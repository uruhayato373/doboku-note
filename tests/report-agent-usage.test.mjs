import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeAgentUsage } from '../scripts/reports/report-agent-usage.mjs';

test('期間で絞り、型なしの割合と model の明示を数える（11-23 より前の記録は不明に数える）', () => {
  const recs = [
    { at: '2026-11-20T00:00:00Z', kind: 'agent', name: 'general-purpose' },
    { at: '2026-11-24T00:00:00Z', kind: 'agent', name: 'general-purpose', typed: false, model: null, effort: null },
    { at: '2026-11-24T01:00:00Z', kind: 'agent', name: 'Explore', typed: true, model: 'sonnet', effort: 'low' },
    { at: '2026-11-24T02:00:00Z', kind: 'skill', name: 'deploy' },
  ];
  const all = summarizeAgentUsage(recs);
  assert.equal(all.total, 3);
  assert.equal(all.untyped, 2);
  assert.deepEqual(Object.fromEntries(all.models), { '不明（11-23 より前）': 1, '明示なし': 1, sonnet: 1 });
  assert.equal(summarizeAgentUsage(recs, { since: '2026-11-23' }).total, 2);
  assert.equal(summarizeAgentUsage(recs, { until: '2026-11-21' }).total, 1);
});
