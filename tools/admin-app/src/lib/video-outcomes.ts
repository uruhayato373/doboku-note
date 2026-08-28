import { existsSync, readFileSync } from 'node:fs';

import { STAGE_LABELS } from '../../../../scripts/lib/content-lifecycle.mjs';
import {
  loadConfig as loadVideoConfig,
  loadPackSummaries,
} from '../../../../scripts/lib/video-content-check.mjs';

import { latestSnapshot, loadSnapshot, ageInDays } from './snapshots';
import { findRepoRoot, repoPath } from './repo-root';

/**
 * video-outcomes.ts — 動画パックの「公開状態 × 送客成果」を join する（read-only）。
 *
 * 設計（docs/marketing/06_動画コンテンツ運用設計.md §6・§9）:
 *   - 計測は **CI 供給が正**。ここでは `.claude/state/metrics/ga4/ga4-campaign-*.json`
 *     （fetch-metrics.yml が週次で取得）を読むだけで、ライブ API を叩かない
 *     （会社 PC はプロキシで外部 API を遮断・measurement-incidents.md）。
 *   - **snapshot 未取得を 0 として扱わない**。campaign スナップショットがまだ無い状態と
 *     「取得済みだがそのパックの流入が 0」を画面で区別する（CLAUDE.md §9）。
 *   - join のキーは `utm_campaign = packId`（video-content-policy §2 で campaign は packId と一致）。
 */

export interface DerivativeState {
  key: string;
  status: string;
  stageLabel: string | null;
  url: string | null;
  videoId: string | null;
  relatedVideoId: string | null;
  approvedBy: string | null;
  measuredAt: string | null;
}

export interface VideoOutcomeRow {
  packId: string;
  exam: string;
  slug: string;
  title: string;
  stage: string | null;
  cta: string | null;
  /** 派生物ごとの公開状態（longform / shorts / IG / X …） */
  derivatives: DerivativeState[];
  /** 公開済みの派生物があるか（成果を期待してよいか） */
  anyPublished: boolean;
  /** GA4 campaign スナップショット由来。snapshot 未取得なら null */
  sessions: number | null;
  activeUsers: number | null;
}

export interface VideoOutcomes {
  rows: VideoOutcomeRow[];
  /** 計測 snapshot の取得状況。未取得と 0 件を区別するための情報 */
  metrics: {
    ok: boolean;
    reason: string | null;
    file: string | null;
    ageDays: number | null;
    startDate: string | null;
    endDate: string | null;
    /** スナップショットに現れた campaign 数（パック外を含む） */
    campaignRows: number;
  };
  /** パックに紐づかない campaign（note/X 等の既存 UTM。参考表示用） */
  otherCampaigns: { campaign: string; sessions: number; activeUsers: number }[];
  /** 公開実体の照合（verify-video-publication が CI で書く記録）。未実行と異常0件を区別する */
  verification: {
    exists: boolean;
    verifiedAt: string | null;
    ageDays: number | null;
    checked: number;
    findings: { id: string; code: string; message: string }[];
  };
}

interface StateDerivative {
  status?: string;
  url?: string;
  videoId?: string;
  relatedVideoId?: string;
  approvedBy?: string;
  measuredAt?: string;
}

const DERIVATIVE_LABELS: Record<string, string> = {
  longform: '通常動画',
  shorts: 'Shorts',
  instagramCarousel: 'IG カルーセル',
  instagramReel: 'IG リール',
  xThread: 'X スレッド',
  threadsBrief: 'Threads',
};

export function derivativeLabel(key: string): string {
  const base = key.replace(/\[\d+\]$/, '');
  const idx = key.match(/\[(\d+)\]$/);
  const label = DERIVATIVE_LABELS[base] ?? base;
  return idx ? `${label} ${Number(idx[1]) + 1}` : label;
}

function readState(): Record<string, { derivatives?: Record<string, StateDerivative | StateDerivative[]> }> {
  const p = repoPath('.claude', 'state', 'video-content-status.json');
  if (!existsSync(p)) return {};
  try {
    const j = JSON.parse(readFileSync(p, 'utf8')) as {
      packs?: Record<string, { derivatives?: Record<string, StateDerivative | StateDerivative[]> }>;
    };
    return j.packs ?? {};
  } catch {
    return {};
  }
}

interface VerifyRecord {
  verifiedAt?: string;
  checked?: number;
  findings?: { id: string; code: string; message: string }[];
}

