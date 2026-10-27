import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import remarkGfm from 'remark-gfm';
import PageShell from '@/components/layout/PageShell';
import TwoColumnShell from '@/components/layout/TwoColumnShell';
import SafeMdx from '@/components/mdx/SafeMdx';
import SectionCard from '@/components/ui/SectionCard/SectionCard';
import StandardsArticleHeader from '@/components/standards/StandardsArticleHeader';
import StandardVerbatimTable from '@/components/standards/StandardVerbatimTable';
import ArticleImage from '@/components/ui/ArticleImage/ArticleImage';
import StandardScrollTable from '@/components/standards/StandardScrollTable';
import StandardsAttribution from '@/components/standards/StandardsAttribution';
import StandardsNavigation from '@/components/standards/StandardsNavigation';
import StandardTopicLinks from '@/components/standards/StandardTopicLinks';
import StandardReferenceLinks from '@/components/standards/StandardReferenceLinks';
import QualificationBridge from '@/components/ui/QualificationBridge/QualificationBridge';
import AffiliateSlot from '@/components/ui/AffiliateSlot/AffiliateSlot';
import rehypeHeadingIds from '@/lib/rehype-heading-ids';
import rehypeScrollableFocus from '@/lib/rehype-scrollable-focus';
import rehypeShortTableCells from '@/lib/rehype-short-table-cells';
import { buildPageMetadata } from '@/lib/metadata';
import { getReferencedStandardDocuments, getStandardDocuments, standardDocumentPath } from '@/lib/standards';
import {
  getStandardChapterSection,
  getStandardChapters,
  standardBookLabel,
  standardChapterHeading,
  standardChapterOgpUrl,
  standardChapterPath,
  standardSectionPageRange,
} from '@/lib/standards-articles';
import { standardSectionPath } from '@/lib/standards-section-split.mjs';
import { getTopicsForStandardText } from '@/lib/topics';
import { buildStandardSectionStructuredData } from '@/lib/standards-structured-data';
import { standardsAgencyPath } from '@/lib/route-paths';

type Params = { agency: string; document: string; chapter: string; section: string };

export const dynamicParams = false;

/** 節ページは splitBySection の章（manifest。判定は build-standard-articles.mjs）だけに作る。 */
export function generateStaticParams(): Params[] {
  return getStandardDocuments().flatMap((document) =>
    getStandardChapters(document.agencyId, document.documentId)
      .filter((chapter) => chapter.splitBySection)
      .flatMap((chapter) =>
        chapter.sections.map((section) => ({
          agency: document.agencyId,
          document: document.documentId,
          chapter: chapter.chapterId,
          section: String(section.number),
        })),
      ),
  );
}

function resolve(params: Params) {
  const number = Number(params.section);
  if (!Number.isInteger(number)) return null;
  return getStandardChapterSection(params.agency, params.document, params.chapter, number);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const resolved = resolve(await params);
  if (!resolved) return { title: '節が見つかりません', robots: { index: false, follow: false } };
  const { document: entry, chapter, section } = resolved;
  const articleNames = section.articles.slice(0, 3).map((article) => article.title).join('・');
  const base = buildPageMetadata({
    title: `${section.headingText}（${chapter.chapterTitle}）｜${entry.title}`,
    description:
      `${entry.agencyName}「${entry.title}」${chapter.title} ${section.headingText}の全文。` +
      `${section.articles.length}条を条・項の構造で読めます` +
      `${articleNames ? `（${articleNames} ほか）` : ''}。`,
    path: standardSectionPath(entry, chapter, section.number),
  });
  // OGP は章のカードを使う（機関名 + 第N編 + 第M章）。節ごとには作らない。
  const ogpUrl = standardChapterOgpUrl(entry, chapter);
  const withImage: Metadata = {
    ...base,
    openGraph: {
      ...base.openGraph,
      images: [{ url: ogpUrl, width: 1200, height: 630, alt: chapter.title }],
    },
    twitter: { card: 'summary_large_image', title: `${section.headingText}｜${chapter.title}`, images: [ogpUrl] },
  };
  // 索引の可否は章と同じ（canonical 機関以外は noindex, follow）。
  return chapter.indexable ? withImage : { ...withImage, robots: { index: false, follow: true } };
}

