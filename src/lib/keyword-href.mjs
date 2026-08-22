/**
 * keyword-href — RelatedKeywords slug → /docs URL 解決の単一真実源。
 *
 * RelatedKeywords コンポーネント（表示）と check-links チェッカー（検証）が
 * 同一の規則を使うための共有純粋関数。両者でロジックが分岐すると
 * 「表示は正しい URL・チェッカーは誤 BROKEN_SLUG」あるいはその逆が起き、
 * 実在ページへのリンクが偽陰性/偽陽性になる（2026-07 の BROKEN_SLUG 166 件事故）。
 *
 * 規則:
 *   1. slug が categories.json の既知カテゴリ接頭辞（`{categorySlug}-`）で始まる場合は
 *      すでに完全修飾済みとみなし `/docs/{slug}` をそのまま返す。
 *   2. どのカテゴリ接頭辞にも一致しない「裸 slug」は legacy 総監キーワード
 *      （pe-comprehensive-management）として `/docs/pe-comprehensive-management-{slug}` を補完する。
 *      約 666 の総監 MDX 呼び出しが接頭辞なしの bare slug を使っているための後方互換。
 *
 * カテゴリ接頭辞は呼び出し側が categories.json から供給する（この関数はカテゴリ定義を
 * 直接読まない純粋関数）。接頭辞照合はまれな入れ子（将来 `civil-construction` と
 * `civil-construction-1` が併存する等）に備え、長い slug を優先して照合する。
 */

/** legacy 裸 slug を補完するカテゴリ（総監）。categories.json の該当 slug と一致させる。 */
export const LEGACY_BARE_SLUG_CATEGORY = 'pe-comprehensive-management';

/**
 * @param {string} slug RelatedKeywords item の slug（例 "concrete-chief-engineer-primary-durability" / bare "followership"）
 * @param {string[]} categorySlugs categories.json の category slug 配列
 * @returns {string} 解決後の /docs パス
 */
export function buildKeywordHref(slug, categorySlugs) {
  const prefixes = [...categorySlugs]
    .sort((a, b) => b.length - a.length)
    .map((s) => `${s}-`);
  if (prefixes.some((p) => slug.startsWith(p))) {
    return `/docs/${slug}`;
  }
  return `/docs/${LEGACY_BARE_SLUG_CATEGORY}-${slug}`;
}
