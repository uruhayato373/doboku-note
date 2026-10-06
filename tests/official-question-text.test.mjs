// 過去問ページの公式問題の逐語範囲（lint-ja の表記統一から外す範囲）を固定する。
// 2026-10-03: 2級土木 一次の設問を公式どおり「土止め支保工」に戻したら、prh（土止め→土留め）が commit を止めた。
// 技術士一次だけだった例外を、土木施工管理の第1次検定（## 問題 No.N）にも広げた。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OFFICIAL_QUESTION_PAGE, officialTextRanges, blankOfficialQuestionLines } from '../scripts/lib/official-question-text.mjs';

test('対象ページ: 技術士一次・建設部門の年度別、土木施工管理の第1次・第2次検定（ガイドは対象外）', () => {
  for (const p of [
    'content/site/pe-first-stage/r07-construction/article.mdx',
    'content/site/pe-first-stage/r01-retry-basic/article.mdx',
    'content/site/civil-construction-2/primary-r05-zenki/article.mdx',
    'content/site/civil-construction-1/primary-h26-a/article.mdx',
    'content\\site\\civil-construction-2\\primary-r03-kouki\\article.mdx',
    // 2026-10-06: lint-mdx-mobile（15-x）と判定を一本化して足した 2 種
    'content/site/civil-construction-1/secondary-r07/article.mdx',
    'content/site/pe-construction/r06-urban-planning/article.mdx',
  ]) assert.equal(OFFICIAL_QUESTION_PAGE.test(p), true, p);
  for (const p of [
    'content/site/pe-first-stage/guide-basic/article.mdx',
    'content/site/civil-construction-2/guide-overview/article.mdx',
    'content/site/civil-construction-1/secondary-experience-writing-guide/article.mdx',
    'content/site/pe-construction/guide-career/article.mdx',
  ]) assert.equal(OFFICIAL_QUESTION_PAGE.test(p), false, p);
});

test('土木の設問（## 問題 No.N 〜 <details>）は行全体、解説は選択肢原文の引用部分だけを除く', () => {
  const text = [
    '## 問題 No.34', // 1
    '', // 2
    '4. 土止め支保工の切りばり又は腹起こしの取り付け又は取り外しの作業', // 3
    '', // 4
    '<details>', // 5
    '4. 土止め支保工の切りばり又は腹起こしの取り付け又は取り外しの作業は、作業主任者の選任が必要', // 6
    '4. 土止め支保工の切りばり等は作業主任者選任', // 7
    '</details>', // 8
  ].join('\n');
  const r = officialTextRanges(text);
  assert.equal(r.get(1), Infinity);
  assert.equal(r.get(3), Infinity);
  assert.equal(r.has(5), false);
  assert.equal(r.get(6), 3 + '土止め支保工の切りばり又は腹起こしの取り付け又は取り外しの作業'.length);
  assert.equal(r.has(7), false, '原文の引用でない自前の解説は表記統一の対象のまま');
});

test('技術士一次の見出し（## Ⅰ-1-1）は従来どおり、問題見出しでない ## は対象外', () => {
  const r = officialTextRanges(['## Ⅰ-1-1', '受け入れ', '<details>', '受け入れ', '## 学習案内', '受け入れ'].join('\n'));
  assert.equal(r.get(2), Infinity);
  assert.equal(r.has(4), false);
  assert.equal(r.has(6), false);
});

test('第2次検定（## 問題 N）と建設部門（## II-1 の ASCII 表記）も問題見出し、### 解説 で自著に戻る', () => {
  const r = officialTextRanges(['## 問題 2', '受け入れ', '### 解説', '受け入れ', '## II-1', '2か所', '<details open>', '2か所'].join('\n'));
  assert.equal(r.get(2), Infinity);
  assert.equal(r.has(4), false, '問題見出しの下でも ### 解説 からは自著');
  assert.equal(r.get(6), Infinity);
  assert.equal(r.has(8), false, '<details open> も解説の始まり');
});

test('blankOfficialQuestionLines: 対象ページだけ公式問題の行を空にする（lint-mdx-mobile の 15-x 用）', () => {
  const lines = ['導入。', '## 問題 1', '設問文。', '<details>', '解説。'];
  assert.deepEqual(blankOfficialQuestionLines(lines, 'content/site/civil-construction-2/secondary-r05/article.mdx'), ['導入。', '', '', '<details>', '解説。']);
  assert.deepEqual(blankOfficialQuestionLines(lines, 'content/site/civil-construction-2/guide-overview/article.mdx'), lines);
});
