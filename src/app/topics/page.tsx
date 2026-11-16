import type { Metadata } from 'next';
import LinkTile from '@/components/ui/LinkTile/LinkTile';
import TopicIcon from '@/components/topics/TopicIcon';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import SectionBlock from '@/components/layout/SectionBlock';
import { buildPageMetadata } from '@/lib/metadata';
import { getTopicDocs, getTopicStandards, getTopicsByFacet } from '@/lib/topics';
import AffiliateSlot from '@/components/ui/AffiliateSlot/AffiliateSlot';
import { topicPath } from '@/lib/route-paths';

export const metadata: Metadata = buildPageMetadata({
  title: '土木技術のテーマ別索引',
  description: 'コンクリート・土工・道路・河川・港湾などの分野、工程・品質・安全・環境・維持管理などの施工管理、関係法令のテーマから、資格試験・現場実務・公的基準を横断して探せます。',
  path: '/topics',
});

export default function TopicsPage() {
  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        label="TOPICS"
        title="土木技術のテーマ別索引"
        lead="資格名や資料名ではなく、現場で調べたい技術テーマから試験対策・実務ノート・公的基準を横断できます。"
      />
      {getTopicsByFacet().map(({ facet, label, topics }, index) => (
      <SectionBlock key={facet} divider={index === 0 ? 'none' : 'top'} ariaLabel={label}>
        <h2 className="mb-6 font-serif text-2xl font-bold text-(--ink)">{label}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-cta="nav" data-cta-label={`topics-index:${facet}`}>
          {topics.map((topic) => {
            const docs = getTopicDocs(topic);
            const standards = getTopicStandards(topic);
            return (
              <LinkTile
                key={topic.slug}
                href={topicPath(topic.slug)}
                size="lg"
                serif
                icon={<TopicIcon slug={topic.slug} className="" />}
                title={topic.label}
                description={topic.description}
                meta={`記事 ${docs.length} / 基準資料 ${standards.length}`}
                headingLevel="h3"
              />
            );
          })}
        </div>
      </SectionBlock>
      ))}
      {/* 転職の案内（ページ末に 1 枠。案件は配置ルール）。ほかの区画と同じ左端にそろえる（2026-10-31 まで中央に細く出ていた） */}
      <SectionBlock divider="top" ariaLabel="転職の相談先">
        <AffiliateSlot page={{ pageKind: 'topic' }} slot="topic-end" alignStart />
      </SectionBlock>
    </PageShell>
  );
}
