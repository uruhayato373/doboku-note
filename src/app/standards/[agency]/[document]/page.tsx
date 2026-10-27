import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import TwoColumnShell from '@/components/layout/TwoColumnShell';
import StandardsAttribution from '@/components/standards/StandardsAttribution';
import StandardDataLinks from '@/components/standards/StandardDataLinks';
import StandardTopicLinks from '@/components/standards/StandardTopicLinks';
import StandardsNavigation from '@/components/standards/StandardsNavigation';
import { buildPageMetadata } from '@/lib/metadata';
import {
  getStandardDocument,
  getStandardDocuments,
  isStandardPartIndexable,
  standardDocumentPath,
} from '@/lib/standards';
import {
  getStandardChapters,
  groupChaptersByBook,
  standardChapterHeading,
  standardChapterPath,
} from '@/lib/standards-articles';
import { getTopicsForStandardDocument } from '@/lib/topics';
import { buildStandardDocumentStructuredData } from '@/lib/standards-structured-data';
import AffiliateSlot from '@/components/ui/AffiliateSlot/AffiliateSlot';
import { standardsAgencyPath } from '@/lib/route-paths';
import { getAreaLabel } from '@/lib/content-taxonomy';

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
  const metadata = buildPageMetadata({
    title: chapterCount > 0 ? `${entry.title} 章別全文` : entry.title,
    description:
      chapterCount > 0
        ? `${entry.agencyName}「${entry.title}」を編・章・節の構造で読める全${chapterCount}章。`
        : `${entry.agencyName}「${entry.title}」（全${entry.pages.toLocaleString('ja-JP')}ページ）の文書情報と出典。`,
    path: standardDocumentPath(entry),
  });
  // 同じ要綱を他の機関・版でも収録している文書（設定 editionCanonical）と、近畿以外の共通仕様書（本文の 98.7% が同じ・
  // 2026-10-22 DN-0677）は、章と同じ判定で 1 本だけ索引に載せる。読める状態は保つ（noindex, follow）。
  // 章の無い文書は本文（逐語ページ）の公開をやめた（2026-10-26）ので、文書情報だけのページを索引に載せない。
  return chapterCount > 0 && isStandardPartIndexable(entry) ? metadata : { ...metadata, robots: { index: false, follow: true } };
}

export default async function StandardDocumentPage({ params }: { params: Promise<Params> }) {
  const { agency, document } = await params;
  const entry = getStandardDocument(agency, document);
  if (!entry) notFound();
  const relatedTopics = getTopicsForStandardDocument(entry);
  // 章が生成済みなら「章から読む」が本文の入口。原本ページ（逐語文字起こし）への案内は出さない（2026-10-26 に公開をやめた）。
  const chapters = getStandardChapters(agency, document);
  const books = groupChaptersByBook(chapters);

  const schema = buildStandardDocumentStructuredData(entry, chapters.length);

  return (
    <PageShell
      variant="default"
      beforeHeader={(
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      )}
    >
      <TwoColumnShell
        as="div"
        mainClassName="py-8 sm:py-10"
        aside={<StandardsNavigation agencyId={agency} currentDocument={entry} />}
      >

        <div className="card-surface-section px-5 pb-8 sm:px-8 sm:pb-10 lg:px-10">
      <PageHeader
        variant="inline"
        className="border-b border-(--rule-soft) py-6 sm:py-8"
        breadcrumb={[
          { label: 'ホーム', href: '/' },
          { label: getAreaLabel('standards'), href: '/standards' },
          { label: entry.agencyName, href: standardsAgencyPath(entry.agencyId) },
        ]}
        title={entry.title}
        lead={chapters.length > 0
          ? `${entry.agencyName}が公表する「${entry.title}」全${chapters.length}章を編・章ごとに読めます。`
          : `${entry.agencyName}が公表する「${entry.title}」です。章ごとの本文はまだ掲載していません。発行元のページはページ末尾の出典欄にあります。`}
        meta={<span className="text-sm">{entry.edition} · {chapters.length > 0 ? `${chapters.length}章 · ` : ''}{entry.pages.toLocaleString('ja-JP')}ページ</span>}
      />
        <div className="pt-5">
        {books.length > 0 && (
          <section aria-labelledby="chapters" className="mb-8">
            <h2 id="chapters" className="text-2xl font-bold text-(--ink)">章から読む</h2>
            <p className="mt-2 text-[14px] leading-[1.8] text-(--ink-muted)">
              読みたい編・章を選んでください。
            </p>
            {books.map((book) => (
              <div key={book.bookNumber} className="mt-5">
                <h3 className="text-lg font-bold text-(--ink)">
                  {book.bookLabel}
                </h3>
                <ol className="mt-3 divide-y divide-(--rule-soft) border-y border-(--rule-soft) bg-(--paper)">
                  {book.chapters.map((chapter) => (
                    <li key={chapter.chapterId}>
                      <Link
                        href={standardChapterPath(entry, chapter)}
                        className="focus-ring flex min-h-14 items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-(--accent-fill)"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-(--ink)">
                            {standardChapterHeading(chapter)}
                          </span>
                          <span className="mt-1 block font-mono text-[11px] text-(--ink-muted)">
                            {chapter.sections.length}節
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-(--ink-muted)">→</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </section>
        )}


        {books.length > 0 && <StandardDataLinks document={entry} />}

        <StandardTopicLinks topics={relatedTopics} />
        </div>
        </div>
        <div className="mt-6 zenn-desktop:hidden">
          <StandardsNavigation agencyId={agency} currentDocument={entry} variant="mobile" />
        </div>
        {/* 転職の案内は本文の外の末尾に 1 枠（章ページ以外の公的基準・右のナビ欄には置かない）。案件は配置ルール */}
        <AffiliateSlot page={{ pageKind: 'standards-list' }} slot="standards-list-end" className="mt-6" />
        <StandardsAttribution document={entry} />
      </TwoColumnShell>
    </PageShell>
  );
}
