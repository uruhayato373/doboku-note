// x-sync-status の TTL（DN-0688・2026-10-11）の回帰ゲート。SessionStart が毎回 Playwright で x.com を開いて
// 9.6 秒掛かっていたのを、前回の完走が TTL 内なら起動しないようにした。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { isSyncFresh, run } from '../scripts/x-sync-status.mjs';
import { datasetPath } from '../scripts/lib/datasets.mjs';

const MIN = 60_000;
const now = Date.parse('2026-10-11T12:00:00Z');

test('TTL 内で不在 0 なら fresh、TTL 超・不在あり・記録なし・未来の時刻は fresh でない', () => {
  const fresh = { syncedAt: new Date(now - 30 * MIN).toISOString(), missingFromQueue: 0 };
  assert.equal(isSyncFresh(fresh, now, 240), true);
  assert.equal(isSyncFresh({ ...fresh, syncedAt: new Date(now - 300 * MIN).toISOString() }, now, 240), false);
  assert.equal(isSyncFresh({ ...fresh, missingFromQueue: 1 }, now, 240), false, '予約が消えている回は次のセッションでも警告を出し直す');
  assert.equal(isSyncFresh(null, now, 240), false);
  assert.equal(isSyncFresh({ ...fresh, syncedAt: new Date(now + 5 * MIN).toISOString() }, now, 240), false);
  assert.equal(isSyncFresh(fresh, now, 0), false, 'TTL 指定なしは常に実査');
});

test('run は TTL 内の記録があれば Playwright を起動せず code 0 で返す', async () => {
  const root = mkdtempSync(join(tmpdir(), 'x-sync-ttl-'));
  try {
    const rel = datasetPath('state.x-sync-last-run');
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), JSON.stringify({ schemaVersion: 1, syncedAt: new Date().toISOString(), queueRows: 3, missingFromQueue: 0 }));
    const r = await run({ argv: ['--dry', '--max-age-minutes', '240'], quiet: true, root });
    assert.equal(r.code, 0);
    assert.match(r.stdout, /TTL 240 分内/);
    assert.doesNotMatch(r.stdout, /Playwright、ヘッドレス/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
