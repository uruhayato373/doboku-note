import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button/Button';
import Arrow from '@/components/ui/Arrow/Arrow';
import { standardChapterDiscoveryItems, standardEntryChaptersItem, standardTopicDiscoveryItems } from '@/components/standards/StandardsSidebarDiscovery';
import Disclosure from '@/components/ui/Disclosure/Disclosure';
import StandardsTreeChapter from '@/components/standards/StandardsTreeChapter';
import { standardTreeSections, standardTreeTocPath, usesTreeNav } from '@/lib/standards-tree-nav';
import {
  getStandardDocuments,
  getStandardsCatalog,
  standardDocumentPath,
  type StandardDocument,
} from '@/lib/standards';
import {
  getStandardChapters,
  groupChaptersByBook,
  standardChapterPath,
  type StandardChapter,
} from '@/lib/standards-articles';
import { generateHeadingId } from '@/lib/toc';
import { standardsAgencyPath } from '@/lib/route-paths';
import { getTopicsForStandardDocument } from '@/lib/topics';
import { getStandardDefaultTopics } from '@/lib/standards-discovery';
import { StandardsRailBanner } from '@/components/standards/StandardsAffiliateBanners';
import LinkRow, { LinkRowList } from '@/components/ui/LinkRow/LinkRow';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import RailStack, { type RailItem } from '@/components/ui/RailStack/RailStack';
import type { RailGroup } from '@/lib/rail-continuation';
import RailFollow from '@/components/ui/RailFollow/RailFollow';
import { followToc } from '@/components/docs/follow-toc';
import type { TocHeading } from '@/lib/toc';

type StandardsNavigationProps = {
  agencyId: string;
  currentDocument?: StandardDocument | undefined;
  currentChapter?: StandardChapter | undefined;
  /** 節ページ（splitBySection の章）で表示中の節番号 */
  currentSection?: number | undefined;
  variant?: 'sidebar' | 'mobile';
  inlineSlots?: readonly string[];
  /** 章・節ページの右の欄の「下に続く束」（回遊カード＋転職バナーの組。無ければ上の束だけ） */
  railGroups?: RailGroup[];
  /** 章・節ページの右の欄の最後の追従ブロック（現在地の目次＋AdSense 1 枠）に出す本文の見出し。渡したページだけ追従ブロックを置く */
  followHeadings?: TocHeading[] | undefined;
};

function AgencyNav({ currentAgency }: { currentAgency: string }) {
  const agencies = getStandardsCatalog().agencies;

  return (
    <MetaCard as="nav" ariaLabel="発行機関を移動" padding="compact" title="発行機関" titleAside={agencies.length}>
      <LinkRowList data={{ 'data-standards-nav': 'agencies' }}>
        {agencies.map((agency) => (
          <LinkRow
            key={agency.agencyId}
            href={standardsAgencyPath(agency.agencyId)}
            title={agency.agencyName}
            meta={<span className="font-mono text-[11px] tabular-nums">{agency.documentCount}</span>}
            current={agency.agencyId === currentAgency}
          />
        ))}
      </LinkRowList>
    </MetaCard>
  );
}

function documentRow(document: StandardDocument, current: boolean) {
  return (
    <LinkRow
      key={document.documentId}
      href={standardDocumentPath(document)}
      title={document.title}
      description={<span className="font-mono text-[11px]">{document.role === 'common' ? '共通仕様書' : '工事必携・関連資料'} · {document.pages.toLocaleString('ja-JP')}頁</span>}
      current={current}
    />
  );
}

function DocumentNav({ currentDocument }: { currentDocument: StandardDocument }) {
  const documents = getStandardDocuments(currentDocument.agencyId);
  const others = documents.filter((document) => document.documentId !== currentDocument.documentId);
  const visibleOthers = others.slice(0, 5);
  const remaining = others.slice(5);

  return (
    <MetaCard as="nav" ariaLabel="この機関の文書を移動" padding="compact" title="この機関の文書" titleAside={documents.length}>
      <LinkRowList data={{ 'data-standards-nav': 'documents' }}>
        {documentRow(currentDocument, true)}
        {visibleOthers.map((document) => documentRow(document, false))}
      </LinkRowList>
      {remaining.length > 0 && (
        <Disclosure
          variant="plain"
          className="border-t border-(--rule-soft)"
          summaryClassName="px-1 py-2 text-[12px] font-bold text-(--accent)"
          summary={`ほか${remaining.length}文書を表示`}
        >
          <LinkRowList className="border-t border-(--rule-soft)">
            {remaining.map((document) => documentRow(document, false))}
          </LinkRowList>
        </Disclosure>
      )}
    </MetaCard>
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
    <MetaCard
      as="nav"
      ariaLabel="目次"
      padding="compact"
      trackNav="standards-tree"
      eyebrow="目次"
      title={
        <Link
          href={standardDocumentPath(document)}
          className="focus-ring hover:text-(--accent)"
          aria-current={!currentChapter ? 'page' : undefined}
        >
          {document.role === 'common' ? '土木工事共通仕様書' : document.title}
        </Link>
      }
    >
      <div
        className="standards-tree"
        data-standards-nav="tree"
      >
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
    </MetaCard>
  );
}

