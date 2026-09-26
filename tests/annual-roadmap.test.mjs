import test from 'node:test';
import assert from 'node:assert/strict';
import { monthsOf, validateRoadmap, examTimeline } from '../scripts/lib/annual-roadmap.mjs';

const period = { start: '2026-10', end: '2027-09' };

test('monthsOf: 年をまたいで12か月', () => {
  const m = monthsOf(period);
  assert.equal(m.length, 12);
  assert.equal(m[0], '2026-10');
  assert.equal(m[11], '2027-09');
});

test('validateRoadmap: 領域・期間・バックログ ID を検査し、done は ID 欠落を許す', () => {
  const cfg = { period, buyWindowWeeks: 8, items: [
    { id: 'r1', domain: 'product', start: '2026-10', end: '2026-12', label: 'a', backlogIds: ['DN-0001'] },
    { id: 'r2', domain: 'nope', start: '2027-10', end: '2027-11', label: 'b' },
    { id: 'r3', domain: 'site', start: '2026-10', end: '2026-10', label: 'c', backlogIds: ['DN-9999'], done: true },
  ] };
  const e = validateRoadmap(cfg, { domainIds: new Set(['product', 'site']), backlogIds: new Set() });
  assert.ok(e.some((x) => x.includes('DN-0001')));
  assert.ok(e.some((x) => x.includes('nope')));
  assert.ok(e.some((x) => x.includes('期間')));
  assert.ok(!e.some((x) => x.includes('DN-9999')));
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
