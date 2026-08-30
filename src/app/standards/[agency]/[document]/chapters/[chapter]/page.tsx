import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import remarkGfm from 'remark-gfm';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import TwoColumnShell from '@/components/layout/TwoColumnShell';
import SafeMdx from '@/components/mdx/SafeMdx';
import StandardsAttribution from '@/components/standards/StandardsAttribution';
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
  standardChapterPath,
} from '@/lib/standards-articles';
import { getTopicsForStandardText } from '@/lib/topics';
import { generateHeadingId } from '@/lib/toc';
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
  // 同一原本を 10 機関が公開しているため、canonical 機関以外の章は noindex, follow にする
  // （読める状態は保ちつつ重複クロールを作らない）。判定の真実源は manifest の indexable。
  return target.indexable ? base : { ...base, robots: { index: false, follow: true } };
}

export default async function StandardChapterPage({ params }: { params: Promise<Params> }) {
  const { agency, document, chapter } = await params;
  const resolved = getStandardChapter(agency, document, chapter);
  if (!resolved) notFound();
  const { document: entry, chapter: target } = resolved;
  const chapters = getStandardChapters(agency, document);
  const markdown = readStandardChapterMarkdown(agency, document, target);
  const relatedTopics = getTopicsForStandardText(entry, markdown);

  const index = chapters.findIndex((candidate) => candidate.chapterId === target.chapterId);
  const previous = index > 0 ? chapters[index - 1] : null;
  const next = index >= 0 && index < chapters.length - 1 ? chapters[index + 1] : null;
  const firstPart = entry.parts.find(
    (part) => target.firstPage >= part.firstPage && target.firstPage <= part.lastPage,
  );

  const breadcrumb = [
    { label: 'ホーム', href: '/' },
    { label: '基準類', href: '/standards' },
    { label: entry.agencyName, href: `/standards/${entry.agencyId}` },
    { label: entry.title, href: standardDocumentPath(entry) },
    { label: target.title },
  ];

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumb.map((crumb, position) => ({
          '@type': 'ListItem',
          position: position + 1,
          name: crumb.label,
          ...(crumb.href ? { item: `https://doboku-note.com${crumb.href}` } : {}),
        })),
      },
      {
        '@type': 'Article',
        headline: target.title,
        inLanguage: 'ja-JP',
        isPartOf: {
          '@type': 'DigitalDocument',
          name: entry.title,
          url: `https://doboku-note.com${standardDocumentPath(entry)}`,
        },
        publisher: { '@type': 'GovernmentOrganization', name: entry.agencyName },
        isBasedOn: entry.sourceUrl ?? entry.landing,
        url: `https://doboku-note.com${standardChapterPath(entry, target)}`,
      },
    ],
  };

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
      variant="default"
      beforeHeader={(
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      )}
    >
      <PageHeader
        variant="band"
        breadcrumb={breadcrumb}
        label={`第${target.bookNumber}編 ${target.bookTitle}`}
        title={target.title}
        lead={`${entry.agencyName}「${entry.title}」を編・章・節の構造で読めるように再構成しました。原文は改変していません。`}
        meta={`${target.sections.length}節 / 原本PDF ${target.firstPage}–${target.lastPage}ページ / ${target.sourceParts.join('・')}`}
      />

      <TwoColumnShell
        as="div"
        mainClassName="py-8 sm:py-10"
        aside={<StandardsNavigation agencyId={agency} currentDocument={entry} currentChapter={target} />}
      >
        <div className="mb-6 zenn-desktop:hidden">
          <StandardsNavigation
            agencyId={agency}
            currentDocument={entry}
            currentChapter={target}
            variant="mobile"
          />
        </div>

        <nav aria-label="章移動" className="flex items-center justify-between gap-4 border-y border-[var(--rule-soft)] py-3 text-sm">
          {previous ? (
            <Link href={standardChapterPath(entry, previous)} className="focus-ring text-[var(--accent)] hover:underline">
              ← 第{previous.chapterNumber}章 {previous.chapterTitle}
            </Link>
          ) : <span />}
          <Link href={standardDocumentPath(entry)} className="focus-ring text-[var(--ink-muted)] hover:text-[var(--accent)]">文書目次</Link>
          {next ? (
            <Link href={standardChapterPath(entry, next)} className="focus-ring text-[var(--accent)] hover:underline">
              第{next.chapterNumber}章 {next.chapterTitle} →
            </Link>
          ) : <span />}
        </nav>

        {target.sections.length > 1 && (
          <nav
            aria-labelledby="chapter-sections"
            className="mt-8 border border-[var(--rule-soft)] bg-[var(--paper)] p-5"
            data-standards-chapter-toc
          >
            <h2 id="chapter-sections" className="font-serif text-lg font-bold text-[var(--ink)]">この章の節</h2>
            {/* 章単位で 1 ページにするため、大きい章は縦に長くなる（第3編第2章は 167 ページ）。
                節の URL へ細分化せず、本文冒頭のアンカー目次で目的の節へ直接飛べるようにする。
                アンカーは src/lib/toc.ts の generateHeadingId で導出し、本文見出しに
                rehypeHeadingIds が振る id と同じ規則を共有する（別々に持つと必ずズレる）。 */}
            <ol className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {target.sections.map((section) => (
                <li key={section.number}>
                  <a
                    href={`#${generateHeadingId(section.headingText)}`}
                    className="focus-ring flex min-h-11 items-baseline gap-2 text-[13px] leading-[1.6] text-[var(--ink-body)] transition-colors hover:text-[var(--accent)] hover:underline"
                  >
                    <span className="w-10 shrink-0 font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
                      第{section.number}節
                    </span>
                    <span className="min-w-0 flex-1">{section.title}</span>
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--ink-muted)]">
                      p.{section.firstPage}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <article className="prose-blog prose-base mt-8" data-standards-chapter={target.chapterId}>
          <SafeMdx source={markdown} components={components} options={mdxOptions} />
        </article>

        <section
          aria-labelledby="chapter-source"
          className="mt-10 border-t border-[var(--rule-soft)] pt-6"
        >
          <h2 id="chapter-source" className="font-serif text-lg font-bold text-[var(--ink)]">原典PDFページで確認する</h2>
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
        </section>

        <StandardTopicLinks topics={relatedTopics} />
        <StandardsAttribution document={entry} />
      </TwoColumnShell>
    </PageShell>
  );
}
