import Link from 'next/link';
import { StandardPracticeLinks } from '@/components/ui/SidebarDiscovery';
import Disclosure from '@/components/ui/Disclosure/Disclosure';
import StandardsTreeActiveScroll from '@/components/standards/StandardsTreeActiveScroll';
import StandardsTreeChapter from '@/components/standards/StandardsTreeChapter';
import { standardTreeSections, standardTreeTocPath, usesTreeNav } from '@/lib/standards-tree-nav';
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
  /** 節ページ（splitBySection の章）で表示中の節番号 */
  currentSection?: number | undefined;
  pageNumbers?: number[] | undefined;
  variant?: 'sidebar' | 'mobile';
};

const LINK_BASE =
  'focus-ring flex min-h-11 items-center gap-3 border-l-4 px-3 py-2 text-[14px] leading-[1.55] transition-colors';

function navLinkClass(active: boolean): string {
  return active
    ? `${LINK_BASE} border-(--accent) bg-(--accent-fill) font-bold text-(--ink)`
    : `${LINK_BASE} border-transparent text-(--ink-body) hover:border-(--rule) hover:bg-(--accent-fill) hover:text-(--ink)`;
}

function NavHeading({ children, count }: { children: string; count?: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-(--rule-soft) px-4 py-3">
      <h3 className="text-[15px] font-bold tracking-[0.02em] text-(--ink)">{children}</h3>
      {typeof count === 'number' && (
        <span className="font-mono text-[11px] tabular-nums text-(--ink-muted)">{count}</span>
      )}
    </div>
  );
}

function AgencyNav({ currentAgency }: { currentAgency: string }) {
  const agencies = getStandardsCatalog().agencies;

  return (
    <nav aria-label="発行機関を移動" className="border border-(--rule-soft) bg-(--paper)">
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
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-(--ink-muted)">
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
        <span className="mt-1 block font-mono text-[11px] font-normal text-(--ink-muted)">
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
    <nav aria-label="この機関の文書を移動" className="border border-(--rule-soft) bg-(--paper)">
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
        <Disclosure
          variant="plain"
          className="border-t border-(--rule-soft)"
          summaryClassName="px-4 py-2 text-[12px] font-bold text-(--accent)"
          summary={`ほか${remaining.length}文書を表示`}
        >
          <ul className="border-t border-(--rule-soft) py-1">
            {remaining.map((document) => (
              <li key={document.documentId}>
                <DocumentLink document={document} active={false} />
              </li>
            ))}
          </ul>
        </Disclosure>
      )}
    </nav>
  );
}

function chapterNumberLabel(chapter: StandardChapter): string {
  return chapter.chapterLabel !== undefined ? chapter.chapterLabel.replace(/^第/, '') : `${chapter.chapterNumber}章`;
}

/**
 * 編 → 章 → 節 の目次（右の欄の主導線）。表示中の編を開いて表示中の章の節を常に出し、表示中の節の下に条（ページ内の見出し）を出す。
 * 章名はリンクなので <summary> に入れない（操作できる要素の入れ子＝axe の nested-interactive）。他の章の開閉は章名の横のボタン。
 * 表示中の章の節は HTML に書き、他の章の節は開いたときに toc.json から読む（StandardsTreeChapter）。
 * 見た目は globals.css の standards-tree に集約する（行ごとにクラスを並べない）。
 */
