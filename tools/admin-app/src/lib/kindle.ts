import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { findRepoRoot, repoPath } from './repo-root';
import { loadProjectEntries } from './project';
import {
  loadKindleCatalog,
  inspectKindleInventory,
  buildPathDateMap,
  estimateFreshness,
  joinRoyalties,
  coverMediaUrl,
  artifactRelPaths,
  ROYALTIES_PATH,
  KINDLE_STATUS_LABELS,
  KINDLE_PLAN_LABELS,
  plansOf,
  nextPlanOf,
  specContents,
  royaltyHistoryOf,
  kindleSpecPath,
} from '../../../../scripts/lib/kindle-catalog.mjs';
import { todayJst } from '../../../../scripts/lib/jst-date.mjs';

/**
 * kindle.ts — `/product/status?ch=kindle`（read-only）の表示モデル。
 *
 * 判定ロジックは `scripts/lib/kindle-catalog.mjs` にすべて置き、ここでは表示用に
 * 整形するだけ。`config/kdp-memo.json`（accountEmail 等の秘密混じり）は
 * 読まない・表示しない。git log は read-only（`git log --name-only`）のみ実行する。
 */

// git log の対象パス。scripts/lib/kindle-catalog.mjs の estimateFreshness が参照する
// 入力（原稿ソース・spec・builder・共有レンダラ）と成果物（EPUB/表紙）の両方を含む。
const GIT_LOG_PATHS = [
  'scripts/kindle-dist',
  'content/site',
  'content/note',
  'content/kindle',
  'src/config/civil-1-exam-questions.json',
  'scripts/build/build-essay-kindle.mjs',
  'scripts/build/build-pe1-kindle.mjs',
  'scripts/build/build-takuitsu-reconstruct.mjs',
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
  rebuildable: boolean;
  freshness: 'fresh' | 'stale' | 'unknown';
  /** 状態の日本語（制作中・出品できる・販売中・販売停止 など） */
  statusLabel: string;
  /** 正本の series（シリーズの名前）と巻の番号。一覧はこの順でまとめる */
  seriesName: string;
  seriesVolume: number | null;
  /** 日本の受取率（0.7 / 0.35）。無ければ null */
  royaltyRate: number | null;
  plans: KindlePlanView[];
  /** まだ来ていない最初の予定（無ければ過ぎた最後の予定）。overdue=予定日を過ぎた */
  nextPlan: (KindlePlanView & { overdue: boolean }) | null;
  supersedes: string[];
  supersededBy: string[];
  versionHistory: Array<{ version: string; date: string; change: string }>;
  priceHistory: Array<Record<string, unknown>>;
  /** spec.json の sources（収録記事）。spec の無い本（A 系）は null */
  contents: Array<{ path: string; heading: string; chars: number; missing: boolean }> | null;
  /** 月ごとの受取（royalties.json の全月）と累計 */
  royaltyMonths: Array<{ month: string; ebook: number; kenp: number; royalty: number; estimated: boolean }>;
  royaltyTotal: number;
}

export interface KindlePlanView {
  action: string;
  actionLabel: string;
  date: string;
  price: number | null;
  note: string | null;
}

