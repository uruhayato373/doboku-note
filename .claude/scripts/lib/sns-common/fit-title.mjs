/**
 * fit-title.mjs — 大型タイトルの auto-fit 共通 util (v7.1)
 *
 * Stories ハイライト・過去問パック cover 等の大型タイトル（132-156px）で
 * 文字数超過による不適切な改行を構造的に防ぐ。
 *
 * 設計思想:
 *   - アプローチ A（文字数制限）: 意味希薄化のリスク → 緩い上限を許容
 *   - アプローチ B（フォント縮小）: 視覚バランス崩壊 → 段階的に切替
 *   ジレンマを段階フォントサイズで吸収する。
 *
 * 使い方:
 *   import { pickTitleSize } from './fit-title.mjs';
 *   const heroStyle = pickTitleSize(data.title, {
 *     large:  TOKENS.highlightStories.typography.hero,    // _maxLen: 7
 *     medium: TOKENS.highlightStories.typography.heroMid, // _maxLen: 11
 *     small:  TOKENS.highlightStories.typography.heroSm,  // _maxLen: 16
 *   });
 *
 * 真実源: .claude/knowledge/reference/ig-highlight-design-policy.md §4
 */

/**
 * 視覚字幅を計算する。全角=1.0、半角英数記号=0.55 の重みづけ。
 * 半角の係数は CJK フォント実測ベース（必要に応じて tokens.json で外出し可）。
 *
 * @param {string} text
 * @returns {number} 視覚字幅（半角 1 つで 0.55、全角 1 つで 1.0）
 */
export function visualLength(text) {
  if (!text) return 0;
  return [...String(text)].reduce(
    (sum, c) => sum + (/[a-zA-Z0-9 .,!?\-]/.test(c) ? 0.55 : 1.0),
    0,
  );
}

/**
 * 文字数に応じて 3 階層のフォントサイズから 1 つを選ぶ。
 *
 * sizes の各エントリは tokens.json の typography トークンで、
 * `_maxLen` フィールドを持つ前提:
 *   { large: { size, lineHeight, _maxLen, ... }, medium: {...}, small: {...} }
 *
 * @param {string} text
 * @param {{ large: object, medium: object, small: object }} sizes
 * @returns {object} 選ばれた typography トークン
 */
export function pickTitleSize(text, sizes) {
  const len = visualLength(text);
  if (len <= sizes.large._maxLen) return sizes.large;
  if (len <= sizes.medium._maxLen) return sizes.medium;
  return sizes.small;
}

/**
 * 字数判定のラベルを返す（lint 用）。
 *
 * @param {string} text
 * @param {{ large: object, medium: object, small: object }} sizes
 * @returns {'OK' | 'WARN' | 'NOTICE' | 'ERROR'}
 */
export function classifyTitle(text, sizes) {
  const len = visualLength(text);
  if (len <= sizes.large._maxLen) return 'OK';
  if (len <= sizes.medium._maxLen) return 'WARN';
  if (len <= sizes.small._maxLen) return 'NOTICE';
  return 'ERROR';
}

// CLI: 文字列を渡して結果を表示
// node .claude/scripts/lib/sns-common/fit-title.mjs "ここでわかること"
import { fileURLToPath } from 'node:url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = process.argv[2];
  if (!text) {
    console.log('Usage: node fit-title.mjs <text>');
    process.exit(1);
  }
  // ハイライト hero の sizes 想定
  const sizes = {
    large:  { size: 132, _maxLen: 7 },
    medium: { size: 100, _maxLen: 11 },
    small:  { size: 80,  _maxLen: 16 },
  };
  const len = visualLength(text);
  const picked = pickTitleSize(text, sizes);
  const label = classifyTitle(text, sizes);
  console.log(`text:    "${text}"`);
  console.log(`length:  ${len.toFixed(2)} (visual)`);
  console.log(`size:    ${picked.size}px`);
  console.log(`label:   ${label}`);
}
