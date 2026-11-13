/**
 * 面のサイズの決まり（config/cta-placements.json の sizes）に合う広告素材を、案件の素材一覧（data/affiliate/catalog.json の creatives）から選ぶ。
 * 依存ゼロ（サイトの部品・テスト・検査が同じ関数を使う）。
 *
 * 選び方: sizes の先頭から順に、そのサイズのバナーを探す。同じサイズが複数あれば ASP は a8 → moshimo → afb の順、
 * 同じ ASP なら一覧の先頭（ASP の画面の並び）。avoid（使わない理由）がある素材は選ばない。見つからなければ null。
 */

const ASP_ORDER = ['a8', 'moshimo', 'afb'];

/**
 * @param {Array<{asp:string, materialId:string, kind:string, width?:number, height?:number, href:string, imageSrc?:string, pixelSrc?:string, avoid?:string}>|undefined} creatives
 * @param {string[]} sizes 例 ['728x90', '468x60']
 */
export function pickCreative(creatives, sizes) {
  const usable = (creatives ?? []).filter((c) => c.kind === 'banner' && !c.avoid && c.imageSrc);
  for (const size of sizes) {
    const [w, h] = size.split('x').map(Number);
    const hits = usable
      .map((c, index) => ({ c, index }))
      .filter(({ c }) => c.width === w && c.height === h)
      .sort((a, b) => ASP_ORDER.indexOf(a.c.asp) - ASP_ORDER.indexOf(b.c.asp) || a.index - b.index);
    if (hits.length > 0) return hits[0].c;
  }
  return null;
}

/**
 * 面の PC・スマホそれぞれの素材。同じ案件で PC とスマホの ASP が分かれると成果の出どころが割れるので、
 * PC で選んだ ASP の素材をスマホでも優先する（その ASP に合うサイズが無ければ他の ASP）。
 */
export function pickSlotCreatives(creatives, sizes) {
  const pc = sizes?.pc?.length ? pickCreative(creatives, sizes.pc) : null;
  const mobileSizes = sizes?.mobile ?? [];
  const sameAsp = pc ? pickCreative((creatives ?? []).filter((c) => c.asp === pc.asp), mobileSizes) : null;
  const mobile = mobileSizes.length ? sameAsp ?? pickCreative(creatives, mobileSizes) : null;
  return { pc, mobile };
}
