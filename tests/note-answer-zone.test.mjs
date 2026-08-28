import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANSWER_SECTION_PATTERN,
  findAnswerStartBlock,
  findAnswerStartLine,
  isAnswerPart,
} from '../scripts/lib/note-answer-zone.mjs';

// 2026-08-28 の事故: note-lint の段落長検査は「模範論文＝有料」という代理指標で
// 答案本文を外そうとしていたが、notePricing: free の R8本試験模範解答例（本文は
// 14立場の模範解答）で破綻し、散文答案59件を誤検出した。reflow は最初からこの
// 見出し境界で保護していたので、flag する側と fix する側が食い違っていた。

test('答案域の開始見出しを検出する', () => {
  for (const h of ['## 試験問題', '## 予想問題', '## A 案', '## B 案']) {
    assert.ok(ANSWER_SECTION_PATTERN.test(h), `${h} は答案域の開始`);
  }
});

test('見出しに続く文字列があっても検出する（実記事の形）', () => {
  assert.ok(ANSWER_SECTION_PATTERN.test('## 試験問題（令和8年度 必須科目I-2「地方創生」・設問の要約）'));
  assert.ok(ANSWER_SECTION_PATTERN.test('## 予想問題 1'));
});

test('無関係な H2 は答案域の開始にしない', () => {
  for (const h of ['## 立場別 模範解答（全14版）', '## 採点者視点でのチェックポイント', '## まとめ']) {
    assert.equal(ANSWER_SECTION_PATTERN.test(h), false, `${h} は答案域ではない`);
  }
});

test('H3 以下は答案域の開始にしない（H2 のみが境界）', () => {
  assert.equal(ANSWER_SECTION_PATTERN.test('### 試験問題'), false);
});

test('findAnswerStartBlock は該当ブロックの index を返す', () => {
  const blocks = ['導入文', '**見出し的ブロック**', '## 試験問題（要約）', '答案本文'];
  assert.equal(findAnswerStartBlock(blocks), 2);
});

test('findAnswerStartBlock は見出しが無ければ blocks.length を返す（全ブロックが対象）', () => {
  const blocks = ['導入文', '## まとめ', '本文'];
  assert.equal(findAnswerStartBlock(blocks), 3);
});

test('findAnswerStartLine は該当行の index を返す', () => {
  const lines = ['# タイトル', '', '導入文', '## 試験問題', '答案'];
  assert.equal(findAnswerStartLine(lines), 3);
});

test('findAnswerStartLine は見出しが無ければ lines.length を返す', () => {
  const lines = ['# タイトル', '本文'];
  assert.equal(findAnswerStartLine(lines), 2);
});

test('前後の空白があっても境界として扱う', () => {
  assert.equal(findAnswerStartBlock(['導入', '  ## 試験問題  ']), 1);
});

// 施策バンク系（R8設問3施策全集）は ## 試験問題 を持たず、施策ごとに ①②③ の
// 答案パーツが並ぶ。見出し境界では拾えないので構造マーカーで判定する。
// 2026-08-28 実測: 同ファイルの違反29件のうち28件がこの形、分割すべき説明文は1件。

test('答案パーツの構造マーカーを検出する', () => {
  assert.ok(isAnswerPart('**①施策の内容とアウトプットにつながる理由**：地方は再生可能エネルギーの…'));
  assert.ok(isAnswerPart('**②有効性と実現性**：政府は2025年12月閣議決定の…'));
  assert.ok(isAnswerPart('**③最も重大な障害と対応方策**：最大の障害は…'));
});

test('通常の太字始まりの段落は答案パーツにしない', () => {
  assert.equal(isAnswerPart('**この記事でわかること**'), false);
  assert.equal(isAnswerPart('**合格者**が書いた解説です。'), false);
});

test('地の文は答案パーツにしない', () => {
  assert.equal(isAnswerPart('一方で、設問(3)の「国家施策」については別に備えていました。'), false);
});
