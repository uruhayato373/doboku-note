import type { DocMeta } from '@/lib/docs';
import { resolveGroupSeriesNav, resolveSeriesNav } from '@/lib/next-in-series';
import { findYearSiblings } from '@/lib/exam-year-nav.mjs';
import { getDocTopics, getTopicsByFacet } from '@/lib/topics';
import PrevNextNav from '@/components/ui/TextbookNav/PrevNextNav';

/** 法令は /laws と同じく、分野・立場のテーマごとの列（記事が最初に属するテーマ）で前後を決める */
function lawTopicGroup(laws: readonly DocMeta[]) {
  const topics = getTopicsByFacet().flatMap(({ topics: list }) => list).filter((t) => t.facet !== 'law');
  const lawsOf = (slug: string) => laws.filter((d) => getDocTopics(d).some((x) => x.slug === slug));
  // 法令ページが 1 本だけのテーマでは前後が無いので、2 本以上あるテーマのうち最初のものを使う
  return (doc: DocMeta) => {
    const own = getDocTopics(doc);
    const topic = topics.find((t) => own.some((x) => x.slug === t.slug) && lawsOf(t.slug).length > 1);
    return topic ? { heading: topic.label, docs: lawsOf(topic.slug) } : null;
  };
}

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
  // 並びの設定に無い記事は、資格ページと同じ並べ方の前後へ。年度違いのある過去問は年度ナビ（ExamYearNav）が受けるので出さない
  const years = findYearSiblings(currentSlug, categoryArticles.map((m) => m.slug));
  const nav = resolveSeriesNav(category, currentSlug, available)
    ?? (years.older || years.newer ? null : resolveGroupSeriesNav(category, currentSlug, categoryArticles, category === 'laws' ? { ownGroup: lawTopicGroup(categoryArticles) } : {}));
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
