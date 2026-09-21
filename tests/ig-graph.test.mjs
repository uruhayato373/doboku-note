// ig-graph.test.mjs — scripts/lib/ig-graph.mjs のテスト。
// fetchImpl を fake に差し替え、実 API・実ネットワークは一切叩かない。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createIgGraphClient,
  metricsFor,
  dropUnsupportedMetric,
  mediaToLive,
} from '../scripts/lib/ig-graph.mjs';

// ─── metricsFor ────────────────────────────────────────────────
test('metricsFor: REELS はリール専用メトリクス（ig_reels_avg_watch_time 含む）を返す', () => {
  const m = metricsFor('REELS');
  assert.ok(m.includes('ig_reels_avg_watch_time'));
  assert.ok(m.includes('reach'));
});

test('metricsFor: STORY は reach/views/replies のみ', () => {
  assert.deepEqual(metricsFor('STORY'), ['reach', 'views', 'replies']);
});

test('metricsFor: FEED/CAROUSEL_ALBUM/AD はフィード系メトリクス', () => {
  const expected = ['reach', 'views', 'likes', 'comments', 'saved', 'shares', 'total_interactions'];
  assert.deepEqual(metricsFor('CAROUSEL_ALBUM'), expected);
  assert.deepEqual(metricsFor('FEED'), expected);
  assert.deepEqual(metricsFor('AD'), expected);
});

// ─── dropUnsupportedMetric ─────────────────────────────────────
test('dropUnsupportedMetric: エラーメッセージ中のメトリクスを特定して除去する', () => {
  const metrics = ['reach', 'views', 'likes'];
  const result = dropUnsupportedMetric(metrics, 'metric views is not supported for this media');
  assert.deepEqual(result, ['reach', 'likes']);
});

test('dropUnsupportedMetric: 特定できなければ reach へ縮退する', () => {
  const metrics = ['reach', 'views', 'likes'];
  const result = dropUnsupportedMetric(metrics, 'unknown internal error');
  assert.deepEqual(result, ['reach']);
});

// ─── mediaToLive ───────────────────────────────────────────────
test('mediaToLive: media_product_type REELS は type=reel、それ以外は carousel', () => {
  const rows = [
    { id: '1', shortcode: 'AAA', media_product_type: 'REELS', permalink: 'https://instagram.com/reel/AAA/', caption: 'テスト投稿\n本文', timestamp: '2026-09-01T00:00:00+0000' },
    { id: '2', shortcode: 'BBB', media_product_type: 'IMAGE', permalink: 'https://instagram.com/p/BBB/', caption: '別の投稿', timestamp: '2026-09-02T00:00:00+0000' },
  ];
  const result = mediaToLive(rows);
  assert.deepEqual(result.shortcodes, ['AAA', 'BBB']);
  assert.equal(result.live[0].type, 'reel');
  assert.equal(result.live[1].type, 'carousel');
  assert.deepEqual(result.recordedInfo.AAA, { exists: true, type: 'reel' });
  assert.deepEqual(result.recordedInfo.BBB, { exists: true, type: 'carousel' });
});

test('mediaToLive: shortcode 欠落時は permalink の /p/ or /reel/ から抽出する', () => {
  const rows = [
    { id: '3', media_product_type: 'REELS', permalink: 'https://instagram.com/reel/CCC123/', caption: 'x' },
  ];
  const result = mediaToLive(rows);
  assert.equal(result.live[0].shortcode, 'CCC123');
});

test('mediaToLive: head は caption 先頭行から記号/空白を除き 24 文字に正規化する', () => {
  const rows = [
    { id: '4', shortcode: 'DDD', media_product_type: 'IMAGE', permalink: 'https://instagram.com/p/DDD/', caption: '📋 総監キーワード「品質管理」まとめ！！詳しくはプロフィールから\n続き' },
  ];
  const result = mediaToLive(rows);
  // 記号・絵文字・句読点を除去し先頭24文字
  assert.equal(result.live[0].head.length <= 24, true);
  assert.equal(/[📋！]/u.test(result.live[0].head), false);
});

// ─── pagedGet: paging.next を辿る ──────────────────────────────
test('pagedGet: paging.next を最後まで辿って data を連結する', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (String(url).includes('page1')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: [{ id: 'a' }], paging: { next: 'https://graph.facebook.com/page2' } }),
      };
    }
    if (String(url).includes('page2')) {
      return { ok: true, status: 200, json: async () => ({ data: [{ id: 'b' }] }) };
    }
    return { ok: true, status: 200, json: async () => ({ data: [] }) };
  };
  const client = createIgGraphClient({ token: 't', igUserId: 'u', fetchImpl });
  const rows = await client.pagedGet('https://graph.facebook.com/page1');
  assert.deepEqual(rows.map((r) => r.id), ['a', 'b']);
  assert.equal(calls.length, 2);
});

