/**
 * ページ単位の商品導線ゼロの判定（check-magazine-cta-reachability の page-gate）。
 *
 * もくじタイル（資格単位の導線）は商品の導線に数えない。以前はもくじタイルが出る資格（1級・2級土木・総監・建設部門）を
 * ゼロの判定から外していたので、2級の見直しページ（GSC 515 クリック）など 20 本が商品の導線 0 のまま検査を通っていた（DN-0890）。
 * 記事のあるカテゴリは検査対象（gate）か理由付きの対象外（excluded）のどちらかに入れる。どちらにも無いカテゴリは
 * uncovered として返し、呼び出し側が検査不成立にする（新しい資格が黙って検査から漏れないように）。
 *
 * @param {Array<{ slug: string, category: string, isCareer: boolean }>} docs 公開記事
 * @param {{ gate: Set<string>, excluded: Record<string, string>, hasSurface: (slug: string) => boolean }} opts
 */
export function pageGate(docs, { gate, excluded, hasSurface }) {
  const uncovered = [...new Set(docs.map((d) => d.category))]
    .filter((c) => !gate.has(c) && !Object.hasOwn(excluded, c))
    .sort();
  const gateDocs = docs.filter((d) => gate.has(d.category));
  const targets = gateDocs.filter((d) => !d.isCareer);
  const zeroPages = targets.filter((d) => !hasSurface(d.slug));
  return { uncovered, gateDocs, targets, zeroPages };
}
