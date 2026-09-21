// fetch-ig-insights.test.mjs — scripts/fetch-ig-insights.mjs の run() テスト。
// fake client（listMedia/mediaInsights/accountInsights/accountFields/debugToken）を注入し、
// 実 API・実ネットワークは一切叩かない。一時ディレクトリを root として渡し、成果物は
// リポジトリの .claude/state/ を汚さない。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from '../scripts/fetch-ig-insights.mjs';

function fakeClient(overrides = {}) {
  return {
    debugToken: async () => ({ type: 'PAGE', expiresAt: 0, dataAccessExpiresAt: 0, scopes: ['instagram_basic'] }),
    accountFields: async () => ({ id: 'IG123', username: 'dobokunotecom', followers_count: 1000, media_count: 42 }),
    listMedia: async () => ({
      rows: [
        { id: 'm1', shortcode: 'AAA', permalink: 'https://instagram.com/p/AAA/', timestamp: '2026-09-10T00:00:00+0000', media_type: 'CAROUSEL_ALBUM', media_product_type: 'CAROUSEL_ALBUM', caption: 'テスト投稿1' },
        { id: 'm2', shortcode: 'BBB', permalink: 'https://instagram.com/reel/BBB/', timestamp: '2020-01-01T00:00:00+0000', media_type: 'VIDEO', media_product_type: 'REELS', caption: '古いリール' },
      ],
      truncated: false,
    }),
    mediaInsights: async (media) => ({ insights: [{ name: 'reach', values: [{ value: 10 }] }] }),
    accountInsights: async ({ since, until }) => [
      { date: since, reach: 100 },
      { date: until, reach: 120 },
    ],
    ...overrides,
  };
}

test('run: ファイルが書かれ counts が正しい（古いメディアは insights 対象外）', async () => {
  const root = mkdtempSync(join(tmpdir(), 'fetch-ig-insights-'));
  const client = fakeClient();
  const now = new Date('2026-09-21T03:00:00Z');
  const result = await run({ client, root, now, argv: [] });

  assert.equal(result.exitCode, 0);
  assert.equal(result.counts.mediaListed, 2);
  assert.equal(result.counts.mediaTruncated, false);
  // insights-since-days 既定90日: m1(2026-09-10)は対象、m2(2020-01-01)は対象外。
  assert.equal(result.counts.insightsTargeted, 1);
  assert.equal(result.counts.insightsFetched, 1);
  assert.equal(result.counts.insightsFailed, 0);
  assert.equal(result.counts.daysReturned, 2);

  assert.equal(result.written.length, 1);
  const outPath = result.written[0];
  assert.ok(existsSync(outPath));
  const written = JSON.parse(readFileSync(outPath, 'utf8'));
  assert.equal(written.schemaVersion, 1);
  assert.equal(written.media.length, 2);
  assert.equal(written.media[0].insights[0].name, 'reach');
  assert.equal(written.media[1].insights, null);
  assert.equal(written.counts.mediaListed, 2);
});

test('run: mediaListed が 0 のときは exit 2 相当を返し何も書かない', async () => {
  const root = mkdtempSync(join(tmpdir(), 'fetch-ig-insights-empty-'));
  const client = fakeClient({ listMedia: async () => ({ rows: [], truncated: false }) });
  const result = await run({ client, root, now: new Date('2026-09-21T03:00:00Z'), argv: [] });

  assert.equal(result.exitCode, 2);
  assert.equal(result.written, undefined);
  assert.equal(existsSync(join(root, '.claude/state/metrics/instagram')), false);
});

test('run: daysReturned が 0 のときも exit 2 相当を返し何も書かない', async () => {
  const root = mkdtempSync(join(tmpdir(), 'fetch-ig-insights-noday-'));
  const client = fakeClient({ accountInsights: async () => [] });
  const result = await run({ client, root, now: new Date('2026-09-21T03:00:00Z'), argv: [] });

  assert.equal(result.exitCode, 2);
  assert.equal(existsSync(join(root, '.claude/state/metrics/instagram')), false);
});

test('run: 認証・ネットワーク失敗（debugToken 例外）は exit 1 で何も書かない', async () => {
  const root = mkdtempSync(join(tmpdir(), 'fetch-ig-insights-auth-'));
  const authError = new Error('Invalid OAuth access token');
  authError.code = 'AUTH';
  const client = fakeClient({ debugToken: async () => { throw authError; } });
  const result = await run({ client, root, now: new Date('2026-09-21T03:00:00Z'), argv: [] });

  assert.equal(result.exitCode, 1);
  assert.ok(result.message.includes('AUTH'));
  assert.equal(existsSync(join(root, '.claude/state/metrics/instagram')), false);
});

test('run: --dry-run は counts を返すが何も書かない', async () => {
  const root = mkdtempSync(join(tmpdir(), 'fetch-ig-insights-dry-'));
  const client = fakeClient();
  const result = await run({ client, root, now: new Date('2026-09-21T03:00:00Z'), argv: ['--dry-run'] });

  assert.equal(result.exitCode, 0);
  assert.equal(result.counts.mediaListed, 2);
  assert.deepEqual(result.written, []);
  assert.equal(existsSync(join(root, '.claude/state/metrics/instagram')), false);
});

test('run: 単一メディアの insights 失敗は insightsError に格納し続行する', async () => {
  const root = mkdtempSync(join(tmpdir(), 'fetch-ig-insights-partial-'));
  const client = fakeClient({
    listMedia: async () => ({
      rows: [
        { id: 'm1', shortcode: 'AAA', permalink: 'https://instagram.com/p/AAA/', timestamp: '2026-09-10T00:00:00+0000', media_type: 'CAROUSEL_ALBUM', media_product_type: 'CAROUSEL_ALBUM', caption: 'テスト投稿1' },
        { id: 'm2', shortcode: 'BBB', permalink: 'https://instagram.com/p/BBB/', timestamp: '2026-09-11T00:00:00+0000', media_type: 'CAROUSEL_ALBUM', media_product_type: 'CAROUSEL_ALBUM', caption: 'テスト投稿2' },
      ],
      truncated: false,
    }),
    mediaInsights: async (media) => {
      if (media.id === 'm2') throw new Error('rate limited');
      return { insights: [{ name: 'reach', values: [{ value: 10 }] }] };
    },
  });
  const result = await run({ client, root, now: new Date('2026-09-21T03:00:00Z'), argv: [] });

  assert.equal(result.exitCode, 0);
  assert.equal(result.counts.insightsTargeted, 2);
  assert.equal(result.counts.insightsFetched, 1);
  assert.equal(result.counts.insightsFailed, 1);
  const m2 = result.output.media.find((m) => m.id === 'm2');
  assert.ok(m2.insightsError.includes('rate limited'));
});

test('run: token 値は出力 JSON に含まれない（type/expiresAt/scopes のみ）', async () => {
  const root = mkdtempSync(join(tmpdir(), 'fetch-ig-insights-token-'));
  const client = fakeClient();
  const result = await run({ client, root, now: new Date('2026-09-21T03:00:00Z'), argv: [] });

  const raw = JSON.stringify(result.output);
  assert.ok(!raw.includes('access_token'));
  assert.deepEqual(Object.keys(result.output.token).sort(), ['dataAccessExpiresAt', 'expiresAt', 'scopes', 'type']);
});
