import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditRuns, auditSchedule, healthTargets, latestRun, runListArgs } from '../scripts/check-workflow-health.mjs';

// 2026-09-22 追加。契約「event=schedule と手動成功を区別する／未発火・古い schedule も検知」の回帰。
// canary を全部 workflow_dispatch で緑にした workflow（旧 login-collectors）では、cron が死んでも
// 手動成功が maxAgeDays を永久にマスクした。schedule 次元がそれを独立に赤にすることを固定する。

const DAY = 86_400_000;
const NOW = Date.parse('2026-10-01T00:00:00Z');
const SCHED = { activeSince: '2026-09-21T21:20:00Z', maxAgeDays: 8, graceHours: 12 };

const run = (over = {}) => ({
  status: 'completed', conclusion: 'success', event: 'schedule',
  createdAt: new Date(NOW).toISOString(), databaseId: 1, ...over,
});

test('auditSchedule: cfg 不在なら null（schedule 次元を評価しない）', () => {
  assert.equal(auditSchedule('w', [run()], null, NOW), null);
  assert.equal(auditSchedule('w', [run()], { activeSince: 'x', maxAgeDays: 8 }, NOW), null);
});

test('auditSchedule: 猶予前は pending（発火をまだ期待しない・異常でない）', () => {
  const now = Date.parse('2026-09-22T00:00:00Z'); // active(21:20Z)+猶予12h = 09-22 09:20Z より前
  const r = auditSchedule('w', [], SCHED, now);
  assert.equal(r.ok, true);
  assert.equal(r.kind, 'schedule-pending');
});

test('auditSchedule: 猶予後に schedule 発火 0 件 → never-fired（手動 run では判定しない）', () => {
  const dispatches = [
    run({ event: 'workflow_dispatch', createdAt: new Date(NOW - DAY).toISOString() }),
    run({ event: 'workflow_dispatch', createdAt: new Date(NOW - 2 * DAY).toISOString() }),
  ];
  const r = auditSchedule('w', dispatches, SCHED, NOW);
  assert.equal(r.ok, false);
  assert.equal(r.kind, 'schedule-never-fired');
  assert.equal(r.lastScheduleAt, null);
});

test('auditSchedule: 最後の schedule 発火が maxAgeDays 超 → stale', () => {
  const old = run({ createdAt: new Date(NOW - 9 * DAY).toISOString() });
  const r = auditSchedule('w', [old], SCHED, NOW);
  assert.equal(r.ok, false);
  assert.equal(r.kind, 'schedule-stale');
  assert.equal(r.scheduleAgeDays, 9);
});

test('auditSchedule: 直近に schedule 発火あり → ok（conclusion は問わない＝発火の有無だけ）', () => {
  const failed = run({ conclusion: 'failure', createdAt: new Date(NOW - DAY).toISOString() });
  const r = auditSchedule('w', [failed], SCHED, NOW);
  assert.equal(r.ok, true);
  assert.equal(r.kind, 'schedule-ok');
});

test('境界: 日数は floor。8日ちょうど・8日+数時間は ok、丸一日超えて 9日で stale', () => {
  const eight = run({ createdAt: new Date(NOW - 8 * DAY).toISOString() });
  assert.equal(auditSchedule('w', [eight], SCHED, NOW).kind, 'schedule-ok');
  const eightPlus = run({ createdAt: new Date(NOW - 8 * DAY - 5 * 3_600_000).toISOString() });
  assert.equal(auditSchedule('w', [eightPlus], SCHED, NOW).kind, 'schedule-ok'); // floor→8
  const nine = run({ createdAt: new Date(NOW - 9 * DAY).toISOString() });
  assert.equal(auditSchedule('w', [nine], SCHED, NOW).kind, 'schedule-stale');
});

// --- 統合: 手動成功による異常隠蔽 ---
test('auditRuns: 手動成功が新しくても cron 未発火なら unhealthy（マスクさせない）', () => {
  const runs = [
    run({ event: 'workflow_dispatch', conclusion: 'success', createdAt: new Date(NOW).toISOString() }),
    run({ event: 'workflow_dispatch', conclusion: 'success', createdAt: new Date(NOW - DAY).toISOString() }),
  ];
  const r = auditRuns('weekly-review-draft.yml', runs, { maxAgeDays: 10, maxConsecutiveFailures: 6, schedule: SCHED }, NOW);
  assert.equal(r.ok, false, '手動成功が続いても cron 未発火なら赤');
  assert.equal(r.schedule.kind, 'schedule-never-fired');
  assert.match(r.detail, /一度も発火/);
});

test('auditRuns: schedule 発火あり＋手動成功 → healthy', () => {
  const runs = [
    run({ event: 'schedule', conclusion: 'success', createdAt: new Date(NOW - DAY).toISOString() }),
    run({ event: 'workflow_dispatch', conclusion: 'success', createdAt: new Date(NOW).toISOString() }),
  ];
  const r = auditRuns('weekly-review-draft.yml', runs, { maxAgeDays: 10, maxConsecutiveFailures: 6, schedule: SCHED }, NOW);
  assert.equal(r.ok, true);
  assert.equal(r.schedule.kind, 'schedule-ok');
});

test('auditRuns: schedule cfg 無しの既存 workflow は従来どおり（後方互換）', () => {
  const runs = [run({ event: 'workflow_dispatch', createdAt: new Date(NOW).toISOString() })];
  const r = auditRuns('ci.yml', runs, { maxAgeDays: 7, maxConsecutiveFailures: 3 }, NOW);
  assert.equal(r.ok, true);
  assert.equal(r.schedule, null);
});

// 2026-10-12（DN-0642）: 足したばかりの週次 workflow は、最初の cron 枠まで run が 0 件。それを no-runs で赤にしない。
test('auditRuns: run 0 件でも最初の cron 枠＋猶予の前なら pending-first-run（健全）', () => {
  const sched = { activeSince: '2026-10-16T04:00:00Z', maxAgeDays: 8, graceHours: 12 };
  const r = auditRuns('weekly-review-draft.yml', [], { maxAgeDays: 9, maxConsecutiveFailures: 2, schedule: sched }, Date.parse('2026-10-12T07:00:00Z'));
  assert.equal(r.ok, true);
  assert.equal(r.kind, 'pending-first-run');
});

test('auditRuns: 猶予を過ぎても run 0 件なら no-runs（初回の発火漏れを隠さない）', () => {
  const sched = { activeSince: '2026-10-16T04:00:00Z', maxAgeDays: 8, graceHours: 12 };
  const r = auditRuns('weekly-review-draft.yml', [], { maxAgeDays: 9, maxConsecutiveFailures: 2, schedule: sched }, Date.parse('2026-10-17T00:00:00Z'));
  assert.equal(r.ok, false);
  assert.equal(r.kind, 'no-runs');
});

test('auditRuns: schedule cfg の無い workflow は run 0 件で従来どおり no-runs', () => {
  const r = auditRuns('x.yml', [], { maxAgeDays: 9, maxConsecutiveFailures: 2 }, NOW);
  assert.equal(r.ok, false);
  assert.equal(r.kind, 'no-runs');
});

// 管理画面 /ops/automations が同じ関数で直近の実行と監視の判定を出す（判定を写さない）
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
