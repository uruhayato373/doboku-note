import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { repoPath } from './repo-root';

/**
 * snapshots.ts — .claude/state/metrics/{ga4,gsc,psi} 配下の
 * CI がコミットしたタイムスタンプ付き JSON スナップショットを読む。
 *
 * ライブ API は絶対に叩かない（会社 PC はプロキシで Google/Meta を遮断・CI 供給が正）。
 */

export type MetricKind = 'ga4' | 'gsc' | 'psi';

const TS_RE = /^(.+)-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})\.json$/;

export interface SnapshotFile {
  /** prefix（例: ga4-date, gsc-query, psi-batch）。 */
  prefix: string;
  /** ファイル名。 */
  file: string;
  /** 絶対パス。 */
  abs: string;
  /** タイムスタンプ文字列（2026-07-15T05-53-27）。 */
  stamp: string;
  /** mtime（epoch ms）。 */
  mtimeMs: number;
}

function metricsDir(kind: MetricKind): string {
  return repoPath('.claude', 'state', 'metrics', kind);
}

/** kind 配下のタイムスタンプ付き JSON を prefix 別・新しい順にグルーピングして返す。 */
export function listSnapshots(kind: MetricKind): Map<string, SnapshotFile[]> {
  const dir = metricsDir(kind);
  const map = new Map<string, SnapshotFile[]>();
  if (!existsSync(dir)) return map;
  for (const file of readdirSync(dir)) {
    const m = TS_RE.exec(file);
    if (!m) continue; // index-coverage-history.json や latest-report.md 等は対象外
    const prefix = m[1]!;
    const abs = join(dir, file);
    const entry: SnapshotFile = {
      prefix,
      file,
      abs,
      stamp: m[2]!,
      mtimeMs: statSync(abs).mtimeMs,
    };
    const arr = map.get(prefix) ?? [];
    arr.push(entry);
    map.set(prefix, arr);
  }
  for (const arr of map.values()) arr.sort((a, b) => b.stamp.localeCompare(a.stamp));
  return map;
}

/** prefix の最新スナップショット（無ければ null）。 */
export function latestSnapshot(kind: MetricKind, prefix: string): SnapshotFile | null {
  return listSnapshots(kind).get(prefix)?.[0] ?? null;
}

/** ファイル名指定でスナップショットを解決（?snapshot= の履歴選択用・traversal ガード付き）。 */
export function snapshotByFile(kind: MetricKind, file: string): SnapshotFile | null {
  if (!TS_RE.test(file)) return null;
  for (const arr of listSnapshots(kind).values()) {
    const hit = arr.find((s) => s.file === file);
    if (hit) return hit;
  }
  return null;
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
