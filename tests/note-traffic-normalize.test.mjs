import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseReferrerTimeSeries, parseReferrerPie, parsePeriod, parseSummary, parseArticleRows, normalizeMonth } from '../scripts/lib/note-traffic-normalize.mjs';

const DIR = dirname(fileURLToPath(import.meta.url));
const ts = readFileSync(join(DIR, 'fixtures/note-dashboard-referrers-365d.txt'), 'utf8');
const d28 = readFileSync(join(DIR, 'fixtures/note-dashboard-28d.txt'), 'utf8');

/**
 * note ダッシュボード innerText → JSON の契約（2026-09-15 実測 fixture）。
 * 収益の出所（note 内回遊／検索直／no referrer）を月次で読む唯一の機械経路なので、列名と月キーを固定する。
 */
test('時系列: 月キーは YYYY-MM、列は (PV) を剥いだ流入元名、合計は行和', () => {
  const r = parseReferrerTimeSeries(ts);
  assert.ok(r);
  assert.deepEqual(r.sources.slice(0, 5), ['no referrer', 'note.com', 'Google', 'www.bing.com', 'search.yahoo.co.jp']);
  const jul = r.months.find((m) => m.month === '2026-07');
  assert.equal(jul.sources['note.com'], 5301);
  assert.equal(jul.sources['no referrer'], 3603);
  assert.equal(jul.total, 3603 + 5301 + 2661 + 1311 + 894 + 30 + 8 + 13 + 10 + 6 + 44);
  assert.equal(r.months[0].month, '2025-09');
  assert.equal(r.months.at(-1).month, '2026-09');
});

test('円グラフ: 流入元・PV・割合', () => {
  const pie = parseReferrerPie(d28);
  assert.equal(pie[0].source, 'no referrer');
  assert.equal(pie[0].pv, 4628);
  assert.equal(pie[0].share, 62.9);
  assert.equal(pie.find((p) => p.source === 'X').pv, 4);
});

test('期間と集計カード', () => {
  assert.deepEqual(parsePeriod(d28), { from: '2026-08-19', to: '2026-09-15' });
  const s = parseSummary(d28);
  assert.equal(s.impressions, 78008);
  assert.equal(s.pageViews, 7359);
  assert.equal(s.likes, 83);
  assert.equal(s.comments, null);
  assert.equal(s.salesYen, 71220);
});

test('記事一覧: タイトル・状態・公開日・5 数値（- は null）', () => {
  const rows = parseArticleRows(d28);
  assert.equal(rows.length, 20);
  assert.equal(rows[0].status, '公開中');
  assert.equal(rows[0].publishedAt, '2026-09-13');
  assert.equal(rows[0].impressions, 133);
  assert.equal(rows[0].pageViews, 5);
  assert.equal(rows[0].salesYen, null);
  const sold = rows.find((r) => r.salesYen !== null);
  assert.equal(sold.salesYen, 1480);
});

test('未検出は null / 空配列（検査ゼロを PASS と呼ばないための入力）', () => {
  assert.equal(parseReferrerTimeSeries('なにもない'), null);
  assert.equal(parseReferrerPie(''), null);
  assert.deepEqual(parseArticleRows(''), []);
  assert.equal(normalizeMonth('2026/09'), '2026-09');
  assert.equal(normalizeMonth('9月'), null);
});
