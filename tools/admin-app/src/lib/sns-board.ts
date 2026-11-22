import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { repoPath } from './repo-root';
import { SNS_CONTENT_ROOT } from '../../../../scripts/lib/repository-paths.mjs';
import { loadXPosts } from '../../../../scripts/lib/registry-x-store.mjs';
import { parseTweetBlocks } from '../../../../scripts/lib/x-tweets-md.mjs';

/**
 * sns-board.ts — SNS 投稿状態板（読み取り専用）。tools/admin/lib/sot.mjs を移植。
 *
 * 読む SoT:
 *   IG posted.json                  scripts/instagram/ig-status.mjs の findPackDirs/packInfo を再利用
 *   X のコンテンツ台帳（loadXPosts）   ツイート別 scheduled/queued/posted/draft/stopped
 *
 * IG 集計は ig-status.mjs を dynamic import して再利用する（集計ロジックの二重化を避ける）。
 * turbopackIgnore で Turbopack のバンドル対象から外し、Node ランタイムの ESM ローダで実体を読む。
 */

const FMT_LETTER: Record<string, string> = { carousel: 'C', reels: 'R', stories: 'S' };

interface PostedEntry {
  at?: string;
  [k: string]: unknown;
}
type Posted = Record<string, PostedEntry | undefined> | null | undefined;

interface IgStatusModule {
  IG_DIR: string;
  FORMATS: string[];
  findPackDirs: (dir: string) => string[];
  packInfo: (dir: string) => { rel: string; exam: string; slug: string; year: string; posted: Posted };
}

function statusStr(posted: Posted, formats: string[]): string {
  return formats.map((f) => (posted?.[f] ? FMT_LETTER[f] : '-')).join('');
}
function latestDate(posted: Posted, formats: string[]): string {
  const dates = formats.map((f) => posted?.[f]?.at).filter(Boolean).sort() as string[];
  return dates.length ? dates[dates.length - 1]! : '';
}

export interface ExamStat {
  done: number;
  total: number;
  carousel: number;
  reels: number;
  stories: number;
}
export interface IgPackRow {
  rel: string;
  exam: string;
  slug: string;
  year: string;
  status: string;
  latest: string;
}
export interface IgBoard {
  packs: IgPackRow[];
  byExam: Record<string, ExamStat>;
  total: number;
  totalDone: number;
}

export async function igBoard(): Promise<IgBoard> {
  const url = pathToFileURL(repoPath('scripts', 'instagram', 'ig-status.mjs')).href;
  const ig = (await import(/* turbopackIgnore: true */ url)) as IgStatusModule;
  const packs = ig.findPackDirs(ig.IG_DIR).map(ig.packInfo);
  const anyPosted = (posted: Posted) => !!posted && ig.FORMATS.some((f) => posted[f]);

  const byExam: Record<string, ExamStat> = {};
  for (const p of packs) {
    if (!byExam[p.exam]) byExam[p.exam] = { done: 0, total: 0, carousel: 0, reels: 0, stories: 0 };
    byExam[p.exam]!.total++;
    if (anyPosted(p.posted)) byExam[p.exam]!.done++;
    for (const f of ig.FORMATS) if (p.posted?.[f]) (byExam[p.exam] as unknown as Record<string, number>)[f]++;
  }
  const totalDone = packs.filter((p) => anyPosted(p.posted)).length;

  return {
    packs: packs.map((p) => ({
      rel: p.rel,
      exam: p.exam,
      slug: p.slug,
      year: p.year,
      status: statusStr(p.posted, ig.FORMATS),
      latest: latestDate(p.posted, ig.FORMATS),
    })),
    byExam,
    total: packs.length,
    totalDone,
  };
}

// ─── X ドラフト ─────────────────────────────────────────────
export interface XTweet {
  no: string;
  title: string;
  status: string;
  scheduledAt: string | null;
  postedAt: string | null;
}
export interface XDraft {
  name: string;
  rel: string;
  updatedAt: string | null;
  counts: Record<string, number>;
  total: number;
  tweets: XTweet[];
}
export interface XBoard {
  drafts: XDraft[];
  totals: Record<string, number>;
}

// 台帳の phase → 板の語彙（planned＝承認済みで予約に未投入 → scheduled、submitted・queued → queued、retired → stopped）
const BOARD_STATUS: Record<string, string> = { draft: 'draft', planned: 'scheduled', submitted: 'queued', queued: 'queued', posted: 'posted', retired: 'stopped' };

interface XPostRow {
  folder: string | null;
  key: string | null;
  phase: string;
  publishAt: string | null;
  publishedAt: string | null;
  row: { legacyKey?: string };
}

export function xBoard(): XBoard {
  const draftDir = join(SNS_CONTENT_ROOT, 'x', 'draft');
  const byFolder = new Map<string, XPostRow[]>();
  // 退避アカウントの行（legacyKey が draft/_archive-… のように _ で始まる階層）は板に出さない
  for (const p of loadXPosts(repoPath()) as XPostRow[]) {
    if (!p.folder || !p.key || /\/_/.test(p.row.legacyKey ?? '')) continue;
    if (!byFolder.has(p.folder)) byFolder.set(p.folder, []);
    byFolder.get(p.folder)!.push(p);
  }
  const drafts: XDraft[] = [];
  for (const name of [...byFolder.keys()].sort()) {
    const mdPath = join(draftDir, name, 'tweets.md');
    const titles = new Map<string, string>(
      existsSync(mdPath) ? (parseTweetBlocks(readFileSync(mdPath, 'utf8')) as { key: string; title: string }[]).map((b) => [b.key, b.title]) : [],
    );
    const tweets: XTweet[] = byFolder.get(name)!
      .sort((a, b) => Number(a.key) - Number(b.key))
      .map((t) => ({
        no: t.key!,
        title: titles.get(t.key!) ?? '',
        status: BOARD_STATUS[t.phase] ?? t.phase,
        scheduledAt: t.publishAt,
        postedAt: t.publishedAt,
      }));
    const counts: Record<string, number> = { draft: 0, scheduled: 0, queued: 0, posted: 0, other: 0 };
    for (const t of tweets) {
      if (t.status in counts) counts[t.status]!++;
      else counts.other!++;
    }
    const last = tweets.map((t) => t.postedAt ?? t.scheduledAt).filter(Boolean).sort().at(-1) ?? null;
    drafts.push({
      name,
      rel: `x/draft/${name}`,
      updatedAt: last,
      counts,
      total: tweets.length,
      tweets,
    });
  }
  const totals: Record<string, number> = { draft: 0, scheduled: 0, queued: 0, posted: 0, other: 0, tweets: 0 };
  for (const d of drafts) {
    totals.tweets! += d.total;
    for (const k of ['draft', 'scheduled', 'queued', 'posted', 'other']) totals[k]! += d.counts[k]!;
  }
  return { drafts, totals };
}

export interface SnsBoard {
  ig: IgBoard;
  x: XBoard;
}

export async function snsBoard(): Promise<SnsBoard> {
  return { ig: await igBoard(), x: xBoard() };
}

export async function figureBoard() {
  // 既存のSVG検査器が使うネイティブレンダラーをTurbopackへバンドルしない。
  const url = pathToFileURL(repoPath('tools', 'admin-app', 'src', 'lib', 'figure-sns-board.mjs')).href;
  const module = await import(/* turbopackIgnore: true */ url) as typeof import('./figure-sns-board.mjs');
  return module.figureSnsBoard(repoPath());
}
