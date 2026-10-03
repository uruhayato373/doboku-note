/**
 * inspect-url.mjs の batch 契約（index-coverage.yml が読む形）を固定する。
 *
 * 背景: 2026-09-01 に sitemap 1,468 URL を無待機の直列で inspect して job timeout 120 分に当たり、
 * 部分結果を 1 件も残さずに cancelled になった。並列化と checkpoint を入れた上で、
 *   - batch の partial / completed / total が CI の分岐（history へ積むか・完全性ゲート）に使えること
 *   - 429/5xx だけ再試行し、403/400（権限・設定ミス）は即失敗させること
 * を機械で守る。API は叩かない（creds 不要）。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';

const mod = await import('../.claude/scripts/inspect-url.mjs');
const { batchSummary, buildBatchDocument, shouldRetryInspect, httpStatusOf } = mod;

test('buildBatchDocument: 全件 settled なら partial:false、穴があれば partial:true で穴を落とす', () => {
  const full = buildBatchDocument([{ url: 'a' }, { url: 'b', error: 'x' }], 2);
  assert.equal(full.schemaVersion, 1);
  assert.equal(full.partial, false);
  assert.equal(full.completed, 2);
  assert.equal(full.total, 2);
  assert.deepEqual(full.results.map((r) => r.url), ['a', 'b']);

  const settled = new Array(4);
  settled[0] = { url: 'a' };
  settled[2] = { url: 'c' };
  const part = buildBatchDocument(settled, 4);
  assert.equal(part.partial, true);
  assert.equal(part.completed, 2);
  assert.equal(part.total, 4);
  assert.deepEqual(part.results.map((r) => r.url), ['a', 'c'], '入力順を保ち、未着手の穴は results に入れない');
});

test('batchSummary: バッチには読まれる欄だけを残す（mobile・amp・rich_results・リンク・参照元は落とす）', () => {
  const full = {
    url: 'https://example.com/a',
    inspected_at: '2026-10-02T00:00:00.000Z',
    index: {
      verdict: 'PASS',
      coverage_state: '送信して登録されました',
      robots_txt_state: 'ALLOWED',
      indexing_state: 'INDEXING_ALLOWED',
      last_crawl_time: '2026-10-01T00:00:00Z',
      page_fetch_state: 'SUCCESSFUL',
      google_canonical: 'https://example.com/a',
      user_canonical: 'https://example.com/a',
      referring_urls: ['https://example.com/'],
      sitemap: ['https://example.com/sitemap.xml'],
    },
    mobile: { verdict: 'VERDICT_UNSPECIFIED', issues: [] },
    amp: { verdict: null, indexing_state: null },
    rich_results: { verdict: null, detected_items: [] },
    inspection_result_link: 'https://search.google.com/search-console/inspect?x=1',
  };
  const slim = batchSummary(full);
  assert.deepEqual(Object.keys(slim), ['url', 'inspected_at', 'index']);
  assert.deepEqual(Object.keys(slim.index), ['verdict', 'coverage_state', 'robots_txt_state', 'last_crawl_time', 'page_fetch_state', 'google_canonical', 'user_canonical']);
  for (const k of Object.keys(slim.index)) assert.equal(slim.index[k], full.index[k], k);
  assert.equal(slim.url, full.url);
  assert.equal(slim.inspected_at, full.inspected_at);
});

test('buildBatchDocument: error エントリも「検査を試みた」として completed に数える', () => {
  const doc = buildBatchDocument([{ url: 'a', error: 'PSI 503' }], 1);
  assert.equal(doc.partial, false);
  assert.equal(doc.completed, 1);
});

test('shouldRetryInspect: 429 と 5xx だけ再試行、403/400/不明は即失敗', () => {
  assert.equal(shouldRetryInspect({ code: 429 }), true);
  assert.equal(shouldRetryInspect({ response: { status: 503 } }), true);
  assert.equal(shouldRetryInspect({ code: '500' }), true);
  assert.equal(shouldRetryInspect({ code: 403 }), false);
  assert.equal(shouldRetryInspect({ response: { status: 400 } }), false);
  assert.equal(shouldRetryInspect(new Error('socket hang up')), false);
  assert.equal(shouldRetryInspect({ code: 'ECONNRESET' }), false);
});

test('httpStatusOf: response.status を優先し、無ければ数値化できる code を使う', () => {
  assert.equal(httpStatusOf({ code: 429, response: { status: 503 } }), 503);
  assert.equal(httpStatusOf({ code: '429' }), 429);
  assert.equal(httpStatusOf({ code: 7 }), null, 'gRPC の 7 は HTTP ステータスではない');
  assert.equal(httpStatusOf({ code: 'ENOTFOUND' }), null);
});
