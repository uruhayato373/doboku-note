import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import SectionBlock from '@/components/layout/SectionBlock';
import { DocCard } from '@/components/category/CategorySections';
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
        title: `${topic.label}｜試験・実務・基準を横断`,
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
      <SectionBlock ariaLabel="関連記事">
        <h2 className="mb-6 font-serif text-2xl font-bold text-[var(--ink)]">試験対策・実務ノート</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc) => <DocCard key={doc.slug} doc={doc} />)}
        </div>
      </SectionBlock>
      {standards.length > 0 && (
        <SectionBlock divider="top" ariaLabel="関連する基準資料">
          <h2 className="mb-6 font-serif text-2xl font-bold text-[var(--ink)]">関連する公的基準・マニュアル</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {standards.map((document) => <StandardDocumentCard key={`${document.agencyId}-${document.documentId}`} document={document} />)}
          </div>
        </SectionBlock>
      )}
    </PageShell>
  );
}
