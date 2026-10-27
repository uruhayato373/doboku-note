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
import AffiliateSlot from '@/components/ui/AffiliateSlot/AffiliateSlot';
import { standardsAgencyPath } from '@/lib/route-paths';
import { getAreaLabel } from '@/lib/content-taxonomy';

type Params = { agency: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getStandardsCatalog().agencies.map((agency) => ({ agency: agency.agencyId }));
}

/** 文書名から「令和N年◯月/度(改定/版)」の版表記を抜き出す（原題の言い回しをそのまま使う）。 */
function extractEdition(title: string): string | null {
  const matches = [...title.matchAll(/令和\d+年(?:度)?(?:\d+月)?(?:[改定版]+)?/g)];
  return matches.at(-1)?.[0] ?? null;
}

/** 共通仕様書を持たない発行元（本省の施工管理基準など）は、収録している文書名で見出しを立てる */
function agencyHeading(agencyName: string, documents: { title: string }[]): string {
  const [only] = documents;
  return documents.length === 1 && only ? `${agencyName} ${only.title}` : `${agencyName} 公開の技術基準`;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { agency } = await params;
  const entry = getStandardsCatalog().agencies.find((candidate) => candidate.agencyId === agency);
  if (!entry) return { title: '発行機関が見つかりません', robots: { index: false, follow: false } };
  const documents = getStandardDocuments(agency);
  const commonDoc = documents.find((document) => document.role === 'common') ?? null;
  const edition = commonDoc ? extractEdition(commonDoc.title) : null;
  const leadDoc = commonDoc ?? documents[0] ?? null;
  return buildPageMetadata({
    title: commonDoc
      ? `${entry.agencyName} 土木工事共通仕様書${edition ? `（${edition}）` : ''}・工事必携`
      : agencyHeading(entry.agencyName, documents),
    description: `${entry.agencyName}が公開する${leadDoc ? `「${leadDoc.title}」` : '技術基準'}${entry.documentCount > 1 ? `ほか${entry.documentCount}文書` : ''}、全${entry.pages.toLocaleString('ja-JP')}ページの文字起こし一覧。原典・版・QA情報を明示しています。`,
    path: standardsAgencyPath(agency),
  });
}

export default async function StandardsAgencyPage({ params }: { params: Promise<Params> }) {
  const { agency } = await params;
  const entry = getStandardsCatalog().agencies.find((candidate) => candidate.agencyId === agency);
  if (!entry) notFound();
  const documents = getStandardDocuments(agency);
  const commonDoc = documents.find((document) => document.role === 'common') ?? null;
  const edition = commonDoc ? extractEdition(commonDoc.title) : null;
  const leadDoc = commonDoc ?? documents[0] ?? null;

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
        className="border-b border-(--rule-soft) py-6 sm:py-8"
        breadcrumb={[{ label: 'ホーム', href: '/' }, { label: getAreaLabel('standards'), href: '/standards' }, { label: entry.agencyName }]}
        title={commonDoc ? `${entry.agencyName} 土木工事共通仕様書${edition ? `（${edition}）` : ''}` : agencyHeading(entry.agencyName, documents)}
        lead={leadDoc
          ? `${entry.agencyName}が公表する最新版「${leadDoc.title}」（全${leadDoc.pages.toLocaleString('ja-JP')}ページ）を含む${entry.documentCount}文書を収録しています。下の一覧から文書を選ぶと、版・章ごとに読めます。原本PDFと発行元ページへのリンクはページ末尾の出典欄にあります。`
          : undefined}
        meta={<span className="text-sm">{entry.documentCount}文書 · {entry.pages.toLocaleString('ja-JP')}ページ</span>}
      />
        <div className="pt-5">
        <section aria-labelledby="agency-documents">
          <div className="mb-3">
            <h2 id="agency-documents" className="text-2xl font-bold text-(--ink)">収録文書</h2>
            <p className="mt-2 text-[14px] leading-[1.8] text-(--ink-muted)">
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
        {/* 転職の案内は本文の外の末尾に 1 枠（章ページ以外の公的基準・右のナビ欄には置かない）。案件は配置ルール */}
        <AffiliateSlot page={{ pageKind: 'standards-list' }} slot="standards-list-end" className="mt-6" />
        {commonDoc ? <StandardsAttribution document={commonDoc} /> : <StandardsAttribution />}
      </TwoColumnShell>
    </PageShell>
  );
}
