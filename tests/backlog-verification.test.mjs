import test from 'node:test';
import assert from 'node:assert/strict';
import { selectBacklogVerification } from '../scripts/lib/backlog-verification.mjs';

const card = (id, props = {}) => ({ id, title: id, verify: 'test', when: null, due: null, ...props });

test('future start months are not-due; a later deadline alone does not postpone active work', () => {
  const result = selectBacklogVerification([
    card('current', { when: '2026-10' }), card('range', { when: '2026-09..2026-12' }),
    card('windows', { when: '2026-12' }), card('future', { due: '2026-10-18' }),
    card('overdue', { when: '2026-12', due: '2026-10-16' }), card('undated'),
  ], '2026-10-17');
  assert.deepEqual(result.targets.map((c) => c.id), ['current', 'range', 'future', 'overdue', 'undated']);
  assert.deepEqual(result.notDue.map((c) => c.id), ['windows']);
  assert.ok(result.notDue.every((c) => c.reason));
});

test('scheduled start becomes due and old unfinished work stays visible', () => {
  const cards = [card('december', { when: '2026-12' }), card('old', { when: '2026-09' })];
  assert.deepEqual(selectBacklogVerification(cards, '2026-11-30').targets.map((c) => c.id), ['old']);
  assert.deepEqual(selectBacklogVerification(cards, '2026-12-01').targets.map((c) => c.id), ['december', 'old']);
});
