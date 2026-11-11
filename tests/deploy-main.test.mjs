// deploy-main の判定の意図: 検査を通った commit だけを昇格し、失敗を見逃さない。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blockingNightlyIssues, findDeployRun, GATE_WAIT_LIMIT_MS, gateWaitExpired, pickGateTarget, pushRejectedAsStale, ssrVerdict, stepConclusion, unverifiedPrCommits } from '../scripts/lib/deploy-main.mjs';

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

test('gateWaitExpired: 30 分までは待ち、超えたら止める', () => {
  assert.equal(gateWaitExpired(0, GATE_WAIT_LIMIT_MS), false);
  assert.equal(gateWaitExpired(0, GATE_WAIT_LIMIT_MS + 1), true);
});

test('stepConclusion: ステップの conclusion を返し、無ければ null', () => {
  const view = { jobs: [{ steps: [{ name: 'Build', conclusion: 'success' }, { name: 'Verify production SSR', conclusion: 'failure' }] }] };
  assert.equal(stepConclusion(view, 'Verify production SSR'), 'failure');
  assert.equal(stepConclusion(view, 'Missing'), null);
  assert.equal(stepConclusion({ jobs: [] }, 'Build'), null);
  assert.equal(stepConclusion({}, 'Build'), null);
});

test('ssrVerdict: 手元 exit 2 はデプロイ run の検査が success のときだけ 0、壊れている exit 1 は 1', () => {
  assert.deepEqual(ssrVerdict(0, null), { code: 0, via: 'local' });
  assert.equal(ssrVerdict(1, 'success').code, 1);
  assert.deepEqual(ssrVerdict(2, 'success'), { code: 0, via: 'deploy-run' });
  assert.equal(ssrVerdict(2, 'failure').code, 2);
  assert.equal(ssrVerdict(2, 'skipped').code, 2);
  assert.equal(ssrVerdict(2, null).code, 2);
});

test('findDeployRun: 今 push した commit の run だけを見る', () => {
  assert.equal(findDeployRun([{ headSha: 'old', databaseId: 1 }], 'new'), null);
  assert.equal(findDeployRun([{ headSha: 'new', databaseId: 2 }], 'new').databaseId, 2);
});

test('夜間の全件検査の未解決 Issue だけが昇格を止める', () => {
  const issues = [
    { number: 1, title: '[auto] e2e-nightly: develop 夜間 E2E 失敗' },
    { number: 2, title: '[auto] lighthouse-nightly: develop 夜間 Lighthouse 失敗' },
    { number: 3, title: '[auto] ops: 別の失敗' },
  ];
  assert.deepEqual(blockingNightlyIssues(issues).map((issue) => issue.number), [1, 2]);
  assert.deepEqual(blockingNightlyIssues([]), []);
});

test('昇格先より新しい PR の commit を取り残さない（台帳と bot の commit は除く）', () => {
  assert.deepEqual(unverifiedPrCommits(['feat(site): AdSense を戻す (#1426)', 'todo: DN-1 を起票する', 'chore(metrics): daily [skip ci]']), ['feat(site): AdSense を戻す (#1426)']);
  assert.deepEqual(unverifiedPrCommits([]), []);
});
