import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDebugWrap, hasExplicitOgp } from '../scripts/check-ogp-line-count.mjs';

/**
 * OGP 折返し行数の実測 surfacer の契約。
 *
 * この surfacer を足した理由は「**誰も行数を測っていなかったせいで台帳の数字が 24 倍ずれた**」
 * （DN-0057: 「残り 5 件」→ 実測 121 件）。同じことを繰り返さないために、
 * **出力形式が変わったら気づける**ことと、**ogp.title 設定済みを対象外にする判定**を固定する。
 */

const SAMPLE = [
  '[ogp-create] 対象 3 件 / mode=debug-wrap',
  'a-one-line',
  '  title: 短いタイトル',
  '  lines: ["短いタイトル"]',
  '  longest: 6 chars → fontSize 76',
  '  template: mono-tag',
  'b-three-lines',
  '  title: 長いほうのタイトル',
  '  lines: ["いち", "にい", "さん"]',
  '  longest: 2 chars → fontSize 76',
  '  template: mono-tag',
  'c-nine-lines',
  '  title: とても長い',
  '  lines: ["1", "2", "3", "4", "5", "6", "7", "8", "9"]',
  '  template: mono-tag',
].join('\n');

test('debug-wrap の出力から slug → 行数を採れる', () => {
  const m = parseDebugWrap(SAMPLE);
  assert.equal(m.size, 3);
  assert.equal(m.get('a-one-line'), 1);
  assert.equal(m.get('b-three-lines'), 3);
  assert.equal(m.get('c-nine-lines'), 9);
});

test('出力形式が変わったら 0 件になる＝検査不成立を検出できる', () => {
  // 本体は size===0 で exit 2 にする。ここでは「黙って 0 件を返す」ことを固定し、
  // 「対象が無い」と「形式が変わった」を取り違えないようにする
  assert.equal(parseDebugWrap('まったく別の出力').size, 0);
  assert.equal(parseDebugWrap('').size, 0);
});

test('[ogp-create] のヘッダ行を slug と誤認しない', () => {
  assert.equal(parseDebugWrap(SAMPLE).has('[ogp-create] 対象 3 件 / mode=debug-wrap'), false);
});

test('frontmatter の ogp ブロックを検出する（設定済みは対象外にする判定）', () => {
  const withOgp = ['---', 'title: T', 'ogp:', '  title: |', '    明示', '---', '本文'].join('\n');
  const without = ['---', 'title: T', 'description: d', '---', '本文'].join('\n');
  assert.equal(hasExplicitOgp(withOgp), true);
  assert.equal(hasExplicitOgp(without), false);
});

test('本文中の "ogp:" を frontmatter と誤認しない', () => {
  const body = ['---', 'title: T', '---', '本文で ogp: について説明する'].join('\n');
  assert.equal(hasExplicitOgp(body), false);
});
