import type { Metadata } from 'next';
import LinkTile from '@/components/ui/LinkTile/LinkTile';
import TopicIcon from '@/components/topics/TopicIcon';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import TwoColumnShell from '@/components/layout/TwoColumnShell';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import IndexRail, { indexRailData } from '@/components/layout/IndexRail';
import AdSlot from '@/components/ads/AdSlot';
import { buildPageMetadata } from '@/lib/metadata';
import { getTopicDocs, getTopicStandards, getTopicsByFacet, type Topic } from '@/lib/topics';
import AffiliateSlot from '@/components/ui/AffiliateSlot/AffiliateSlot';
import { topicPath } from '@/lib/route-paths';

export const metadata: Metadata = buildPageMetadata({
  title: '土木技術のテーマ別索引',
  description: 'コンクリート・土工・道路・河川・港湾などの分野、工程・品質・安全・環境・維持管理などの施工管理、関係法令のテーマから、資格試験・現場実務・公的基準を横断して探せます。',
  path: '/topics',
});

/** テーマがこの数以下の区分は、末尾の 1 区画にまとめて見せる（区分の定義 content-taxonomy.json は変えない） */
const SMALL_FACET_MAX = 2;

function TopicTile({ topic, facet, eyebrow }: { topic: Topic; facet: string; eyebrow?: string | undefined }) {
  return (
    <LinkTile
      href={topicPath(topic.slug)}
      size="lg"
      serif
      icon={<TopicIcon slug={topic.slug} className="" />}
      eyebrow={eyebrow}
      title={topic.label}
      description={topic.description}
      meta={`記事 ${getTopicDocs(topic).length} / 基準資料 ${getTopicStandards(topic).length}`}
      headingLevel="h3"
      data={{ 'data-cta': 'nav', 'data-cta-label': `topics-index:${facet}` }}
    />
  );
}

export default function TopicsPage() {
  const facets = getTopicsByFacet().filter((f) => f.topics.length > 0);
  const large = facets.filter((f) => f.topics.length > SMALL_FACET_MAX);
  const small = facets.filter((f) => f.topics.length <= SMALL_FACET_MAX);
  const sections = [
    ...large.map((f) => ({ id: f.facet, label: f.label, items: f.topics.map((topic) => ({ topic, facet: f.facet, eyebrow: undefined as string | undefined })) })),
    ...(small.length > 0 ? [{
      id: 'others',
      label: small.length > 1 ? 'そのほかのテーマ' : small[0]!.label,
      items: small.flatMap((f) => f.topics.map((topic) => ({ topic, facet: f.facet, eyebrow: small.length > 1 ? f.label : undefined }))),
    }] : []),
  ];
  const railData = indexRailData();

  return (
    <PageShell variant="default">
      {/* 右の欄（PC ≥993px）。並びは IndexRail（/search と同じ）。転職のピクセルは末尾の topic-end が持つ（同じ案件） */}
      <TwoColumnShell
        as="div"
        stretchAside
        aside={(
          <IndexRail
            ad={<AdSlot slot="rail" />}
            ad2={<AdSlot slot="rail" />}
            career={{ page: { pageKind: 'topic' }, slot: 'topic-rail', pageSlots: ['topic-end', 'topic-rail'] }}
            data={railData}
            label="topics"
          />
        )}
      >
        {/* 左の列を 1 枚の白い面にする（資格トップ・基準書・テーマの個別ページと同じ。2026-11-23 まで背景の上に直に載っていた） */}
        <MetaCard padding="none" as="div" className="px-5 pb-8 sm:px-8 sm:pb-10 lg:px-10">
        <PageHeader
          variant="inline"
          titleSize="lg"
          breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Topics' }]}
          title="土木技術のテーマ別索引"
          lead="資格名や資料名ではなく、現場で調べたい技術テーマから試験対策・実務ノート・公的基準を横断できます。"
          className="border-b border-(--rule-soft) py-5 sm:py-6 dark:border-(--rule-soft)"
        />
        <nav aria-label="テーマの区分" className="mt-6 mb-8 flex flex-wrap gap-3">
          {sections.map((s) => (
            <a key={s.id} href={`#topics-${s.id}`} className="focus-ring rounded-card-inline border border-(--rule-soft) dark:border-(--rule-soft) px-4 py-3 text-sm text-(--ink)">
              {s.label} <span className="text-(--ink-muted)">{s.items.length}</span>
            </a>
          ))}
        </nav>
        {sections.map((s) => (
          <section key={s.id} id={`topics-${s.id}`} aria-label={s.label} className="mb-10 scroll-mt-24">
            <h2 className="mb-4 font-serif text-xl font-bold text-(--ink)">{s.label}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {s.items.map(({ topic, facet, eyebrow }) => <TopicTile key={topic.slug} topic={topic} facet={facet} eyebrow={eyebrow} />)}
            </div>
          </section>
        ))}
        {/* 転職の案内（ページ末に 1 枠。案件は配置ルール） */}
        <AffiliateSlot page={{ pageKind: 'topic' }} slot="topic-end" alignStart />
        </MetaCard>
      </TwoColumnShell>
    </PageShell>
  );
}
