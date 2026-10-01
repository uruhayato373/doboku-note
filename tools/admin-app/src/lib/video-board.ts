import {
  loadConfig as loadVideoConfig,
  loadPackSummaries,
} from '../../../../scripts/lib/video-content-check.mjs';
import { STAGES } from '../../../../scripts/lib/content-lifecycle.mjs';

import { findRepoRoot } from './repo-root';
import { qualificationBadgeLabel } from '../../../../scripts/lib/qualification-names.mjs';
import registry from '../../../../config/qualification-registry.json';

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

/** 動画パックの資格（registry の資格 id）の短い表示名。registry のごく短い名前（badgeLabel）を引く（写さない） */
export const examLabel = (id: string): string => qualificationBadgeLabel(registry, id);

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
