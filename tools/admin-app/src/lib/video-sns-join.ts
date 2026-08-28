import { existsSync, readFileSync } from 'node:fs';

import {
  loadConfig as loadVideoConfig,
  loadPackSummaries,
} from '../../../../scripts/lib/video-content-check.mjs';
import { youtubeScheduleStatusToStage } from '../../../../scripts/lib/content-lifecycle.mjs';

import { findRepoRoot, repoPath } from './repo-root';

/**
 * video-sns-join.ts — SNS 投稿状況と動画パックの join（read-only）。
 *
 * なぜ必要か（DN-0110 Phase 3）: Shorts 台帳 `.claude/state/youtube-schedule.json` は
 * IG 過去問パック由来の既存 200 本を持つが、**動画パック（video-pack）とは無関係**で、
 * 台帳の item には packId も relatedVideoId も無い。一方 DN-0110 以降の派生 Shorts は
 * `.claude/state/video-content-status.json` の `derivatives.shorts[]` に入る。
 *
 * 2 つを 1 画面で見るとき、**「パック由来」と「パック外（レガシー）」を混ぜない**。
 * 混ぜると「動画パックの Shorts が 200 本ある」ように見えて実態を誤読する。
 */

export interface ShortsLedgerSummary {
  ok: boolean;
  reason: string | null;
  total: number;
  byStage: Record<string, number>;
  /** 台帳側で packId を持つ item 数（現状 0＝レガシーのみ） */
  packLinked: number;
}

export interface PackDerivativeSummary {
  packId: string;
  exam: string;
  slug: string;
  title: string;
  /** 派生キー → 状態（複数ある shorts は配列） */
  derivatives: { key: string; status: string; videoId: string | null; relatedVideoId: string | null }[];
}

export interface VideoSnsJoin {
  /** 動画パック由来の派生物（公開状態を持つものだけ） */
  packDerivatives: PackDerivativeSummary[];
  /** 動画パック総数（企画のみを含む） */
  packTotal: number;
  /** レガシー Shorts 台帳（パック外） */
  legacyShorts: ShortsLedgerSummary;
}

interface StateDerivative {
  status?: string;
  videoId?: string;
  relatedVideoId?: string;
}

export function videoSnsJoin(): VideoSnsJoin {
  const root = findRepoRoot();

  // ── 動画パック側 ──
  let packs: { packId: string; exam: string; slug: string; title: string }[] = [];
  try {
    packs = loadPackSummaries(root, loadVideoConfig(root)) as typeof packs;
  } catch {
    packs = [];
  }

  let statePacks: Record<string, { derivatives?: Record<string, StateDerivative | StateDerivative[]> }> = {};
  const statePath = repoPath('.claude', 'state', 'video-content-status.json');
  if (existsSync(statePath)) {
    try {
      statePacks =
        (JSON.parse(readFileSync(statePath, 'utf8')) as { packs?: typeof statePacks }).packs ?? {};
    } catch {
      statePacks = {};
    }
  }

  const packDerivatives: PackDerivativeSummary[] = [];
  for (const p of packs) {
    const entries = statePacks[p.packId]?.derivatives ?? {};
    const derivatives: PackDerivativeSummary['derivatives'] = [];
    for (const [key, raw] of Object.entries(entries)) {
      const list = Array.isArray(raw) ? raw : [raw];
      list.forEach((d, i) => {
        // 企画だけ（draft）の行で画面を埋めない。制作が動いたものだけ出す。
        if (!d.status || d.status === 'draft') return;
        derivatives.push({
          key: Array.isArray(raw) ? `${key}[${i}]` : key,
          status: d.status,
          videoId: d.videoId ?? null,
          relatedVideoId: d.relatedVideoId ?? null,
        });
      });
    }
    if (derivatives.length > 0) {
      packDerivatives.push({ packId: p.packId, exam: p.exam, slug: p.slug, title: p.title, derivatives });
    }
  }

  // ── レガシー Shorts 台帳側 ──
  const ledgerPath = repoPath('.claude', 'state', 'youtube-schedule.json');
  let legacyShorts: ShortsLedgerSummary;
  if (!existsSync(ledgerPath)) {
    legacyShorts = { ok: false, reason: '台帳が無い', total: 0, byStage: {}, packLinked: 0 };
  } else {
    try {
      const j = JSON.parse(readFileSync(ledgerPath, 'utf8')) as {
        items?: { status?: string; sourcePackId?: string }[];
      };
      const items = j.items ?? [];
      const byStage: Record<string, number> = {};
      let packLinked = 0;
      for (const it of items) {
        const stage = youtubeScheduleStatusToStage(it.status ?? '') ?? 'unknown';
        byStage[stage] = (byStage[stage] ?? 0) + 1;
        if (it.sourcePackId) packLinked += 1;
      }
      legacyShorts = { ok: true, reason: null, total: items.length, byStage, packLinked };
    } catch (e) {
      legacyShorts = { ok: false, reason: (e as Error).message, total: 0, byStage: {}, packLinked: 0 };
    }
  }

  return { packDerivatives, packTotal: packs.length, legacyShorts };
}
