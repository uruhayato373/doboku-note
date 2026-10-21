/**
 * 記事末の「この記事のテーマ」カード（content-taxonomy.md §6-3）。
 *
 * 記事が属するテーマ（分野・施工管理・法令の軸。src/config/topics.json）ごとに、テーマのページへのリンクと、
 * 同じテーマを他の資格・実務で扱う記事を並べる。中身は src/lib/article-end-wiring.ts の resolveTopicHubLinks が選ぶ。
 *
 * 計測: root の data-cta="nav"（label topic-hub）。リンクごとに data-cta-label でテーマへのリンク（topic-hub:hub）と
 * 記事へのリンク（topic-hub:article）を分ける（AnalyticsProvider はリンク側のラベルを優先する）。
 *
 * MDX には書かれない。DocPage → ArticleFooter で render-time に注入される。
 */
import Link from 'next/link';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import MetaListItem from '@/components/ui/MetaListItem/MetaListItem';
import type { TopicHubLink } from '@/lib/article-end-wiring';

export default function TopicHubLinks({ links }: { links: readonly TopicHubLink[] }) {
  if (links.length === 0) return null;
  return (
    <MetaCard ariaLabel="この記事のテーマ" trackNav="topic-hub">
      <h2 className="text-lg font-bold text-(--ink) mb-1">この記事のテーマ</h2>
      <p className="text-sm text-(--ink-muted) mb-4">
        同じテーマを、ほかの資格の試験対策や現場の実務でどう扱うか
      </p>
      <ul className="space-y-5">
        {links.map(({ topic, total, picks }) => (
          <li key={topic.slug}>
            <Link
              href={`/topics/${topic.slug}`}
              data-cta-label="topic-hub:hub"
              className="focus-ring inline-block font-medium text-(--accent) hover:underline"
            >
              {topic.label}のテーマを見る（{total}件） →
            </Link>
            {picks.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {picks.map((doc) => (
                  <li key={doc.slug}>
                    <Link href={doc.href} data-cta-label="topic-hub:article" className="block group">
                      <MetaListItem title={doc.title} source={doc.categoryLabel} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </MetaCard>
  );
}
