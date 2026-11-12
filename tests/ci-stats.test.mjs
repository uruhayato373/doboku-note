// ci-stats の数え方。CI の構成を変えた前後を比べる物差しなので、赤の時間と取消の扱いを固定する。
import test from 'node:test';
import assert from 'node:assert/strict';
import { failedCheckIds, gateTimeline, median, summarizeRuns } from '../scripts/lib/ci-stats.mjs';

const GATE = 'Pre-merge check (quality audit + build)';
const run = (id, conclusion, start, end, extra = {}) => ({
  databaseId: id, workflowName: GATE, event: 'push', headBranch: 'develop', status: 'completed', conclusion,
  createdAt: `2026-11-11T${start}:00Z`, startedAt: `2026-11-11T${start}:00Z`, updatedAt: `2026-11-11T${end}:00Z`, ...extra,
});

test('赤の時間は、失敗が終わってから次の成功が終わるまで。取消は数えない', () => {
  const t = gateTimeline([
    run(1, 'success', '00:00', '00:07'),
    run(2, 'failure', '01:00', '01:07'),
    run(3, 'cancelled', '01:10', '01:12'),
    run(4, 'failure', '01:30', '01:37'),
    run(5, 'success', '02:00', '02:07'),
  ], { workflowName: GATE });
  assert.deepEqual(t.count, { success: 2, failure: 2, cancelled: 1, other: 0 });
  assert.equal(t.redMin, 60);
  assert.equal(t.openRed, false);
  assert.deepEqual(t.failed, [2, 4]);
});

test('最後が赤のままなら、その失敗の終了時刻で打ち切って openRed を立てる', () => {
  const t = gateTimeline([run(1, 'failure', '01:00', '01:07'), run(2, 'failure', '01:30', '01:37')], { workflowName: GATE });
  assert.equal(t.redMin, 30);
  assert.equal(t.openRed, true);
});

test('PR・別の workflow・実行中の実行はゲートの時系列に入れない', () => {
  const t = gateTimeline([
    run(1, 'failure', '01:00', '01:07', { event: 'pull_request', headBranch: 'fix/x' }),
    run(2, 'failure', '01:00', '01:07', { workflowName: 'Playwright E2E' }),
    run(3, '', '01:00', '01:07', { status: 'in_progress' }),
  ], { workflowName: GATE });
  assert.equal(t.total, 0);
  assert.equal(t.redMin, 0);
});

test('workflow × event ごとに結論を数え、所要時間は成功した実行だけで出す', () => {
  const [g] = summarizeRuns([run(1, 'success', '00:00', '00:06'), run(2, 'success', '01:00', '01:08'), run(3, 'cancelled', '02:00', '02:01')]);
  assert.equal(g.total, 3);
  assert.deepEqual(g.conclusions, { success: 2, cancelled: 1 });
  assert.equal(g.medianMin, 8);
  assert.equal(g.maxMin, 8);
  assert.equal(median([]), null);
});

test('落ちた検査の id は色コードを落としてから読む（色つきのままだと 0 件になる）', () => {
  const log = 'audit\tQuality audit\t2026-11-11T05:41:53Z \x1b[31m[quality-audit] CI 失敗: unit-tests, media-references\x1b[0m\n';
  assert.deepEqual(failedCheckIds(log), ['unit-tests', 'media-references']);
  assert.deepEqual(failedCheckIds('Process completed with exit code 1.'), []);
});
