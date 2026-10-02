import { test } from 'node:test';
import assert from 'node:assert/strict';
import { completedWeekRanges } from '../.claude/scripts/lib/metrics-reader.mjs';
import { reviewPeriod, weekPeriod } from '../scripts/lib/business-direction.mjs';

/**
 * 週次スナップショット（data/business/weekly）の窓は、事業レビュー（KPI 台帳）・成長パックと同じ「確定した月〜日」で、
 * week_id はその窓の ISO 週。以前は実行日の前日までの 7 日を実行日の ISO 週で呼んでいて、同じ W37 でも自然検索人数が
 * 2,307 と 2,158 になった。
 */
test('金曜の定期実行は、前の月〜日（確定済み）を今週、その前の週を前週にする。GA4 と GSC は同じ窓', () => {
  const r = completedWeekRanges('2026-10-02'); // 金
  assert.equal(r.weekId, '2026-W39');
  assert.equal(r.year, 2026);
  assert.equal(r.week, 39);
  assert.deepEqual(r.ranges.ga4, { this: { start: '2026-09-21', end: '2026-09-27' }, prev: { start: '2026-09-14', end: '2026-09-20' } });
  assert.deepEqual(r.ranges.gsc, r.ranges.ga4);
});

test('窓は事業レビューの週（reviewPeriod）・週キーの月〜日（weekPeriod）と一致する', () => {
  for (const today of ['2026-09-18', '2026-09-25', '2026-10-02', '2026-10-09']) {
    const r = completedWeekRanges(today);
    const review = reviewPeriod('weekly', today);
    assert.deepEqual({ startDate: r.ranges.ga4.this.start, endDate: r.ranges.ga4.this.end }, review, today);
    assert.deepEqual(weekPeriod(r.weekId), review, `${today}: week_id の月〜日が窓と同じ`);
  }
});

test('GSC が確定する前（週の終了日から 4 日未満）は 1 週前の週にさかのぼる。ちょうど 4 日後（木）は今週', () => {
  assert.equal(completedWeekRanges('2026-09-28').weekId, '2026-W38'); // 月: 日曜が昨日
  assert.equal(completedWeekRanges('2026-09-30').weekId, '2026-W38'); // 水: 3 日後
  assert.equal(completedWeekRanges('2026-10-01').weekId, '2026-W39'); // 木: 4 日後
  assert.equal(completedWeekRanges('2026-10-04').weekId, '2026-W39'); // 日
});

test('年をまたぐ週は ISO 週の年・週番号になる', () => {
  const r = completedWeekRanges('2027-01-08'); // 金。窓は 2026-12-28〜2027-01-03
  assert.equal(r.ranges.ga4.this.start, '2026-12-28');
  assert.equal(r.ranges.ga4.this.end, '2027-01-03');
  assert.equal(r.weekId, '2026-W53');
  assert.equal(r.year, 2026);
  assert.equal(r.week, 53);
});
