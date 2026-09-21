import { test } from 'node:test';
import assert from 'node:assert/strict';

import { assessIgInsights } from '../scripts/check-ig-insights-freshness.mjs';

const NOW = Date.parse('2026-09-21T00:00:00Z');
const nowSec = Math.floor(NOW / 1000);

function snap({ ageDays = 1, mediaListed = 10, expiresAt = 0, dataAccessExpiresAt = 0 } = {}) {
  const fetchedMs = NOW - ageDays * 86_400_000;
  return {
    fetchedAt: new Date(fetchedMs).toISOString(),
    counts: { mediaListed },
    token: { type: 'long_lived', expiresAt, dataAccessExpiresAt },
  };
}

test('snapshot が null なら FAIL', () => {
  const r = assessIgInsights(null, NOW);
  assert.equal(r.status, 'FAIL');
  assert.ok(r.reasons.some((m) => m.includes('snapshot が無い')));
});

test('fetchedAt が 11 日前なら FAIL（上限10日）', () => {
  const r = assessIgInsights(snap({ ageDays: 11 }), NOW);
  assert.equal(r.status, 'FAIL');
  assert.ok(r.reasons.some((m) => m.includes('11 日前')));
});

test('トークン失効まで 6 日なら FAIL（下限7日）', () => {
  const expiresAt = nowSec + 6 * 86_400;
  const r = assessIgInsights(snap({ expiresAt }), NOW);
  assert.equal(r.status, 'FAIL');
  assert.ok(r.reasons.some((m) => m.includes('失効まで 6 日')));
});

test('トークン失効まで 13 日なら WARN（警告14日）', () => {
  const expiresAt = nowSec + 13 * 86_400;
  const r = assessIgInsights(snap({ expiresAt }), NOW);
  assert.equal(r.status, 'WARN');
  assert.equal(r.expiresInDays, 13);
});

test('expiresAt/dataAccessExpiresAt が両方 0 なら無期限扱い（OK）', () => {
  const r = assessIgInsights(snap({}), NOW);
  assert.equal(r.status, 'OK');
  assert.equal(r.expiresInDays, null);
});

test('dataAccessExpiresAt がより小さければそちらが支配する', () => {
  const expiresAt = nowSec + 30 * 86_400;
  const dataAccessExpiresAt = nowSec + 6 * 86_400;
  const r = assessIgInsights(snap({ expiresAt, dataAccessExpiresAt }), NOW);
  assert.equal(r.status, 'FAIL');
  assert.equal(r.expiresInDays, 6);
});

test('mediaListed が 0 なら FAIL', () => {
  const r = assessIgInsights(snap({ mediaListed: 0 }), NOW);
  assert.equal(r.status, 'FAIL');
  assert.ok(r.reasons.some((m) => m.includes('mediaListed')));
});
