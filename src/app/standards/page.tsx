import type { Metadata } from 'next';
import Link from 'next/link';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import SectionBlock from '@/components/layout/SectionBlock';
import SectionCard from '@/components/ui/SectionCard/SectionCard';
import StandardsAttribution from '@/components/standards/StandardsAttribution';
import StandardsAgencySelector from '@/components/standards/StandardsAgencySelector';
import StandardDocumentCard from '@/components/standards/StandardDocumentCard';
import { DocCard } from '@/components/category/CategorySections';
import { buildPageMetadata } from '@/lib/metadata';
import { getDocsMetaByCategory } from '@/lib/docs';
import { getStandardDocuments, getStandardsCatalog } from '@/lib/standards';

export const metadata: Metadata = buildPageMetadata({
  title: '土木工事共通仕様書・工事必携 全文検索ライブラリ',
  description: '国土交通省の地方整備局等10機関が公開する土木工事共通仕様書、土木請負工事必携、施工管理・工事書類マニュアル72文書11,109ページを全文文字起こし。原典・版・QA情報を明示しています。',
  path: '/standards',
});

export default function StandardsPage() {
  const catalog = getStandardsCatalog();
  const kinki = getStandardDocuments('kinki');
  const guides = getDocsMetaByCategory('reference-materials').filter((doc) => doc.published !== false);

  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        label="PUBLIC STANDARDS"
        title="土木工事共通仕様書・工事必携"
        lead="地方整備局等が公開する共通仕様書・工事必携・施工管理資料を、原本PDFのページ番号を保ったまま全文検索できる形に整理しました。"
        meta={`全国${catalog.totals.agencies}機関・${catalog.totals.documents}文書・${catalog.totals.pages.toLocaleString('ja-JP')}ページ・${catalog.totals.parts}分冊`}
      />

      <SectionBlock space="md">
        <StandardsAgencySelector agencies={catalog.agencies} />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['収録ページ', `${catalog.totals.pages.toLocaleString('ja-JP')}頁`],
            ['目視確認', `${catalog.totals.visualReviewedPages.toLocaleString('ja-JP')}頁`],
            ['文字化け', `${catalog.totals.replacementCharacters}件`],
            ['原本画質注記', `${catalog.totals.unreadableRanges}箇所`],
          ].map(([label, value]) => (
            <SectionCard key={label} padding="compact">
              <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-muted)]">{label}</div>
              <div className="mt-2 font-serif text-2xl font-bold text-[var(--ink)]">{value}</div>
            </SectionCard>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock divider="top" ariaLabel="近畿地方整備局">
        <div className="mb-6">
          <div className="font-mono text-[11px] uppercase tracking-widest text-[var(--accent)]">KINKI</div>
          <h2 className="mt-2 font-serif text-2xl font-bold text-[var(--ink)]">近畿地方整備局</h2>
          <p className="mt-2 max-w-[65ch] text-[15px] leading-[1.85] text-[var(--ink-body)]">
            本ライブラリの起点となった「土木工事共通仕様書（案）令和8年4月改定」と「土木請負工事必携 令和6年8月」です。全1,421ページを欠番なく収録しています。
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {kinki.map((document) => <StandardDocumentCard key={document.documentId} document={document} />)}
        </div>
      </SectionBlock>

      <SectionBlock divider="top" ariaLabel="発行機関別一覧">
        <div className="mb-6">
          <h2 className="font-serif text-2xl font-bold text-[var(--ink)]">発行機関から探す</h2>
          <p className="mt-2 text-[14px] leading-[1.8] text-[var(--ink-muted)]">
            共通部分が重なる仕様書は、各機関の文書ページを公開しつつ、重複する全文分冊を検索インデックスから整理しています。
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.agencies.map((agency) => (
            <Link
              key={agency.agencyId}
              href={`/standards/${agency.agencyId}`}
              className="focus-ring card-interactive border border-[var(--rule-soft)] bg-[var(--paper)] p-5 transition-[border-color,box-shadow] hover:border-[var(--accent)]"
            >
              <h3 className="font-serif text-lg font-bold text-[var(--ink)]">{agency.agencyName}</h3>
              <p className="mt-2 font-mono text-[11px] text-[var(--ink-muted)]">
                {agency.documentCount}文書 / {agency.pages.toLocaleString('ja-JP')}ページ / {agency.partCount}分冊
              </p>
            </Link>
          ))}
        </div>
      </SectionBlock>

      {guides.length > 0 && (
        <SectionBlock divider="top" ariaLabel="実務向け要点ガイド">
          <div className="mb-6">
            <h2 className="font-serif text-2xl font-bold text-[var(--ink)]">実務向け要点ガイド</h2>
            <p className="mt-2 text-[14px] leading-[1.8] text-[var(--ink-muted)]">
              原典全文とは別に、設計・施工時に確認しやすい論点を資料別に整理しています。
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {guides.map((guide) => <DocCard key={guide.slug} doc={guide} />)}
          </div>
        </SectionBlock>
      )}

      <SectionBlock divider="top" width="860">
        <StandardsAttribution />
      </SectionBlock>
    </PageShell>
  );
}
