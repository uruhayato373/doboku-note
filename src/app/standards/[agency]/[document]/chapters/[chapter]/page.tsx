import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import remarkGfm from 'remark-gfm';
import PageShell from '@/components/layout/PageShell';
import TwoColumnShell from '@/components/layout/TwoColumnShell';
import AdSlot from '@/components/ads/AdSlot';
import { CTA_STACK_CLASS } from '@/lib/cta-stack';
import SafeMdx from '@/components/mdx/SafeMdx';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import StandardsArticleHeader from '@/components/standards/StandardsArticleHeader';
import StandardSectionIndex from '@/components/standards/StandardSectionIndex';
import StandardVerbatimTable from '@/components/standards/StandardVerbatimTable';
import ArticleImage from '@/components/ui/ArticleImage/ArticleImage';
import StandardScrollTable from '@/components/standards/StandardScrollTable';
import StandardsAttribution from '@/components/standards/StandardsAttribution';
import StandardDataLinks from '@/components/standards/StandardDataLinks';
import StandardsNavigation from '@/components/standards/StandardsNavigation';
import { extractHeadings } from '@/lib/toc';
import StandardTopicLinks from '@/components/standards/StandardTopicLinks';
import StandardReferenceLinks from '@/components/standards/StandardReferenceLinks';
import StandardChapterPager from '@/components/standards/StandardChapterPager';
import QualificationBridge from '@/components/ui/QualificationBridge/QualificationBridge';
import { StandardsEndBanner, StandardsInlineBanner } from '@/components/standards/StandardsAffiliateBanners';
import { planInlineSlots, withInlineSlots } from '@/lib/standards-inline-slots.mjs';
import { standardsSidebarContinuation } from '@/lib/standards-sidebar-continuation';
import rehypeHeadingIds from '@/lib/rehype-heading-ids';
import rehypeScrollableFocus from '@/lib/rehype-scrollable-focus';
import rehypeShortTableCells from '@/lib/rehype-short-table-cells';
import { buildPageMetadata } from '@/lib/metadata';
import { getReferencedStandardDocuments, getStandardDocuments, standardDocumentPath } from '@/lib/standards';
import {
  getStandardChapter,
  getStandardChapters,
  readStandardChapterMarkdown,
  getStandardChapterPresentation,
  standardBookLabel,
  standardChapterHeading,
  standardChapterOgpUrl,
  standardChapterPreamble,
  isStandardChapterMerged,
  standardChapterPath,
} from '@/lib/standards-articles';
import { getTopicsForStandardText } from '@/lib/topics';
import {
  buildStandardChapterStructuredData,
  standardsDataPath,
} from '@/lib/standards-structured-data';
import { standardsAgencyPath } from '@/lib/route-paths';
import { getAreaLabel } from '@/lib/content-taxonomy';

type Params = { agency: string; document: string; chapter: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getStandardDocuments().filter((document) => !isStandardChapterMerged(document.agencyId, document.documentId)).flatMap((document) =>
    getStandardChapters(document.agencyId, document.documentId).map((chapter) => ({
      agency: document.agencyId,
      document: document.documentId,
      chapter: chapter.chapterId,
    })),
  );
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { agency, document, chapter } = await params;
  const resolved = getStandardChapter(agency, document, chapter);
  if (!resolved) return { title: '章が見つかりません', robots: { index: false, follow: false } };
  const { document: entry, chapter: target } = resolved;
  const sectionNames = target.sections.slice(0, 3).map((section) => section.title).join('・');
  const base = buildPageMetadata({
    title: `${target.title}｜${entry.title}`,
    description:
      `${entry.agencyName}「${entry.title}」${target.title}の全文。` +
      // 節・条の無い章（通達・別表など）で「0節・0条」と出さない
      (target.sections.length > 0
        ? `${target.sections.length}節${target.stats.articles ? `・${target.stats.articles}条` : ''}を編・章・節の構造で読めます` +
          `${sectionNames ? `（${sectionNames} ほか）` : ''}。`
        : '原典の版と出典を明示しています。'),
    path: standardChapterPath(entry, target),
  });
  // 章ごとの OGP（機関名 + 第N編 + 第M章）。buildPageMetadata の既定は og-default.png で、
  // 344 章がすべて同じカードになり SNS で中身が判別できないため差し替える。
  const ogpUrl = standardChapterOgpUrl(entry, target);
  const withImage: Metadata = {
    ...base,
    openGraph: {
      ...base.openGraph,
      images: [{ url: ogpUrl, width: 1200, height: 630, alt: target.title }],
    },
    twitter: { card: 'summary_large_image', title: target.title, images: [ogpUrl] },
  };
  // 同一原本を 9 機関が公開しているため、canonical 機関以外の章は noindex, follow にする
  // （読める状態は保ちつつ重複クロールを作らない）。判定の真実源は manifest の indexable。
  return target.indexable ? withImage : { ...withImage, robots: { index: false, follow: true } };
}

