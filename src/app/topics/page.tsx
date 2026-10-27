import type { Metadata } from 'next';
import Link from 'next/link';
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
              <Link
                key={topic.slug}
                href={topicPath(topic.slug)}
                className="focus-ring card-interactive border border-(--rule-soft) bg-(--paper) p-5 transition-[border-color,box-shadow] hover:border-(--accent)"
              >
                <TopicIcon slug={topic.slug} />
                <h3 className="font-serif text-lg font-bold text-(--ink)">{topic.label}</h3>
                <p className="mt-2 text-[13px] leading-[1.75] text-(--ink-muted)">{topic.description}</p>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-(--accent)">
                  記事 {docs.length} / 基準資料 {standards.length}
                </p>
              </Link>
            );
          })}
        </div>
      </SectionBlock>
      ))}
      {/* 転職の案内（ページ末に 1 枠。案件は配置ルール） */}
      <AffiliateSlot page={{ pageKind: 'topic' }} slot="topic-end" className="max-w-[760px] mx-auto px-4 sm:px-6 pb-10" />
    </PageShell>
  );
}
