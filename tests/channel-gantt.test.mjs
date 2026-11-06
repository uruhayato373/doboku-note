import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutLanes, slotSegments } from '../scripts/lib/channel-gantt.mjs';

// 期は 2026-11〜2027-10 で、表は 4 月始まり
const months = ['2027-04', '2027-05', '2027-06', '2027-07', '2027-08', '2027-09', '2027-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03'];
const win = (from, to) => ({ window: { from, to } });

test('年度をまたがない枠は 1 本、またぐ枠は 2 本に分かれる', () => {
  assert.deepEqual(slotSegments(win('2027-04', '2027-06').window, months), [{ start: 0, span: 3 }]);
  assert.deepEqual(slotSegments(win('2026-11', '2027-01').window, months), [{ start: 7, span: 3 }]);
  assert.deepEqual(slotSegments(win('2027-03', '2027-06').window, months), [{ start: 0, span: 3 }, { start: 11, span: 1 }]);
});
test('表に無い月だけの枠は出さない', () => {
  assert.deepEqual(layoutLanes([win('2028-04', '2028-05')], months), []);
});
test('重なる枠は別の段に、重ならない枠は同じ段に置き、分かれた枠は同じ段に残す', () => {
  const a = { id: 'a', ...win('2027-04', '2027-05') };
  const b = { id: 'b', ...win('2027-05', '2027-06') };
  const c = { id: 'c', ...win('2027-07', '2027-08') };
  const wrap = { id: 'w', ...win('2027-03', '2027-04') };
  const lanes = layoutLanes([a, b, c, wrap], months);
  const ids = lanes.map((l) => l.map((x) => x.item.id));
  assert.deepEqual(ids, [['a', 'c'], ['w', 'b', 'w']]);
  for (const lane of lanes) {
    for (let i = 1; i < lane.length; i++) assert.ok(lane[i - 1].start + lane[i - 1].span <= lane[i].start);
  }
});
