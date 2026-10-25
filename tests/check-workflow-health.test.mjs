import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditRuns, healthTargets, latestRun, runListArgs } from '../scripts/check-workflow-health.mjs';

const NOW = Date.parse('2026-10-01T00:00:00Z');

const run = (over = {}) => ({
  status: 'completed', conclusion: 'success', event: 'schedule',
  createdAt: new Date(NOW).toISOString(), databaseId: 1, ...over,
});

test('auditRuns: 直近が success なら健全（event は区別しない）', () => {
  const runs = [run({ event: 'workflow_dispatch', createdAt: new Date(NOW).toISOString() })];
  const r = auditRuns('ci.yml', runs, { maxAgeDays: 7, maxConsecutiveFailures: 3 }, NOW);
  assert.equal(r.ok, true);
});

test('auditRuns: 完了した run が 0 件なら no-runs', () => {
  const r = auditRuns('x.yml', [], { maxAgeDays: 9, maxConsecutiveFailures: 2 }, NOW);
  assert.equal(r.ok, false);
  assert.equal(r.kind, 'no-runs');
});

// 管理画面 /ops/ci が同じ関数で直近の実行と監視の判定を出す（判定を写さない）
test('latestRun は status を問わず一番新しい run・無ければ null', () => {
  const runs = [
    { status: 'completed', conclusion: 'success', createdAt: '2026-10-24T10:00:00Z' },
    { status: 'in_progress', conclusion: null, createdAt: '2026-10-25T00:30:00Z' },
    { status: 'completed', conclusion: 'failure', createdAt: '2026-10-24T23:00:00Z' },
  ];
  assert.equal(latestRun(runs).status, 'in_progress');
  assert.equal(latestRun([]), null);
  assert.equal(latestRun(undefined), null);
});

test('healthTargets は defaults に各行を重ね、監視の設定に無い workflow は引けない', () => {
  const t = healthTargets({ defaults: { maxAgeDays: 10, maxConsecutiveFailures: 3 }, workflows: [{ workflow: 'ci.yml', branch: 'develop', maxAgeDays: 7 }, { workflow: 'ops-audit.yml' }] });
  assert.deepEqual(t.get('ci.yml'), { maxAgeDays: 7, maxConsecutiveFailures: 3, workflow: 'ci.yml', branch: 'develop' });
  assert.equal(t.get('ops-audit.yml').maxAgeDays, 10);
  assert.equal(t.has('competitor-scan.yml'), false);
  assert.equal(healthTargets(null).size, 0);
});

test('runListArgs は branch があるときだけ --branch を付ける', () => {
  assert.deepEqual(runListArgs('ci.yml', 'develop', 10).slice(-2), ['--branch', 'develop']);
  assert.equal(runListArgs('ops-audit.yml', undefined, 10).includes('--branch'), false);
});
