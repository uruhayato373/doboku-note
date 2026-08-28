import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { findRepoRoot, repoPath } from './repo-root';
import { loadProjectEntries } from './project';
import {
  loadKindleCatalog,
  inspectKindleInventory,
  buildPathDateMap,
  estimateFreshness,
  joinRoyalties,
  coverMediaUrl,
  ROYALTIES_PATH,
} from '../../../../scripts/lib/kindle-catalog.mjs';

/**
 * kindle.ts — `/content/kindle`（read-only）の表示モデル。
 *
 * 判定ロジックは `scripts/lib/kindle-catalog.mjs` にすべて置き、ここでは表示用に
 * 整形するだけ。`.claude/config/kdp-memo.json`（accountEmail 等の秘密混じり）は
 * 読まない・表示しない。git log は read-only（`git log --name-only`）のみ実行する。
 */

// git log の対象パス。scripts/lib/kindle-catalog.mjs の estimateFreshness が参照する
// 入力（原稿ソース・spec・builder・共有レンダラ）と成果物（EPUB/表紙）の両方を含む。
const GIT_LOG_PATHS = [
  'scripts/kindle-dist',
  'scripts/kindle-published',
  'content/site',
  'content/note',
  'content/kindle',
  'scripts/kindle-specs',
  'src/config/civil-1-exam-questions.json',
  'scripts/build-essay-kindle.mjs',
  'scripts/build-pe1-kindle.mjs',
  'scripts/build-takuitsu-reconstruct.mjs',
  'scripts/lib/kindle-md.mjs',
];

export interface KindleBookView {
  id: string;
  series: string;
  title: string;
  subtitle: string;
  priceJpy: number;
  status: string;
  version: string;
  submittedDate: string | null;
  publishedDate: string | null;
  asin: string | null;
  draftAsin: string | null;
  amazonUrl: string | null;
  epubExists: boolean;
  epubBytes: number;
  coverUrl: string | null;
  kdpMemoDead: boolean;
  rebuildable: boolean;
  freshness: 'fresh' | 'stale' | 'unknown';
}

export interface KindleRoyaltyView {
  ok: boolean;
  month?: string;
  fetchedAt?: string | null;
  estimated?: boolean;
  caveat?: string | null;
  total?: { bookCount?: number; ebook?: number; print?: number; kenp?: number; royalty?: number } | null;
  perBook?: Array<{ bookId: string; title: string; royalty: number; inCatalog: boolean }>;
}

export interface KindleRelatedDoc {
  file: string;
  title: string;
  href: string;
}

export interface KindleView {
  books: KindleBookView[];
  summary: {
    total: number;
    byStatus: Record<string, number>;
    staleCount: number;
    unknownCount: number;
    deadMemoCount: number;
    notRebuildableCount: number;
  };
  /** git log 取得の成否。false なら freshness は全冊 unknown ＝ stale=0 を健全と読まない。 */
  freshnessOk: boolean;
  royalties: KindleRoyaltyView | null;
  relatedDocs: KindleRelatedDoc[];
}

/** `/content` カード用の軽量サマリ（catalog だけ読む・git を呼ばない）。 */
export function loadKindleSummary(): { total: number; live: number; inReview: number } {
  const books = loadKindleCatalog();
  return {
    total: books.length,
    live: books.filter((b: { status: string }) => b.status === 'live').length,
    inReview: books.filter((b: { status: string }) => b.status === 'in_review').length,
  };
}

function runGitLog(): { ok: boolean; text: string } {
  try {
    const text = execFileSync(
      'git',
      ['log', '--name-only', '--pretty=format:%cI', '--', ...GIT_LOG_PATHS],
      { cwd: findRepoRoot(), encoding: 'utf8', timeout: 60_000, maxBuffer: 64 * 1024 * 1024 },
    );
    return { ok: true, text };
  } catch {
    return { ok: false, text: '' };
  }
}

function readSpecFile(relPath: string): object | null {
  try {
    return JSON.parse(readFileSync(repoPath(relPath), 'utf8')) as object;
  } catch {
    return null;
  }
}

function loadRoyaltiesJson(): unknown | null {
  if (!existsSync(ROYALTIES_PATH)) return null;
  try {
    return JSON.parse(readFileSync(ROYALTIES_PATH, 'utf8'));
  } catch {
    return null;
  }
}

export function loadKindleView(): KindleView {
  const books = loadKindleCatalog();
  const inventory = inspectKindleInventory(books);
  const invById = new Map(inventory.map((i: { id: string }) => [i.id, i]));

  const gitLog = runGitLog();
  const pathDateMap = buildPathDateMap(gitLog.text);
  const freshnessOk = gitLog.ok && pathDateMap.size > 0;
  const freshness = freshnessOk
    ? estimateFreshness(books, pathDateMap, readSpecFile)
    : { staleIds: [] as string[], unknownIds: books.map((b: { id: string }) => b.id), perBook: {} as Record<string, { freshness: string }> };

  const bookViews: KindleBookView[] = books.map((b: Record<string, unknown>) => {
    const inv = invById.get(b.id as string) as
      | { epub: { exists: boolean; bytes: number }; kdpMemoDead: boolean; rebuildable: boolean }
      | undefined;
    const f = (freshness.perBook as Record<string, { freshness: 'fresh' | 'stale' | 'unknown' }>)[b.id as string];
    const asin = (b.asin as string | null) ?? null;
    return {
      id: b.id as string,
      series: (b.series as string) ?? '',
      title: (b.title as string) ?? '',
      subtitle: (b.subtitle as string) ?? '',
      priceJpy: (b.priceJpy as number) ?? 0,
      status: (b.status as string) ?? 'unknown',
      version: (b.version as string) ?? '',
      submittedDate: (b.submittedDate as string | null) ?? null,
      publishedDate: (b.publishedDate as string | null) ?? null,
      asin,
      draftAsin: (b.draftAsin as string | null) ?? null,
      amazonUrl: b.status === 'live' && asin ? `https://www.amazon.co.jp/dp/${asin}` : null,
      epubExists: inv?.epub.exists ?? false,
      epubBytes: inv?.epub.bytes ?? 0,
      coverUrl: coverMediaUrl(b),
      kdpMemoDead: inv?.kdpMemoDead ?? true,
      rebuildable: inv?.rebuildable ?? false,
      freshness: f?.freshness ?? 'unknown',
    };
  });

  const byStatus: Record<string, number> = {};
  for (const b of bookViews) byStatus[b.status] = (byStatus[b.status] ?? 0) + 1;

  const royaltiesJson = loadRoyaltiesJson();
  const royalties = joinRoyalties(books, royaltiesJson) as KindleRoyaltyView;

  const relatedDocs: KindleRelatedDoc[] = loadProjectEntries()
    .filter((e) => e.channel.includes('kindle'))
    .map((e) => ({ file: e.file, title: e.title, href: `/docs/${e.slug}` }));

  return {
    books: bookViews,
    summary: {
      total: bookViews.length,
      byStatus,
      staleCount: freshness.staleIds.length,
      unknownCount: freshness.unknownIds.length,
      deadMemoCount: bookViews.filter((b) => b.kdpMemoDead).length,
      notRebuildableCount: bookViews.filter((b) => !b.rebuildable).length,
    },
    freshnessOk,
    royalties,
    relatedDocs,
  };
}
