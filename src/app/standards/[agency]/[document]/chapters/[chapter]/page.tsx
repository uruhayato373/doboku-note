import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import remarkGfm from 'remark-gfm';
import PageShell from '@/components/layout/PageShell';
import TwoColumnShell from '@/components/layout/TwoColumnShell';
import SafeMdx from '@/components/mdx/SafeMdx';
import SectionCard from '@/components/ui/SectionCard/SectionCard';
import StandardsArticleHeader from '@/components/standards/StandardsArticleHeader';
import StandardsAttribution from '@/components/standards/StandardsAttribution';
import StandardDataLinks from '@/components/standards/StandardDataLinks';
import StandardsNavigation from '@/components/standards/StandardsNavigation';
import StandardTopicLinks from '@/components/standards/StandardTopicLinks';
import SourceRef from '@/components/standards/SourceRef';
import rehypeHeadingIds from '@/lib/rehype-heading-ids';
import { buildPageMetadata } from '@/lib/metadata';
import { getStandardDocuments, standardDocumentPath, standardPartPath } from '@/lib/standards';
import {
  getStandardChapter,
  getStandardChapters,
  readStandardChapterMarkdown,
  standardChapterOgpUrl,
  standardChapterPath,
} from '@/lib/standards-articles';
import { getTopicsForStandardText } from '@/lib/topics';
import {
  buildStandardChapterStructuredData,
  standardsDataPath,
} from '@/lib/standards-structured-data';
import type React from 'react';

type Params = { agency: string; document: string; chapter: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getStandardDocuments().flatMap((document) =>
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
      `${target.sections.length}節・${target.stats.articles ?? 0}条を編・章・節の構造で読めます` +
      `${sectionNames ? `（${sectionNames} ほか）` : ''}。原本PDF ${target.firstPage}–${target.lastPage}ページ。`,
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
  const markdown = readStandardChapterMarkdown(agency, document, target);
  const relatedTopics = getTopicsForStandardText(entry, markdown);

  const firstPart = entry.parts.find(
    (part) => target.firstPage >= part.firstPage && target.firstPage <= part.lastPage,
  );

  const schema = buildStandardChapterStructuredData(entry, target, {
    markdown: standardsDataPath(entry, target, 'md'),
    jsonLd: standardsDataPath(entry, target, 'jsonld'),
  });

  // 章記事は数式を持たないので KaTeX は積まない（katex.min.css は render-blocking なので
  // 必要なページだけに閉じ込める運用。DocPage 側のコメント参照）。
  const mdxOptions = {
    blockJS: false as const,
    blockDangerousJS: true as const,
    mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeHeadingIds] },
  };
  const components = {
    // 生成器が埋めた <SourceRef pages="151-153" /> に、原典へ戻すための文書コンテキストを束ねる
    SourceRef: (props: { pages: string; kind?: 'section' | 'table' | 'figure' }) => (
      <SourceRef {...props} document={entry} />
    ),
    table: (props: React.ComponentProps<'table'>) => (
      <div className="table-scroll">
        <table {...props} />
      </div>
    ),
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
        aside={<StandardsNavigation agencyId={agency} currentDocument={entry} currentChapter={target} />}
      >
        <SectionCard
          as="article"
          padding="none"
          className="overflow-hidden px-10 py-12 transition-colors duration-300 zenn-desktop:px-11 max-zenn-sp:rounded-none max-zenn-sp:border-x-0 max-zenn-sp:px-[var(--article-gutter-sp)] max-zenn-sp:py-[35px]"
        >
          <StandardsArticleHeader
            breadcrumb={[
              { label: 'ホーム', href: '/' },
              { label: '基準類', href: '/standards' },
              { label: entry.agencyName, href: `/standards/${entry.agencyId}` },
              {
                label: entry.role === 'common' ? '土木工事共通仕様書' : entry.title,
                href: standardDocumentPath(entry),
              },
            ]}
            label={`第${target.bookNumber}編 ${target.bookTitle}`}
            title={`第${target.chapterNumber}章 ${target.chapterTitle}`}
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
              同じ一覧が本文前に重複して読書開始を押し下げないようにする。 */}
          <div
            className="prose-blog prose-base mt-7 [&>h2:first-child]:mt-0"
            data-standards-chapter={target.chapterId}
          >
            <SafeMdx source={markdown} components={components} options={mdxOptions} />
          </div>

          <section
            aria-labelledby="chapter-source"
            className="mt-10 border-t border-[var(--rule-soft)] pt-6"
          >
            <h2 id="chapter-source" className="text-lg font-bold text-[var(--ink)]">原典PDFページで確認する</h2>
            <p className="mt-2 text-[13px] leading-[1.8] text-[var(--ink-muted)]">
              この章は原本PDFの {target.firstPage}–{target.lastPage} ページから構成しています。紙面の改行・空白をそのまま保った逐語文字起こしは分冊ページで確認できます。
            </p>
            {firstPart && (
              <Link
                href={`${standardPartPath(entry, firstPart)}#pdf-page-${target.firstPage}`}
                className="focus-ring mt-3 inline-flex min-h-11 items-center text-[13px] font-bold text-[var(--accent)] hover:underline"
              >
                逐語文字起こし PDF page {target.firstPage} を開く →
              </Link>
            )}
            <StandardDataLinks document={entry} chapter={target} />
          </section>

          <StandardTopicLinks topics={relatedTopics} />
          <StandardsAttribution document={entry} />
        </SectionCard>
      </TwoColumnShell>
    </PageShell>
  );
}