function navigationItems({
  agencyId,
  currentDocument,
  currentChapter,
  currentSection,
}: StandardsNavigationProps): RailItem[] {
  // 機関のページの読み手はその機関の仕様書を探しに来ているので、機関の切り替えより先に章の入口を出す
  if (!currentDocument) {
    return [standardEntryChaptersItem(agencyId), { kind: 'nav', node: <AgencyNav currentAgency={agencyId} /> }];
  }

  // 章を構造化した文書は 編 → 章 → 節 の目次 1 本。章の無い文書は同じ機関の文書一覧だけ
  // （原本の逐語ページ＝分冊は 2026-10-26 に公開をやめた）。
  if (usesTreeNav(currentDocument)) {
    return [
      { kind: 'nav', node: !currentChapter && <DocumentNav currentDocument={currentDocument} /> },
      { kind: 'tree', node: <DocumentTreeNav document={currentDocument} currentChapter={currentChapter} currentSection={currentSection} /> },
    ];
  }

  return [{ kind: 'nav', node: <DocumentNav currentDocument={currentDocument} /> }];
}

/** 右の欄の目次の下に置く回遊。章・節 → 関連記事と他地域の同じ章、文書 → 文書のテーマ、機関 → 施工計画・品質管理のテーマ（入口の章は目次の位置に出す） */
function discoveryItems({
  currentDocument,
  currentChapter,
  withBridge,
  betweenCards,
}: {
  currentDocument?: StandardDocument | undefined;
  currentChapter?: StandardChapter | undefined;
  withBridge: boolean;
  betweenCards?: ReactNode;
}): RailItem[] {
  if (currentDocument && currentChapter) {
    return standardChapterDiscoveryItems({ document: currentDocument, chapter: currentChapter, withBridge, betweenCards });
  }
  if (currentDocument) {
    return standardTopicDiscoveryItems({ topics: getTopicsForStandardDocument(currentDocument), heading: 'この資料を実務・試験で深める', withBridge, betweenCards });
  }
  return standardTopicDiscoveryItems({ topics: getStandardDefaultTopics(), heading: '基準を実務・試験で深める', withBridge, betweenCards });
}

export default function StandardsNavigation({
  agencyId,
  currentDocument,
  currentChapter,
  currentSection,
  variant = 'sidebar',
  inlineSlots = [],
  railGroups = [],
  followHeadings,
}: StandardsNavigationProps) {
  const agency = getStandardsCatalog().agencies.find((entry) => entry.agencyId === agencyId);
  const sectionTitle = currentSection !== undefined
    ? currentChapter?.sections.find((section) => section.number === currentSection)?.headingText
    : undefined;
  const contextLabel = currentChapter
    ? sectionTitle ? `${currentChapter.title} ${sectionTitle}` : currentChapter.title
    : currentDocument?.title ?? agency?.agencyName ?? '基準類';
  // 節ページの親は章ページ（節の一覧）。章の親は文書目次。
  const parentHref = sectionTitle && currentChapter && currentDocument
    ? standardChapterPath(currentDocument, currentChapter)
    : currentChapter && currentDocument
      ? standardDocumentPath(currentDocument)
      : currentDocument
        ? standardsAgencyPath(agencyId)
        : '/standards';
  const parentLabel = sectionTitle
    ? '章の節一覧へ戻る'
    : currentChapter
      ? '文書目次へ戻る'
      : currentDocument
        ? `${agency?.agencyName ?? '発行機関'}の文書一覧`
        : '全国の基準類一覧';
  // 目次 1 本の文書は目次の頭に文書へのリンクがあるので、右の欄の「資料内を移動」の枠を出さない。
  const treeMode = Boolean(currentDocument && usesTreeNav(currentDocument));
  const pageKind = currentChapter ? 'standards' : 'standards-list';
  const navItems = navigationItems({ agencyId, currentDocument, currentChapter, currentSection });
  // 目次の下に置く回遊の枠。モバイルは本文の末尾に資格の橋渡しがあるので、ここでは出さない
  const discovery = discoveryItems({
    currentDocument,
    currentChapter,
    withBridge: variant === 'sidebar',
    // 右の欄の転職は 2 つまで（RAIL_AFFILIATE_MAX）。章・節ページは上の standards-rail・standards-rail-2 で足りるので、回遊の間には置かない
    betweenCards: variant === 'sidebar' && !currentChapter ? <StandardsRailBanner slot="standards-list-rail-2" pageKind={pageKind} inlineSlots={inlineSlots} /> : null,
  });

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
          <ButtonLink href={parentHref} variant="text">
            <Arrow direction="prev" /> {parentLabel}
          </ButtonLink>
          {[...navItems, ...discovery].map((item, index) => <Fragment key={index}>{item.node}</Fragment>)}
        </div>
      </Disclosure>
    );
  }

  // 右の欄は固定・欄の中のスクロールをしない（2026-11-15 運営者指示・全ページ共通）。
  // 上の束も下に続く束（章・節ページだけ・1 組おきに AdSense）も上詰めで並べる。
  const items: RailItem[] = [
    { kind: 'career', node: <StandardsRailBanner slot={currentChapter ? 'standards-rail' : 'standards-list-rail'} pageKind={pageKind} inlineSlots={inlineSlots} /> },
    {
      kind: 'nav',
      node: !treeMode && (
        <MetaCard padding="compact" eyebrow="基準類ナビ" title="資料内を移動" lead={<span className="line-clamp-2">{contextLabel}</span>}>
          <ButtonLink href={parentHref} variant="text" className="mt-3">
            <Arrow direction="prev" /> {parentLabel}
          </ButtonLink>
        </MetaCard>
      ),
    },
    ...navItems,
    { kind: 'career', node: currentChapter && <StandardsRailBanner slot="standards-rail-2" pageKind="standards" inlineSlots={inlineSlots} /> },
    ...discovery,
  ];
  return <RailStack items={items} groups={railGroups} follow={followHeadings && <RailFollow toc={followToc(followHeadings)} />} upperData={{ 'data-standards-sidebar': '' }} />;
}
