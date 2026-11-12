import type { DocMeta } from '@/lib/docs';
import { resolveSeriesNav } from '@/lib/next-in-series';
import PrevNextNav from '@/components/ui/TextbookNav/PrevNextNav';

/**
 * NextInSeries — 記事末の「前の記事・次の記事」。並びは資格ページと同じ category-curriculum.json（next-in-series.ts）。
 * クリックは internal_nav_click（label=series-nav）。
 */
export default function NextInSeries({
  category,
  currentSlug,
  categoryArticles,
}: {
  category: string | undefined;
  currentSlug: string;
  categoryArticles: readonly DocMeta[];
}) {
  const available = new Map(categoryArticles.map((m) => [m.slug, m.shortTitle ?? m.title] as const));
  const nav = resolveSeriesNav(category, currentSlug, available);
  if (!nav) return null;
  return (
    <PrevNextNav
      heading={`${nav.heading}の続き`}
      track="series-nav"
      prev={nav.prev}
      next={nav.next}
      prevLabel="前の記事"
      nextLabel="次に読む"
    />
  );
}
