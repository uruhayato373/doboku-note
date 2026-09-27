import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import SectionBlock from '@/components/layout/SectionBlock';
import TopicArticles, { type TopicArea } from '@/components/topics/TopicArticles';
import { getPublicDocPath } from '@/lib/content-routes';
import { getCategoryBySlug, getCategoryLabel } from '@/lib/categories';
import { getAreaLabel, getCategoryArea } from '@/lib/content-taxonomy';
import { getOgpDisplayUrl } from '@/lib/r2-image-loader';
import StandardDocumentCard from '@/components/standards/StandardDocumentCard';
import { buildPageMetadata } from '@/lib/metadata';
import { getAllTopics, getTopicBySlug, getTopicDocs, getTopicStandards } from '@/lib/topics';

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getAllTopics().map((topic) => ({ slug: topic.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const topic = getTopicBySlug((await params).slug);
  return topic
    ? buildPageMetadata({
        title: topic.seoTitle ?? `${topic.label}｜試験・実務・基準を横断`,
        description: topic.description,
        path: `/topics/${topic.slug}`,
      })
    : { title: 'テーマが見つかりません', robots: { index: false, follow: false } };
}

export default async function TopicPage({ params }: { params: Promise<Params> }) {
  const topic = getTopicBySlug((await params).slug);
  if (!topic) notFound();
  const docs = getTopicDocs(topic);
  const standards = getTopicStandards(topic);
  const areaLabels: Record<TopicArea, string> = { exam: getAreaLabel('exam'), practice: getAreaLabel('practice'), standards: getAreaLabel('standards') };
  const areaCount = (area: TopicArea) => docs.filter(doc => getCategoryArea(String(doc.category)) === area).length;
  const areaNav = (['exam', 'practice', 'standards'] as TopicArea[])
    .map(area => ({ area, count: area === 'standards' ? areaCount(area) + standards.length : areaCount(area) }))
    .filter(({ count }) => count > 0);

  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        breadcrumb={[{ label: 'ホーム', href: '/' }, { label: 'テーマ', href: '/topics' }, { label: topic.label }]}
        label="TOPIC HUB"
        title={topic.label}
        lead={topic.description}
        meta={`記事 ${docs.length}件 / 基準資料 ${standards.length}件`}
      />
      {topic.intro && topic.intro.length > 0 && (
        <SectionBlock space="sm" ariaLabel="このテーマの要点">
          <h2 className="mb-4 font-serif text-2xl font-bold text-[var(--ink)]">{topic.label}で押さえること</h2>
          <div className="max-w-[780px] space-y-4 text-[15px] leading-[1.9] text-[var(--ink-body)]">
            {topic.intro.map((paragraph) => <p key={paragraph.slice(0, 24)}>{paragraph}</p>)}
          </div>
        </SectionBlock>
      )}
      <SectionBlock divider={topic.intro?.length ? 'top' : 'none'} ariaLabel="関連記事">
        {areaNav.length > 1 && (
          <nav aria-label="領域へ移動" className="mb-6 flex flex-wrap gap-x-5 gap-y-1">
            {areaNav.map(({ area, count }) => (
              <a key={area} className="focus-ring inline-block py-3 text-[var(--accent)] underline" href={area === 'standards' && standards.length > 0 ? '#topic-standards' : `#area-${area}`}>{areaLabels[area]}（{count}件） →</a>
            ))}
          </nav>
        )}
        <h2 className="mb-6 font-serif text-2xl font-bold text-[var(--ink)]">試験対策・実務ノート</h2>
        <TopicArticles articles={docs.map(doc => ({
          href: getPublicDocPath(doc.slug), title: doc.shortTitle || doc.title,
          description: doc.subtitle || doc.description || '', category: String(doc.category),
          categoryLabel: getCategoryLabel(String(doc.category)), image: getOgpDisplayUrl(doc.slug),
          categoryOrder: getCategoryBySlug(String(doc.category))?.order ?? 999, area: getCategoryArea(String(doc.category)),
          kind: doc.category === 'civil-practice' ? '実務' : doc.category === 'concrete-engineer' && doc.group === 'primary' ? '演習' : ({guide:'受験ガイド', textbook:'テキスト', keyword:'用語', primary:'過去問', secondary:'過去問', 'past-exam':'過去問', pillar:'まとめ'}[String(doc.group)] ?? '解説'),
        }))} areaLabels={areaLabels} />
      </SectionBlock>
      {standards.length > 0 && (
        <SectionBlock divider="top" ariaLabel="関連する基準資料">
          <h2 id="topic-standards" className="mb-6 scroll-mt-24 font-serif text-2xl font-bold text-[var(--ink)]">関連する公的基準・マニュアル</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {standards.map((document) => <StandardDocumentCard key={`${document.agencyId}-${document.documentId}`} document={document} />)}
          </div>
        </SectionBlock>
      )}
    </PageShell>
  );
}
