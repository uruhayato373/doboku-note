import type { DocMeta } from '@/lib/docs';
import { resolveSeriesNav } from '@/lib/next-in-series';
import PrevNextNav from '@/components/ui/TextbookNav/PrevNextNav';
import { getCardImage } from '@/lib/site-thumbnail';

/**
 * NextInSeries — 記事末の「前の記事・次の記事」。並びは資格ページと同じ category-curriculum.json（next-in-series.ts）。
 * クリックは internal_nav_click（label=series-nav）。左右 2 枚のサムネイルカード（教科書の章・過去問の年度の前後ナビは文字のまま）。
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
  const withImage = (item: { slug: string; title: string } | null) => {
    const doc = item && categoryArticles.find((m) => m.slug === item.slug);
    return item && doc ? { ...item, image: getCardImage(doc) } : item;
  };
  return (
    <PrevNextNav
      heading={`${nav.heading}の続き`}
      track="series-nav"
      prev={withImage(nav.prev)}
      next={withImage(nav.next)}
      prevLabel="前の記事"
      nextLabel="次に読む"
    />
  );
}
