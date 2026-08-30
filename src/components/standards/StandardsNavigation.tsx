import Link from 'next/link';
import DisclosureChevron from '@/components/ui/DisclosureChevron';
import {
  getStandardDocuments,
  getStandardsCatalog,
  standardDocumentPath,
  standardPartPath,
  type StandardDocument,
  type StandardPart,
} from '@/lib/standards';
import {
  getStandardChapters,
  groupChaptersByBook,
  standardChapterPath,
  type StandardChapter,
} from '@/lib/standards-articles';
import { generateHeadingId } from '@/lib/toc';

type StandardsNavigationProps = {
  agencyId: string;
  currentDocument?: StandardDocument | undefined;
  currentPart?: StandardPart | undefined;
  currentChapter?: StandardChapter | undefined;
  pageNumbers?: number[] | undefined;
  variant?: 'sidebar' | 'mobile';
};

const LINK_BASE =
  'focus-ring flex min-h-11 items-center gap-3 border-l-4 px-3 py-2 text-[13px] leading-[1.45] transition-colors';

function navLinkClass(active: boolean): string {
  return active
    ? `${LINK_BASE} border-[var(--accent)] bg-[var(--accent-fill)] font-bold text-[var(--ink)]`
    : `${LINK_BASE} border-transparent text-[var(--ink-body)] hover:border-[var(--rule)] hover:bg-[var(--accent-fill)] hover:text-[var(--ink)]`;
}

function NavHeading({ children, count }: { children: string; count?: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--rule-soft)] px-4 py-3">
      <h3 className="font-serif text-[15px] font-bold text-[var(--ink)]">{children}</h3>
      {typeof count === 'number' && (
        <span className="font-mono text-[10px] tabular-nums text-[var(--ink-muted)]">{count}</span>
      )}
    </div>
  );
}

