import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weightedScore, agreement, familyOf } from '../scripts/gemini-scoring-trial.mjs';
import { interactionText, parseJsonReply } from '../scripts/lib/gemini-api.mjs';

test('weightedScore: 重みで合計し、0 点の軸があれば 1.0 にクランプする', () => {
  const w = { a: 0.5, b: 0.5 };
  assert.equal(weightedScore({ a: 3, b: 2 }, w), 2.5);
  assert.equal(weightedScore({ a: 3, b: 0 }, w), 1.0);
});

test('agreement: 軸ごとの完全一致・±1・平均の差・Claude が 3 未満の軸の検出率', () => {
  const pairs = [
    { family: 'guide-qa', claude: { scores: { intro: 3, readability: 2, volume: 3, funnel: 2, mobile: 3 } }, gemini: { scores: { intro: 3, readability: 3, volume: 1, funnel: 2, mobile: 3 } } },
    { family: 'guide-qa', claude: { scores: { intro: 2, readability: 2, volume: 3, funnel: 2, mobile: 3 } }, gemini: { scores: { intro: 3, readability: 2, volume: 3, funnel: 2, mobile: 3 } } },
  ];
  const a = agreement(pairs)['guide-qa'];
  assert.deepEqual(a.intro, { n: 2, exact: 0.5, within1: 1, meanDiff: 0.5, flagged: 1, detect: 0 });
  assert.deepEqual(a.volume, { n: 2, exact: 0.5, within1: 0.5, meanDiff: -1, flagged: 0, detect: null });
  assert.deepEqual(a.readability, { n: 2, exact: 0.5, within1: 1, meanDiff: 0.5, flagged: 2, detect: 0.5 });
  assert.equal(a.funnel.exact, 1);
});

test('familyOf: 比較に入れる種類だけに評価役を返す', () => {
  assert.equal(familyOf({ category: 'pe-comprehensive-management', group: 'keyword' }), 'cem-qa');
  assert.equal(familyOf({ category: 'pe-construction', group: 'keyword' }), 'guide-qa');
  assert.equal(familyOf({ category: 'civil-construction-2', group: 'guide' }), 'guide-qa');
  assert.equal(familyOf({ category: 'civil-practice', group: 'guide' }), null);
  assert.equal(familyOf({ category: 'concrete-engineer', group: 'textbook' }), 'civil-construction-qa');
  assert.equal(familyOf({ category: 'civil-construction-1', group: 'primary' }), null);
});

test('interactionText と parseJsonReply: 思考の段を捨て、囲みつきの JSON を読む', () => {
  const json = { steps: [{ type: 'thought', signature: 'x' }, { type: 'model_output', content: [{ type: 'text', text: '```json\n{"scores":{"a":1}}\n```' }] }] };
  assert.deepEqual(parseJsonReply(interactionText(json)), { scores: { a: 1 } });
  assert.equal(parseJsonReply('読めない'), null);
});
