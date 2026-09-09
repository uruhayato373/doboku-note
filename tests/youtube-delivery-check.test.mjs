import test from 'node:test';
import assert from 'node:assert/strict';
import { assessDelivery } from '../scripts/lib/youtube-delivery-check.mjs';
const time = Date.parse('2026-09-10T11:20:00Z');
const options = { planSha256: 'plan', total: 344, now: time, requireDeleted: true };
const state = { planSha256: 'plan', lastRun: { checkedAt: new Date(time).toISOString(), summary: { total: 344, deleted: 0, dryRun: false, waiting: { 'pending-upload': 258, 'pending-thumbnail': 86 } } } };
test('remaining old versions cannot pass the backlog completion check', () => {
  assert.equal(assessDelivery(state, options).code, 1);
  assert.equal(assessDelivery(state, { ...options, requireDeleted: false }).code, 0);
  const done = structuredClone(state); done.lastRun.summary.deleted = 344;
  assert.equal(assessDelivery(done, options).code, 0);
});
test('zero targets, dry runs, old plans, missing counts and stale observations are not completion', () => {
  for (const mutate of [s => { s.planSha256 = 'old-plan'; }, s => { s.lastRun.summary.total = 0; }, s => { s.lastRun.summary.dryRun = true; }, s => { delete s.lastRun.summary.deleted; }, s => { s.lastRun.checkedAt = new Date(time - 37 * 3600e3).toISOString(); }]) {
    const changed = structuredClone(state); mutate(changed); assert.equal(assessDelivery(changed, options).code, 2);
  }
});
