import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import { datasetFiles } from '../../../../scripts/lib/datasets.mjs';
import { findRepoRoot, repoPath } from './repo-root';

/**
 * snapshots.ts — CI がコミットした時刻つきの JSON スナップショット（GA4・GSC・PSI など）を読む。
 * どのファイルがどのデータセットかは台帳（scripts/lib/datasets.mjs）が決める。ここは台帳の id で引くだけ。
 *
 * ライブ API は絶対に叩かない（会社 PC はプロキシで Google/Meta を遮断・CI 供給が正）。
 */

/** 名前の時刻（2026-07-15T05-53-27）か日付（2026-07-15・その日の 0 時として扱う） */
const STAMP_RE = /(\d{4}-\d{2}-\d{2})(T\d{2}-\d{2}-\d{2})?/;

export interface SnapshotFile {
  /** 台帳のデータセット id（例: ga4.date, gsc.query, psi.batch）。 */
  dataset: string;
  /** ファイル名。 */
  file: string;
  /** 絶対パス。 */
  abs: string;
  /** タイムスタンプ文字列（2026-07-15T05-53-27）。 */
  stamp: string;
  /** mtime（epoch ms）。 */
  mtimeMs: number;
}

/** データセットの時刻つきファイルを新しい順に返す。 */
export function listSnapshots(dataset: string): SnapshotFile[] {
  const out: SnapshotFile[] = [];
  for (const rel of datasetFiles(findRepoRoot(), dataset)) {
    const file = basename(rel);
    const m = STAMP_RE.exec(file);
    if (!m) continue;
    const abs = repoPath(rel);
    out.push({ dataset, file, abs, stamp: `${m[1]}${m[2] ?? 'T00-00-00'}`, mtimeMs: statSync(abs).mtimeMs });
  }
  return out.sort((a, b) => b.stamp.localeCompare(a.stamp));
}

/** データセットの最新スナップショット（無ければ null）。 */
export function latestSnapshot(dataset: string): SnapshotFile | null {
  return listSnapshots(dataset)[0] ?? null;
}

/** ファイル名指定でスナップショットを解決（?snapshot= の履歴選択用・台帳に当たるものだけ＝traversal ガード）。 */
export function snapshotByFile(dataset: string, file: string): SnapshotFile | null {
  return listSnapshots(dataset).find((s) => s.file === file) ?? null;
}

export interface GaMeta {
  startDate?: string;
  endDate?: string;
  dimension?: string;
  metrics?: string[];
  [k: string]: unknown;
}

export interface LoadedSnapshot<Row = Record<string, unknown>> {
  meta: GaMeta;
  rows: Row[];
}

/** スナップショット JSON を読み込む。壊れていれば空を返す（ページを落とさない）。 */
export function loadSnapshot<Row = Record<string, unknown>>(
  s: SnapshotFile | null,
): LoadedSnapshot<Row> | null {
  if (!s || !existsSync(s.abs)) return null;
  try {
    const data = JSON.parse(readFileSync(s.abs, 'utf8'));
    return { meta: data.meta ?? {}, rows: Array.isArray(data.rows) ? data.rows : [] };
  } catch {
    return null;
  }
}

/** 任意の JSON を読む（PSI batch のような非 {meta,rows} 形式用）。 */
export function readJsonFile<T = unknown>(abs: string): T | null {
  try {
    return JSON.parse(readFileSync(abs, 'utf8')) as T;
  } catch {
    return null;
  }
}

/** スタンプ（2026-07-15T05-53-27）を Date に変換。失敗時 null。 */
export function stampToDate(stamp: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})$/.exec(stamp);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const dt = new Date(Date.UTC(+y!, +mo! - 1, +d!, +h!, +mi!, +s!));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** スナップショットの鮮度日数（今日 − stamp）。CI 週次のため 8 日超で「遅延」。 */
export function ageInDays(s: SnapshotFile | null): number | null {
  if (!s) return null;
  const dt = stampToDate(s.stamp);
  if (!dt) return null;
  return Math.floor((Date.now() - dt.getTime()) / 86_400_000);
}
