import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectFalseNegative } from '../scripts/lib/asp-falsenegative-guard.mjs';

// 2026-08-13 に実際に起きた形をそのまま固定する。
// affiliate-status のログ: a8/moshimo とも partnered 0 件（SID は取れている＝取得は成功扱い）。
// --write を付けていればカタログの approved が none で塗り潰されていた。
test('セッション切れの偽陰性（approved が全滅）を検出する', () => {
  const blocked = detectFalseNegative({
    aspNames: ['a8', 'moshimo'],
    drift: [
      { asp: 'a8', catalog: 'approved', actual: 'none' },
      { asp: 'a8', catalog: 'approved', actual: 'none' },
      { asp: 'moshimo', catalog: 'approved', actual: 'none' },
    ],
    knownApprovedByAsp: { a8: 2, moshimo: 1 },
    partneredSeenByAsp: { a8: 0, moshimo: 0 },
  });
  assert.equal(blocked.length, 2);
  assert.deepEqual(blocked.map((b) => b.asp).sort(), ['a8', 'moshimo']);
  assert.match(blocked[0].reason, /全て none へ落ちた/);
});

test('一部だけ解除されたケースは通す（実際に起こりうるため止めない）', () => {
  const blocked = detectFalseNegative({
    aspNames: ['a8'],
    drift: [{ asp: 'a8', catalog: 'approved', actual: 'none' }],
    knownApprovedByAsp: { a8: 3 }, // 3 件中 1 件だけ解除
    partneredSeenByAsp: { a8: 2 },
  });
  assert.equal(blocked.length, 0);
});

test('元から approved が無い ASP は判定しない', () => {
  const blocked = detectFalseNegative({
    aspNames: ['afb'],
    drift: [],
    knownApprovedByAsp: { afb: 0 },
    partneredSeenByAsp: { afb: 0 },
  });
  assert.equal(blocked.length, 0);
});

test('approved 以外へのドリフト（applying 化など）は偽陰性と見なさない', () => {
  const blocked = detectFalseNegative({
    aspNames: ['a8'],
    drift: [
      { asp: 'a8', catalog: 'approved', actual: 'applying' },
      { asp: 'a8', catalog: 'none', actual: 'approved' },
    ],
    knownApprovedByAsp: { a8: 1 },
    partneredSeenByAsp: { a8: 5 },
  });
  assert.equal(blocked.length, 0);
});

test('取得できなかった ASP は aspNames に含まれないので判定対象外', () => {
  // 取得失敗は呼び出し側で failed に分離済み。ここへは来ない。
  const blocked = detectFalseNegative({
    aspNames: ['a8'], // afb は取得失敗で除外されている
    drift: [{ asp: 'afb', catalog: 'approved', actual: 'none' }],
    knownApprovedByAsp: { a8: 1, afb: 4 },
    partneredSeenByAsp: { a8: 1 },
  });
  assert.equal(blocked.length, 0);
});

test('実機が本当に 0 件でも、approved が残っていれば止める（破壊的な側を選ばない）', () => {
  // 「実機 0 件」と「見えていないだけ」は区別できない。区別できない以上、
  // カタログを全消しする側には倒さない。本当に解除されたなら --asp で個別確認する。
  const blocked = detectFalseNegative({
    aspNames: ['moshimo'],
    drift: [
      { asp: 'moshimo', catalog: 'approved', actual: 'none' },
      { asp: 'moshimo', catalog: 'approved', actual: 'none' },
      { asp: 'moshimo', catalog: 'approved', actual: 'none' },
    ],
    knownApprovedByAsp: { moshimo: 3 },
    partneredSeenByAsp: { moshimo: 0 },
  });
  assert.equal(blocked.length, 1);
  assert.equal(blocked[0].knownApproved, 3);
  assert.equal(blocked[0].lostApproved, 3);
  assert.equal(blocked[0].partneredSeen, 0);
});
