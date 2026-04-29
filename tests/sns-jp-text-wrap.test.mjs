// tests/sns-jp-text-wrap.test.mjs
//
// 日本語改行ロジックの境界ケースを固定する。
// OGP との後方互換維持のため、ogp-text.mjs 経由でも同じ結果が返ることを確認する。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { wrapTitle, pickFontSize } from '#lib/sns-common/jp-text-wrap.mjs';
// 後方互換: OGP の thin wrapper も同じ実装を返す
import { wrapTitle as wrapTitleViaOgp, pickFontSize as pickFontSizeViaOgp } from '../.claude/skills/conversion/ogp-create/scripts/lib/ogp-text.mjs';

const DEFAULT_CONFIG = {
  breakBefore: ['（', '：', '〜'],
  breakAt: [' ', '　'],
  charCountFallback: 12,
  budouX: { enabled: false },
};

test('wrapTitle: 空文字は [""] を返す', async () => {
  const result = await wrapTitle('', DEFAULT_CONFIG);
  assert.deepEqual(result, ['']);
});

test('wrapTitle: 明示改行（\\n）を尊重する（Layer 1）', async () => {
  const result = await wrapTitle('上の行\n下の行', DEFAULT_CONFIG);
  assert.deepEqual(result, ['上の行', '下の行']);
});

test('wrapTitle: breakBefore の記号直前で改行（Layer 2a）', async () => {
  const result = await wrapTitle('MBO（目標管理）', DEFAULT_CONFIG);
  assert.deepEqual(result, ['MBO', '（目標管理）']);
});

test('wrapTitle: breakAt の区切り文字で分割（Layer 2b）', async () => {
  const result = await wrapTitle('リスク マネジメント', DEFAULT_CONFIG);
  assert.deepEqual(result, ['リスク', 'マネジメント']);
});

test('wrapTitle: charCountFallback で長文を機械的に折り返す（Layer 4）', async () => {
  const long = 'あいうえおかきくけこさしすせそたちつてと'; // 20 字
  const result = await wrapTitle(long, { ...DEFAULT_CONFIG, charCountFallback: 10 });
  assert.equal(result.length, 2);
  assert.equal(result[0].length, 10);
  assert.equal(result[1].length, 10);
});

test('pickFontSize: 全行が safetyWidth に収まる最大サイズを返す', () => {
  const lines = ['ABC', 'DEF'];
  const config = { fontSizeTable: [120, 96, 80, 64], safetyWidth: 200 };
  const size = pickFontSize(lines, config);
  // 'ABC' は半角3文字 ≒ 3 * size * 0.58 = 1.74 * size。200 / 1.74 ≒ 114。
  // table から 96 が最初に通る（120 は不通）。
  assert.equal(size, 96);
});

test('pickFontSize: 日本語文字は約 1.0 × fontSize 幅と推定', () => {
  const lines = ['あいう']; // 全角 3 文字
  const config = { fontSizeTable: [120, 96, 80, 64], safetyWidth: 200 };
  const size = pickFontSize(lines, config);
  // 200 / 3 ≒ 66.7 → 64
  assert.equal(size, 64);
});

test('pickFontSize: どのサイズも収まらない場合は最小サイズを返す', () => {
  const lines = ['あいうえおかきくけこさしすせそ']; // 15 文字、どのサイズでも収まらない
  const config = { fontSizeTable: [120, 96, 64], safetyWidth: 100 };
  const size = pickFontSize(lines, config);
  assert.equal(size, 64);
});

test('OGP thin wrapper 経由でも同じ結果を返す（後方互換）', async () => {
  const a = await wrapTitle('MBO（目標管理）', DEFAULT_CONFIG);
  const b = await wrapTitleViaOgp('MBO（目標管理）', DEFAULT_CONFIG);
  assert.deepEqual(a, b);

  const config = { fontSizeTable: [120, 96, 64], safetyWidth: 200 };
  const sa = pickFontSize(['ABC'], config);
  const sb = pickFontSizeViaOgp(['ABC'], config);
  assert.equal(sa, sb);
});