export interface KindleRoyaltyView {
  ok: boolean;
  month?: string;
  fetchedAt?: string | null;
  estimated?: boolean;
  caveat?: string | null;
  total?: { bookCount?: number; ebook?: number; print?: number; kenp?: number; royalty?: number } | null;
  accountTotal?: { bookCount?: number; ebook?: number; print?: number; kenp?: number; royalty?: number } | null;
  accountKenpPagesRead?: number | null;
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
    notRebuildableCount: number;
    /** 予定を持つ冊数と、予定日を過ぎた冊数 */
    plannedCount: number;
    overdueCount: number;
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

const execFileAsync = promisify(execFile);

// execFileSync は Node の単一イベントループを同期ブロックする。next dev は 1 プロセスなので、
// 複数リクエストが同時にこのページを開くと git 呼び出しが直列に詰まり、無関係な並行リクエスト
// まで巻き込んで極端に遅くなる（2026-08-28・e2e 並列実行で実測）。async 版で待つ。
// 複数セッションが同一リポジトリを並行操作する運用（CLAUDE.md §10）では、他セッションの
// commit/gc 中に git コマンドがロック待ちで数十秒詰まることがある（2026-08-28 実測: 単発
// 実行で 36 秒かかるケースを観測）。git 呼び出し自体のタイムアウトを短く切り、かつ短命
// キャッシュで「毎リクエスト git を叩く」頻度を下げる（このページの鮮度情報は秒単位の
// 精度を要さない）。キャッシュはプロセス内メモリのみ（dev サーバー再起動で消える）。
const GIT_LOG_TIMEOUT_MS = 8_000;
const GIT_LOG_CACHE_TTL_MS = 60_000;
let gitLogCache: { result: { ok: boolean; text: string }; expiresAt: number } | null = null;

async function runGitLog(): Promise<{ ok: boolean; text: string }> {
  const now = Date.now();
  if (gitLogCache && gitLogCache.expiresAt > now) return gitLogCache.result;
  let result: { ok: boolean; text: string };
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['log', '--name-only', '--pretty=format:%cI', '--', ...GIT_LOG_PATHS],
      { cwd: findRepoRoot(), encoding: 'utf8', timeout: GIT_LOG_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024 },
    );
    result = { ok: true, text: stdout };
  } catch {
    result = { ok: false, text: '' };
  }
  // 失敗（ロック競合等）は次回すぐ再試行できるよう TTL を短く、成功はフルTTLでキャッシュする。
  gitLogCache = { result, expiresAt: now + (result.ok ? GIT_LOG_CACHE_TTL_MS : 5_000) };
  return result;
}

function readSpecFile(relPath: string): object | null {
  try {
    return JSON.parse(readFileSync(repoPath(relPath), 'utf8')) as object;
  } catch {
    return null;
  }
}

function readRepoText(relPath: string): string | null {
  try {
    return readFileSync(repoPath(...relPath.split('/')), 'utf8');
  } catch {
    return null;
  }
}

function planView(p: Record<string, unknown>): KindlePlanView {
  const action = String(p.action ?? '');
  return {
    action,
    actionLabel: (KINDLE_PLAN_LABELS as Record<string, string>)[action] ?? action,
    date: String(p.date ?? ''),
    price: typeof p.price === 'number' ? p.price : null,
    note: typeof p.note === 'string' ? p.note : null,
  };
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

function loadRoyaltiesJson(): unknown | null {
  if (!existsSync(ROYALTIES_PATH)) return null;
  try {
    return JSON.parse(readFileSync(ROYALTIES_PATH, 'utf8'));
  } catch {
    return null;
  }
}

export async function loadKindleView(): Promise<KindleView> {
  const books = loadKindleCatalog();
  const inventory = inspectKindleInventory(books);
  const invById = new Map(inventory.map((i: { id: string }) => [i.id, i]));

  const gitLog = await runGitLog();
  const pathDateMap = buildPathDateMap(gitLog.text);
  const freshnessOk = gitLog.ok && pathDateMap.size > 0;
  const freshness = freshnessOk
    ? estimateFreshness(books, pathDateMap, readSpecFile)
    : { staleIds: [] as string[], unknownIds: books.map((b: { id: string }) => b.id), perBook: {} as Record<string, { freshness: string }> };

  const royaltiesJson = loadRoyaltiesJson();
  const todayKey = todayJst();

  const bookViews: KindleBookView[] = books.map((b: Record<string, unknown>) => {
    const inv = invById.get(b.id as string) as
      | { epub: { exists: boolean; bytes: number }; rebuildable: boolean }
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
      rebuildable: inv?.rebuildable ?? false,
      freshness: f?.freshness ?? 'unknown',
      ...ledgerFields(b, royaltiesJson, todayKey),
    };
  });
  // シリーズの名前 → 巻の番号の順にまとめる（同じシリーズの中で巻の番号が無い本は正本の order の順のまま後ろ）
  const seriesFirst = new Map<string, number>();
  bookViews.forEach((b, i) => { if (!seriesFirst.has(b.seriesName)) seriesFirst.set(b.seriesName, i); });
  const indexOf = new Map(bookViews.map((b, i) => [b.id, i]));
  bookViews.sort((a, b) =>
    (seriesFirst.get(a.seriesName)! - seriesFirst.get(b.seriesName)!)
    || ((a.seriesVolume ?? Number.MAX_SAFE_INTEGER) - (b.seriesVolume ?? Number.MAX_SAFE_INTEGER))
    || (indexOf.get(a.id)! - indexOf.get(b.id)!));

  const byStatus: Record<string, number> = {};
  for (const b of bookViews) byStatus[b.status] = (byStatus[b.status] ?? 0) + 1;

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
      notRebuildableCount: bookViews.filter((b) => !b.rebuildable).length,
      plannedCount: bookViews.filter((b) => b.plans.length > 0).length,
      overdueCount: bookViews.filter((b) => b.nextPlan?.overdue).length,
    },
    freshnessOk,
    royalties,
    relatedDocs,
  };
}

