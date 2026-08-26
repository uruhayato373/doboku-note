import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateDispatchLog } from '../scripts/check-dispatch-log.mjs';

const ok = (entries) => ({ _schema: {}, entries });

test('id付き新規エントリはPASS', () => {
  const r = validateDispatchLog(ok([{ id: 'DN-0093', at: '2026-08-26', task: 't', outcome: 'done' }]));
  assert.equal(r.violations.length, 0); assert.equal(r.checked, 1);
});
test('新規エントリのid欠落はFAIL', () => {
  const r = validateDispatchLog(ok([{ at: '2026-08-26', task: 't', outcome: 'done' }]));
  assert.equal(r.violations.length, 1); assert.match(r.violations[0], /id/);
});
test('legacy(2026-08-18以前)のid無しは許容しlegacyに数える', () => {
  const r = validateDispatchLog(ok([{ at: '2026-08-18', task: 't', outcome: 'done' }]));
  assert.equal(r.violations.length, 0); assert.equal(r.legacy, 1);
});
test('dateキー混入はFAIL', () => {
  const r = validateDispatchLog(ok([{ id: 'DN-0001', at: '2026-08-26', date: '2026-08-26', task: 't', outcome: 'done' }]));
  assert.ok(r.violations.some((v) => v.includes('date キーは禁止')));
});
test('outcome語彙外はFAIL', () => {
  const r = validateDispatchLog(ok([{ id: 'DN-0001', at: '2026-08-26', task: 't', outcome: 'shipped' }]));
  assert.ok(r.violations.some((v) => v.includes('語彙外')));
});
test('outcome=failは4語彙目としてPASS（backlog-sweep手順6の既存記録慣行を壊さない）', () => {
  const r = validateDispatchLog(ok([{ id: 'DN-0001', at: '2026-08-26', task: 't', outcome: 'fail' }]));
  assert.equal(r.violations.length, 0);
});
test('entries配列が無ければnull(検査不成立)', () => {
  assert.equal(validateDispatchLog({}), null);
});
