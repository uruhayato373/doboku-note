import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import TwoColumnShell from '@/components/layout/TwoColumnShell';
import StandardsAttribution from '@/components/standards/StandardsAttribution';
import StandardsNavigation from '@/components/standards/StandardsNavigation';
import StandardTopicLinks from '@/components/standards/StandardTopicLinks';
import {
  getStandardDocuments,
  getStandardPart,
  isStandardPartIndexable,
  readTranscribedPages,
  standardDocumentPath,
  standardPartPath,
} from '@/lib/standards';
import { hasStandardChapters } from '@/lib/standards-articles';
import { getTopicsForStandardText } from '@/lib/topics';

type Params = { agency: string; document: string; part: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getStandardDocuments().flatMap((document) =>
    document.parts.map((part) => ({
      agency: document.agencyId,
      document: document.documentId,
      part: part.slug,
    })),
  );
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { agency, document, part } = await params;
  const resolved = getStandardPart(agency, document, part);
  if (!resolved) return { title: '分冊が見つかりません', robots: { index: false, follow: false } };
  const { document: entry, part: entryPart } = resolved;
  const path = standardPartPath(entry, entryPart);
  return {
    title: { absolute: `${entry.title} PDF page ${entryPart.firstPage}–${entryPart.lastPage}｜全文文字起こし` },
    description: `${entry.agencyName}「${entry.title}」PDF page ${entryPart.firstPage}–${entryPart.lastPage}の逐語文字起こし。原本のページ番号・改行・空白を保持しています。`,
    alternates: { canonical: path },
    openGraph: {
      title: `${entry.title} PDF page ${entryPart.firstPage}–${entryPart.lastPage}`,
      description: `${entryPart.pageCount}ページ分の全文文字起こし`,
      url: path,
      type: 'article',
      siteName: 'doboku-note',
    },
    // 構造化章記事を公開した文書では、同内容の逐語分冊は noindex, follow に下げる。
    // ページは原典照合用に残す（follow で内部リンク資産も保つ）が、章記事と重複した
    // クロール対象を作らない。章が未生成の文書は従来どおり canonical 判定のみ。
    ...((!isStandardPartIndexable(entry) || hasStandardChapters(agency, document)) && {
      robots: { index: false, follow: true },
    }),
  };
}

export default async function StandardPartPage({ params }: { params: Promise<Params> }) {
  const { agency, document, part } = await params;
  const resolved = getStandardPart(agency, document, part);
  if (!resolved) notFound();
  const { document: entry, part: entryPart } = resolved;
  const pages = readTranscribedPages(entryPart);
  const relatedTopics = getTopicsForStandardText(entry, pages.map((page) => page.text).join('\n'));
  const partIndex = entry.parts.findIndex((candidate) => candidate.slug === entryPart.slug);
  const previous = partIndex > 0 ? entry.parts[partIndex - 1] : null;
  const next = partIndex >= 0 && partIndex < entry.parts.length - 1 ? entry.parts[partIndex + 1] : null;

  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        breadcrumb={[
          { label: 'ホーム', href: '/' },
          { label: '基準類', href: '/standards' },
          { label: entry.agencyName, href: `/standards/${entry.agencyId}` },
          { label: entry.title, href: standardDocumentPath(entry) },
          { label: `PDF ${entryPart.firstPage}–${entryPart.lastPage}` },
        ]}
        label="VERBATIM TRANSCRIPTION"
        title={`${entry.title} PDF page ${entryPart.firstPage}–${entryPart.lastPage}`}
        lead="原本PDFのページ番号を基準に、紙面内の改行・空白を保って表示しています。横に長い表は左右にスクロールできます。"
        meta={`${entryPart.pageCount}ページ / part SHA-256 ${entryPart.sha256.slice(0, 16)}…`}
      />

      <TwoColumnShell
        as="div"
        mainClassName="py-8 sm:py-10"
        aside={(
          <StandardsNavigation
            agencyId={agency}
            currentDocument={entry}
            currentPart={entryPart}
            pageNumbers={pages.map((page) => page.page)}
          />
        )}
      >
        <div className="mb-6 zenn-desktop:hidden">
          <StandardsNavigation
            agencyId={agency}
            currentDocument={entry}
            currentPart={entryPart}
            pageNumbers={pages.map((page) => page.page)}
            variant="mobile"
          />
        </div>

        <nav aria-label="分冊移動" className="flex items-center justify-between gap-4 border-y border-[var(--rule-soft)] py-3 text-sm">
          {previous ? (
            <Link href={standardPartPath(entry, previous)} className="text-[var(--accent)] hover:underline">← PDF {previous.firstPage}–{previous.lastPage}</Link>
          ) : <span />}
          <Link href={standardDocumentPath(entry)} className="text-[var(--ink-muted)] hover:text-[var(--accent)]">文書目次</Link>
          {next ? (
            <Link href={standardPartPath(entry, next)} className="text-[var(--accent)] hover:underline">PDF {next.firstPage}–{next.lastPage} →</Link>
          ) : <span />}
        </nav>

        {/* 章記事がある文書では逐語本文をサイト内検索の対象から外す。同じ内容が構造化章記事側で
            拾えるうえ、版面保持のコードブロックが検索結果のスニペットを埋めてしまうため。 */}
        <article
          className="mt-8 space-y-10"
          aria-label="文字起こし本文"
          {...(hasStandardChapters(agency, document) ? { 'data-pagefind-ignore': 'all' } : {})}
        >
          {pages.map((page) => {
            const unreadable = entry.unreadableRanges.filter((range) => range.page === page.page);
            return (
              <section key={page.page} id={`pdf-page-${page.page}`} className="scroll-mt-6">
                <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-[var(--rule)] pb-2">
                  <h2 className="font-serif text-xl font-bold text-[var(--ink)]">PDF page {page.page}</h2>
                  <a href={`#pdf-page-${page.page}`} className="font-mono text-[10px] text-[var(--ink-muted)] hover:text-[var(--accent)]">#{page.page}</a>
                </div>
                {unreadable.map((range) => (
                  <div key={range.range} className="mb-3 border-l-4 border-[var(--color-warn)] bg-[var(--color-warn-fill)] p-3 text-[13px] leading-[1.7] text-[var(--ink-body)]">
                    <strong>原本画質による判読注記：</strong>{range.range}
                  </div>
                ))}
                <div className="overflow-x-auto border border-[var(--rule-soft)] bg-[var(--paper)]">
                  <pre
                    data-text-sha256={page.textSha256 ?? undefined}
                    className="min-w-max p-4 font-mono text-[12px] leading-[1.65] text-[var(--ink-body)]"
                  >
                    {page.text}
                  </pre>
                </div>
              </section>
            );
          })}
        </article>

        <nav aria-label="分冊移動" className="mt-10 flex items-center justify-between gap-4 border-y border-[var(--rule-soft)] py-3 text-sm">
          {previous ? <Link href={standardPartPath(entry, previous)} className="text-[var(--accent)] hover:underline">← 前の分冊</Link> : <span />}
          <Link href={standardDocumentPath(entry)} className="text-[var(--ink-muted)] hover:text-[var(--accent)]">文書目次</Link>
          {next ? <Link href={standardPartPath(entry, next)} className="text-[var(--accent)] hover:underline">次の分冊 →</Link> : <span />}
        </nav>

        <StandardTopicLinks topics={relatedTopics} />
        <StandardsAttribution document={entry} />
      </TwoColumnShell>
    </PageShell>
  );
}