export default async function StandardChapterPage({ params }: { params: Promise<Params> }) {
  const { agency, document, chapter } = await params;
  const resolved = getStandardChapter(agency, document, chapter);
  if (!resolved) notFound();
  const { document: entry, chapter: target } = resolved;
  const presentation = getStandardChapterPresentation(agency, document, target);
  const markdown = presentation?.markdown ?? readStandardChapterMarkdown(agency, document, target);
  const preamble = target.splitBySection ? standardChapterPreamble(markdown) : null;
  const inlinePlan = target.splitBySection ? null : planInlineSlots(markdown);
  const inlineSlots = inlinePlan ? inlinePlan.insertAt.map(({ slot }) => slot) : [];
  // 節ページに分けた章は本文が節の一覧なので、右の欄の下に続く束の見積もりは前置きの字数だけ
  // 右の欄の最後の追従ブロックの目次（本文の 節・条。id は rehypeHeadingIds と同じ規則）
  const followHeadings = extractHeadings(preamble ?? markdown, 2, 3);
  const railGroups = standardsSidebarContinuation(entry, target, inlinePlan?.chars ?? preamble?.length ?? 0);
  const relatedTopics = getTopicsForStandardText(entry, markdown);
  const referencedDocuments = getReferencedStandardDocuments(entry, markdown);

  const schema = buildStandardChapterStructuredData(entry, target, {
    markdown: standardsDataPath(entry, target, 'md'),
    jsonLd: standardsDataPath(entry, target, 'jsonld'),
  }, undefined, presentation?.text);

  // 章記事は数式を持たないので KaTeX は積まない（katex.min.css は render-blocking なので
  // 必要なページだけに閉じ込める運用。DocPage 側のコメント参照）。
  const mdxOptions = {
    blockJS: false as const,
    blockDangerousJS: true as const,
    mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeHeadingIds, rehypeScrollableFocus, rehypeShortTableCells] },
  };
  const components = {
    pre: StandardVerbatimTable,
    // 中国版に差し込んだ地方の訂正・追加のうち、原本の図（画像）を出す
    ArticleImage,
    // <SourceRef> は表・図の出所ページの目印（生成器が置き、check-standard-articles とエージェントの照合が読む）。
    // 原本の逐語ページは 2026-10-26 に公開をやめたので、サイトには何も出さない
    SourceRef: () => null,
    // はみ出すときだけキーボードで操作でき、案内を出す（scrollable-region-focusable）
    table: StandardScrollTable,
    // 実際に置く面だけを渡し、短い章でピクセルの持ち主が消えないようにする
    StandardsInlineBanner: ({ slot }: { slot: string }) => <StandardsInlineBanner slot={slot} inlineSlots={inlineSlots} />,
  };

  return (
    <PageShell
      variant="article"
      beforeHeader={(
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      )}
    >
      <TwoColumnShell
        gutter="flush-mobile"
        stretchAside
        aside={<StandardsNavigation agencyId={agency} currentDocument={entry} currentChapter={target} inlineSlots={inlineSlots} railGroups={railGroups} followHeadings={followHeadings} />}
      >
        <MetaCard
          as="article"
          padding="none"
          className="overflow-hidden px-10 py-12 transition-colors duration-300 zenn-desktop:px-11 max-zenn-sp:rounded-none max-zenn-sp:border-x-0 max-zenn-sp:px-(--article-gutter-sp) max-zenn-sp:py-[35px]"
        >
          <StandardsArticleHeader
            breadcrumb={[
              { label: 'ホーム', href: '/' },
              { label: getAreaLabel('standards'), href: '/standards' },
              { label: entry.agencyName, href: standardsAgencyPath(entry.agencyId) },
              {
                label: entry.role === 'common' ? '土木工事共通仕様書' : entry.title,
                href: standardDocumentPath(entry),
              },
            ]}
            label={standardBookLabel(target)}
            title={standardChapterHeading(target)}
            meta={[entry.agencyName, entry.edition].filter((item): item is string => Boolean(item))}
          />

          <div className="mt-6 zenn-desktop:hidden">
            <StandardsNavigation
              agencyId={agency}
              currentDocument={entry}
              currentChapter={target}
              variant="mobile"
            />
          </div>

          {/* 節移動は PC の右ナビ／モバイルの「資料内を移動」に集約し、
              同じ一覧が本文前に重複して読書開始を押し下げないようにする。
              節ページに分けた章（splitBySection）だけは、章ページの本文が節の一覧になる。 */}
          {target.splitBySection ? (
            <div className="mt-7">
              {preamble && (
                <div className="prose-blog mb-6">
                  <SafeMdx source={preamble} components={components} options={mdxOptions} />
                </div>
              )}
              <StandardSectionIndex document={entry} chapter={target} />
            </div>
          ) : (
            <div
              className="prose-blog mt-7 [&>h2:first-child]:mt-0"
              data-standards-chapter={target.chapterId}
            >
              <SafeMdx source={withInlineSlots(markdown)} components={components} options={mdxOptions} />
            </div>
          )}

          {/* 原本ページ（逐語文字起こし）への案内は出さない（2026-10-26 に公開をやめた。照合はエージェントが文字起こしで行う） */}
          <div className="mt-8">
            <StandardChapterPager document={entry} chapter={target} />
          </div>

          <StandardReferenceLinks documents={referencedDocuments} />
          <StandardTopicLinks topics={relatedTopics} />
          {/* 共通仕様書の読者（発注者・施工会社）を資格の入口へ。本文の外に 1 枚だけ置く。 */}
          <div className="mt-10">
            <QualificationBridge placement="standards-chapter-footer" />
          </div>
          <StandardsEndBanner pageKind="standards" inlineSlots={inlineSlots} />
          <StandardDataLinks document={entry} chapter={target} />
          <StandardsAttribution document={entry} item={target.item} pages={{ first: target.firstPage, last: target.lastPage }} />
        </MetaCard>
        <div className="mt-10 max-zenn-sp:px-(--article-gutter-sp)"><AdSlot slot="endMultiplex" className={CTA_STACK_CLASS} /></div>
      </TwoColumnShell>
    </PageShell>
  );
}
