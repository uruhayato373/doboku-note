import 'server-only';

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getStandardDocument, type StandardDocument, type StandardPart } from '@/lib/standards';
import { getSiteAssetR2Url } from '@/lib/r2-image-loader';
import { chapterPreambleText, sectionPageMarkdown, splitChapterBySection } from '@/lib/standards-section-split.mjs';
import { standardBookLabel } from '@/lib/standards-chapter-labels';

export { standardBookLabel, standardChapterHeading } from '@/lib/standards-chapter-labels';

/**
 * 構造化章記事（レイヤー2）の読み出し。
 *
 * レイヤー1（content/site/standards-library/**）は原典照合用の逐語文字起こしで不変。
 * レイヤー2はそこから scripts/build-standard-articles.mjs が生成した派生コンテンツで、
 * 台帳は content/site/standards-articles/{agency}/{document}/manifest.json。
 *
 * アンカー ID はここに持たない。src/lib/toc.ts の extractHeadings（rehypeHeadingIds と同じ
 * 生成規則）から導出する。manifest に複製すると第 2 の真実源になり必ずズレる。
 */

const ARTICLES_ROOT = join(process.cwd(), 'content', 'site', 'standards-articles');

type StandardChapterArticle = {
  number: string;
  title: string;
  headingText: string;
  page: number;
};

export type StandardChapterSection = {
  number: number;
  title: string;
  headingText: string;
  firstPage: number;
  lastPage: number;
  articles: StandardChapterArticle[];
};

export type StandardChapter = {
  chapterId: string;
  title: string;
  bookNumber: number;
  bookTitle: string;
  chapterNumber: number;
  chapterTitle: string;
  /** 目次（outline）で切った文書の編・章の表示の語（`土木工事編`・`第1章`・`Ⅰ．`）。無ければ「第N編」「第N章」 */
  bookLabel?: string;
  chapterLabel?: string;
  file: string;
  firstPage: number;
  lastPage: number;
  sourceParts: string[];
  sourcePages: number[];
  sourceSha256: string;
  outputSha256: string;
  outputBytes: number;
  /** 章ページを節の一覧にして本文を節ページで出す章（判定は build-standard-articles.mjs） */
  splitBySection?: boolean;
  sections: StandardChapterSection[];
  /** 節を持たない章の条（要綱の `第1 目的`）。節の中の条は sections 側 */
  articles?: StandardChapterArticle[];
  /** 冊子の項目番号（近畿の必携の総目次の番号）。設定 editionCanonical の item と結ぶ */
  item?: number;
  /** 設定で条の見出しを止めた章（見出しを持たない説明資料） */
  plainArticles?: boolean;
  stats: Record<string, number>;
  indexable: boolean;
  /** 原本が章名だけで本文の無い章（中部の特記仕様書 10-9 など）。検索に載せない */
  bodyless?: boolean;
  /** 地方の訂正・追加（中国地方整備局版）が載っている原本ページ（判定は build-standard-articles.mjs） */
  amendments?: { document: string; pages: number[] };
  duplicateOf: string | null;
  reviewStatus: 'clean' | 'needs-review';
};

export type StandardArticlesManifest = {
  version: number;
  agencyId: string;
  agencyName: string;
  documentId: string;
  documentTitle: string;
  documentRole: 'common' | 'companion';
  catalogSourceSha256: string;
  pages: number;
  bodyStart: { page: number; reason: string };
  frontMatter: { firstPage: number | null; lastPage: number | null; pageCount: number; note: string };
  indexable: boolean;
  indexableReason: string;
  duplicateOf: string | null;
  audit: Record<string, number>;
  chapters: StandardChapter[];
};

/** 編ごとに章を束ねた表示用の並び。文書ページとサイドバーが同じ順序を共有する。 */
export type StandardChapterBook = {
  bookNumber: number;
  bookTitle: string;
  /** 表示する編の名前（`第1編 共通編` または目次で切った文書の `土木工事編`） */
  bookLabel: string;
  chapters: StandardChapter[];
};

// build 済み manifest は不変なのでプロセス内で使い回す（静的書き出しで 344 章 × 各ページから読まれる）。
// 値だけを覚え、「無かった」ことは覚えない（下の getStandardArticlesManifest 参照）。
const manifestCache = new Map<string, StandardArticlesManifest>();

function manifestKey(agencyId: string, documentId: string): string {
  return `${agencyId}/${documentId}`;
}

function getStandardArticlesManifest(
  agencyId: string,
  documentId: string,
): StandardArticlesManifest | null {
  const key = manifestKey(agencyId, documentId);
  const cached = manifestCache.get(key);
  if (cached) return cached;
  const path = join(ARTICLES_ROOT, agencyId, documentId, 'manifest.json');
  if (!existsSync(path)) {
    // 「まだ生成していない」は覚えない。覚えると dev サーバー起動後に
    // build-standard-articles を回しても章が出ないまま古い状態を返し続ける。
    // 存在検査は 1 リクエスト数マイクロ秒で、静的書き出しでは初回に埋まる。
    return null;
  }
  const manifest = JSON.parse(readFileSync(path, 'utf8')) as StandardArticlesManifest;
  manifestCache.set(key, manifest);
  return manifest;
}

/** 構造化済みかどうか。構造化した 9 文書（共通仕様書 8 文書と北海道開発局の道路・河川工事仕様書）だけが true で、未生成の文書は従来どおり分冊が主導線になる。 */
export function hasStandardChapters(agencyId: string, documentId: string): boolean {
  return (getStandardArticlesManifest(agencyId, documentId)?.chapters.length ?? 0) > 0;
}

