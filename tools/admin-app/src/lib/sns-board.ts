import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { repoPath } from './repo-root';
import { SNS_CONTENT_ROOT } from '../../../../scripts/lib/repository-paths.mjs';

/**
 * sns-board.ts — SNS 投稿状態板（読み取り専用）。tools/admin/lib/sot.mjs を移植。
 *
 * 読む SoT:
 *   content/sns/schedule.json          全チャネル統合スケジュール
 *   IG posted.json                  scripts/ig-status.mjs の walkPacks/packInfo を再利用
 *   X draft の status.json           ツイート別 scheduled/posted/draft
 *
 * IG 集計は ig-status.mjs を dynamic import して再利用する（集計ロジックの二重化を避ける）。
 * turbopackIgnore で Turbopack のバンドル対象から外し、Node ランタイムの ESM ローダで実体を読む。
 */

function readJson<T>(abs: string): T | null {
  try {
    return JSON.parse(readFileSync(abs, 'utf8')) as T;
  } catch {
    return null;
  }
}

const FMT_LETTER: Record<string, string> = { carousel: 'C', reels: 'R', stories: 'S' };

interface PostedEntry {
  at?: string;
  [k: string]: unknown;
}
type Posted = Record<string, PostedEntry | undefined> | null | undefined;

interface IgStatusModule {
  IG_DIR: string;
  FORMATS: string[];
  walkPacks: (dir: string) => string[];
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
  const url = pathToFileURL(repoPath('scripts', 'ig-status.mjs')).href;
  const ig = (await import(/* turbopackIgnore: true */ url)) as IgStatusModule;
  const packs = ig.walkPacks(ig.IG_DIR).map(ig.packInfo);
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

export function xBoard(): XBoard {
  const draftDir = join(SNS_CONTENT_ROOT, 'x', 'draft');
  const drafts: XDraft[] = [];
  if (!existsSync(draftDir)) return { drafts, totals: {} };
  for (const name of readdirSync(draftDir).sort()) {
    const dir = join(draftDir, name);
    if (!statSync(dir).isDirectory()) continue;
    const status = readJson<{ tweets?: Record<string, { title?: string; status?: string; scheduled_at?: string; posted_at?: string }>; updated_at?: string }>(
      join(dir, 'status.json'),
    );
    const tweets: XTweet[] = Object.entries(status?.tweets ?? {}).map(([no, t]) => ({
      no,
      title: t.title ?? '',
      status: t.status ?? 'draft',
      scheduledAt: t.scheduled_at ?? null,
      postedAt: t.posted_at ?? null,
    }));
    const counts: Record<string, number> = { draft: 0, scheduled: 0, posted: 0, other: 0 };
    for (const t of tweets) t.status in counts ? counts[t.status]!++ : counts.other!++;
    drafts.push({
      name,
      rel: `x/draft/${name}`,
      updatedAt: status?.updated_at ?? null,
      counts,
      total: tweets.length,
      tweets,
    });
  }
  const totals: Record<string, number> = { draft: 0, scheduled: 0, posted: 0, other: 0, tweets: 0 };
  for (const d of drafts) {
    totals.tweets! += d.total;
    for (const k of ['draft', 'scheduled', 'posted', 'other']) totals[k]! += d.counts[k]!;
  }
  return { drafts, totals };
}

export interface ScheduleRow {
  slug: string;
  [k: string]: unknown;
}

export function readSchedule(): ScheduleRow[] {
  return readJson<ScheduleRow[]>(join(SNS_CONTENT_ROOT, 'schedule.json')) ?? [];
}

export interface SnsBoard {
  ig: IgBoard;
  x: XBoard;
  schedule: ScheduleRow[];
}

export async function snsBoard(): Promise<SnsBoard> {
  return { ig: await igBoard(), x: xBoard(), schedule: readSchedule() };
}
