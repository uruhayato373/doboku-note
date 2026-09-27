/**
 * review-wiring.test.mjs — レビューの配線（スキルのコマンドと正本の一致・レビュー由来カードの数え方）を固定する
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractCommands, diffWiring, validateWiring, cardsFromReview } from '../scripts/lib/review-wiring.mjs';

test('スキル本文から npm run と node scripts のコマンドを重複なく拾う', () => {
  const text = '`npm run business-review -- report` と `node scripts/check-backlog-health.mjs` と `npm run business-review`';
  assert.deepEqual(extractCommands(text), ['business-review', 'node:check-backlog-health']);
});

test('正本に無いコマンドと、スキルが実行しない正本のコマンドを両方挙げる', () => {
  const d = diffWiring([{ command: 'a' }, { command: 'b' }], 'npm run a と npm run c');
  assert.deepEqual(d, { missing: ['c'], extra: ['b'] });
});

test('stage と role の語彙外・重複を止める', () => {
  const errs = validateWiring({ stages: ['検索'], cadences: { weekly: { inputs: [{ command: 'x', stage: '検索', role: '判断' }, { command: 'x', stage: '別', role: '見る' }] } } });
  assert.equal(errs.length, 3);
});

test('起点にそのレビューの期間を書いたカードだけを数える', () => {
  const text = '### [DN-0001] A\n**起点**: 週次レビュー（2026-09-21〜2026-09-27）で見つけた\n### [DN-0002] B\n**起点**: 週次レビュー（2026-09-14〜2026-09-20）\n### [DN-0003] C\n別件';
  assert.deepEqual(cardsFromReview(text, '週次', { startDate: '2026-09-21', endDate: '2026-09-27' }).map((c) => c.id), ['DN-0001']);
});
