/**
 * 実験期限 surfacer の判定（scripts/lib/experiment-due.mjs・唯一の実装）を固定する。
 * 2026-09-19（DN-0252）: 2 本あった surfacer を統合。measuring でも next_check_date 超過は MEASURE_DUE（旧 check-experiments-due の判定を吸収）。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { judgeExperiment, judgeLedger, DEFAULT_THRESHOLDS } from '../scripts/lib/experiment-due.mjs';

const NOW = Date.parse('2026-09-19T00:00:00Z');
const kinds = (r) => r.reasons.map((x) => x.kind);

test('running: next_check_date 超過は MEASURE_DUE、未来なら due でない', () => {
  assert.deepEqual(kinds(judgeExperiment({ id: 'E1', status: 'running', next_check_date: '2026-09-18', baseline: { a: 1 } }, NOW)), ['MEASURE_DUE']);
  assert.equal(judgeExperiment({ id: 'E1', status: 'running', next_check_date: '2026-09-20', baseline: { a: 1 } }, NOW).due, false);
});

test('measuring: next_check_date 超過も MEASURE_DUE（旧 check-experiments-due の判定を吸収）・放置は CLOSE_DUE', () => {
  const r = judgeExperiment({ id: 'E2', status: 'measuring', next_check_date: '2026-09-15', history: [{ date: '2026-09-15' }] }, NOW);
  assert.deepEqual(kinds(r), ['MEASURE_DUE']);
  assert.match(r.review, /close E2/);
  const stale = judgeExperiment({ id: 'E3', status: 'measuring', history: [{ date: '2026-09-01' }] }, NOW);
  assert.deepEqual(kinds(stale), ['CLOSE_DUE']);
});

test('running で baseline 無し → NO_BASELINE、next_check_date 未設定は開始 28 日で MEASURE_DUE', () => {
  const r = judgeExperiment({ id: 'E4', status: 'running', started_at: '2026-08-01', baseline: {} }, NOW);
  assert.deepEqual(kinds(r).sort(), ['MEASURE_DUE', 'NO_BASELINE']);
  assert.equal(DEFAULT_THRESHOLDS.runningDays, 28);
});

test('proposed の放置は DECIDE_DUE、pending_user_actions は PENDING（done では出さない）', () => {
  assert.deepEqual(kinds(judgeExperiment({ id: 'E5', status: 'proposed', created_at: '2026-08-20' }, NOW)), ['DECIDE_DUE']);
  assert.deepEqual(kinds(judgeExperiment({ id: 'E6', status: 'running', next_check_date: '2026-10-01', baseline: { a: 1 }, pending_user_actions: [{ action: '再計測' }] }, NOW)), ['PENDING']);
  assert.equal(judgeExperiment({ id: 'E7', status: 'done', pending_user_actions: [{ action: 'x' }] }, NOW).due, false);
});

test('judgeLedger: due と issues（PENDING の 1 行）を返す', () => {
  const { due, issues } = judgeLedger([
    { id: 'A', status: 'running', next_check_date: '2026-09-01', baseline: { a: 1 }, pending_user_actions: [{ action: 'deploy 後に再計測' }] },
    { id: 'B', status: 'done' },
  ], NOW);
  assert.deepEqual(due.map((d) => d.id), ['A']);
  assert.deepEqual(issues, ['A: 要人手 1 件: deploy 後に再計測']);
});
