import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSharedGroupSchedule, selectRerunTargets } from '../scripts/lib/cancelled-schedule-runs.mjs';

const now = new Date('2026-10-09T12:00:00Z');
const run = (over) => ({ databaseId: 1, event: 'schedule', conclusion: 'cancelled', status: 'completed', attempt: 1, createdAt: '2026-10-09T09:49:06Z', jobCount: 0, ...over });

test('共通 group を使う定期ワークフローだけを対象にする', () => {
  const yml = (group, on) => `on:\n${on}\nconcurrency:\n  group: ${group}\n  cancel-in-progress: false\n`;
  assert.equal(isSharedGroupSchedule(yml('develop-git-write', '  schedule:\n    - cron: "0 3 * * 5"')), true);
  assert.equal(isSharedGroupSchedule(yml('develop-git-write', '  push:')), false);
  assert.equal(isSharedGroupSchedule(yml('other-group', '  schedule:\n    - cron: "0 3 * * 5"')), false);
});

test('待機中に取り消された定期実行（2026-10-09 の gsc-auto-review の形）を選ぶ', () => {
  const runs = [run({ databaseId: 2 }), run({ databaseId: 1, conclusion: 'success', createdAt: '2026-10-02T09:10:19Z', jobCount: null })];
  assert.deepEqual(selectRerunTargets(runs, { now }).map((r) => r.databaseId), [2]);
});

test('選ばないもの: 手で止めた実行中の run・再実行済み・手動起動・古いもの・後の run が成功か実行中', () => {
  assert.equal(selectRerunTargets([run({ jobCount: 2 })], { now }).length, 0);
  assert.equal(selectRerunTargets([run({ attempt: 2 })], { now }).length, 0);
  assert.equal(selectRerunTargets([run({ event: 'workflow_dispatch' })], { now }).length, 0);
  assert.equal(selectRerunTargets([run({ createdAt: '2026-10-07T09:00:00Z' })], { now }).length, 0);
  assert.equal(selectRerunTargets([run({}), run({ databaseId: 3, conclusion: 'success', createdAt: '2026-10-09T11:00:00Z', jobCount: null })], { now }).length, 0);
  assert.equal(selectRerunTargets([run({}), run({ databaseId: 3, conclusion: null, status: 'in_progress', createdAt: '2026-10-09T11:00:00Z', jobCount: null })], { now }).length, 0);
});
