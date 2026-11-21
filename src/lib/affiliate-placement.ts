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
import { choosePixelCarrier, resolveSlots, resolveSplit } from './affiliate-placement-core.mjs';
import { PROGRAM_ASSETS, type CareerArticleEndCard, type SidebarAdCreative } from '@/config/affiliate-creatives';
import type { CareerNeed } from '@/config/career-pathways';

type PlacementPageKind = 'doc' | 'category' | 'tool' | 'standards' | 'standards-list' | 'topic' | 'laws-list' | 'home';
export type PlacementPage = {
  readonly pageKind: PlacementPageKind;
  readonly category?: string | null;
  readonly isCareerDoc?: boolean;
};
/** 出し分け（EXP-055）の代わりの案件。訪問者の約半分に primary の代わりに出す（config/affiliate-placements.json の splits） */
export type ResolvedAlternate = {
  readonly splitId: string;
  readonly experiment: string;
  readonly program: string;
  readonly banner: SidebarAdCreative;
  readonly trackLabel: string;
  readonly card: (slug?: string, need?: CareerNeed | null) => CareerArticleEndCard;
};
export type ResolvedPlacement = {
  readonly ruleId: string;
  readonly slot: string;
  readonly program: string;
  readonly banner: SidebarAdCreative;
  /** バナーの GA4 ラベル（記事末は *-endbanner） */
  readonly trackLabel: string;
  readonly card: (slug?: string, need?: CareerNeed | null) => CareerArticleEndCard;
  /** 意匠実験の B が使うテキスト素材のリンク（PROGRAM_ASSETS の textHref） */
  readonly textHref?: string | undefined;
  /** textHref と同じ素材の計測ピクセル（PROGRAM_ASSETS の textPixelSrc） */
  readonly textPixelSrc?: string | undefined;
  /** 出し分けの代わりの案件（資格トップ・記事末などで、組があるときだけ） */
  readonly alternate?: ResolvedAlternate | undefined;
};
export type ResolvedPlacements = Readonly<Partial<Record<string, ResolvedPlacement>>>;

type Rule = (typeof placementsConfig)['rules'][number];
const RULES = placementsConfig.rules as readonly Rule[];
const SPLITS = ((placementsConfig as { splits?: unknown[] }).splits ?? []) as never[];
const VOCAB = ctaPlacements.affiliate as Record<string, { pixelPriority: number | null }>;

/** ページの面ごとに出す案件を返す。now はビルド時刻（テストは固定時刻を渡す） */
export function resolvePlacements(page: PlacementPage, now: number = Date.now()): ResolvedPlacements {
  const slots = resolveSlots(RULES as never, page, now) as Record<string, Rule>;
  const out: Record<string, ResolvedPlacement> = {};
  for (const [slot, rule] of Object.entries(slots)) {
    const asset = PROGRAM_ASSETS[rule.program];
    if (!asset) throw new Error(`配置ルール ${rule.id} の案件 ${rule.program} の素材が PROGRAM_ASSETS に無い`);
    const split = resolveSplit(SPLITS, rule as never, page, now) as { id: string; alternate: string; experiment: string } | null;
    const alt = split ? PROGRAM_ASSETS[split.alternate] : undefined;
    if (split && !alt) throw new Error(`出し分け ${split.id} の案件 ${split.alternate} の素材が PROGRAM_ASSETS に無い`);
    const endLabel = (label: string) => (slot === 'article-end' ? label.replace(/-sidebar$/, '-endbanner') : label);
    out[slot] = {
      ...(split && alt
        ? { alternate: { splitId: split.id, experiment: split.experiment, program: split.alternate, banner: alt.banner, trackLabel: endLabel(alt.trackLabel), card: alt.card } }
        : {}),
      ruleId: rule.id,
      slot,
      program: rule.program,
      banner: asset.banner,
      trackLabel: endLabel(asset.trackLabel),
      card: asset.card,
      textHref: asset.textHref,
      textPixelSrc: asset.textPixelSrc,
    };
  }
  return out;
}

/**
 * 1 ページ 1 ピクセル。実際に描画した面のうち優先順の最も高い面の案件のピクセルを返す（無ければ null）。
 * 発火源の面も返すので、呼び出し側はその面にだけピクセルを付ける。
 */
export function pixelFor(resolved: ResolvedPlacements, renderedSlots: readonly string[]): { slot: string; pixelSrc: string; textHref?: string | undefined; textPixelSrc?: string | undefined } | null {
  const slot = choosePixelCarrier(VOCAB, renderedSlots.filter((s) => resolved[s]));
  const r = slot ? resolved[slot] : undefined;
  return slot && r ? { slot, pixelSrc: r.banner.pixelSrc, textHref: r.textHref, textPixelSrc: r.textPixelSrc } : null;
}
