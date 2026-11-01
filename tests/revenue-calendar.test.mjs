import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, phasesFor, mapRevenueCalendar } from '../scripts/lib/revenue-calendar.mjs';
import { ConfigRevenueCalendar } from '../scripts/lib/dataset-schemas.mjs';
import config from '../config/revenue-calendar.json' with { type: 'json' };
import exam from '../config/exam-calendar.json' with { type: 'json' };

const target = { qualification: 'q', examEvent: 'written', productionStartWeeks: 16, ctaSwitchWeeks: 8, peakFromWeeks: 8, peakToWeeks: 1, judgmentDaysAfter: 30, note: 'x' };

test('addDays: 月またぎ・うるう年', () => {
  assert.equal(addDays('2028-03-01', -1), '2028-02-29');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('phasesFor: 試験日から週数・日数で逆算する', () => {
  const p = Object.fromEntries(phasesFor(target, '2027-07-18').map((x) => [x.phase, x.date]));
  assert.equal(p['production-start'], '2027-03-28');
  assert.equal(p['cta-switch'], '2027-05-23');
  assert.equal(p['peak-start'], '2027-05-23');
  assert.equal(p['peak-end'], '2027-07-11');
  assert.equal(p.judgment, '2027-08-17');
});

const cal = (date) => ({ exams: { q: { events: { written: { date } } } } });

test('mapRevenueCalendar: 将来の試験日は 5 件の予定、過去は pending（推測しない）', () => {
  const future = mapRevenueCalendar({ targets: [target] }, cal('2027-07-18'), 'c.json', '2026-11-01');
  assert.equal(future.events.length, 5);
  assert.equal(future.pending.length, 0);
  assert.ok(future.events.every((e) => e.channel === 'revenue' && e.sourceId === 'revenue-calendar'));
  const past = mapRevenueCalendar({ targets: [target] }, cal('2026-07-19'), 'c.json', '2026-11-01');
  assert.equal(past.events.length, 0);
  assert.equal(past.pending.length, 1);
});

test('mapRevenueCalendar: 起点の試験日が無い設定は errors（黙って捨てない）', () => {
  const r = mapRevenueCalendar({ targets: [target] }, { exams: {} }, 'c.json', '2026-11-01');
  assert.equal(r.errors.length, 1);
});

test('config/revenue-calendar.json: 型に通り、起点が exam-calendar に実在する', () => {
  assert.equal(ConfigRevenueCalendar.safeParse(config).success, true);
  for (const t of config.targets) assert.match(exam.exams[t.qualification]?.events?.[t.examEvent]?.date ?? '', /^\d{4}-\d{2}-\d{2}$/, `${t.qualification}/${t.examEvent}`);
});

test('ConfigRevenueCalendar: 週数の前後関係が逆なら落ちる', () => {
  const bad = { ...config, targets: [{ ...config.targets[0], ctaSwitchWeeks: 20 }] };
  assert.equal(ConfigRevenueCalendar.safeParse(bad).success, false);
});
