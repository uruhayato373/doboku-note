import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import TwoColumnShell from '@/components/layout/TwoColumnShell';
import SectionCard from '@/components/ui/SectionCard/SectionCard';
import StandardsAttribution from '@/components/standards/StandardsAttribution';
import StandardTopicLinks from '@/components/standards/StandardTopicLinks';
import StandardsNavigation from '@/components/standards/StandardsNavigation';
import { buildPageMetadata } from '@/lib/metadata';
import {
  getStandardDocument,
  getStandardDocuments,
  standardDocumentPath,
  standardPartPath,
} from '@/lib/standards';
import {
  getStandardChapters,
  groupChaptersByBook,
  standardChapterPath,
} from '@/lib/standards-articles';
import { getTopicsForStandardDocument } from '@/lib/topics';

type Params = { agency: string; document: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getStandardDocuments().map((document) => ({
    agency: document.agencyId,
    document: document.documentId,
  }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { agency, document } = await params;
  const entry = getStandardDocument(agency, document);
  if (!entry) return { title: '文書が見つかりません', robots: { index: false, follow: false } };
  const chapterCount = getStandardChapters(agency, document).length;
  return buildPageMetadata({
    title: chapterCount > 0 ? `${entry.title} 章別全文` : `${entry.title} 全文文字起こし`,
    description:
      chapterCount > 0
        ? `${entry.agencyName}「${entry.title}」を編・章・節の構造で読める全${chapterCount}章。原本PDF全${entry.pages.toLocaleString('ja-JP')}ページの逐語文字起こしと原典URL・SHA-256も併載しています。`
        : `${entry.agencyName}「${entry.title}」全${entry.pages.toLocaleString('ja-JP')}ページの文字起こし。PDFページ番号、原典URL、SHA-256、目視確認・判読注記を明示しています。`,
    path: standardDocumentPath(entry),
  });
}

export default async function StandardDocumentPage({ params }: { params: Promise<Params> }) {
  const { agency, document } = await params;
  const entry = getStandardDocument(agency, document);
  if (!entry) notFound();
  const relatedTopics = getTopicsForStandardDocument(entry);
  // 章が生成済みなら「章から読む」を主導線にし、分冊一覧は原典照合用の副次セクションへ下げる。
  const books = groupChaptersByBook(getStandardChapters(agency, document));

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'DigitalDocument',
    name: entry.title,
    inLanguage: 'ja-JP',
    pagination: `${entry.pages} pages`,
    publisher: { '@type': 'GovernmentOrganization', name: entry.agencyName },
    isBasedOn: entry.sourceUrl ?? entry.landing,
    url: `https://doboku-note.com${standardDocumentPath(entry)}`,
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
        breadcrumb={[
          { label: 'ホーム', href: '/' },
          { label: '基準類', href: '/standards' },
          { label: entry.agencyName, href: `/standards/${entry.agencyId}` },
          { label: entry.title },
        ]}
        label={entry.role === 'common' ? 'COMMON SPECIFICATION' : 'COMPANION DOCUMENT'}
        title={entry.title}
        lead={`${entry.agencyName}が公開する原本PDFを、ページ番号と紙面内の改行・空白を保って文字起こししました。`}
        meta={`${books.length > 0 ? `${books.reduce((sum, book) => sum + book.chapters.length, 0)}章 / ` : ''}${entry.pages.toLocaleString('ja-JP')}ページ / ${entry.partCount}分冊 / 原本SHA-256 ${entry.sourceSha256.slice(0, 16)}…`}
      />

      <TwoColumnShell
        as="div"
        mainClassName="py-8 sm:py-10"
        aside={<StandardsNavigation agencyId={agency} currentDocument={entry} />}
      >
        <div className="mb-6 zenn-desktop:hidden">
          <StandardsNavigation agencyId={agency} currentDocument={entry} variant="mobile" />
        </div>
        {entry.duplicateOf && (
          <SectionCard title="同一原本の検索整理" padding="compact" className="mb-6">
            <p className="text-[14px] leading-[1.8] text-[var(--ink-body)]">
              原本SHA-256が <Link href={`/standards/${entry.duplicateOf}`} className="text-[var(--accent)] underline underline-offset-4">{entry.duplicateOf}</Link> と一致します。この機関の原典導線は残し、全文分冊は重複インデックスを避けるため noindex としています。
            </p>
          </SectionCard>
        )}

        {entry.unreadableRanges.length > 0 && (
          <SectionCard title="原本画質による判読注記" padding="compact" className="mb-6 border-[var(--color-warn)]">
            <ul className="space-y-3 text-[13px] leading-[1.8] text-[var(--ink-body)]">
              {entry.unreadableRanges.map((range) => (
                <li key={`${range.page}-${range.range}`}>
                  <strong>PDF page {range.page}：</strong>{range.range}
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        {books.length > 0 && (
          <section aria-labelledby="chapters" className="mb-12">
            <h2 id="chapters" className="font-serif text-2xl font-bold text-[var(--ink)]">章から読む</h2>
            <p className="mt-2 text-[14px] leading-[1.8] text-[var(--ink-muted)]">
              原本の編・章・節の構造で読めます。PDFの分冊位置ではなく、条項の並びのまま通して読める形にしています。
            </p>
            {books.map((book) => (
              <div key={book.bookNumber} className="mt-8">
                <h3 className="font-serif text-lg font-bold text-[var(--ink)]">
                  第{book.bookNumber}編 {book.bookTitle}
                </h3>
                <ol className="mt-3 divide-y divide-[var(--rule-soft)] border-y border-[var(--rule-soft)] bg-[var(--paper)]">
                  {book.chapters.map((chapter) => (
                    <li key={chapter.chapterId}>
                      <Link
                        href={standardChapterPath(entry, chapter)}
                        className="focus-ring flex min-h-14 items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-[var(--accent-fill)]"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-[var(--ink)]">
                            第{chapter.chapterNumber}章 {chapter.chapterTitle}
                          </span>
                          <span className="mt-1 block font-mono text-[11px] text-[var(--ink-muted)]">
                            {chapter.sections.length}節 · 原本 p.{chapter.firstPage}–{chapter.lastPage}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-[var(--ink-muted)]">→</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </section>
        )}

        <section aria-labelledby="transcription-parts">
          <h2 id="transcription-parts" className="font-serif text-xl font-bold text-[var(--ink)]">原典PDFページで確認する</h2>
          <p className="mt-2 text-[14px] leading-[1.8] text-[var(--ink-muted)]">
            {books.length > 0
              ? '章記事の元になった逐語文字起こしです。紙面の改行・空白・ページ番号をそのまま保っているため、原本との照合に使えます。1分冊は原則50ページです。'
              : '1分冊は原則50ページです。各ページ見出しの番号は原本PDF上のページ番号です。'}
          </p>
          <ol className="mt-4 divide-y divide-[var(--rule-soft)] border-y border-[var(--rule-soft)] bg-[var(--paper)]">
            {entry.parts.map((part) => (
              <li key={part.slug}>
                <Link
                  href={standardPartPath(entry, part)}
                  className="focus-ring flex min-h-14 items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-[var(--accent-fill)]"
                >
                  <span className="font-medium text-[var(--ink)]">PDF page {part.firstPage}–{part.lastPage}</span>
                  <span className="font-mono text-[11px] text-[var(--ink-muted)]">{part.pageCount}頁 →</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <StandardTopicLinks topics={relatedTopics} />
        <StandardsAttribution document={entry} />
      </TwoColumnShell>
    </PageShell>
  );
}
