import { getCategoryCurriculum } from '@/config/category-curriculum';

/**
 * next-in-series.ts — 記事末の「前の記事・次の記事」を、資格ページの並び（category-curriculum.json）から決める。
 *
 * なぜ要るか: 実務・分野別の要点などは 1 本読んで離脱しがちで、次に読む 1 本が記事末に無かった（2026-11 の SEO 計画 §4）。
 *   並びの正本は資格ページと同じ category-curriculum.json の examGuide.slugs と fields.blocks[].slugs（記載順）。
 *   受験ガイドの列と分野別の列は別の列として扱い、分野別は block をまたいで続ける（block の最後の次は次の block の先頭）。
 *   公開中の記事（available に含まれる slug）だけを数え、非公開・未作成の slug は飛ばす。
 *   教科書の章（TextbookNav）・過去問の年度（ExamYearNav）は既存の前後ナビがあるので、ここでは扱わない。
 */

interface SeriesItem {
  readonly slug: string;
  readonly title: string;
}

export interface SeriesNav {
  /** 見出し（受験ガイド・分野の block の名前） */
  readonly heading: string;
  readonly prev: SeriesItem | null;
  readonly next: SeriesItem | null;
}

function sequences(category: string): { heading: string; slugs: { suffix: string; heading: string }[] }[] {
  const c = getCategoryCurriculum(category);
  if (!c) return [];
  const out: { heading: string; slugs: { suffix: string; heading: string }[] }[] = [];
  if (c.examGuide?.slugs.length) {
    const heading = c.examGuide.title;
    out.push({ heading, slugs: c.examGuide.slugs.map((suffix) => ({ suffix, heading })) });
  }
  if (c.fields?.blocks.length) {
    const fallback = c.fields.title;
    out.push({
      heading: fallback,
      slugs: c.fields.blocks.flatMap((b) => b.slugs.map((suffix) => ({ suffix, heading: b.label ?? fallback }))),
    });
  }
  return out;
}

/** 現在の記事が並びに入っていれば前後を返す。入っていない・前後とも無ければ null */
export function resolveSeriesNav(
  category: string | undefined,
  currentSlug: string,
  available: ReadonlyMap<string, string>,
): SeriesNav | null {
  if (!category) return null;
  for (const seq of sequences(category)) {
    const items = seq.slugs
      .map((s) => ({ slug: `${category}-${s.suffix}`, heading: s.heading }))
      .filter((s, i, arr) => available.has(s.slug) && arr.findIndex((x) => x.slug === s.slug) === i);
    const idx = items.findIndex((s) => s.slug === currentSlug);
    if (idx < 0) continue;
    const pick = (i: number): SeriesItem | null => {
      const s = items[i];
      return s ? { slug: s.slug, title: available.get(s.slug) ?? s.slug } : null;
    };
    const prev = pick(idx - 1);
    const next = pick(idx + 1);
    if (!prev && !next) return null;
    return { heading: items[idx]!.heading, prev, next };
  }
  return null;
}
