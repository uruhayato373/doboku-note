import { test } from 'node:test';
import assert from 'node:assert/strict';

import { assessCloudflareFreshness } from '../scripts/check-cloudflare-metrics-freshness.mjs';

const NOW = Date.parse('2026-09-21T00:00:00Z');

function zone({ ageDays = 1, daysReturned = 1 } = {}) {
  return { fetchedAt: new Date(NOW - ageDays * 86_400_000).toISOString(), counts: { daysReturned } };
}
function config({ ageDays = 1 } = {}) {
  return { fetchedAt: new Date(NOW - ageDays * 86_400_000).toISOString() };
}

test('zone snapshot が 4 日前なら FAIL（上限3日）', () => {
  const r = assessCloudflareFreshness({ zoneSnapshot: zone({ ageDays: 4 }), configLatest: config() }, NOW);
  assert.equal(r.status, 'FAIL');
  assert.ok(r.reasons.some((m) => m.includes('4 日前')));
});

test('zone snapshot の daysReturned が 0 なら FAIL', () => {
  const r = assessCloudflareFreshness({ zoneSnapshot: zone({ daysReturned: 0 }), configLatest: config() }, NOW);
  assert.equal(r.status, 'FAIL');
  assert.ok(r.reasons.some((m) => m.includes('daysReturned')));
});

test('config latest が 11 日前なら FAIL（上限10日）', () => {
  const r = assessCloudflareFreshness({ zoneSnapshot: zone(), configLatest: config({ ageDays: 11 }) }, NOW);
  assert.equal(r.status, 'FAIL');
  assert.ok(r.reasons.some((m) => m.includes('config latest が 11 日前')));
});

test('両方新しければ OK', () => {
  const r = assessCloudflareFreshness({ zoneSnapshot: zone(), configLatest: config() }, NOW);
  assert.equal(r.status, 'OK');
  assert.deepEqual(r.reasons, []);
});

test('両方なしなら FAIL（未取得）', () => {
  const r = assessCloudflareFreshness({ zoneSnapshot: null, configLatest: null }, NOW);
  assert.equal(r.status, 'FAIL');
  assert.ok(r.reasons.some((m) => m.includes('未取得')));
});
