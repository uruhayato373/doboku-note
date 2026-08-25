import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addWipToken,
  removeWipToken,
  claimTask,
  releaseTask,
  checkCompleteReadiness,
  readClaimsStore,
  emptyClaimsStore,
} from '../scripts/lib/todo-lifecycle.mjs';

function sampleBacklog() {
  return [
    '## 🔴 高',
    '',
    '### [DN-0001] サンプルタスク',
    'タグ: [収益化] [種類:改善] [実行:sweep] [検証:npm run test] [起票:2026-01-01]',
    '',
    '本文です。',
    '',
    '### [DN-0002] 別のタスク',
    'タグ: [収益化] [種類:不具合] [実行:sweep]',
    '',
    '本文2。',
  ].join('\n');
}

// --- addWipToken / removeWipToken -----------------------------------------

test('addWipToken: タグ行へ [進行中] を追加する', () => {
  const r = addWipToken(sampleBacklog(), 'DN-0001');
  assert.equal(r.ok, true);
  assert.match(r.text, /タグ: .*\[進行中\]/);
  const line = r.text.split('\n').find((l) => l.startsWith('タグ:'));
  assert.match(line, /\[検証:npm run test\] \[起票:2026-01-01\] \[進行中\]$/);
});

test('addWipToken: 存在しないIDはエラー', () => {
  const r = addWipToken(sampleBacklog(), 'DN-9999');
  assert.equal(r.ok, false);
  assert.match(r.error, /存在しない/);
});

test('addWipToken: 既に[進行中]なら二重claim拒否', () => {
  const once = addWipToken(sampleBacklog(), 'DN-0001');
  const twice = addWipToken(once.text, 'DN-0001');
  assert.equal(twice.ok, false);
  assert.match(twice.error, /既に \[進行中\]/);
});

test('removeWipToken: [進行中] を除去する', () => {
  const added = addWipToken(sampleBacklog(), 'DN-0001');
  const removed = removeWipToken(added.text, 'DN-0001');
  assert.equal(removed.ok, true);
  assert.doesNotMatch(removed.text, /\[進行中\]/);
  // DN-0002（別カード）のタグ行は無関係に無傷であること
  const dn2Line = removed.text.split('\n').find((l) => l.startsWith('タグ:') && removed.text.indexOf(l) > removed.text.indexOf('[DN-0002]'));
  assert.ok(dn2Line, 'DN-0002のタグ行が見つかること');
  assert.doesNotMatch(dn2Line, /\[進行中\]/);
});

test('removeWipToken: [進行中]でないIDはエラー', () => {
  const r = removeWipToken(sampleBacklog(), 'DN-0001');
  assert.equal(r.ok, false);
  assert.match(r.error, /release対象外/);
});

// --- claimTask / releaseTask -----------------------------------------------

test('claimTask: backlogとclaims.json両方を更新する', () => {
  const r = claimTask(sampleBacklog(), null, 'DN-0001', 'claude-code', { now: '2026-08-26T00:00:00.000Z' });
  assert.equal(r.ok, true);
  assert.match(r.text, /\[進行中\]/);
  assert.equal(r.claimsStore.claims.length, 1);
  assert.equal(r.claimsStore.claims[0].id, 'DN-0001');
  assert.equal(r.claimsStore.claims[0].owner, 'claude-code');
  assert.equal(r.claimsStore.claims[0].startedAt, '2026-08-26T00:00:00.000Z');
});

test('claimTask: claims.jsonに既に記録があれば二重claim拒否（backlogのwipフラグより先に検知）', () => {
  const existingClaims = JSON.stringify({ claims: [{ id: 'DN-0001', owner: 'someone-else', startedAt: 'x' }] });
  const r = claimTask(sampleBacklog(), existingClaims, 'DN-0001', 'claude-code');
  assert.equal(r.ok, false);
  assert.match(r.error, /someone-else/);
});

test('releaseTask: claim解除でbacklogとclaims.json両方が戻る', () => {
  const claimed = claimTask(sampleBacklog(), null, 'DN-0001', 'claude-code');
  const released = releaseTask(claimed.text, JSON.stringify(claimed.claimsStore), 'DN-0001', { reason: 'blocked' });
  assert.equal(released.ok, true);
  assert.doesNotMatch(released.text, /\[進行中\]/);
  assert.equal(released.claimsStore.claims.length, 0);
  assert.equal(released.reason, 'blocked');
});

// --- checkCompleteReadiness --------------------------------------------------

test('checkCompleteReadiness: claim済みならhard failなしでok=true', () => {
  const claimed = claimTask(sampleBacklog(), null, 'DN-0001', 'claude-code');
  const r = checkCompleteReadiness(claimed.text, JSON.stringify(claimed.claimsStore), 'DN-0001');
  assert.equal(r.ok, true);
  const claimedCheck = r.checks.find((c) => c.label === 'claimed');
  assert.equal(claimedCheck.pass, true);
  const wipCheck = r.checks.find((c) => c.label === 'wip-flag');
  assert.equal(wipCheck.pass, true);
  // 3つの人間判断項目は常にpass=nullで残る（機械が勝手にtrueにしない）
  const humanChecks = r.checks.filter((c) => c.pass === null);
  assert.equal(humanChecks.length, 3);
});

test('checkCompleteReadiness: 未claimはhard fail（claimせずに直接completeする迂回を防ぐ）', () => {
  const r = checkCompleteReadiness(sampleBacklog(), null, 'DN-0001');
  assert.equal(r.ok, false);
  const claimedCheck = r.checks.find((c) => c.label === 'claimed');
  assert.equal(claimedCheck.pass, false);
});

test('checkCompleteReadiness: 存在しないIDはhard fail', () => {
  const r = checkCompleteReadiness(sampleBacklog(), null, 'DN-9999');
  assert.equal(r.ok, false);
});

// --- readClaimsStore ---------------------------------------------------------

test('readClaimsStore: null/不正JSONは空ストアへフォールバック', () => {
  assert.deepEqual(readClaimsStore(null), emptyClaimsStore());
  assert.deepEqual(readClaimsStore('{not json'), emptyClaimsStore());
  assert.deepEqual(readClaimsStore('{"claims":"not-array"}'), emptyClaimsStore());
});
