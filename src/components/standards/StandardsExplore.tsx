import { Fragment, type ReactNode } from 'react';
import LinkRow, { LinkRowList } from '@/components/ui/LinkRow/LinkRow';
import { ButtonLink } from '@/components/ui/Button/Button';
import Arrow from '@/components/ui/Arrow/Arrow';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import { getDocsMetaByCategory } from '@/lib/docs';
import { getPublicDocPath } from '@/lib/content-routes';
import { resolveNavTitle } from '@/lib/doc-title';
import { getAllTopics } from '@/lib/topics';
import { topicPath } from '@/lib/route-paths';
import QualificationBridge from '@/components/ui/QualificationBridge/QualificationBridge';
import type { RailItem } from '@/components/ui/RailStack/RailStack';
import { standardEntryChaptersItem } from '@/components/standards/StandardsSidebarDiscovery';

// 基準書の規定を実務へつなぐ入口。表示名・公開状態は既存の索引から解決する。
const topicSlugs = ['quality-management', 'construction-management', 'concrete', 'earthwork-foundations', 'safety-laws', 'roads'];
const practiceSlugs = ['construction-plan-document', 'embankment-quality-control', 'concrete-mix-acceptance'];

/** トップの右の欄に並べるもの（モバイルは StandardsExplore が同じ順に本文の下へ並べる）。betweenCards は入口の章の次 */
export function standardsExploreItems(betweenCards?: ReactNode): RailItem[] {
  const topics = getAllTopics();
  const practiceDocs = getDocsMetaByCategory('civil-practice').filter(doc => doc.published !== false && !doc.hideFromCategory);
  const selectedDocs = practiceSlugs.flatMap(slug => {
    const doc = practiceDocs.find(item => item.slug === `civil-practice-${slug}`);
    return doc ? [doc] : [];
  });

  return [
    // 全国版（近畿版にまとめた共通の本文）の入口の章。トップから章へ 1 クリックで入れる
    standardEntryChaptersItem('kinki', '共通仕様書を章から読む'),
    { kind: 'career', node: betweenCards },
    {
      kind: 'nav',
      node: (
        <MetaCard padding="compact" title="テーマから読む">
          <nav aria-label="基準と関連する技術テーマ">
            <LinkRowList>
              {topicSlugs.flatMap(slug => {
                const topic = topics.find(item => item.slug === slug);
                return topic ? [
                  <LinkRow key={slug} href={topicPath(slug)} title={topic.label} arrow data={{ 'data-cta': 'nav', 'data-cta-label': 'standards-topic' }} />,
                ] : [];
              })}
            </LinkRowList>
          </nav>
          <div className="mt-1 flex justify-end"><ButtonLink href="/topics" variant="text">すべてのテーマ <Arrow /></ButtonLink></div>
        </MetaCard>
      ),
    },
    {
      kind: 'nav',
      node: (
        <MetaCard as="nav" ariaLabel="実務・比較・データ" padding="compact" title="実務・比較・データ">
          <LinkRowList>
            {selectedDocs.map(doc => (
              <LinkRow key={doc.slug} href={getPublicDocPath(doc.slug)} title={resolveNavTitle(doc).main} data={{ 'data-cta': 'nav', 'data-cta-label': 'standards-practice' }} />
            ))}
            <LinkRow href="/practice" title="土木施工の実務ノート" />
            <LinkRow href="/standards/compare" title="地方整備局別の違い" />
            <LinkRow href="/standards/data" title="基準本文のデータ" />
          </LinkRowList>
        </MetaCard>
      ),
    },
    { kind: 'bridge', node: <QualificationBridge placement="standards-bridge-sidebar" layout="sidebar" /> },
  ];
}

/** モバイル（本文の下）。右の欄と同じ並び */
export default function StandardsExplore() {
  return (
    <div className="space-y-4" data-standards-explore>
      {standardsExploreItems().map((item, index) => <Fragment key={index}>{item.node}</Fragment>)}
    </div>
  );
}