function AgencyNav({ currentAgency }: { currentAgency: string }) {
  const agencies = getStandardsCatalog().agencies;

  return (
    <nav aria-label="発行機関を移動" className="border border-[var(--rule-soft)] bg-[var(--paper)]">
      <NavHeading count={agencies.length}>発行機関</NavHeading>
      <ul className="py-1" data-standards-nav="agencies">
        {agencies.map((agency) => {
          const active = agency.agencyId === currentAgency;
          return (
            <li key={agency.agencyId}>
              <Link
                href={`/standards/${agency.agencyId}`}
                className={navLinkClass(active)}
                aria-current={active ? 'page' : undefined}
              >
                <span className="min-w-0 flex-1">{agency.agencyName}</span>
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--ink-muted)]">
                  {agency.documentCount}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function DocumentLink({ document, active }: { document: StandardDocument; active: boolean }) {
  return (
    <Link
      href={standardDocumentPath(document)}
      className={navLinkClass(active)}
      aria-current={active ? 'page' : undefined}
      title={document.title}
    >
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2">{document.title}</span>
        <span className="mt-1 block font-mono text-[10px] font-normal text-[var(--ink-muted)]">
          {document.role === 'common' ? '共通仕様書' : '工事必携・関連資料'} · {document.pages.toLocaleString('ja-JP')}頁
        </span>
      </span>
    </Link>
  );
}

function DocumentNav({ currentDocument }: { currentDocument: StandardDocument }) {
  const documents = getStandardDocuments(currentDocument.agencyId);
  const others = documents.filter((document) => document.documentId !== currentDocument.documentId);
  const visibleOthers = others.slice(0, 5);
  const remaining = others.slice(5);

  return (
    <nav aria-label="この機関の文書を移動" className="border border-[var(--rule-soft)] bg-[var(--paper)]">
      <NavHeading count={documents.length}>この機関の文書</NavHeading>
      <ul className="py-1" data-standards-nav="documents">
        <li>
          <DocumentLink document={currentDocument} active />
        </li>
        {visibleOthers.map((document) => (
          <li key={document.documentId}>
            <DocumentLink document={document} active={false} />
          </li>
        ))}
      </ul>
      {remaining.length > 0 && (
        <details className="group border-t border-[var(--rule-soft)]">
          <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2 text-[12px] font-bold text-[var(--accent)] marker:hidden">
            <span className="min-w-0 flex-1">ほか{remaining.length}文書を表示</span>
            <DisclosureChevron className="disclosure-chevron h-4 w-4 shrink-0 text-[var(--ink-muted)]" />
          </summary>
          <ul className="border-t border-[var(--rule-soft)] py-1">
            {remaining.map((document) => (
              <li key={document.documentId}>
                <DocumentLink document={document} active={false} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </nav>
  );
}

/**
 * 編ごとに章を束ねた目次。文書ページと章記事の主導線で、PDF の分冊位置ではなく
 * 原本の編・章構造で移動する。構造化前の文書では章がゼロ件なので呼び出し側が出さない。
 */
function ChapterNav({
  document,
  currentChapter,
}: {
  document: StandardDocument;
  currentChapter?: StandardChapter | undefined;
}) {
  const books = groupChaptersByBook(getStandardChapters(document.agencyId, document.documentId));
  const total = books.reduce((sum, book) => sum + book.chapters.length, 0);

  return (
    <nav aria-label="章を移動" className="border border-[var(--rule-soft)] bg-[var(--paper)]">
      <NavHeading count={total}>章から読む</NavHeading>
      <div className="py-1" data-standards-nav="chapters">
        {books.map((book) => (
          <div key={book.bookNumber}>
            <p className="px-4 pt-2 pb-1 font-mono text-[10px] tracking-wide text-[var(--ink-muted)]">
              第{book.bookNumber}編 {book.bookTitle}
            </p>
            <ul>
              {book.chapters.map((chapter) => {
                const active = chapter.chapterId === currentChapter?.chapterId;
                return (
                  <li key={chapter.chapterId}>
                    <Link
                      href={standardChapterPath(document, chapter)}
                      className={navLinkClass(active)}
                      aria-current={active ? 'page' : undefined}
                    >
                      <span className="w-8 shrink-0 font-mono text-[10px] tabular-nums text-[var(--ink-muted)]">
                        {chapter.chapterNumber}章
                      </span>
                      <span className="min-w-0 flex-1">{chapter.chapterTitle}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

/**
 * 表示中の章の節目次。アンカーは src/lib/toc.ts の generateHeadingId で導出する
 * （rehypeHeadingIds が本文へ振る ID と同じ関数＝ここに ID を持たせて第 2 の真実源にしない）。
 */
function SectionNav({ chapter }: { chapter: StandardChapter }) {
  if (chapter.sections.length === 0) return null;
  return (
    <nav aria-label="この章の節を移動" className="border border-[var(--rule-soft)] bg-[var(--paper)]">
      <NavHeading count={chapter.sections.length}>この章の節</NavHeading>
      <ol className="py-1" data-standards-nav="sections">
        {chapter.sections.map((section) => (
          <li key={section.number}>
            <a
              href={`#${generateHeadingId(section.headingText)}`}
              className={navLinkClass(false)}
            >
              <span className="w-8 shrink-0 font-mono text-[10px] tabular-nums text-[var(--ink-muted)]">
                {section.number}節
              </span>
              <span className="min-w-0 flex-1">{section.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function PartNav({ document, currentPart }: { document: StandardDocument; currentPart?: StandardPart | undefined }) {
  return (
    <nav aria-label="分冊を移動" className="border border-[var(--rule-soft)] bg-[var(--paper)]">
      <NavHeading count={document.parts.length}>原典PDFページ</NavHeading>
      <ol className="py-1" data-standards-nav="parts">
        {document.parts.map((part, index) => {
          const active = part.slug === currentPart?.slug;
          return (
            <li key={part.slug}>
              <Link
                href={standardPartPath(document, part)}
                className={navLinkClass(active)}
                aria-current={active ? 'page' : undefined}
              >
                <span className="w-5 shrink-0 font-mono text-[10px] tabular-nums text-[var(--ink-muted)]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1">PDF {part.firstPage}–{part.lastPage}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function PageNav({ pageNumbers }: { pageNumbers: number[] }) {
  return (
    <nav aria-label="この分冊のページ" className="border border-[var(--rule-soft)] bg-[var(--paper)]">
      <NavHeading count={pageNumbers.length}>ページへ移動</NavHeading>
      <ol className="grid grid-cols-5 gap-px bg-[var(--rule-soft)] p-px" data-standards-nav="pages">
        {pageNumbers.map((page) => (
          <li key={page} className="bg-[var(--paper)]">
            <a
              href={`#pdf-page-${page}`}
              className="focus-ring flex min-h-11 items-center justify-center font-mono text-[11px] tabular-nums text-[var(--ink-body)] transition-colors hover:bg-[var(--accent-fill)] hover:text-[var(--accent)]"
              aria-label={`PDF page ${page}へ移動`}
            >
              {page}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function NavigationContents({
  agencyId,
  currentDocument,
  currentPart,
  currentChapter,
  pageNumbers = [],
}: Omit<StandardsNavigationProps, 'variant'>) {
  if (!currentDocument) return <AgencyNav currentAgency={agencyId} />;

  const hasChapters =
    getStandardChapters(currentDocument.agencyId, currentDocument.documentId).length > 0;

  // 面ごとに出すもの: 文書ページ=編・章一覧 / 章記事=章一覧＋この章の節 / 逐語ページ=分冊＋PDFページ。
  // 章が未生成の文書は従来どおり分冊が主導線になる。
  return (
    <>
      {!currentPart && !currentChapter && <DocumentNav currentDocument={currentDocument} />}
      {hasChapters && !currentPart && (
        <ChapterNav document={currentDocument} currentChapter={currentChapter} />
      )}
      {currentChapter && <SectionNav chapter={currentChapter} />}
      {(!hasChapters || currentPart) && (
        <PartNav document={currentDocument} currentPart={currentPart} />
      )}
      {currentPart && pageNumbers.length > 0 && <PageNav pageNumbers={pageNumbers} />}
    </>
  );
}

export default function StandardsNavigation({
  agencyId,
  currentDocument,
  currentPart,
  currentChapter,
  pageNumbers,
  variant = 'sidebar',
}: StandardsNavigationProps) {
  const agency = getStandardsCatalog().agencies.find((entry) => entry.agencyId === agencyId);
  const contextLabel = currentPart
    ? `PDF ${currentPart.firstPage}–${currentPart.lastPage}`
    : currentChapter
      ? currentChapter.title
      : currentDocument?.title ?? agency?.agencyName ?? '基準類';
  const parentHref = (currentPart || currentChapter) && currentDocument
    ? standardDocumentPath(currentDocument)
    : currentDocument
      ? `/standards/${agencyId}`
      : '/standards';
  const parentLabel = currentPart || currentChapter
    ? '文書目次へ戻る'
    : currentDocument
      ? `${agency?.agencyName ?? '発行機関'}の文書一覧`
      : '全国の基準類一覧';
  const contents = (
    <NavigationContents
      agencyId={agencyId}
      currentDocument={currentDocument}
      currentPart={currentPart}
      currentChapter={currentChapter}
      pageNumbers={pageNumbers}
    />
  );

  if (variant === 'mobile') {
    return (
      <details
        className="group zenn-desktop:hidden border border-[var(--rule-soft)] bg-[var(--paper)]"
        data-standards-mobile-nav
      >
        <summary className="focus-ring flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-3 marker:hidden">
          <span className="min-w-0 flex-1">
            <span className="block font-serif text-[15px] font-bold text-[var(--ink)]">資料内を移動</span>
            <span className="mt-0.5 block truncate text-[11px] text-[var(--ink-muted)]">{contextLabel}</span>
          </span>
          <DisclosureChevron className="disclosure-chevron h-4 w-4 shrink-0 text-[var(--ink-muted)]" />
        </summary>
        <div className="space-y-3 border-t border-[var(--rule-soft)] bg-[var(--bg)] p-3">
          <Link
            href={parentHref}
            className="focus-ring inline-flex min-h-11 items-center text-[12px] font-bold text-[var(--accent)] hover:underline"
          >
            ← {parentLabel}
          </Link>
          {contents}
        </div>
      </details>
    );
  }

  return (
    <div className="sticky top-6 max-h-[calc(100vh-3rem)] space-y-3 overflow-y-auto" data-standards-sidebar>
      <div className="border border-[var(--rule-soft)] bg-[var(--paper)] p-5">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--accent)]">LIBRARY NAV</div>
        <h2 className="mt-2 font-serif text-lg font-bold text-[var(--ink)]">基準類を移動</h2>
        <p className="mt-2 line-clamp-2 text-[12px] leading-[1.65] text-[var(--ink-muted)]">{contextLabel}</p>
        <Link
          href={parentHref}
          className="focus-ring mt-3 inline-flex min-h-11 items-center text-[12px] font-bold text-[var(--accent)] hover:underline"
        >
          ← {parentLabel}
        </Link>
      </div>
      {contents}
    </div>
  );
}