export function getStandardChapters(agencyId: string, documentId: string): StandardChapter[] {
  return getStandardArticlesManifest(agencyId, documentId)?.chapters ?? [];
}

export function getStandardChapter(
  agencyId: string,
  documentId: string,
  chapterId: string,
): { document: StandardDocument; manifest: StandardArticlesManifest; chapter: StandardChapter } | null {
  const manifest = getStandardArticlesManifest(agencyId, documentId);
  const document = getStandardDocument(agencyId, documentId);
  const chapter = manifest?.chapters.find((entry) => entry.chapterId === chapterId);
  return manifest && document && chapter ? { document, manifest, chapter } : null;
}

/** 編 → 章 の 2 段構成へ畳む。manifest の並び（＝原本のページ順）をそのまま保つ。 */
export function groupChaptersByBook(chapters: StandardChapter[]): StandardChapterBook[] {
  const books: StandardChapterBook[] = [];
  for (const chapter of chapters) {
    const last = books[books.length - 1];
    if (last && last.bookNumber === chapter.bookNumber) {
      last.chapters.push(chapter);
      continue;
    }
    books.push({ bookNumber: chapter.bookNumber, bookTitle: chapter.bookTitle, bookLabel: standardBookLabel(chapter), chapters: [chapter] });
  }
  return books;
}

export function readStandardChapterMarkdown(
  agencyId: string,
  documentId: string,
  chapter: Pick<StandardChapter, 'file'>,
): string {
  return readFileSync(join(ARTICLES_ROOT, agencyId, documentId, chapter.file), 'utf8');
}

/**
 * 節ページに分けた章の、最初の節より前の本文（生成器の注記コメントを除く）。無ければ null。
 * 章ページは節の一覧になるので、ここに置いた案内（地方の訂正・追加など）は一覧の上に出す。
 */
export function standardChapterPreamble(markdown: string): string | null {
  return chapterPreambleText(markdown) || null;
}

/**
 * 節ページの解決。章が splitBySection でない、または節が無いときは null。
 * 本文は章の Markdown から src/lib/standards-section-split.mjs の規則で切り出す（章の .md は 1 本のまま）。
 */
export function getStandardChapterSection(
  agencyId: string,
  documentId: string,
  chapterId: string,
  sectionNumber: number,
): {
  document: StandardDocument;
  chapter: StandardChapter;
  section: StandardChapterSection;
  index: number;
  markdown: string;
} | null {
  const resolved = getStandardChapter(agencyId, documentId, chapterId);
  if (!resolved?.chapter.splitBySection) return null;
  const { document, chapter } = resolved;
  const index = chapter.sections.findIndex((section) => section.number === sectionNumber);
  const section = chapter.sections[index];
  if (!section) return null;
  const split = splitChapterBySection(readStandardChapterMarkdown(agencyId, documentId, chapter));
  const lines = split.sections.find((entry) => entry.number === sectionNumber)?.lines;
  if (!lines) return null;
  return { document, chapter, section, index, markdown: sectionPageMarkdown(lines) };
}

/**
 * 節が原本の何ページにわたるか。manifest の lastPage は最後の見出しのページなので、
 * 表示は「次の節の始まるページ」（同じページで切り替わることがある）か章の最終ページまでとする。
 */
export function standardSectionPageRange(chapter: StandardChapter, index: number): { first: number; last: number } {
  const first = chapter.sections[index]?.firstPage ?? chapter.firstPage;
  const next = chapter.sections[index + 1];
  return { first, last: next ? next.firstPage : chapter.lastPage };
}

export function standardChapterPath(
  document: Pick<StandardDocument, 'agencyId' | 'documentId'>,
  chapter: Pick<StandardChapter, 'chapterId'>,
): string {
  return `/standards/${document.agencyId}/${document.documentId}/chapters/${chapter.chapterId}`;
}

/**
 * PDF ページ番号から、それを収録する分冊とアンカーを引く。
 * 章記事の `<SourceRef>` が原典の逐語ページへ戻るための唯一の解決口。
 */
export function resolveSourcePageHref(document: StandardDocument, page: number): string | null {
  const part: StandardPart | undefined = document.parts.find(
    (candidate) => page >= candidate.firstPage && page <= candidate.lastPage,
  );
  if (!part) return null;
  return `/standards/${document.agencyId}/${document.documentId}/${part.slug}#pdf-page-${page}`;
}

/**
 * `<SourceRef pages="151-153" />` の値をページ番号へ展開する。
 * 表示は範囲のまま、リンク先は先頭ページにする（原典はページ単位でしかアンカーを持たない）。
 */
export function parseSourcePages(value: string): { first: number; last: number } | null {
  const match = value.match(/^(\d+)(?:-(\d+))?$/);
  if (!match) return null;
  const first = Number(match[1]);
  return { first, last: match[2] ? Number(match[2]) : first };
}

/**
 * 章記事の OGP 画像 URL。
 *
 * 実体は scripts/build-standards-ogp.mjs が
 * content/site/standards-articles/{agency}/{document}/chapters/{chapterId}/ogp.png へ生成し、
 * asset-storage の site-ogp-png グループ（`^content/site/.+/ogp\.png$` → `posts/` prefix）が
 * R2 へ供給する。パスと R2 キーが 1:1 なので、ここでの導出と供給側がズレない。
 */
export function standardChapterOgpUrl(
  document: Pick<StandardDocument, 'agencyId' | 'documentId'>,
  chapter: Pick<StandardChapter, 'chapterId'>,
): string {
  return getSiteAssetR2Url(
    `standards-articles/${document.agencyId}/${document.documentId}/chapters/${chapter.chapterId}/ogp.png`,
  );
}
