/**
 * affiliate-placement.ts — 転職アフィリエイトを「どのページのどの面に出すか」を解決する（ビルド時＝SSG）。
 *
 * ルールの正本は config/affiliate-placements.json（案件 × 面 × 対象 × 期間）。判定は依存ゼロの
 * affiliate-placement-core.mjs（検査・型と共有）。案件の見た目（バナー・カード文言）は affiliate-creatives.ts の PROGRAM_ASSETS。
 * 面の名前と 1 ページ 1 ピクセルの優先順は config/cta-placements.json。
 * 記事の長さで枠を出すか・何枠出すかはページ側（DocPage）が決め、ここは「その面に出すならどの案件か」だけを返す。
 */
import placementsConfig from '../../config/affiliate-placements.json';
import ctaPlacements from '../../config/cta-placements.json';
import { choosePixelCarrier, resolveSlots } from './affiliate-placement-core.mjs';
import { PROGRAM_ASSETS, type CareerArticleEndCard, type SidebarAdCreative } from '@/config/affiliate-creatives';
import type { CareerNeed } from '@/config/career-pathways';

type PlacementPageKind = 'doc' | 'category' | 'tool' | 'standards' | 'standards-list' | 'topic' | 'home';
export type PlacementPage = {
  readonly pageKind: PlacementPageKind;
  readonly category?: string | null;
  readonly isCareerDoc?: boolean;
};
export type ResolvedPlacement = {
  readonly ruleId: string;
  readonly slot: string;
  readonly program: string;
  readonly banner: SidebarAdCreative;
  /** バナーの GA4 ラベル（記事末は *-endbanner） */
  readonly trackLabel: string;
  readonly card: (slug?: string, need?: CareerNeed | null) => CareerArticleEndCard;
};
export type ResolvedPlacements = Readonly<Partial<Record<string, ResolvedPlacement>>>;

type Rule = (typeof placementsConfig)['rules'][number];
const RULES = placementsConfig.rules as readonly Rule[];
const VOCAB = ctaPlacements.affiliate as Record<string, { pixelPriority: number | null }>;

/** ページの面ごとに出す案件を返す。now はビルド時刻（テストは固定時刻を渡す） */
export function resolvePlacements(page: PlacementPage, now: number = Date.now()): ResolvedPlacements {
  const slots = resolveSlots(RULES as never, page, now) as Record<string, Rule>;
  const out: Record<string, ResolvedPlacement> = {};
  for (const [slot, rule] of Object.entries(slots)) {
    const asset = PROGRAM_ASSETS[rule.program];
    if (!asset) throw new Error(`配置ルール ${rule.id} の案件 ${rule.program} の素材が PROGRAM_ASSETS に無い`);
    out[slot] = {
      ruleId: rule.id,
      slot,
      program: rule.program,
      banner: asset.banner,
      trackLabel: slot === 'article-end' ? asset.trackLabel.replace(/-sidebar$/, '-endbanner') : asset.trackLabel,
      card: asset.card,
    };
  }
  return out;
}

/**
 * 1 ページ 1 ピクセル。実際に描画した面のうち優先順の最も高い面の案件のピクセルを返す（無ければ null）。
 * 発火源の面も返すので、呼び出し側はその面にだけピクセルを付ける。
 */
export function pixelFor(resolved: ResolvedPlacements, renderedSlots: readonly string[]): { slot: string; pixelSrc: string } | null {
  const slot = choosePixelCarrier(VOCAB, renderedSlots.filter((s) => resolved[s]));
  const r = slot ? resolved[slot] : undefined;
  return slot && r ? { slot, pixelSrc: r.banner.pixelSrc } : null;
}
