import type { ResolvedPlacement, ResolvedPlacements } from './affiliate-placement';
import { slotCreatives } from './affiliate-slot-creatives';
export type ArticlePixelCandidate = { program: string; slot: string; src: string; viewport?: 'pc' | 'mobile'; secondary?: boolean };

export function articleRailSlot(index: number) { return index === 0 ? 'article-rail' : `article-rail-${index + 1}`; }

/** 過去問の右の欄で、回遊の組の間を埋めるバナーだけの組の面。計測ピクセルは付けず、同じ案件の繰り返しを許す。 */
export const ARTICLE_RAIL_FILL_SLOT = 'article-rail-fill';

/**
 * 埋める組のバナーの案件の列。右の欄に実際に出る画像（上の束＋回遊の組）の案件を出る順に 1 回ずつ並べ直し、
 * 面名だけ article-rail-fill にする。ピクセルは右の欄の同じ案件が既に 1 発持つので、ここでは増やさない。
 */
export function articleRailFillColumn(railImages: ReturnType<typeof articleImagePlacements>): ResolvedPlacement[] {
  const seen = new Set<string>();
  return railImages.flatMap(({ placement }) => {
    if (seen.has(placement.program)) return [];
    seen.add(placement.program);
    return slotCreatives(placement.program, ARTICLE_RAIL_FILL_SLOT).pc ? [{ ...placement, slot: ARTICLE_RAIL_FILL_SLOT }] : [];
  });
}

/** 最終的に存在する画像面だけ。右欄は上の実カード数＋下に続く組数で割り当てる。 */
export function articleImagePlacements(placements: ResolvedPlacements, inlineSlots: string[], cards: number, continuationSlots: string[] = []) {
  const railPrograms = new Set<string>();
  return [...inlineSlots, ...Array.from({ length: cards }, (_, i) => articleRailSlot(i)), ...continuationSlots, 'article-banner-end']
    .flatMap(slot => {
      const p = placements[slot];
      if (!p) return [];
      // 右欄内だけ案件を一度ずつ使う。重複枠を詰めず、カード間の位置を保つ。
      const rail = slot.startsWith('article-rail');
      if (rail && railPrograms.has(p.program)) return [];
      const creatives = slotCreatives(p.program, slot);
      if (!creatives.pc && !creatives.mobile) return [];
      if (rail) railPrograms.add(p.program);
      return [{ placement: p, creatives }];
    });
}

export function articlePixelCandidates(placements: ResolvedPlacements, nativeSlots: string[], images: ReturnType<typeof articleImagePlacements>): ArticlePixelCandidate[] {
  const native: ArticlePixelCandidate[] = nativeSlots.flatMap(slot => {
    const p = placements[slot];
    if (!p) return [];
    return [
      { program: p.program, slot, src: p.textHref ? p.textPixelSrc ?? '' : p.banner.pixelSrc },
      ...(p.secondary ? [{ program: p.secondary.program, slot, src: p.secondary.textHref ? p.secondary.textPixelSrc ?? '' : p.secondary.banner.pixelSrc, secondary: true }] : []),
    ];
  });
  return [...native, ...images.flatMap(({ placement: p, creatives }) => (['pc', 'mobile'] as const).flatMap(viewport => {
    const c = creatives[viewport];
    return c ? [{ program: p.program, slot: p.slot, src: c.pixelSrc, viewport }] : [];
  }))];
}

