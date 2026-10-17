import test from 'node:test';
import assert from 'node:assert/strict';
import { plannerSlots } from '../scripts/lib/ig-reconcile-core.mjs';

const days = Array.from({ length: 31 }, (_, n) => ({ d: `${n + 1}日`, x: (n % 7) * 200, y: Math.floor(n / 7) * 300 }));

test('予約0件は月カレンダー全体が読めた場合だけ確定する', () => {
  assert.deepEqual(plannerSlots(days, []), {});
  assert.throws(() => plannerSlots([], []), /PLANNER_INCOMPLETE/);
  assert.throws(() => plannerSlots(days.slice(0, 27), []), /PLANNER_INCOMPLETE/);
});

test('時刻を日セルへ対応し、対応不能なチップを消さずに失敗する', () => {
  assert.deepEqual(plannerSlots(days, [{ t: '19:00', x: 205, y: 30 }]), { '2日': ['19:00'] });
  assert.throws(() => plannerSlots(days, [{ t: '19:00', x: 9999, y: 30 }]), /時刻 19:00/);
});
