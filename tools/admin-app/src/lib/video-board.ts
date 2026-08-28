import {
  loadConfig as loadVideoConfig,
  loadPackSummaries,
} from '../../../../scripts/lib/video-content-check.mjs';
import { STAGES } from '../../../../scripts/lib/content-lifecycle.mjs';

import { findRepoRoot } from './repo-root';

/**
 * video-board.ts — `/content/video`（動画パック企画ボード・read-only）の表示モデル。
 *
 * 行の組み立ては `scripts/lib/video-content-check.mjs` の `loadPackSummaries`
 * （CLI の build-video-pack-index と共有）をそのまま使う。ステージ判定も
 * content-lifecycle.mjs 側にあり、ここでは絞り込み用の集計と色付けだけを行う。
 */

export interface VideoPackRow {
  exam: string;
  packId: string;
  slug: string;
  title: string;
  pain: string;
  promise: string;
  intent: string;
  status: string | null;
  stage: string | null;
  qa: { avg?: number; blocks?: number; at?: string; by?: string } | null;
  hasScript: boolean;
  hasStoryboard: boolean;
  cta: string | null;
  ctaKind: string | null;
}

export interface VideoPackBoard {
  ok: boolean;
  reason: string | null;
  rows: VideoPackRow[];
  byStage: Record<string, number>;
}

export const EXAM_LABELS: Record<string, string> = {
  'civil-construction-1': '1級土木',
  'civil-construction-2': '2級土木',
  'pe-comprehensive-management': '技術士総監',
  'pe-construction': '技術士建設',
  'pe-first-stage': '技術士一次',
  'concrete-chief-engineer': 'コン主任',
  'concrete-diagnostician': 'コン診断士',
};

/** ステージ → バッジ色（globals.css の badge good/warn/bad/neutral） */
export function stageClass(stage: string | null): string {
  switch (stage) {
    case 'published':
      return 'good';
    case 'scheduled':
    case 'review':
      return 'warn';
    case 'retired':
      return 'bad';
    case 'planned':
    case 'draft':
      return 'neutral';
    default:
      return 'bad'; // 不明＝写像できていない。緑にしない
  }
}

export function videoPackBoard(): VideoPackBoard {
  try {
    const root = findRepoRoot();
    const rows = loadPackSummaries(root, loadVideoConfig(root)) as VideoPackRow[];
    const byStage: Record<string, number> = {};
    for (const s of [...STAGES, 'unknown'] as string[]) byStage[s] = 0;
    for (const r of rows) byStage[r.stage ?? 'unknown'] += 1;
    return { ok: true, reason: null, rows, byStage };
  } catch (e) {
    return { ok: false, reason: (e as Error).message, rows: [], byStage: {} };
  }
}