export default async function StandardSectionPage({ params }: { params: Promise<Params> }) {
  const resolvedParams = await params;
  const resolved = resolve(resolvedParams);
  if (!resolved) notFound();
  const { document: entry, chapter, section, index, markdown } = resolved;
  const pages = standardSectionPageRange(chapter, index);
  const previous = chapter.sections[index - 1];
  const next = chapter.sections[index + 1];
  const relatedTopics = getTopicsForStandardText(entry, markdown);
  const referencedDocuments = getReferencedStandardDocuments(entry, markdown);
  const schema = buildStandardSectionStructuredData(entry, chapter, section, pages);

  // 章ページ（chapters/[chapter]/page.tsx）と同じ描画設定。数式は無いので KaTeX は積まない。
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
        aside={(
          <StandardsNavigation
            agencyId={resolvedParams.agency}
            currentDocument={entry}
            currentChapter={chapter}
            currentSection={section.number}
          />
        )}
      >
        <SectionCard
          as="article"
          padding="none"
          className="overflow-hidden px-10 py-12 transition-colors duration-300 zenn-desktop:px-11 max-zenn-sp:rounded-none max-zenn-sp:border-x-0 max-zenn-sp:px-(--article-gutter-sp) max-zenn-sp:py-[35px]"
        >
          <StandardsArticleHeader
            breadcrumb={[
              { label: 'ホーム', href: '/' },
              { label: '基準類', href: '/standards' },
              { label: entry.agencyName, href: standardsAgencyPath(entry.agencyId) },
              {
                label: entry.role === 'common' ? '土木工事共通仕様書' : entry.title,
                href: standardDocumentPath(entry),
              },
              { label: standardChapterHeading(chapter), href: standardChapterPath(entry, chapter) },
            ]}
            label={`${standardBookLabel(chapter)} ${standardChapterHeading(chapter)}`}
            title={section.headingText}
            meta={[entry.agencyName, entry.edition].filter((item): item is string => Boolean(item))}
          />

          <div className="mt-6 zenn-desktop:hidden">
            <StandardsNavigation
              agencyId={resolvedParams.agency}
              currentDocument={entry}
              currentChapter={chapter}
              currentSection={section.number}
              variant="mobile"
            />
          </div>

          <div
            className="prose-blog mt-7 [&>h2:first-child]:mt-0"
            data-standards-chapter={chapter.chapterId}
            data-standards-section={section.number}
          >
            <SafeMdx source={markdown} components={components} options={mdxOptions} />
          </div>

          <nav aria-label="前後の節" className="mt-10 grid gap-3 border-t border-(--rule-soft) pt-6 sm:grid-cols-2">
            {previous ? (
              <Link
                href={standardSectionPath(entry, chapter, previous.number)}
                className="focus-ring flex min-h-14 flex-col justify-center border border-(--rule-soft) px-4 py-3 transition-colors hover:bg-(--accent-fill) dark:border-(--rule-soft)"
              >
                <span className="text-[11px] text-(--ink-muted)">← 前の節</span>
                <span className="mt-1 font-bold text-(--ink)">{previous.headingText}</span>
              </Link>
            ) : <span aria-hidden />}
            {next && (
              <Link
                href={standardSectionPath(entry, chapter, next.number)}
                className="focus-ring flex min-h-14 flex-col justify-center border border-(--rule-soft) px-4 py-3 text-right transition-colors hover:bg-(--accent-fill) dark:border-(--rule-soft)"
              >
                <span className="text-[11px] text-(--ink-muted)">次の節 →</span>
                <span className="mt-1 font-bold text-(--ink)">{next.headingText}</span>
              </Link>
            )}
          </nav>

          <StandardReferenceLinks documents={referencedDocuments} />
          <StandardTopicLinks topics={relatedTopics} />
          <div className="mt-10">
            <QualificationBridge placement="standards-chapter-footer" />
          </div>
          <AffiliateSlot page={{ pageKind: 'standards' }} slot="standards-end" className="mt-6" />
          <StandardsAttribution document={entry} item={chapter.item} />
        </SectionCard>
      </TwoColumnShell>
    </PageShell>
  );
}
