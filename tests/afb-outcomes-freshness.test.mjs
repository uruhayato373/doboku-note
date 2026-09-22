import { test } from 'node:test';
import assert from 'node:assert/strict';

import { assessAfbOutcomesFreshness } from '../scripts/check-afb-outcomes-freshness.mjs';

const NOW = Date.parse('2026-09-22T00:00:00Z');

function latest({ ageDays = 1, occRows = 3, recRows = 2 } = {}) {
  return {
    siteId: '984453',
    observedAt: new Date(NOW - ageDays * 86_400_000).toISOString(),
    basis: { occurrence: { rows: occRows, totals: {} }, recognition: { rows: recRows, totals: {} } },
  };
}

test('observedAt が 1 日前なら OK', () => {
  const r = assessAfbOutcomesFreshness({ latest: latest({ ageDays: 1 }) }, NOW);
  assert.equal(r.status, 'OK');
  assert.deepEqual(r.reasons, []);
  assert.equal(r.inspected.siteId, '984453');
  assert.equal(r.inspected.rowsExamined, 5);
});

test('observedAt が 11 日前なら FAIL（上限10日）', () => {
  const r = assessAfbOutcomesFreshness({ latest: latest({ ageDays: 11 }) }, NOW);
  assert.equal(r.status, 'FAIL');
  assert.ok(r.reasons.some((m) => m.includes('11 日前')));
});

test('afb-outcomes-latest.json が無ければ FAIL（未取得）', () => {
  const r = assessAfbOutcomesFreshness({ latest: null }, NOW);
  assert.equal(r.status, 'FAIL');
  assert.ok(r.reasons.some((m) => m.includes('無い')));
});

test('observedAt が読めなければ FAIL', () => {
  const r = assessAfbOutcomesFreshness({ latest: { siteId: '984453', observedAt: 'not-a-date' } }, NOW);
  assert.equal(r.status, 'FAIL');
  assert.ok(r.reasons.some((m) => m.includes('読めない')));
});

test('0 件成果（rows 0）でも observedAt が新しければ OK（0 件を未取得と混同しない）', () => {
  const r = assessAfbOutcomesFreshness({ latest: latest({ ageDays: 0, occRows: 0, recRows: 0 }) }, NOW);
  assert.equal(r.status, 'OK');
  assert.equal(r.inspected.rowsExamined, 0);
});
