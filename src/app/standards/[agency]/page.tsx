import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import TwoColumnShell from '@/components/layout/TwoColumnShell';
import StandardsAttribution from '@/components/standards/StandardsAttribution';
import StandardDocumentCard from '@/components/standards/StandardDocumentCard';
import StandardsNavigation from '@/components/standards/StandardsNavigation';
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
      <TwoColumnShell
        as="div"
        mainClassName="py-8 sm:py-10"
        aside={<StandardsNavigation agencyId={agency} />}
      >

        <div className="card-surface-section px-5 pb-8 sm:px-8 sm:pb-10 lg:px-10">
      <PageHeader
        variant="inline"
        className="border-b border-[var(--rule-soft)] py-6 sm:py-8"
        breadcrumb={[{ label: 'ホーム', href: '/' }, { label: '基準類', href: '/standards' }, { label: entry.agencyName }]}
        title={entry.agencyName}
        meta={<span className="text-sm">{entry.documentCount}文書 · {entry.pages.toLocaleString('ja-JP')}ページ</span>}
      />
        <div className="pt-5">
        <section aria-labelledby="agency-documents">
          <div className="mb-3">
            <h2 id="agency-documents" className="text-2xl font-bold text-[var(--ink)]">収録文書</h2>
            <p className="mt-2 text-[14px] leading-[1.8] text-[var(--ink-muted)]">
              読みたい文書を選んでください。
            </p>
          </div>
          <div className="grid gap-x-5 sm:grid-cols-2">
            {documents.map((document) => <StandardDocumentCard key={document.documentId} document={document} variant="row" />)}
          </div>
        </section>
        </div>
        </div>
        <div className="mt-6 zenn-desktop:hidden">
          <StandardsNavigation agencyId={agency} variant="mobile" />
        </div>
        <StandardsAttribution />
      </TwoColumnShell>
    </PageShell>
  );
}
