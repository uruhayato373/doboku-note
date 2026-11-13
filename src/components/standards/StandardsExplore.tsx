import Link from 'next/link';
import SectionCard from '@/components/ui/SectionCard/SectionCard';
import { getDocsMetaByCategory } from '@/lib/docs';
import { getPublicDocPath } from '@/lib/content-routes';
import { resolveNavTitle } from '@/lib/doc-title';
import { getAllTopics } from '@/lib/topics';
import { topicPath } from '@/lib/route-paths';
import QualificationBridge from '@/components/ui/QualificationBridge/QualificationBridge';
import { StandardEntryChapters } from '@/components/standards/StandardsSidebarDiscovery';

// 基準書の規定を実務へつなぐ入口。表示名・公開状態は既存の索引から解決する。
const topicSlugs = ['quality-management', 'construction-management', 'concrete', 'earthwork-foundations', 'safety-laws', 'roads'];
const practiceSlugs = ['construction-plan-document', 'embankment-quality-control', 'concrete-mix-acceptance'];

export default function StandardsExplore() {
  const topics = getAllTopics();
  const practiceDocs = getDocsMetaByCategory('civil-practice').filter(doc => doc.published !== false && !doc.hideFromCategory);
  const selectedDocs = practiceSlugs.flatMap(slug => {
    const doc = practiceDocs.find(item => item.slug === `civil-practice-${slug}`);
    return doc ? [doc] : [];
  });
  const small = 'focus-ring inline-flex min-h-11 items-center text-[13px] text-(--accent) underline underline-offset-4';

  return (
    <div className="space-y-4" data-standards-explore>
      {/* 全国版（近畿版にまとめた共通の本文）の入口の章。トップから章へ 1 クリックで入れる */}
      <StandardEntryChapters agencyId="kinki" heading="共通仕様書を章から読む" />
      <SectionCard padding="compact">
        <h2 className="text-lg font-bold text-(--ink)">テーマから読む</h2>
        <nav aria-label="基準と関連する技術テーマ" className="mt-2 divide-y divide-(--rule-soft)">
          {topicSlugs.flatMap(slug => {
            const topic = topics.find(item => item.slug === slug);
            return topic ? [
              <Link key={slug} href={topicPath(slug)} data-cta="nav" data-cta-label="standards-topic"
                className="focus-ring flex min-h-11 items-center justify-between gap-2 px-2 py-2 text-sm font-bold text-(--accent) transition-colors hover:bg-(--accent-fill)">
                {topic.label}<span aria-hidden="true">›</span>
              </Link>,
            ] : [];
          })}
        </nav>
        <Link href="/topics" className="focus-ring mt-1 flex min-h-11 items-center justify-end text-sm text-(--accent) underline underline-offset-4">すべてのテーマ →</Link>
      </SectionCard>

      <nav aria-label="実務・比較・データ" className="flex flex-wrap gap-x-4 px-1">
        {selectedDocs.map(doc => (
          <Link key={doc.slug} href={getPublicDocPath(doc.slug)} data-cta="nav" data-cta-label="standards-practice" className={small}>{resolveNavTitle(doc).main}</Link>
        ))}
        <Link href="/practice" className={small}>土木施工の実務ノート</Link>
        <Link href="/standards/compare" className={small}>地方整備局別の違い</Link>
        <Link href="/standards/data" className={small}>基準本文のデータ</Link>
      </nav>

      <QualificationBridge placement="standards-sidebar" layout="sidebar" />
    </div>
  );
}
