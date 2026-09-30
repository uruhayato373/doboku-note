import test from 'node:test';
import assert from 'node:assert/strict';
import { monthsOf, validateRoadmap, examTimeline, lastYearSalesByMonth } from '../scripts/lib/annual-roadmap.mjs';

const period = { start: '2026-10', end: '2027-09' };

test('monthsOf: 年をまたいで12か月', () => {
  const m = monthsOf(period);
  assert.equal(m.length, 12);
  assert.equal(m[0], '2026-10');
  assert.equal(m[11], '2027-09');
});

test('validateRoadmap: 期間と買い場の週数だけ。重点の items を置いたら違反', () => {
  assert.deepEqual(validateRoadmap({ period, buyWindowWeeks: 8 }), []);
  assert.ok(validateRoadmap({ period, buyWindowWeeks: 8, items: [] }).some((e) => e.includes('items')));
  assert.ok(validateRoadmap({ period: { start: '2027-09', end: '2026-10' }, buyWindowWeeks: 0 }).length === 2);
});

test('examTimeline: 公表済みは実日付、翌年は昨年度を1年ずらした推定、試験前を買い場に', () => {
  const cal = { exams: { a: { label: 'A', events: {
    x: { label: '二次', date: '2026-10-04', kind: 'exam' },
    y: { label: '一次', date: '2026-07-05', kind: 'exam' },
    z: { label: '発表', date: '2027-01-08', kind: 'result' },
  } } } };
  const [row] = examTimeline(cal, ['a', 'missing'], period, 8);
  const byDate = Object.fromEntries(row.marks.map((m) => [m.date, m]));
  assert.equal(byDate['2026-10-04'].estimated, false);
  assert.equal(byDate['2027-07-05'].estimated, true); // 一次は昨年度から推定
  assert.equal(byDate['2027-01-08'].estimated, false);
  assert.equal(row.buys.length, 2);
  assert.equal(row.buys[0].from, 0); // 10/4 の8週前は期間の前 → 期間の頭で切る
});

test('lastYearSalesByMonth: 前年同月の資格別売上を降順で返し、0 円は出さない', () => {
  const sales = {
    'pe-comprehensive': { byMonth: { '2025-10': 3000, '2025-11': 0 } },
    'civil-1': { byMonth: { '2025-10': 5000 } },
    'civil-2': { byMonth: { '2026-10': 9999 } },
  };
  const r = lastYearSalesByMonth(sales, ['2026-10', '2026-11']);
  assert.equal(r['2026-10'].month, '2025-10');
  assert.deepEqual(r['2026-10'].items, [{ id: 'civil-1', yen: 5000 }, { id: 'pe-comprehensive', yen: 3000 }]);
  assert.equal(r['2026-10'].total, 8000);
  assert.deepEqual(r['2026-11'].items, []);
  assert.equal(r['2026-11'].total, 0);
});
