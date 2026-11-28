import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alreadyApplied, countIn, invariantProblems, planProblems, verifyProblems } from '../scripts/lib/note-editor-patch.mjs';

const H = (text) => ({ tag: 'H3', text });
const P = (text) => ({ tag: 'P', text });
const ops = [
  { op: 'replace', from: '採点者が見るポイント', to: '答案の自己点検ポイント', count: 2 },
  { op: 'insert-after', heading: '答案の自己点検ポイント（安全管理）', text: '採点基準は公表されていません。', headings: 1, count: 1 },
];

test('countIn は重ならない出現を数える', () => {
  assert.equal(countIn('ああああ', 'ああ'), 2);
  assert.equal(countIn('abc', ''), 0);
});

test('置き換える文の数が原稿の旧版と同じなら進める', () => {
  const blocks = [H('採点者が見るポイント（安全管理）'), P('本文'), H('採点者が見るポイント（品質管理）')];
  assert.deepEqual(planProblems(ops, blocks), []);
});

test('置き換える文が 0 件・多すぎるときは保存しない', () => {
  assert.match(planProblems(ops, [P('本文')]).join(), /0 件/);
  const three = [H('採点者が見るポイント（安全管理）'), H('採点者が見るポイント（品質管理）'), P('採点者が見るポイントの補足')];
  assert.match(planProblems(ops, three).join(), /3 件/);
});

test('前の置き換えを当てた後の数で数える（長い語を先に置き換える）', () => {
  const seq = [
    { op: 'replace', from: '品質管理の答案で採点者が見るポイント', to: '品質管理の答案の自己点検ポイント', count: 1 },
    { op: 'replace', from: '採点者が見るポイント', to: '答案の自己点検ポイント', count: 1 },
  ];
  assert.deepEqual(planProblems(seq, [H('品質管理の答案で採点者が見るポイント'), H('採点者が見るポイント')]), []);
});

test('前置きがすでに本文にあれば足さない', () => {
  const blocks = [H('採点者が見るポイント（安全管理）'), P('採点基準は公表されていません。'), H('採点者が見るポイント（品質管理）')];
  assert.match(planProblems(ops, blocks).join(), /すでに本文にある/);
});

test('置き換え後の文に元の文が含まれる操作は受け付けない（何度も当たる）', () => {
  assert.match(planProblems([{ op: 'replace', from: '鉄則', to: '鉄則の目安', count: 1 }], [P('鉄則')]).join(), /含まれる/);
});

test('書き換えの後: 旧い文が残る・前置きが足りないと外れる', () => {
  const ok = [H('答案の自己点検ポイント（安全管理）'), P('採点基準は公表されていません。'), H('答案の自己点検ポイント（品質管理）')];
  assert.deepEqual(verifyProblems(ops, ok), []);
  assert.equal(alreadyApplied(ops, ok), true);
  const half = [H('答案の自己点検ポイント（安全管理）'), P('本文'), H('採点者が見るポイント（品質管理）')];
  assert.equal(verifyProblems(ops, half).length, 3);
  assert.equal(alreadyApplied(ops, half), false);
});

test('添付・画像・埋め込みの数が変わったら外れる', () => {
  const before = { attachments: ['a.pdf'], images: 2, embeds: 5 };
  assert.deepEqual(invariantProblems(before, { attachments: ['a.pdf'], images: 2, embeds: 5 }), []);
  assert.match(invariantProblems(before, { attachments: [], images: 2, embeds: 4 }).join(), /PDF 添付.*埋め込み/);
});

test('公開本文（HTML）で置き換えと前置きを確かめる', async () => {
  const { liveHtmlProblems, htmlCounts } = await import('../scripts/lib/note-editor-patch.mjs');
  const html = '<h3>答案の自己点検ポイント（安全管理）</h3><p>採点基準は公表されていません。</p><h3>答案の自己点検ポイント（品質管理）</h3><p>a.pdf</p><img src="x">';
  assert.deepEqual(liveHtmlProblems(ops, html), []);
  assert.equal(liveHtmlProblems(ops, '<h3>採点者が見るポイント</h3>').length, 3);
  assert.deepEqual(htmlCounts(html), { pdf: 1, img: 1, figure: 0 });
});