function DocumentTreeNav({
  document,
  currentChapter,
  currentSection,
}: {
  document: StandardDocument;
  currentChapter?: StandardChapter | undefined;
  currentSection?: number | undefined;
}) {
  const books = groupChaptersByBook(getStandardChapters(document.agencyId, document.documentId));
  const tocUrl = standardTreeTocPath(document);

  return (
    <nav aria-label="目次" className="border border-(--rule-soft) bg-(--paper) py-2 dark:border-(--rule-soft)">
      <Link
        href={standardDocumentPath(document)}
        className="focus-ring block px-4 pb-2 pt-1 text-[12px] font-bold text-(--ink-muted) hover:text-(--accent)"
        aria-current={!currentChapter ? 'page' : undefined}
      >
        {document.role === 'common' ? '土木工事共通仕様書' : document.title}・目次
      </Link>
      <div className="standards-tree" data-standards-nav="tree">
        {books.map((book) => {
          const activeBook = book.chapters.some((chapter) => chapter.chapterId === currentChapter?.chapterId);
          return (
            <Disclosure key={book.bookNumber} variant="plain" open={activeBook} data-tree-book summary={book.bookLabel}>
              <ul className="pb-1 pl-2">
                {book.chapters.map((chapter) => {
                  const activeChapter = chapter.chapterId === currentChapter?.chapterId;
                  const chapterLink = (
                    <Link
                      href={standardChapterPath(document, chapter)}
                      className="focus-ring"
                      aria-current={activeChapter && currentSection === undefined ? 'page' : undefined}
                      data-active={activeChapter ? '' : undefined}
                    >
                      <span>{chapterNumberLabel(chapter)}</span>
                      <span>{chapter.chapterTitle}</span>
                    </Link>
                  );
                  if (chapter.sections.length === 0) {
                    return <li key={chapter.chapterId}><div data-tree-row data-tree-leaf>{chapterLink}</div></li>;
                  }
                  if (!activeChapter) {
                    return (
                      <li key={chapter.chapterId}>
                        <StandardsTreeChapter tocUrl={tocUrl} chapterId={chapter.chapterId} label={`${chapterNumberLabel(chapter)} ${chapter.chapterTitle}`}>
                          {chapterLink}
                        </StandardsTreeChapter>
                      </li>
                    );
                  }
                  return (
                    <li key={chapter.chapterId}>
                      <div data-tree-row data-tree-leaf>{chapterLink}</div>
                        <ol data-standards-nav="sections" data-tree-sections>
                          {standardTreeSections(document, chapter, { samePage: currentSection === undefined }).map((section) => {
                            const activeSection = section.number === currentSection;
                            const articles = activeSection
                              ? chapter.sections.find((entry) => entry.number === section.number)?.articles ?? []
                              : [];
                            return (
                              <li key={section.number}>
                                <Link href={section.href} className="focus-ring" aria-current={activeSection ? 'page' : undefined}>
                                  <span>{section.number}節</span>
                                  <span>{section.title}</span>
                                </Link>
                                {articles.length > 0 && (
                                  <ol>
                                    {articles.map((article) => (
                                      <li key={article.number}>
                                        <a href={`#${generateHeadingId(article.headingText)}`} className="focus-ring">
                                          {article.title}
                                        </a>
                                      </li>
                                    ))}
                                  </ol>
                                )}
                              </li>
                            );
                          })}
                        </ol>
                    </li>
                  );
                })}
              </ul>
            </Disclosure>
          );
        })}
      </div>
      <StandardsTreeActiveScroll />
    </nav>
  );
}

