// 2026-10-22: 作業ツリーに古い未コミットの変更が残っていたら、セッション開始時に 1 行出す
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatStaleWip, STALE_WIP_HOURS } from '../scripts/check-git-sync.mjs';

const H = 3_600_000;
const now = Date.parse('2026-10-22T12:00:00Z');

test('いちばん新しい変更が しきい値より古ければ件数と経過時間を出す', () => {
  const line = formatStaleWip([
    { path: 'a.mjs', mtimeMs: now - 13 * H },
    { path: 'b.json', mtimeMs: now - 12 * H },
  ], now);
  assert.match(line, /未コミットの変更 2 件が 12 時間以上残っている/);
  assert.match(line, /ブランチを切ってコミット/);
});

test('新しい変更が 1 つでもあれば作業中とみなして出さない', () => {
  assert.equal(formatStaleWip([
    { path: 'a.mjs', mtimeMs: now - 20 * H },
    { path: 'b.mjs', mtimeMs: now - 1 * H },
  ], now), null);
});

test('しきい値ちょうどの手前は出さない・既定は 6 時間', () => {
  assert.equal(STALE_WIP_HOURS, 6);
  assert.equal(formatStaleWip([{ path: 'a', mtimeMs: now - 5.9 * H }], now), null);
  assert.ok(formatStaleWip([{ path: 'a', mtimeMs: now - 6 * H }], now));
});

test('変更なし・時刻の取れない削除だけは出さない', () => {
  assert.equal(formatStaleWip([], now), null);
  assert.equal(formatStaleWip([{ path: 'gone', mtimeMs: null }], now), null);
  // 削除が混ざっても、残りの時刻で判定する（件数は削除も含む）
  assert.match(formatStaleWip([{ path: 'gone', mtimeMs: null }, { path: 'a', mtimeMs: now - 8 * H }], now), /2 件が 8 時間以上/);
});
