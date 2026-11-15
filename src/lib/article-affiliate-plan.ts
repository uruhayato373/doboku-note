import type { ResolvedPlacements } from './affiliate-placement';
import { slotCreatives } from './affiliate-slot-creatives';
export type ArticlePixelCandidate = { program: string; slot: string; src: string; viewport?: 'pc' | 'mobile'; secondary?: boolean };

export function articleRailSlot(index: number) { return index === 0 ? 'article-rail' : `article-rail-${index + 1}`; }

/** 最終的に存在する画像面だけ。右欄は実カードの先頭と全間隔（末尾には置かない）。 */
export function articleImagePlacements(placements: ResolvedPlacements, inlineSlots: string[], cards: number) {
  const railPrograms = new Set<string>();
  return [...inlineSlots, ...Array.from({ length: Math.min(cards, 6) }, (_, i) => articleRailSlot(i)), 'article-banner-end']
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

