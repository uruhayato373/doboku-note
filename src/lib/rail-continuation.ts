import type { DocMeta } from './docs';
import type { ResolvedPlacement } from './affiliate-placement';
import { slotCreatives } from './affiliate-slot-creatives';

/**
 * 右の欄の「下に続く束」の共通部品（記事・基準書の章と節・資格トップが同じ仕組みを使う）。
 * 上の束（そのページの今の並び）の下へ、回遊カードと転職バナーの組を上詰めで並べる（2026-11-16 運営者判断: 均等割りは組の間に大きな余白が出た）。
 * 2 組目は転職バナーの代わりに AdSense の枠を置く（withRailAdSense）。上詰めで広告が続かないよう、カードの無い組（バナーだけ）は作らない。
 * 組の数の判定・カードの選び方・バナーだけの組の散らし方は、ここだけに置く。
 */

export interface RailLink {
  href: string;
  title: string;
  doc?: DocMeta;
}
export interface RailCard {
  label:
    | 'rail-related' | 'rail-exam-years' | 'rail-textbooks' | 'rail-discovery' | 'rail-topic' | 'rail-popular' | 'rail-latest' | 'rail-tools'
    | 'rail-standards-practice' | 'rail-standards-exam' | 'rail-standards-chapters';
  title: string;
  links: RailLink[];
  /** サムネイルなしの文字の一覧（記事ではない行き先。基準書の前後の章） */
  plain?: boolean;
}
export interface RailGroup {
  slot: string;
  card: RailCard | null;
  banner: ResolvedPlacement | undefined;
  /** 回遊の組の間をバナーだけで埋める組（card なし・面は *-rail-fill） */
  fill?: boolean;
  /** 転職バナーの代わりに AdSense の枠を置く組 */
  adsense?: boolean;
  /** 上詰めの組の下の空きへ均等に散らす AdSense だけの組 */
  lower?: boolean;
}

/** 上詰めの組の下の空きに置く AdSense の上限（2026-11-16 運営者判断）。間隔（2,500px ごとに 1 枠）と出すかどうかは描画した空きの高さで決める（globals.css の rail-lower-ads） */
const RAIL_LOWER_AD_MAX = 3;

/**
 * 2 組目の転職バナーを AdSense の枠に替え（1 組だけなら組の後ろに AdSense だけの組を足す）、カード → 転職 → カード → AdSense → カード の順にする。
 * 上詰めの組の下の空きには AdSense だけの組（lower）を最大 3 つ足す。何枠出すかは描画した空きの高さで決める（2,500px ごとに 1 枠。
 * 字数からの高さの見積もりは表の多い基準書の章で外れ、空きが 1 万 px を超えても 0 枠だった）。転職バナーは同じ案件の繰り返しとピクセルの扱いが崩れるので足さない。
 */
export function withRailAdSense(groups: RailGroup[]): RailGroup[] {
  const packed = groups.length === 0 ? []
    : groups.length === 1 ? [...groups, { slot: 'rail-adsense', card: null, banner: undefined, adsense: true }]
    : groups.map((group, index) => index === 1 ? { ...group, banner: undefined, adsense: true } : group);
  return [...packed, ...Array.from({ length: RAIL_LOWER_AD_MAX }, (_, i) => ({ slot: `rail-adsense-lower-${i + 1}`, card: null, banner: undefined, adsense: true, lower: true }))];
}
export interface RailSource { label: RailCard['label']; title: string; links: RailLink[]; plain?: boolean }

/** 空きが FIRST_GROUP_MIN_PX 未満なら 0 組。以降は約 GROUP_SPACING_PX ごとに 1 組 */
const GROUP_SPACING_PX = 2000;
const FIRST_GROUP_MIN_PX = 3000;

/** 右の欄に残る空き（px）から組の数を決める。記事・基準書・資格トップで同じ判定を使う。 */
export function railGroupCountFromFree(free: number, { first = FIRST_GROUP_MIN_PX, spacing = GROUP_SPACING_PX, max }: { first?: number; spacing?: number; max: number }): number {
  return free < first ? 0 : Math.min(max, Math.max(1, Math.floor(free / spacing)));
}

/**
 * 資格トップの組の数。本文の高さは一覧の記事数で決まる（2026-11-16 の全ページ実測・PC 1440・資格トップ 15 ページ）。
 * 右の欄の上の束が終わった後の空きは、記事 14 本以下で 50〜500px、18〜20 本で 1,600〜2,200px、59 本以上で 1,750〜5,400px。
 * 組 1 つは約 600px なので、16 本から 1 組・40 本から 2 組（上限 2）にする。
 */
const CATEGORY_RAIL_FREE_PX: ReadonlyArray<readonly [minDocs: number, free: number]> = [[40, 3600], [16, 2000]];
export function categoryRailGroupCount(docCount: number): number {
  return railGroupCountFromFree(categoryRailFreePx(docCount), { first: 1500, spacing: 1800, max: 2 });
}
function categoryRailFreePx(docCount: number): number {
  return CATEGORY_RAIL_FREE_PX.find(([minDocs]) => docCount >= minDocs)?.[1] ?? 0;
}

const PER_GROUP = 3;

/**
 * 回遊カードの選び方。1 組 3 件（最後の組だけ 2 件）。種類を続けず、同じリンクを 2 回出さない（usedHrefs に積む）。
 * first があれば偶数番の組の先頭候補・奇数番の組の末尾候補にする。候補が尽きたら以降は null。
 */
export function createCardPicker({ first, others, usedHrefs }: { first?: RailSource; others: RailSource[]; usedHrefs: Set<string> }): (index: number) => RailCard | null {
  const available = (source: RailSource) => source.links.filter(link => !usedHrefs.has(link.href));
  const taken = new Map<RailSource, number>();
  let cursor = 0;
  let last: RailSource | null = null;
  let closed = false;
  return index => {
    if (closed) return null;
    const rotated = [...others.slice(cursor), ...others.slice(0, cursor)];
    const order = !first ? rotated : index % 2 === 0 ? [first, ...rotated] : [...rotated, first];
    for (const need of [PER_GROUP, 2]) {
      const source = order.find(candidate => candidate !== last && available(candidate).length >= need);
      if (!source) continue;
      const links = available(source).slice(0, PER_GROUP);
      links.forEach(link => usedHrefs.add(link.href));
      const round = taken.get(source) ?? 0;
      taken.set(source, round + 1);
      if (others.includes(source)) cursor = (others.indexOf(source) + 1) % others.length;
      if (links.length < PER_GROUP) closed = true;
      last = source;
      return { label: source.label, title: round ? `${source.title}（続き）` : source.title, links, ...(source.plain ? { plain: true } : {}) };
    }
    closed = true;
    return null;
  };
}

/**
 * バナーだけの組の案件の列。右の欄に出ている案件を出る順に 1 回ずつ並べ直し、面名だけ fill 面にする。
 * ピクセルは上の束の同じ案件が既に 1 発持つので、ここでは増やさない。面の画像が無い案件は入れない。
 */
export function railFillColumn(placements: ResolvedPlacement[], fillSlot: string): ResolvedPlacement[] {
  const seen = new Set<string>();
  return placements.flatMap(placement => {
    if (seen.has(placement.program)) return [];
    seen.add(placement.program);
    return slotCreatives(placement.program, fillSlot).pc ? [{ ...placement, alternate: undefined, secondary: undefined, slot: fillSlot }] : [];
  });
}