/** 台帳の欄（状態の日本語・シリーズ・予定・置き換え・履歴・収録記事・受取の推移）を表示用に整える */
function ledgerFields(b: Record<string, unknown>, royaltiesJson: unknown, todayKey: string) {
  const plans = (plansOf(b) as Record<string, unknown>[]).map(planView);
  const next = nextPlanOf(b, todayKey) as Record<string, unknown> | null;
  const spec = readSpecFile(kindleSpecPath(b.id as string));
  const history = royaltyHistoryOf(b.id as string, royaltiesJson) as { months: KindleBookView['royaltyMonths']; total: number };
  const status = (b.status as string) ?? 'unknown';
  return {
    statusLabel: (KINDLE_STATUS_LABELS as Record<string, string>)[status] ?? status,
    seriesName: (b.series as string) ?? '',
    seriesVolume: typeof b.seriesVolume === 'number' ? b.seriesVolume : null,
    royaltyRate: typeof b.royalty === 'number' ? b.royalty : null,
    plans,
    nextPlan: next ? { ...planView(next), overdue: String(next.date) < todayKey } : null,
    supersedes: strings(b.supersedes),
    supersededBy: strings(b.supersededBy),
    versionHistory: Array.isArray(b.versionHistory) ? (b.versionHistory as KindleBookView['versionHistory']) : [],
    priceHistory: Array.isArray(b.priceHistory) ? (b.priceHistory as KindleBookView['priceHistory']) : [],
    contents: spec ? (specContents(spec, readRepoText) as KindleBookView['contents']) : null,
    royaltyMonths: history.months,
    royaltyTotal: history.total,
  };
}

export interface KindlePreviewView {
  id: string;
  title: string;
  status: string;
  coverUrl: string | null;
  /** プレビュー未生成なら null */
  pages: { url: string; item: string }[] | null;
  generatedAt: string | null;
  /** プレビューが今の EPUB から作られたか（EPUB が無ければ null） */
  matchesEpub: boolean | null;
}

/** /content/kindle/<id> — EPUB のページ画像（.tmp/kindle-preview/<id>/manifest.json）を表示用に読む。 */
export function loadKindlePreview(id: string): KindlePreviewView | null {
  const book = loadKindleCatalog().find((b: { id: string }) => b.id === id) as Record<string, unknown> | undefined;
  if (!book) return null;
  const manifestPath = repoPath('.tmp', 'kindle-preview', id, 'manifest.json');
  const manifest = existsSync(manifestPath)
    ? (JSON.parse(readFileSync(manifestPath, 'utf8')) as { epubSha256: string; generatedAt: string; pages: { file: string; item: string }[] })
    : null;
  const epubRel = artifactRelPaths(book).epub as string | null;
  const epubPath = epubRel ? repoPath(...epubRel.split('/')) : null;
  const epubSha = epubPath && existsSync(epubPath) ? createHash('sha256').update(readFileSync(epubPath)).digest('hex') : null;
  return {
    id,
    title: (book.title as string) ?? id,
    status: (book.status as string) ?? 'unknown',
    coverUrl: coverMediaUrl(book),
    pages: manifest ? manifest.pages.map((p) => ({ url: `/media/kindlepreview/${encodeURIComponent(id)}/${p.file}`, item: p.item })) : null,
    generatedAt: manifest?.generatedAt ?? null,
    matchesEpub: manifest && epubSha ? manifest.epubSha256 === epubSha : null,
  };
}
