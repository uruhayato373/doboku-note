import type { Metadata } from 'next';
import { Braces, Download, FileText, GitCompare, ShieldCheck } from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import SectionBlock from '@/components/layout/SectionBlock';
import { StandardsEndBanner } from '@/components/standards/StandardsAffiliateBanners';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import { ButtonLink } from '@/components/ui/Button/Button';
import Arrow from '@/components/ui/Arrow/Arrow';
import { buildPageMetadata } from '@/lib/metadata';
import { getStandardDocuments, getStandardsCatalog } from '@/lib/standards';
import { getStandardChapters } from '@/lib/standards-articles';
import { getStandardsComparison } from '@/lib/standards-comparison';
import { buildStandardsDatasetStructuredData } from '@/lib/standards-structured-data';
import { getAreaLabel } from '@/lib/content-taxonomy';

export const metadata: Metadata = buildPageMetadata({
  title: '土木工事共通仕様書のJSON-LD・Markdownデータ',
  description:
    '地方整備局等の土木工事共通仕様書を、出典・原本SHA-256・編章節条の階層を保持したMarkdownとJSON-LDで公開。地域差分と品質検査方法も確認できます。',
  path: '/standards/data',
});

export default function StandardsDataPage() {
  const catalog = getStandardsCatalog();
  const documents = getStandardDocuments();
  const chapters = documents.flatMap((document) =>
    getStandardChapters(document.agencyId, document.documentId),
  );
  const articleCount = chapters.reduce((sum, chapter) => sum + (chapter.stats.articles ?? 0), 0);
  const structuredDocuments = documents.filter(
    (document) => getStandardChapters(document.agencyId, document.documentId).length > 0,
  ).length;
  const comparison = getStandardsComparison();
  const schema = buildStandardsDatasetStructuredData({
    asOf: catalog.asOf,
    documents: catalog.totals.documents,
    structuredDocuments,
    pages: catalog.totals.pages,
    chapters: chapters.length,
    articles: articleCount,
  });

  const formats = [
    {
      icon: FileText,
      title: 'HTML',
      text: 'スマートフォンでも読める章単位の本文。節・条への固定リンクと原本ページへの導線を備えます。',
    },
    {
      icon: Download,
      title: 'Markdown',
      text: '文書名、版、出典、SHA-256、原本ページをfrontmatterに持つ全文データです。',
    },
    {
      icon: Braces,
      title: 'JSON-LD',
      text: '原資料と加工ページの公開者を分離し、編・章・節・条の関係と条本文を機械可読化しています。',
    },
  ];

  return (
    <PageShell
      variant="default"
      beforeHeader={(
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      )}
    >
      <PageHeader
        variant="band"
        breadcrumb={[
          { label: 'ホーム', href: '/' },
          { label: getAreaLabel('standards'), href: '/standards' },
          { label: '機械可読データ' },
        ]}
        label="機械可読データ"
        title="共通仕様書データセット"
        lead="公的基準をPDFのまま閉じ込めず、人が読めるHTMLと、再利用できるMarkdown・JSON-LDへ変換しています。"
        meta={`${catalog.totals.documents}文書 / ${catalog.totals.pages.toLocaleString('ja-JP')}ページ / ${chapters.length}章 / ${articleCount.toLocaleString('ja-JP')}条`}
      />

      <SectionBlock space="md">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['収録文書', `${catalog.totals.documents}文書`],
            ['原本ページ', `${catalog.totals.pages.toLocaleString('ja-JP')}頁`],
            ['構造化済み', `${structuredDocuments}文書・${chapters.length}章`],
            ['本文割当漏れ', '0行'],
          ].map(([label, value]) => (
            <MetaCard key={label} padding="compact">
              <div className="text-[11px] font-bold tracking-[0.08em] text-(--ink-muted)">{label}</div>
              <div className="mt-2 text-2xl font-bold text-(--ink)">{value}</div>
            </MetaCard>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/standards-data/catalog.json" download variant="primary" size="md" data={{ 'data-cta': 'standards-data', 'data-cta-label': 'catalog-json', 'data-cta-placement': 'standards-data-hero' }}>
            <Download aria-hidden="true" className="h-4 w-4" />
            データカタログ JSON
          </ButtonLink>
          <ButtonLink href="/standards-data/comparison.json" download variant="soft" size="md" data={{ 'data-cta': 'standards-data', 'data-cta-label': 'comparison-json', 'data-cta-placement': 'standards-data-hero' }}>
            <GitCompare aria-hidden="true" className="h-4 w-4" />
            地域差分 JSON
          </ButtonLink>
          <ButtonLink href="/standards/compare" variant="text">
            画面で地域差分を見る
            <Arrow />
          </ButtonLink>
        </div>
      </SectionBlock>

      <SectionBlock divider="top" ariaLabel="提供形式">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-(--ink)">同じ原典を3つの形で提供</h2>
          <p className="mt-2 max-w-[70ch] text-[14px] leading-[1.8] text-(--ink-body)">
            MarkdownとJSON-LDは二者択一ではありません。Markdownを検証済み本文、JSON-LDを意味・階層・出典の表現、HTMLを読者向け表示として役割分担しています。
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {formats.map(({ icon: Icon, title, text }) => (
            <MetaCard key={title} padding="default">
              <Icon aria-hidden="true" className="h-6 w-6 text-(--accent)" />
              <h3 className="mt-4 text-lg font-bold text-(--ink)">{title}</h3>
              <p className="mt-2 text-[14px] leading-[1.8] text-(--ink-body)">{text}</p>
            </MetaCard>
          ))}
        </div>
        <MetaCard serifTitle title="サンプル" padding="compact" className="mt-5">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[14px]">
            <ButtonLink href="/standards-data/kinki/common/chapters/1-1.md" download variant="text" data={{ 'data-cta': 'standards-data', 'data-cta-label': 'sample-chapter-markdown', 'data-cta-placement': 'standards-data-sample' }}>
              第1編 第1章 Markdown
            </ButtonLink>
            <ButtonLink href="/standards-data/kinki/common/chapters/1-1.jsonld" download variant="text" data={{ 'data-cta': 'standards-data', 'data-cta-label': 'sample-chapter-jsonld', 'data-cta-placement': 'standards-data-sample' }}>
              第1編 第1章 JSON-LD
            </ButtonLink>
          </div>
        </MetaCard>
      </SectionBlock>

      <SectionBlock divider="top" ariaLabel="品質と来歴">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex items-center gap-3">
              <ShieldCheck aria-hidden="true" className="h-7 w-7 text-(--accent)" />
              <h2 className="text-2xl font-bold text-(--ink)">原本へ戻れるデータ</h2>
            </div>
            <ul className="mt-5 list-disc space-y-3 pl-5 text-[14px] leading-[1.8] text-(--ink-body)">
              <li>原本PDFのURL、文書全体と章ごとのSHA-256を記録</li>
              <li>PDF全ページと本文行の割当を検査し、判読不能箇所を推測で補完しない</li>
              <li>加工主体をdoboku-note、原資料の発行者を各機関として明確に分離</li>
              <li>実務判断では発行機関の最新版原本を確認する注意事項を全ページに表示</li>
            </ul>
          </div>
          <MetaCard serifTitle title="現在の地域比較" padding="default">
            <p className="text-[14px] leading-[1.8] text-(--ink-body)">
              近畿版を比較基準として、{comparison.summary.structuredDocuments}文書を行単位で比較しています。
              完全一致は{comparison.summary.identicalDocuments}文書、地域差分は
              {comparison.summary.differentDocuments}文書・{comparison.summary.changedChapters}章・
              {comparison.summary.changeHunks}箇所です。
            </p>
            <ButtonLink href="/standards/compare" variant="text" className="mt-4">
              比較結果を確認する
              <Arrow />
            </ButtonLink>
          </MetaCard>
        </div>
      </SectionBlock>

      <SectionBlock divider="top" width="860" ariaLabel="データ加工の相談">
        <MetaCard serifTitle title="公的資料の構造化・更新について">
          <p className="text-[15px] leading-[1.85] text-(--ink-body)">
            PDF資料のHTML・Markdown・JSON-LD化、年度改定差分、原本照合、検索・AI利用向けデータ整備について相談を受け付けています。行政機関、建設コンサルタント、システム事業者での利用を想定しています。
          </p>
          <ButtonLink href="/contact" size="md" className="mt-5">
            データ加工について問い合わせる
          </ButtonLink>
        </MetaCard>
        <p className="mt-5 text-[12px] leading-[1.8] text-(--ink-muted)">
          本データは各発行機関の公式サービスではありません。出典資料をdoboku-noteが加工した二次利用物です。公共データ利用規約（第1.0版）に基づき、出典と加工内容を表示しています。
        </p>
        <StandardsEndBanner pageKind="standards-list" />
      </SectionBlock>
    </PageShell>
  );
}
