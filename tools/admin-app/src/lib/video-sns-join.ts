
import {
  loadConfig as loadVideoConfig,
  loadPackSummaries,
} from '../../../../scripts/lib/video-content-check.mjs';
import { youtubePublications } from '../../../../scripts/lib/registry-youtube-view.mjs';
import { loadVideoState } from '../../../../scripts/lib/registry-video-state.mjs';

import { igReelDerivatives } from './video-outcomes';
import { findRepoRoot } from './repo-root';

/**
 * video-sns-join.ts — SNS 投稿状況と動画パックの join（read-only）。
 *
 * なぜ必要か（DN-0110 Phase 3）: Shorts 台帳 `content/registry（kind legacy-short）` は
 * IG 過去問パック由来の既存 200 本を持つが、**動画パック（video-pack）とは無関係**で、
 * 台帳の item には packId も relatedVideoId も無い。一方 DN-0110 以降の派生 Shorts は
 * コンテンツ台帳（loadVideoState）の `derivatives.shorts[]` に入る。
 *
 * 2 つを 1 画面で見るとき、**「パック由来」と「パック外（レガシー）」を混ぜない**。
 * 混ぜると「動画パックの Shorts が 200 本ある」ように見えて実態を誤読する。
 */

export interface ShortsLedgerSummary {
  ok: boolean;
  reason: string | null;
  total: number;
  byStage: Record<string, number>;
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
  try {
    statePacks = (loadVideoState(root) as { packs?: typeof statePacks }).packs ?? {};
  } catch {
    statePacks = {};
  }

  const igReels = igReelDerivatives(findRepoRoot());
  const packDerivatives: PackDerivativeSummary[] = [];
  for (const p of packs) {
    const entries = statePacks[p.packId]?.derivatives ?? {};
    const derivatives: PackDerivativeSummary['derivatives'] = [];
    for (const [key, raw] of Object.entries(entries)) {
      if (key === 'instagramReel') continue; // IG リールの正本は台帳（igReelDerivatives）
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
    (igReels.get(p.packId) ?? []).forEach((d, i) => {
      derivatives.push({ key: `instagramReel[${i}]`, status: d.status ?? 'unknown', videoId: null, relatedVideoId: null });
    });
    if (derivatives.length > 0) {
      packDerivatives.push({ packId: p.packId, exam: p.exam, slug: p.slug, title: p.title, derivatives });
    }
  }

  // ── レガシー Shorts（台帳 content/registry の kind legacy-short）──
  let legacyShorts: ShortsLedgerSummary;
  try {
    const items = youtubePublications(findRepoRoot(), { legacyOnly: true }) as { stage: string }[];
    const byStage: Record<string, number> = {};
    for (const it of items) byStage[it.stage] = (byStage[it.stage] ?? 0) + 1;
    legacyShorts = items.length === 0
      ? { ok: false, reason: '台帳に旧 Shorts が 1 件も無い', total: 0, byStage: {} }
      : { ok: true, reason: null, total: items.length, byStage };
  } catch (e) {
    legacyShorts = { ok: false, reason: (e as Error).message, total: 0, byStage: {} };
  }

  return { packDerivatives, packTotal: packs.length, legacyShorts };
}
