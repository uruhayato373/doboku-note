import test from 'node:test';
import assert from 'node:assert/strict';
import { auditTopicWiring } from '../scripts/check-topic-wiring.mjs';

test('topics・全国11機関（地方 10＋本省）・公開実務ガイドの回遊配線が完全である', () => {
  const result = auditTopicWiring();
  assert.deepEqual(result.issues, []);
  assert.equal(result.summary.agencies, 11);
  assert.equal(result.summary.publishedGuides, result.summary.guidesWithTopic);
});