/** CI が書く公開実体の照合記録。無い＝まだ一度も実査していない（0 件と混同しない）。 */
function readVerification(): VideoOutcomes['verification'] {
  const p = repoPath('.claude', 'state', 'video-publication-verify.json');
  if (!existsSync(p)) {
    return { exists: false, verifiedAt: null, ageDays: null, checked: 0, findings: [] };
  }
  try {
    const j = JSON.parse(readFileSync(p, 'utf8')) as VerifyRecord;
    const at = j.verifiedAt ?? null;
    return {
      exists: true,
      verifiedAt: at,
      ageDays: at ? Math.floor((Date.now() - new Date(at).getTime()) / 86_400_000) : null,
      checked: j.checked ?? 0,
      findings: j.findings ?? [],
    };
  } catch {
    return { exists: false, verifiedAt: null, ageDays: null, checked: 0, findings: [] };
  }
}

export function videoOutcomes(): VideoOutcomes {
  const root = findRepoRoot();
  const rows: VideoOutcomeRow[] = [];

  // ── 1) 企画 × 派生物の公開状態 ──
  const packs = loadPackSummaries(root, loadVideoConfig(root)) as {
    packId: string; exam: string; slug: string; title: string; stage: string | null; cta: string | null;
  }[];
  const state = readState();

  // ── 2) 計測 snapshot（CI 供給・未取得は 0 にしない）──
  const snap = latestSnapshot('ga4', 'ga4-campaign');
  const loaded = loadSnapshot<Record<string, unknown>>(snap);
  const metrics: VideoOutcomes['metrics'] = loaded
    ? {
        ok: true,
        reason: null,
        file: snap!.file,
        ageDays: ageInDays(snap),
        startDate: (loaded.meta.startDate as string) ?? null,
        endDate: (loaded.meta.endDate as string) ?? null,
        campaignRows: loaded.rows.length,
      }
    : {
        ok: false,
        reason:
          'GA4 campaign スナップショットが未取得（fetch-metrics.yml の "Fetch GA4 (campaign, 28d…)" が走ると .claude/state/metrics/ga4/ga4-campaign-*.json が供給される）',
        file: null,
        ageDays: null,
        startDate: null,
        endDate: null,
        campaignRows: 0,
      };

  const byCampaign = new Map<string, { sessions: number; activeUsers: number }>();
  for (const r of loaded?.rows ?? []) {
    const name = String(r.campaign ?? r.sessionCampaignName ?? '');
    if (!name) continue;
    byCampaign.set(name, {
      sessions: Number(r.sessions ?? 0),
      activeUsers: Number(r.activeUsers ?? 0),
    });
  }

  for (const p of packs) {
    const derivatives: DerivativeState[] = [];
    for (const [key, raw] of Object.entries(state[p.packId]?.derivatives ?? {})) {
      const list = Array.isArray(raw) ? raw : [raw];
      list.forEach((d, i) => {
        derivatives.push({
          key: Array.isArray(raw) ? `${key}[${i}]` : key,
          status: d.status ?? 'unknown',
          stageLabel: null,
          url: d.url ?? null,
          videoId: d.videoId ?? null,
          relatedVideoId: d.relatedVideoId ?? null,
          approvedBy: d.approvedBy ?? null,
          measuredAt: d.measuredAt ?? null,
        });
      });
    }
    const hit = byCampaign.get(p.packId);
    rows.push({
      packId: p.packId,
      exam: p.exam,
      slug: p.slug,
      title: p.title,
      stage: p.stage,
      cta: p.cta,
      derivatives,
      anyPublished: derivatives.some((d) =>
        ['published', 'measured', 'refresh_due'].includes(d.status),
      ),
      sessions: metrics.ok ? (hit?.sessions ?? 0) : null,
      activeUsers: metrics.ok ? (hit?.activeUsers ?? 0) : null,
    });
  }

  const packIds = new Set(packs.map((p) => p.packId));
  const otherCampaigns = [...byCampaign.entries()]
    .filter(([name]) => !packIds.has(name))
    .map(([campaign, v]) => ({ campaign, ...v }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 20);

  rows.sort(
    (a, b) =>
      Number(b.anyPublished) - Number(a.anyPublished) ||
      (b.sessions ?? -1) - (a.sessions ?? -1) ||
      a.packId.localeCompare(b.packId),
  );

  return { rows, metrics, otherCampaigns, verification: readVerification() };
}

export { STAGE_LABELS };
