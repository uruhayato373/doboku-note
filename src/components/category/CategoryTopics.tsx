/**
 * 資格のハブの「テーマから探す」（content-taxonomy.md §6-3）。この資格の記事が属す横断テーマ（分野・施工管理・法令）を、
 * この資格の記事の多い順に並べ、テーマのページ（他の資格・実務・公的基準を束ねる）へ送る。
 *
 * テーマには画像が無いので、テーマの代表記事（topics.json の featured。この資格の記事を優先）の画像を左に出す（2026-11-22・以前は文字のタイル）。
 * 計測: root の data-cta="nav"（label category-topics）。AnalyticsProvider が internal_nav_click として拾う。
 */
import ArticleThumbRow from '@/components/ui/ArticleThumbRow/ArticleThumbRow';
import { getTopicDocs, getTopicsForCategory, type Topic } from '@/lib/topics';
import type { DocMeta } from '@/lib/docs';
import { topicPath } from '@/lib/route-paths';
import { getCardImage } from '@/lib/site-thumbnail';

/** テーマの代表記事（featured の順で、この資格の記事 → ほかの記事。無ければテーマの最初の記事） */
function topicCoverDoc(topic: Topic, docs: DocMeta[]): DocMeta | undefined {
  const inCategory = new Map(docs.map((doc) => [doc.slug, doc]));
  const all = getTopicDocs(topic);
  const bySlug = new Map(all.map((doc) => [doc.slug, doc]));
  const featured = topic.featured ?? [];
  return featured.map((slug) => inCategory.get(slug)).find(Boolean)
    ?? featured.map((slug) => bySlug.get(slug)).find(Boolean)
    ?? docs.find((doc) => all.includes(doc))
    ?? all[0];
}

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
        {items.map(({ topic, inCategory, total }) => {
          const cover = topicCoverDoc(topic, docs);
          return (
            <li key={topic.slug}>
              <ArticleThumbRow
                href={topicPath(topic.slug)}
                title={topic.label}
                image={cover ? getCardImage(cover) : undefined}
                meta={`この資格 ${inCategory}件・全体 ${total}件`}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
