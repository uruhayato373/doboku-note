import type { Metadata } from 'next';
import Link from 'next/link';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import TwoColumnShell from '@/components/layout/TwoColumnShell';
import StandardsExplore from '@/components/standards/StandardsExplore';
import StandardsAttribution from '@/components/standards/StandardsAttribution';
import { buildPageMetadata } from '@/lib/metadata';
import { getStandardsCatalog } from '@/lib/standards';

export const metadata: Metadata = buildPageMetadata({
  title: '土木工事共通仕様書・工事必携 全文検索ライブラリ',
  description: '国土交通省の地方整備局等10機関が公開する土木工事共通仕様書、土木請負工事必携、施工管理・工事書類マニュアル72文書11,109ページを全文文字起こし。発行機関から資料を探し、原典・版を確認できます。',
  path: '/standards',
});

const rowLink = 'focus-ring flex min-h-12 items-center justify-between gap-3 px-4 py-3 text-[var(--ink)] transition-colors hover:bg-[var(--accent-fill)] hover:text-[var(--accent)]';

export default function StandardsPage() {
  const catalog = getStandardsCatalog();

  return (
    <PageShell variant="default">
      <TwoColumnShell
        as="div"
        aside={<StandardsExplore />}
      >
        <div className="card-surface-section px-5 pb-8 sm:px-8 sm:pb-10 lg:px-10">
          <PageHeader
            className="border-b border-[var(--rule-soft)] py-6 sm:py-8"
            title="土木工事共通仕様書・工事必携"
            lead="発行機関を選んで、共通仕様書・工事必携・施工管理資料を読む。"
            meta={<span className="text-sm">全国{catalog.totals.agencies}機関 · {catalog.totals.documents}文書 · {catalog.totals.pages.toLocaleString('ja-JP')}ページ</span>}
          />

          <section id="agencies" aria-labelledby="agencies-heading" className="mt-7 scroll-mt-6">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="agencies-heading" className="text-xl font-bold text-[var(--ink)]">発行機関から探す</h2>
              <span className="text-sm text-[var(--ink-body)]">全{catalog.totals.agencies}機関</span>
            </div>
            <ul className="grid gap-x-4 sm:grid-cols-2">
              {catalog.agencies.map((agency) => (
                <li key={agency.agencyId} className="border-b border-[var(--rule-soft)]">
                  <Link href={`/standards/${agency.agencyId}`} className={rowLink}>
                    <span className="min-w-0">
                      <span className="block font-bold">{agency.agencyName}</span>
                      <span className="mt-1 block text-sm text-[var(--ink-body)]">{agency.documentCount}文書 · {agency.pages.toLocaleString('ja-JP')}ページ</span>
                    </span>
                    <span aria-hidden="true" className="text-[var(--accent)]">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="mt-6 zenn-desktop:hidden">
          <StandardsExplore />
        </div>
        <StandardsAttribution />
      </TwoColumnShell>
    </PageShell>
  );
}
