import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { datasetPath } from '../../../../scripts/lib/datasets.mjs';
import { findRepoRoot } from './repo-root';

/**
 * note の記事単位の反映計画（scripts/note-sync-plan.mjs --json）と、Mac の週次の実行記録（sync-log.json）。
 * 判定は CLI 側（scripts/lib/note-sync-plan.mjs）に置き、ここは読むだけ。取得に失敗したら ok:false を返し、
 * 「反映待ち 0」に化けさせない（CLAUDE.md §9）。
 */
export type SyncPart = 'body' | 'cover' | 'tags' | 'title';
export interface SyncItem {
  path: string;
  noteId: string;
  title: string;
  exam: string;
  pricing: string;
  images: number;
  parts: SyncPart[];
  reasons: Partial<Record<SyncPart, string>>;
  status: 'ready' | 'blocked';
  blocker: string | null;
  needsPdfPull: boolean;
  abort: { reason: string; at: string } | null;
}
export interface SyncPlan {
  ok: boolean;
  error: string | null;
  counts: { synced: number; ready: number; blocked: number; pdfPull: number; parts: Record<SyncPart, number>; blockers: Record<string, number> };
  blockers: Record<string, { label: string; action: string }>;
  items: SyncItem[];
}
export interface SyncRun {
  startedAt: string;
  finishedAt: string;
  articles: { attempted: number; updated: { path: string; parts: SyncPart[] }[]; failed: { path: string; reason: string }[] };
  magazines: { attempted: number; updated: { key: string }[]; failed: { key: string; reason: string }[] };
  problems: string[];
}

export function noteSyncPlan(): SyncPlan {
  const empty = { counts: { synced: 0, ready: 0, blocked: 0, pdfPull: 0, parts: { body: 0, cover: 0, tags: 0, title: 0 }, blockers: {} }, blockers: {}, items: [] };
  const root = findRepoRoot();
  try {
    const out = execFileSync(process.execPath, ['scripts/note-sync-plan.mjs', '--json'], { cwd: root, encoding: 'utf8', timeout: 120_000, maxBuffer: 64 * 1024 * 1024 });
    return { ok: true, error: null, ...(JSON.parse(out) as Omit<SyncPlan, 'ok' | 'error'>) };
  } catch (e) {
    return { ok: false, error: (e as Error).message.slice(0, 200), ...empty };
  }
}

export function noteSyncRuns(): SyncRun[] {
  const p = `${findRepoRoot()}/${datasetPath('note.sync-log')}`;
  if (!existsSync(p)) return [];
  try {
    return (JSON.parse(readFileSync(p, 'utf8')) as { runs?: SyncRun[] }).runs ?? [];
  } catch {
    return [];
  }
}
