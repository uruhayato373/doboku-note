import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoPath } from './repo-root';
import { datasetDir, datasetFiles } from '../../../../scripts/lib/datasets.mjs';

/**
 * affiliate-layout.ts — 広告配置のスクリーンショット（npm run affiliate:shots の manifest.json）を読む。読み取り専用。
 * 撮影・判定は scripts/affiliate-layout-shots.mjs と scripts/lib/affiliate-layout-judge.mjs。
 */

export type LayoutCheck = { ok: boolean; detail: string[] };
export type LayoutAd = { placement: string; program: string; variant: string | null; ruleId: string | null; ruleStatus: string; top: number; problems: string[] };
export type LayoutShot = {
  targetId: string;
  viewport: string;
  variant: string;
  url: string;
  status: 'ok' | 'ng' | 'error';
  file?: string;
  error?: string;
  pageHeight?: number;
  truncated?: boolean;
  checks?: Record<string, LayoutCheck>;
  warnings?: string[];
  ads?: LayoutAd[];
  notes?: { label: string; top: number }[];
};
export type LayoutTarget = { id: string; kind: string; label: string; path: string; pageKind: string; category: string | null; isCareerDoc: boolean; expected: Record<string, { ruleId: string; program: string }> };
export type LayoutManifest = {
  ts: string;
  generatedAt: string;
  base: string;
  variants: string[];
  viewports: { id: string; label: string; width: number; height: number }[];
  counts: { targets: number; planned: number; captured: number; failed: number; ng: number; warn: number };
  targets: LayoutTarget[];
  shots: LayoutShot[];
};

/** 判定の名前（画面の見出し） */
export const CHECK_LABELS: Record<string, string> = {
  firstView: '1 画面目に広告が無い（2026-10-31 に廃止・古い記録だけ）',
  pixels: '計測ピクセルが素材ごとに 1 以下',
  stretch: 'バナーを引き伸ばしていない',
  overflow: '横にはみ出さない',
  rule: '面にルールがある',
  variant: '案が固定できている',
};

export const SHOTS_COMMAND = 'npm run affiliate:shots';
export const SHOTS_COMMAND_PROD = 'npm run affiliate:shots -- --base https://doboku-note.com';

/** 最新の manifest（無ければ null）。撮影した時刻のディレクトリ名が ts */
export function latestLayoutManifest(): LayoutManifest | null {
  const root = repoPath();
  const file = (datasetFiles(root, 'affiliate.layout-shots') as string[]).find((f) => f.endsWith('/manifest.json'));
  if (!file) return null;
  const ts = file.split('/').slice(-2, -1)[0];
  const m = JSON.parse(readFileSync(repoPath(file), 'utf8')) as Omit<LayoutManifest, 'ts'>;
  return { ...m, ts };
}

/** スクリーンショットの置き場の絶対パス（ルートハンドラが配信する） */
export function layoutShotsRoot(): string {
  return join(repoPath(), datasetDir('affiliate.layout-shots'));
}
