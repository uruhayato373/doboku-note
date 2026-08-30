import 'server-only';

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getStandardDocument, type StandardDocument, type StandardPart } from '@/lib/standards';
import { getSiteAssetR2Url } from '@/lib/r2-image-loader';

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

type StandardChapterSection = {
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
  file: string;
  firstPage: number;
  lastPage: number;
  sourceParts: string[];
  sourcePages: number[];
  sourceSha256: string;
  outputSha256: string;
  outputBytes: number;
  sections: StandardChapterSection[];
  stats: Record<string, number>;
  indexable: boolean;
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

/** 構造化済みかどうか。共通仕様書 8 文書だけが true で、未生成の文書は従来どおり分冊が主導線になる。 */
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
    books.push({ bookNumber: chapter.bookNumber, bookTitle: chapter.bookTitle, chapters: [chapter] });
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