function PartNav({ document, currentPart }: { document: StandardDocument; currentPart?: StandardPart | undefined }) {
  return (
    <nav aria-label="分冊を移動" className="border border-(--rule-soft) bg-(--paper)">
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
                <span className="w-5 shrink-0 font-mono text-[11px] tabular-nums text-(--ink-muted)">
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
    <nav aria-label="この分冊のページ" className="border border-(--rule-soft) bg-(--paper)">
      <NavHeading count={pageNumbers.length}>ページへ移動</NavHeading>
      <ol className="grid grid-cols-5 gap-px bg-(--rule-soft) p-px" data-standards-nav="pages">
        {pageNumbers.map((page) => (
          <li key={page} className="bg-(--paper)">
            <a
              href={`#pdf-page-${page}`}
              className="focus-ring flex min-h-11 items-center justify-center font-mono text-[11px] tabular-nums text-(--ink-body) transition-colors hover:bg-(--accent-fill) hover:text-(--accent)"
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
  currentSection,
  pageNumbers = [],
}: Omit<StandardsNavigationProps, 'variant'>) {
  if (!currentDocument) return <AgencyNav currentAgency={agencyId} />;

  // 章を構造化した文書は 編 → 章 → 節 の目次 1 本。未構造化の文書と逐語ページは分冊が主導線。
  if (!currentPart && usesTreeNav(currentDocument)) {
    return (
      <>
        {!currentChapter && <DocumentNav currentDocument={currentDocument} />}
        <DocumentTreeNav document={currentDocument} currentChapter={currentChapter} currentSection={currentSection} />
      </>
    );
  }

  return (
    <>
      {!currentPart && <DocumentNav currentDocument={currentDocument} />}
      <PartNav document={currentDocument} currentPart={currentPart} />
      {currentPart && pageNumbers.length > 0 && <PageNav pageNumbers={pageNumbers} />}
    </>
  );
}

export default function StandardsNavigation({
  agencyId,
  currentDocument,
  currentPart,
  currentChapter,
  currentSection,
  pageNumbers,
  variant = 'sidebar',
}: StandardsNavigationProps) {
  const agency = getStandardsCatalog().agencies.find((entry) => entry.agencyId === agencyId);
  const sectionTitle = currentSection !== undefined
    ? currentChapter?.sections.find((section) => section.number === currentSection)?.headingText
    : undefined;
  const contextLabel = currentPart
    ? `PDF ${currentPart.firstPage}–${currentPart.lastPage}`
    : currentChapter
      ? sectionTitle ? `${currentChapter.title} ${sectionTitle}` : currentChapter.title
      : currentDocument?.title ?? agency?.agencyName ?? '基準類';
  // 節ページの親は章ページ（節の一覧）。章・分冊の親は文書目次。
  const parentHref = sectionTitle && currentChapter && currentDocument
    ? standardChapterPath(currentDocument, currentChapter)
    : (currentPart || currentChapter) && currentDocument
      ? standardDocumentPath(currentDocument)
      : currentDocument
        ? `/standards/${agencyId}`
        : '/standards';
  const parentLabel = sectionTitle
    ? '章の節一覧へ戻る'
    : currentPart || currentChapter
      ? '文書目次へ戻る'
      : currentDocument
        ? `${agency?.agencyName ?? '発行機関'}の文書一覧`
        : '全国の基準類一覧';
  // 目次 1 本の文書は目次の頭に文書へのリンクがあるので、右の欄の「資料内を移動」の枠を出さない。
  const treeMode = Boolean(currentDocument && !currentPart && usesTreeNav(currentDocument));
  const contents = (
    <NavigationContents
      agencyId={agencyId}
      currentDocument={currentDocument}
      currentPart={currentPart}
      currentChapter={currentChapter}
      currentSection={currentSection}
      pageNumbers={pageNumbers}
    />
  );

  if (variant === 'mobile') {
    return (
      <Disclosure
        radius="none"
        className="zenn-desktop:hidden"
        data-standards-mobile-nav
        summary={
          <>
            <span className="block text-[15px] font-bold tracking-[0.02em] text-(--ink)">資料内を移動</span>
            <span className="mt-0.5 block truncate text-[11px] text-(--ink-muted)">{contextLabel}</span>
          </>
        }
      >
        <div className="space-y-3 border-t border-(--rule-soft) bg-(--bg) p-3">
          <Link
            href={parentHref}
            className="focus-ring inline-flex min-h-11 items-center text-[12px] font-bold text-(--accent) hover:underline"
          >
            ← {parentLabel}
          </Link>
          {contents}
          {currentChapter && <StandardPracticeLinks title={currentChapter.title} />}
        </div>
      </Disclosure>
    );
  }

  return (
    <div className="sticky top-6 max-h-[calc(100vh-3rem)] space-y-3 overflow-y-auto" data-standards-sidebar>
      {!treeMode && <div className="border border-(--rule-soft) bg-(--paper) p-5">
        <div className="text-[11px] font-bold tracking-[0.08em] text-(--accent)">基準類ナビ</div>
        <h2 className="mt-2 text-[18px] font-bold tracking-[0.02em] text-(--ink)">資料内を移動</h2>
        <p className="mt-2 line-clamp-2 text-[13px] leading-[1.7] text-(--ink-muted)">{contextLabel}</p>
        <Link
          href={parentHref}
          className="focus-ring mt-3 inline-flex min-h-11 items-center text-[12px] font-bold text-(--accent) hover:underline"
        >
          ← {parentLabel}
        </Link>
      </div>}
      {contents}
      {currentChapter && <StandardPracticeLinks title={currentChapter.title} />}
    </div>
  );
}
