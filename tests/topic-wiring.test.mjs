import test from 'node:test';
import assert from 'node:assert/strict';
import { auditTopicWiring } from '../scripts/check-topic-wiring.mjs';

test('topics・全国10機関・公開実務ガイドの回遊配線が完全である', () => {
  const result = auditTopicWiring();
  assert.deepEqual(result.issues, []);
  assert.equal(result.summary.agencies, 10);
  assert.equal(result.summary.publishedGuides, result.summary.guidesWithTopic);
});
