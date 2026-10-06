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
    // DN-0549: 総監の択一と測量士の択一
    'content/site/pe-comprehensive-management/r05-primary/article.mdx',
    'content/site/surveyor/primary-r07/article.mdx',
  ]) assert.equal(OFFICIAL_QUESTION_PAGE.test(p), true, p);
  for (const p of [
    'content/site/pe-first-stage/guide-basic/article.mdx',
    'content/site/civil-construction-2/guide-overview/article.mdx',
    'content/site/civil-construction-1/secondary-experience-writing-guide/article.mdx',
    'content/site/pe-construction/guide-career/article.mdx',
    'content/site/surveyor/guide-overview/article.mdx',
    'content/site/pe-comprehensive-management/primary-statistics-2026/article.mdx',
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

test('解説の引用は文末の「。」を落としたもの・末尾だけ言い換えたものも原文として除き、頭が 8 割未満の言い換えは対象に残す', () => {
  // 2026-10-06 primary-h28-a: 「…2か所設ける ✅」（設問は「…設ける。」）や「…構造とする ✅」（設問は「…構造とし，上側鉄筋には…」）を
  // prh が「箇所」「取り付け」へ直せと止めた。原文の表記は直さない
  const text = [
    '## 問題 No.1', // 1
    '1. 通常鋼矢板側と控工側のできるだけ近い位置に2か所設ける。', // 2
    '2. 鉄筋コンクリート版標準断面（標準軌）の橋梁との取付け部は，目違いを防止するためにコンクリート路盤の鉄筋コンクリート版端部を橋台のパラペット天端に載せる構造とし，上側鉄筋にはD16を用いる。', // 3
    '3. スランプは低下しやすいため，一般に練混ぜから1.5時間以内に打ち込むことが望ましい。', // 4
    '<details>', // 5
    '1. 通常鋼矢板側と控工側のできるだけ近い位置に2か所設ける ✅', // 6
    '2. 鉄筋コンクリート版標準断面（標準軌）の橋梁との取付け部は，目違いを防止するためにコンクリート路盤の鉄筋コンクリート版端部を橋台のパラペット天端に載せる構造とする ✅', // 7
    '3. スランプは低下しやすいため，長時間経過したコンクリートは打ち込みが困難 ✅', // 8
    '</details>', // 9
  ].join('\n');
  const r = officialTextRanges(text);
  assert.equal(r.get(6), 3 + '通常鋼矢板側と控工側のできるだけ近い位置に2か所設ける'.length);
  assert.equal(r.get(7), 3 + '鉄筋コンクリート版標準断面（標準軌）の橋梁との取付け部は，目違いを防止するためにコンクリート路盤の鉄筋コンクリート版端部を橋台のパラペット天端に載せる構造と'.length); // 「構造とし」と「構造とする」は「と」まで同じ
  assert.equal(r.has(8), false, '頭だけ同じ自前の解説は表記統一の対象のまま');
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

test('blankOfficialQuestionLines: 対象ページだけ公式問題の行を空にする（見出しは残す・lint-mdx-mobile の 15-x 用）', () => {
  const lines = ['導入。', '## 問題 1', '設問文。', '<details>', '解説。'];
  assert.deepEqual(blankOfficialQuestionLines(lines, 'content/site/civil-construction-2/secondary-r05/article.mdx'), ['導入。', '## 問題 1', '', '<details>', '解説。']);
  assert.deepEqual(blankOfficialQuestionLines(lines, 'content/site/civil-construction-2/guide-overview/article.mdx'), lines);
});

test('測量士の問題見出し（## No.N）も問題の始まり、文体検査用の空白化では見出し行を残す', () => {
  const r = officialTextRanges(['## No.3', '次の文は，測量法に規定された事項である。', '<details>', '解説。'].join('\n'));
  assert.equal(r.get(2), Infinity);
  assert.equal(r.has(4), false);
  const lines = ['## No.3', '設問文。', '<details>', '解説。'];
  assert.deepEqual(blankOfficialQuestionLines(lines, 'content/site/surveyor/primary-r07/article.mdx'), ['## No.3', '', '<details>', '解説。']);
});

test('1級土木 二次の分野別過去問（DN-0553）: 年度の見出し（## と ###）から <details> までが設問の逐語', () => {
  // 2026-10-07: secondary-earthwork-past-problems の図の寸法を直したら、設問文の転記（「締め固めに適した状態」「仕上がり厚さ」
  // 「取付け部」）を prh が止めた。試験の原文は直さず、解説の自前の表記は従来どおり揃える
  for (const p of [
    'content/site/civil-construction-1/secondary-earthwork-past-problems/article.mdx',
    'content/site/civil-construction-1/secondary-construction-plan-past-problems/article.mdx',
    'content/site/civil-construction-1/secondary-quality-management-past-problems/article.mdx',
    'content/site/civil-construction-1/secondary-concrete-past-problems/article.mdx',
  ]) assert.equal(OFFICIAL_QUESTION_PAGE.test(p), true, p);
  assert.equal(OFFICIAL_QUESTION_PAGE.test('content/site/civil-construction-1/secondary-earthwork-basics/article.mdx'), false);
  const r = officialTextRanges([
    '## 出題傾向', // 1
    '仕上がり厚さ', // 2
    '## 令和2年度〔問題1〕', // 3
    '**【No.7】** 構造物と盛土の取付け部に…', // 4
    '<details>', // 5
    '構造物と盛土の取付け部に踏掛版を設ける', // 6
    '</details>', // 7
    '### 令和元年度 No.3', // 8
    '裏込め材を薄い仕上がり厚さで締め固める。', // 9
    '<details>', // 10
    '薄い仕上がり厚さにする', // 11
  ].join('\n'));
  assert.equal(r.has(2), false, '出題傾向は自著');
  assert.equal(r.get(4), Infinity);
  assert.equal(r.has(6), false, '解説は自著');
  assert.equal(r.get(9), Infinity, 'h3 の年度見出しも設問の始まり');
  assert.equal(r.has(11), false);
});
