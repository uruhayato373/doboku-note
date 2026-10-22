// S16（2026-10-22）: マージ済み・閉じた PR を「PR #N（未マージ）」と書いたまま、または origin に無いブランチを
// 同じ行にマージ・削除の記述なしで書いたままのカードを拾う
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectMergeRefs, computeStaleMergeNotes } from '../scripts/check-backlog-health.mjs';

const card = (id, body) => ({ id, line: 1, title: `${id} の題名`, body });

test('参照の集め方: 「PR #N（未マージ）」「PR #N・未マージ」とブランチ名', () => {
  const refs = collectMergeRefs([
    card('DN-0001', '**進捗**: PR #1183（未マージ）で実装した'),
    card('DN-0002', '第2波を実装した（PR #1184・未マージ）。ブランチ `prep/after-exam` で準備'),
    card('DN-0003', 'PR #1000 でマージ済み'),
  ]);
  assert.deepEqual([...refs.prs].sort(), [1183, 1184]);
  assert.deepEqual([...refs.branches], ['prep/after-exam']);
});

test('マージ済み・閉じた PR を「未マージ」と書いたカードを拾い、開いている PR は拾わない', () => {
  const cards = [
    card('DN-0001', 'PR #1183（未マージ）で実装した'),
    card('DN-0002', 'PR #1190（未マージ）で実装中'),
    card('DN-0003', 'PR #1170（未マージ）は取り下げ'),
  ];
  const prState = new Map([[1183, 'MERGED'], [1190, 'OPEN'], [1170, 'CLOSED']]);
  const hits = computeStaleMergeNotes(cards, { prState, remoteBranches: new Set() });
  assert.deepEqual(hits.map((h) => [h.id, h.ref]), [['DN-0001', 'PR #1183'], ['DN-0003', 'PR #1170']]);
  assert.match(hits[0].why, /マージ済み/);
});

test('origin に無いブランチは、同じ行にマージ・削除の記述が無いときだけ拾う', () => {
  const cards = [
    card('DN-0001', '**準備**: ブランチ `prep/after-exam`（10/26 に develop へマージ）'),
    card('DN-0002', '**準備**: ブランチ `prep/done`（10/22 に前倒しして develop へマージし本番へ反映）'),
    card('DN-0003', '**準備**: ブランチ `feat/alive` で作業中'),
  ];
  const hits = computeStaleMergeNotes(cards, { prState: new Map(), remoteBranches: new Set(['feat/alive']) });
  assert.deepEqual(hits.map((h) => [h.id, h.ref]), [['DN-0001', 'prep/after-exam']]);
});

test('取得できなかった側（null）は判定しない', () => {
  const cards = [card('DN-0001', 'PR #1183（未マージ）。ブランチ `prep/x` で準備')];
  assert.deepEqual(computeStaleMergeNotes(cards, { prState: null, remoteBranches: null }), []);
});
