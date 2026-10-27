/**
 * 資格のハブの「テーマから探す」（content-taxonomy.md §6-3）。この資格の記事が属す横断テーマ（分野・施工管理・法令）を、
 * この資格の記事の多い順に並べ、テーマのページ（他の資格・実務・公的基準を束ねる）へ送る。
 *
 * 計測: root の data-cta="nav"（label category-topics）。AnalyticsProvider が internal_nav_click として拾う。
 */
import Link from 'next/link';
import { getTopicsForCategory } from '@/lib/topics';
import type { DocMeta } from '@/lib/docs';
import { topicPath } from '@/lib/route-paths';

export default function CategoryTopics({ docs }: { docs: DocMeta[] }) {
  const items = getTopicsForCategory(docs);
  if (items.length === 0) return null;
  return (
    <section className="mt-12 border-t border-(--rule-soft) pt-8 dark:border-(--rule-soft)" aria-labelledby="category-topics-heading">
      <h2 id="category-topics-heading" className="font-serif text-[20px] font-bold text-(--ink)">テーマから探す</h2>
      <p className="mt-2 text-[14px] leading-[1.8] text-(--ink-muted)">
        同じテーマを、ほかの資格の試験対策・現場の実務・公的基準と合わせて読めます。
      </p>
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2" data-cta="nav" data-cta-label="category-topics">
        {items.map(({ topic, inCategory, total }) => (
          <li key={topic.slug}>
            <Link
              href={topicPath(topic.slug)}
              className="focus-ring block h-full rounded-card-content border border-(--rule-soft) px-4 py-3 transition-colors hover:border-(--accent) dark:border-(--rule-soft)"
            >
              <span className="block text-[15px] font-medium text-(--ink)">{topic.label}</span>
              <span className="mt-0.5 block text-[12px] text-(--ink-muted)">この資格 {inCategory}件・全体 {total}件</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
