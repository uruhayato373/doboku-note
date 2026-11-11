import assert from 'node:assert/strict';
import test from 'node:test';
import { designProblems, effectiveCover, ledgerProblems } from '../scripts/check-youtube-covers.mjs';

const pop = { format: 'longform', exam: 'civil-2', headline: ['題材選び', '自分の経験'], accentLine: 1, subtitle: '担当した管理を探す',
  character: { pose: 'checklist-pen', frame: 'waist' }, design: 'pop-poster-v3', approvedImage: { path: 'cover.png', sha256: 'a'.repeat(64) } };

test('図解だけの表紙（先生のキャラクターの指定なし）を表紙の設計の違反にする（2026-11-11 の再発防止）', () => {
  const { character: _drop, ...diagram } = pop;
  assert.match(designProblems({ ...diagram, layout: 'diagram-led', approvedImage: { ...pop.approvedImage, normalization: { mode: 'full-frame-v1' } } })[0], /character/);
  assert.deepEqual(designProblems(pop), []);
  assert.deepEqual(designProblems({ ...pop, approvedImage: undefined }), [], '画像の生成前の設計は採用画像なしで通す');
});

test('投稿へ進んだ通常動画の表紙が表紙の設計の採用画像と違えば違反にする', () => {
  const media = new Map([['w/cover', { id: 'w/cover', sha256: 'a'.repeat(64) }], ['w/candidate-cover', { id: 'w/candidate-cover', sha256: 'b'.repeat(64) }]]);
  const pub = (over) => ({ id: 'e/w/youtube.longform', channel: 'youtube', format: 'longform', status: 'published', media: { cover: 'w/candidate-cover' }, ...over });
  const specOf = () => pop;
  assert.equal(ledgerProblems([pub()], media, specOf).problems.length, 1);
  assert.equal(ledgerProblems([pub({ media: { cover: 'w/cover' } })], media, specOf).problems.length, 0);
  // 公開後に差し替えた表紙（thumbnail.update）で揃っていれば違反にしない
  const replaced = pub({ thumbnail: { status: 'set', update: { coverKey: 'w/cover' } } });
  assert.equal(effectiveCover(replaced), 'w/cover');
  assert.equal(ledgerProblems([replaced], media, specOf).problems.length, 0);
  // 承認の前（qa_passed）は表紙がまだ決まっていないので数えない
  assert.equal(ledgerProblems([pub({ status: 'qa_passed' })], media, specOf).checked, 0);
});
