import type { DocMeta } from '@/lib/docs';
import { resolveArticleSeriesNav, type SeriesGroupOf } from '@/lib/next-in-series';
import PrevNextNav from '@/components/ui/PrevNextNav/PrevNextNav';
import { getCardImage } from '@/lib/site-thumbnail';

/**
 * NextInSeries — 記事末の「前の記事・次の記事」。並びは資格ページと同じ category-curriculum.json（next-in-series.ts）。
 * クリックは internal_nav_click（label=series-nav）。左右 2 枚のサムネイルカード（教科書の章・過去問の年度の前後ナビは文字のまま）。
 */
export default function NextInSeries({
  category,
  currentSlug,
  categoryArticles,
  ownGroup,
}: {
  category: string | undefined;
  currentSlug: string;
  categoryArticles: readonly DocMeta[];
  /** 資格ページと別の並べ方をする領域（法令はテーマごと）の列。呼び出し側が渡す（この部品はテーマの一覧を読まない） */
  ownGroup?: SeriesGroupOf | undefined;
}) {
  const nav = resolveArticleSeriesNav(category, currentSlug, categoryArticles, ownGroup);
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
