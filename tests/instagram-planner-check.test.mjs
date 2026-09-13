import test from 'node:test';
import assert from 'node:assert/strict';
import { assessInstagramPlanner } from '../scripts/lib/instagram-planner-check.mjs';

const days = Array.from({ length: 35 }, (_, i) => ({ day: `${new Date(Date.UTC(2026, 7, 30 + i)).getUTCDate()}日`, x: 100 + i % 7 * 150, y: 200 + Math.floor(i / 7) * 280 }));
const chipAt = (index, time) => ({ x: days[index].x, y: days[index].y + 50, time });
test('loading calendar is incomplete even when no expected time was supplied', () => {
  assert.equal(assessInstagramPlanner({ body: '9月 2026年', days: [], chips: [] }).pass, false);
});
test('same time on the wrong month or missing expected title cannot pass', () => {
  const input = { body: '9月 2026年\n工事概要', days, chips: [chipAt(19, '12:30')], expected: '2026-09-18T12:30', expectedText: '工事概要' };
  assert.equal(assessInstagramPlanner(input).pass, true);
  assert.equal(assessInstagramPlanner({ ...input, expected: '2026-10-18T12:30' }).pass, false);
  assert.equal(assessInstagramPlanner({ ...input, expectedText: '別の投稿' }).pass, false);
});
test('August 30 shown in the September grid cannot certify September 30', () => {
  const input = { body: '9月 2026年', days, chips: [chipAt(0, '19:00')], expected: '2026-09-30T19:00' };
  assert.equal(assessInstagramPlanner(input).pass, false);
  const result = assessInstagramPlanner({ ...input, chips: [...input.chips, chipAt(31, '19:00')] });
  assert.equal(result.pass, true);
  assert.deepEqual(result.dateSlots['2026-08-30'], ['19:00']);
  assert.deepEqual(result.dateSlots['2026-09-30'], ['19:00']);
});
