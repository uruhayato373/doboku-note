import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import SectionBlock from '@/components/layout/SectionBlock';
import StandardsAttribution from '@/components/standards/StandardsAttribution';
import StandardDocumentCard from '@/components/standards/StandardDocumentCard';
import { buildPageMetadata } from '@/lib/metadata';
import { getStandardDocuments, getStandardsCatalog } from '@/lib/standards';

type Params = { agency: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getStandardsCatalog().agencies.map((agency) => ({ agency: agency.agencyId }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { agency } = await params;
  const entry = getStandardsCatalog().agencies.find((candidate) => candidate.agencyId === agency);
  if (!entry) return { title: '発行機関が見つかりません', robots: { index: false, follow: false } };
  return buildPageMetadata({
    title: `${entry.agencyName} 土木工事共通仕様書・工事必携`,
    description: `${entry.agencyName}が公開する土木工事共通仕様書・工事必携等${entry.documentCount}文書、全${entry.pages.toLocaleString('ja-JP')}ページの文字起こし一覧。原典・版・QA情報を明示しています。`,
    path: `/standards/${agency}`,
  });
}

export default async function StandardsAgencyPage({ params }: { params: Promise<Params> }) {
  const { agency } = await params;
  const entry = getStandardsCatalog().agencies.find((candidate) => candidate.agencyId === agency);
  if (!entry) notFound();
  const documents = getStandardDocuments(agency);

  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        breadcrumb={[{ label: 'ホーム', href: '/' }, { label: '基準類', href: '/standards' }, { label: entry.agencyName }]}
        label="PUBLIC STANDARDS"
        title={entry.agencyName}
        lead={`土木工事共通仕様書・工事必携等 ${entry.documentCount}文書を、原本PDFのページ番号を保って公開しています。`}
        meta={`${entry.pages.toLocaleString('ja-JP')}ページ / ${entry.partCount}分冊`}
      />
      <SectionBlock>
        <div className="grid gap-4 lg:grid-cols-2">
          {documents.map((document) => <StandardDocumentCard key={document.documentId} document={document} />)}
        </div>
        <StandardsAttribution />
      </SectionBlock>
    </PageShell>
  );
}
