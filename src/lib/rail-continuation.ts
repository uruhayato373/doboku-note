import type { DocMeta } from './docs';
import { RAIL_GROUP_AD_MAX } from './rail-kinds.mjs';

/**
 * 右の欄の「下に続く束」の共通部品（記事・基準書の章と節・資格トップが同じ仕組みを使う）。
 * 上の束（そのページの今の並び）の下へ、回遊カードの組を上詰めで並べる（2026-11-16 運営者判断: 均等割りは組の間に大きな余白が出た）。
 * 組には転職バナーを置かず、1 組目と 3 組目のカードの上にだけ AdSense の枠を置く（withRailAdSense）。上詰めで広告が続かないよう、カードの無い組は作らない。
 * 欄の最後には追従ブロック（RailFollow・目次＋AdSense 1 枠）が付く（RailStack の follow）。
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
  /** カードの上に AdSense の枠を置く組 */
  adsense?: boolean;
}

/**
 * 右の欄の転職バナーの上限（上の束の先頭から数えて 2 つまで・2026-11-22 運営者判断）。下に続く組には転職バナーを置かず、
 * 1 組おきに AdSense を置く。転職バナーは 28 日で表示 24,450・クリック 24（0.10%）で、基準書・キーワードはクリック 0 だった
 * （GA4 2026-10-18〜11-14）。上の束が案件を 1 つずつ持つので、ピクセルもこの 2 つが持つ。
 */
export const RAIL_AFFILIATE_MAX = 2;

/**
 * 下に続く組の転職バナーを外し、1 組目から 1 組おきに AdSense を置く（RAIL_GROUP_AD_MAX 枠まで＝1 組目と 3 組目。値と経緯は rail-kinds.mjs）。
 * 組の下の空きは、欄の最後の追従ブロック（RailFollow）が受け持つ。
 */
export function withRailAdSense(groups: RailGroup[]): RailGroup[] {
  return groups.map((group, index) => ({ ...group, adsense: index % 2 === 0 && index / 2 < RAIL_GROUP_AD_MAX }));
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
