import type { Metadata } from 'next';
import Link from 'next/link';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import TwoColumnShell from '@/components/layout/TwoColumnShell';
import StandardsExplore from '@/components/standards/StandardsExplore';
import StandardsAttribution from '@/components/standards/StandardsAttribution';
import { StandardsEndBanner, StandardsSidebarBanners } from '@/components/standards/StandardsAffiliateBanners';
import { buildPageMetadata } from '@/lib/metadata';
import { getStandardDocuments, getStandardsCatalog, standardDocumentPath } from '@/lib/standards';
import { standardsAgencyPath, standardsDocumentPath } from '@/lib/route-paths';

const { totals } = getStandardsCatalog();

export const metadata: Metadata = buildPageMetadata({
  title: '土木工事共通仕様書・工事必携 全文検索ライブラリ',
  description: `国土交通省と地方整備局等${totals.agencies}機関が公開する土木工事共通仕様書、施工管理基準、土木請負工事必携、施工管理・工事書類マニュアル${totals.documents}文書${totals.pages.toLocaleString('ja-JP')}ページを全文文字起こし。発行機関から資料を探し、原典・版を確認できます。`,
  path: '/standards',
});

// 章が深い階層に並ぶ文書は、一覧から直接たどれるようにする（未クロールの章が多い 4 文書）。
const MAJOR_DOCUMENTS = [
  { agencyId: 'kinki', documentId: 'common', label: '土木工事共通仕様書', note: '近畿地方整備局' },
  { agencyId: 'kinki', documentId: 'hikkei', label: '土木請負工事必携', note: '近畿地方整備局' },
  { agencyId: 'kyushu', documentId: 'management-manual', label: '土木工事施工管理の手引き', note: '九州地方整備局' },
  { agencyId: 'mlit', documentId: 'sekou-kanri-kijun', label: '土木工事施工管理基準及び規格値（案）', note: '国土交通省' },
];

const rowLink = 'focus-ring flex min-h-11 items-center justify-between gap-3 px-2 py-2 text-(--ink) transition-colors hover:bg-(--accent-fill) hover:text-(--accent)';
const MAX_AGENCY_DOCS = 3;

export default function StandardsPage() {
  const catalog = getStandardsCatalog();

  return (
    <PageShell variant="default">
      <TwoColumnShell
        as="div"
        aside={(
          <div className="space-y-4">
            <StandardsExplore />
            <StandardsSidebarBanners pageKind="standards-list" />
          </div>
        )}
      >
        <div className="card-surface-section px-5 pb-8 sm:px-8 sm:pb-10 lg:px-10">
          <PageHeader
            className="border-b border-(--rule-soft) py-5 sm:py-6"
            title="土木工事共通仕様書・工事必携"
            meta={<span className="text-sm">全国{catalog.totals.agencies}機関 · {catalog.totals.documents}文書 · {catalog.totals.pages.toLocaleString('ja-JP')}ページ</span>}
          />

          <section aria-labelledby="major-documents-heading" className="mt-5">
            <h2 id="major-documents-heading" className="mb-2 text-xl font-bold text-(--ink)">よく使う文書</h2>
            <ul className="grid gap-x-4 sm:grid-cols-2" data-standards-list="major">
              {MAJOR_DOCUMENTS.map((doc) => (
                <li key={`${doc.agencyId}-${doc.documentId}`} className="border-b border-(--rule-soft)">
                  <Link href={standardsDocumentPath(doc.agencyId, doc.documentId)} data-cta="nav" data-cta-label="standards-document" className={rowLink}>
                    <span className="min-w-0">
                      <span className="block font-bold">{doc.label}</span>
                      <span className="block text-sm text-(--ink-body)">{doc.note}</span>
                    </span>
                    <span aria-hidden="true" className="text-(--accent)">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section id="agencies" aria-labelledby="agencies-heading" className="mt-7 scroll-mt-6">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="agencies-heading" className="text-xl font-bold text-(--ink)">発行機関から探す</h2>
              <span className="text-sm text-(--ink-body)">全{catalog.totals.agencies}機関</span>
            </div>
            <ul className="grid gap-x-4 sm:grid-cols-2" data-standards-list="agencies">
              {catalog.agencies.map((agency) => {
                const documents = getStandardDocuments(agency.agencyId);
                const shown = documents.slice(0, MAX_AGENCY_DOCS);
                const rest = documents.length - shown.length;
                return (
                  <li key={agency.agencyId} className="border-b border-(--rule-soft) pb-2">
                    <Link href={standardsAgencyPath(agency.agencyId)} data-cta="nav" data-cta-label="standards-agency" className={rowLink}>
                      <span className="font-bold">{agency.agencyName}</span>
                      <span aria-hidden="true" className="text-(--accent)">→</span>
                    </Link>
                    <ul className="flex flex-wrap gap-x-3 px-2 text-[13px] leading-[1.7]">
                      {shown.map((document) => (
                        <li key={document.documentId}>
                          <Link href={standardDocumentPath(document)} data-cta="nav" data-cta-label="standards-document" className="text-(--accent) hover:underline">{document.title}</Link>
                        </li>
                      ))}
                      {rest > 0 && <li className="text-(--ink-muted)">ほか{rest}文書</li>}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="mt-6 zenn-desktop:hidden">
          <StandardsExplore />
        </div>
        <StandardsEndBanner pageKind="standards-list" />
        <StandardsAttribution />
      </TwoColumnShell>
    </PageShell>
  );
}
