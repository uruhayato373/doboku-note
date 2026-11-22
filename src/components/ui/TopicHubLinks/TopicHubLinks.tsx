/**
 * 記事末の「この記事のテーマ」カード（content-taxonomy.md §6-3）。
 *
 * 記事が属するテーマ（分野・施工管理・法令の軸。src/config/topics.json）ごとに、テーマのページへのリンクと、
 * 同じテーマを他の資格・実務で扱う記事を並べる。中身は src/lib/article-end-wiring.ts の resolveTopicHubLinks が選ぶ。
 *
 * 記事へのリンクは小型サムネイルつき（ArticleThumbRow・リンクの data-thumb で写真と OGP を分けて計測する）。
 *
 * 計測: root の data-cta="nav"（label topic-hub）。リンクごとに data-cta-label でテーマへのリンク（topic-hub:hub）と
 * 記事へのリンク（topic-hub:article）を分ける（AnalyticsProvider はリンク側のラベルを優先する）。
 *
 * MDX には書かれない。DocPage → ArticleFooter で render-time に注入される。
 */
import Link from 'next/link';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import ArticleThumbRow from '@/components/ui/ArticleThumbRow/ArticleThumbRow';
import type { TopicHubLink } from '@/lib/article-end-wiring';
import { topicPath } from '@/lib/route-paths';
import { getCardImage } from '@/lib/site-thumbnail';
import Arrow from '@/components/ui/Arrow/Arrow';

export default function TopicHubLinks({ links }: { links: readonly TopicHubLink[] }) {
  if (links.length === 0) return null;
  return (
    <MetaCard ariaLabel="この記事のテーマ" trackNav="topic-hub" title="この記事のテーマ" lead="同じテーマを、ほかの資格の試験対策や現場の実務でどう扱うか">
      <ul className="space-y-5">
        {links.map(({ topic, total, picks }) => (
          <li key={topic.slug}>
            <Link
              href={topicPath(topic.slug)}
              data-cta-label="topic-hub:hub"
              className="focus-ring inline-block font-medium text-(--accent) hover:underline"
            >
              {topic.label}のテーマを見る（{total}件） <Arrow />
            </Link>
            {picks.length > 0 && (
              <ul className="mt-2 space-y-2">
                {picks.map((doc) => (
                  <li key={doc.slug}>
                    <ArticleThumbRow href={doc.href} title={doc.title} caption={doc.categoryLabel} image={getCardImage(doc)} ctaLabel="topic-hub:article" />
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
