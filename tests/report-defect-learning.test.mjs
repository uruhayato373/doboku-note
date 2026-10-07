import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeDefectLearning } from '../scripts/report-defect-learning.mjs';

test('期間内に起票・完了した不具合と再発防止の内訳を数える', () => {
  const cards = [
    { id: 'DN-0010', title: '新しい不具合', kind: '不具合', filed: '2026-10-06' },
    { id: 'DN-0011', title: '古い不具合', kind: '不具合', filed: '2026-09-01' },
    { id: 'DN-0012', title: '改善', kind: '改善', filed: '2026-10-06' },
  ];
  const entries = [
    { id: 'DN-0001', at: '2026-10-06', task: 'a', outcome: 'done', kind: '不具合', prevention: { type: 'gate', ref: 'check-x' } },
    { id: 'DN-0002', at: '2026-10-06', task: 'b', outcome: 'done', kind: '不具合', prevention: { type: 'none', ref: '一回きり' } },
    { id: 'DN-0003', at: '2026-09-30', task: 'c', outcome: 'done', kind: '不具合', prevention: { type: 'memory', ref: 'm' } },
    { id: 'DN-0004', at: '2026-10-06', task: 'd', outcome: 'done', kind: '改善' },
  ];
  const r = summarizeDefectLearning(cards, entries, '2026-10-05');
  assert.deepEqual(r.filed.map((f) => f.id), ['DN-0010']);
  assert.deepEqual(r.closed.map((c) => c.id), ['DN-0001', 'DN-0002']);
  assert.deepEqual(r.byType, { gate: 1, memory: 0, doc: 0, none: 1 });
  assert.equal(r.openDefects, 2);
});
