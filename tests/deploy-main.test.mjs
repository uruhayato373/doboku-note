// deploy-main の判定の意図: 検査を通った commit だけを昇格し、失敗を見逃さない。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findDeployRun, pickGateTarget, pushRejectedAsStale } from '../scripts/lib/deploy-main.mjs';

const run = (headSha, status, conclusion, databaseId = 1) => ({ headSha, status, conclusion, databaseId });

test('pickGateTarget: 検査の無い bot の commit を飛ばし、最新の検査済み commit を選ぶ', () => {
  assert.deepEqual(pickGateTarget(['bot', 'a', 'b'], [run('a', 'completed', 'success'), run('b', 'completed', 'success')]), { kind: 'ok', sha: 'a' });
});

test('pickGateTarget: 取り消された回は飛ばす', () => {
  assert.equal(pickGateTarget(['c', 'a'], [run('c', 'completed', 'cancelled'), run('a', 'completed', 'success')]).sha, 'a');
});

test('pickGateTarget: 最新が赤なら古い緑へ逃げず止める', () => {
  const pick = pickGateTarget(['c', 'a'], [run('c', 'completed', 'failure', 9), run('a', 'completed', 'success')]);
  assert.deepEqual(pick, { kind: 'fail', sha: 'c', runId: 9, conclusion: 'failure' });
});

test('pickGateTarget: 走っている回は待つ', () => {
  assert.equal(pickGateTarget(['c'], [run('c', 'in_progress', '')]).kind, 'wait');
});

test('pickGateTarget: 検査が 1 件も無ければ検査不成立', () => {
  assert.equal(pickGateTarget(['c'], []).kind, 'none');
});

test('pushRejectedAsStale: main が先に進んだ失敗だけを作り直しの対象にする', () => {
  assert.equal(pushRejectedAsStale('! [rejected] main -> main (non-fast-forward)'), true);
  assert.equal(pushRejectedAsStale('fatal: the remote end hung up unexpectedly'), false);
});

test('findDeployRun: 今 push した commit の run だけを見る', () => {
  assert.equal(findDeployRun([{ headSha: 'old', databaseId: 1 }], 'new'), null);
  assert.equal(findDeployRun([{ headSha: 'new', databaseId: 2 }], 'new').databaseId, 2);
});
