import { strict as assert } from 'node:assert';
import test from 'node:test';
import { isoWeekKey, weekPeriod, reviewWindowOfWeek, reviewWeekOfWindow, reviewWeekLabel } from '../scripts/lib/review-week.mjs';
import { lastLaunchdRun } from '../scripts/lib/review-automation.mjs';
import { runKeyOfPeriod } from '../scripts/lib/review-wiring.mjs';
import { reviewPeriod } from '../scripts/lib/business-direction.mjs';

test('回と振り返り期間: W41 は 10/05〜10/11 の週で、09/28〜10/04 を振り返る（往復が一致する）', () => {
  assert.deepEqual(weekPeriod('2026-W41'), { startDate: '2026-10-05', endDate: '2026-10-11' });
  assert.deepEqual(reviewWindowOfWeek('2026-W41'), { startDate: '2026-09-28', endDate: '2026-10-04' });
  assert.equal(reviewWeekOfWindow({ startDate: '2026-09-28', endDate: '2026-10-04' }), '2026-W41');
  assert.equal(runKeyOfPeriod('weekly', { startDate: '2026-09-28', endDate: '2026-10-04' }), '2026-W41');
  assert.deepEqual(reviewWeekLabel('2026-W41'), { week: 'W41（10/05〜10/11）', window: '振り返り 09/28〜10/04' });
});

test('年またぎ: 2026-12-31 は W53、2027-01-04 は 2027-W01。W01 の振り返りは前年の W53', () => {
  assert.equal(isoWeekKey('2026-12-31'), '2026-W53');
  assert.equal(isoWeekKey('2027-01-04'), '2027-W01');
  assert.equal(reviewWeekOfWindow(reviewWindowOfWeek('2027-W01')), '2027-W01');
  assert.equal(isoWeekKey(reviewWindowOfWeek('2027-W01').startDate), '2026-W53');
});

test('reviewPeriod（事業レビューの週次の窓）は、今日を含む回の振り返り期間と同じ', () => {
  for (const day of ['2026-10-10', '2026-10-11', '2026-10-12', '2026-12-31', '2027-01-03']) {
    assert.deepEqual(reviewPeriod('weekly', day), reviewWindowOfWeek(isoWeekKey(day)), day);
  }
});

test('launchd のログ: 最後の start 以降の結果（完了・何もしない・失敗・途中）を拾う', () => {
  const log = [
    '=== 2026-10-03T09:30:00+09:00 [weekly-review] start ===',
    '=== 2026-10-03T10:10:00+09:00 [weekly-review] ok (docs/reviews/weekly/2026-W40-review.md) ===',
    '',
    '=== 2026-10-10T12:44:47+09:00 [weekly-review] start ===',
    '[weekly-review] docs/reviews/weekly/2026-W41-review.md は develop に既にある。何もしない',
  ].join('\n');
  assert.deepEqual({ ...lastLaunchdRun(log), line: undefined }, { at: '2026-10-10T12:44:47+09:00', result: 'skipped', line: undefined });
  assert.equal(lastLaunchdRun(log + '\n=== 2026-10-17T09:30:00+09:00 [weekly-review] start ===\n=== x [weekly-review] FAILED rc=1 ===').result, 'failed');
  assert.equal(lastLaunchdRun('=== 2026-10-17T09:30:00+09:00 [weekly-review] start ===\n...').result, 'running');
  assert.equal(lastLaunchdRun(''), null);
});