// ─── listMedia: max 打ち切り ────────────────────────────────────
test('listMedia: max 件で打ち切り truncated:true を返す', async () => {
  let page = 0;
  const fetchImpl = async () => {
    page += 1;
    if (page === 1) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ id: '1' }, { id: '2' }, { id: '3' }],
          paging: { next: 'https://graph.facebook.com/next' },
        }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: [{ id: '4' }, { id: '5' }] }),
    };
  };
  const client = createIgGraphClient({ token: 't', igUserId: 'u', fetchImpl });
  const { rows, truncated } = await client.listMedia({ max: 4 });
  assert.equal(rows.length, 4);
  assert.equal(truncated, true);
});

test('listMedia: max に達しないうちに paging が尽きれば truncated:false', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ data: [{ id: '1' }, { id: '2' }] }),
  });
  const client = createIgGraphClient({ token: 't', igUserId: 'u', fetchImpl });
  const { rows, truncated } = await client.listMedia({ max: 200 });
  assert.equal(rows.length, 2);
  assert.equal(truncated, false);
});

// ─── mediaInsights: code 100 は 1 回だけ縮退再試行 ──────────────
test('mediaInsights: error.code 100 を受けたら metric を縮退して 1 回だけ再試行し成功する', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    if (calls.length === 1) {
      return {
        ok: false,
        status: 400,
        json: async () => ({ error: { code: 100, message: 'metric ig_reels_avg_watch_time is not supported' } }),
      };
    }
    return { ok: true, status: 200, json: async () => ({ data: [{ name: 'reach', values: [{ value: 10 }] }] }) };
  };
  const client = createIgGraphClient({ token: 't', igUserId: 'u', fetchImpl });
  const result = await client.mediaInsights({ id: 'm1', media_product_type: 'REELS' });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].includes('ig_reels_avg_watch_time'), false);
  assert.deepEqual(result.insights, [{ name: 'reach', values: [{ value: 10 }] }]);
});

test('mediaInsights: 2 回目も失敗したら insights:null + insightsError（≤120字）を返す', async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ error: { code: 100, message: 'metric views is not supported for this media type' } }),
  });
  const client = createIgGraphClient({ token: 't', igUserId: 'u', fetchImpl });
  const result = await client.mediaInsights({ id: 'm1', media_product_type: 'IMAGE' });
  assert.equal(result.insights, null);
  assert.equal(typeof result.insightsError, 'string');
  assert.equal(result.insightsError.length <= 120, true);
});

// ─── debugToken: token 文字列を含まない ─────────────────────────
test('debugToken: 返り値に token 文字列が含まれない', async () => {
  const token = 'SECRET_TOKEN_VALUE_XYZ';
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      data: { type: 'PAGE', expires_at: 1234567890, data_access_expires_at: 1234567891, scopes: ['instagram_basic'] },
    }),
  });
  const client = createIgGraphClient({ token, igUserId: 'u', fetchImpl });
  const result = await client.debugToken();
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(token), false);
  assert.deepEqual(result, {
    type: 'PAGE',
    expiresAt: 1234567890,
    dataAccessExpiresAt: 1234567891,
    scopes: ['instagram_basic'],
  });
});

// ─── accountInsights / accountFields: 最低限の疎通 ──────────────
test('accountInsights: since/until を日付で渡し reach 系列を返す', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      data: [{ name: 'reach', values: [{ value: 5, end_time: '2026-09-01T07:00:00+0000' }] }],
    }),
  });
  const client = createIgGraphClient({ token: 't', igUserId: 'u', fetchImpl });
  const series = await client.accountInsights({ since: '2026-08-01', until: '2026-09-01' });
  assert.deepEqual(series, [{ date: '2026-09-01', reach: 5 }]);
});

test('accountFields: followers_count 等を返す', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ followers_count: 100, media_count: 50, username: 'dobokunotecom' }),
  });
  const client = createIgGraphClient({ token: 't', igUserId: 'u', fetchImpl });
  const fields = await client.accountFields();
  assert.deepEqual(fields, { followers_count: 100, media_count: 50, username: 'dobokunotecom' });
});

// ─── HTTP エラー分類 ────────────────────────────────────────────
test('HTTP エラー: status 401 は code:AUTH で message に token を含めない', async () => {
  const token = 'SECRET_ABC';
  const fetchImpl = async () => ({
    ok: false,
    status: 401,
    json: async () => ({ error: { message: 'Invalid OAuth access token' } }),
  });
  const client = createIgGraphClient({ token, igUserId: 'u', fetchImpl });
  await assert.rejects(
    () => client.accountFields(),
    (err) => {
      assert.equal(err.code, 'AUTH');
      assert.equal(String(err.message).includes(token), false);
      return true;
    },
  );
});

test('HTTP エラー: status 429 は code:RATE', async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 429,
    json: async () => ({ error: { message: 'rate limited' } }),
  });
  const client = createIgGraphClient({ token: 't', igUserId: 'u', fetchImpl });
  await assert.rejects(() => client.accountFields(), (err) => {
    assert.equal(err.code, 'RATE');
    return true;
  });
});
