import ledger from '../../config/site-cta-surfaces.json';
import { examDayEndUtcMs, examDayStartUtcMs } from './exam-dates';
import type { MagazineId } from './note-magazines';

/**
 * サイトの広い面（資格トップ・記事の横の欄・記事末のタイル・/links の先頭）から note のどこへ案内するか（DN-1223）。
 * 正本は config/site-cta-surfaces.json。ここは読むだけで、資格ごとの判断を書かない。
 * 検査は scripts/check-cta-surfaces.mjs（商品とテーマの実在・試験日の行事・もくじの有無・コードの直書き）。
 */

type SurfaceLead = 'mokuji' | 'product' | 'none';
export type SeasonKind = 'before-exam' | 'after-event';

export interface SurfaceSeason {
  readonly kind: SeasonKind;
  /** config/exam-calendar.json の行事名（second・written・writtenResult・exam など） */
  readonly event: string;
  /** before-exam: 行事の何日前から（無ければ行事の日までずっと）。after-event: 行事の日から何日間 */
  readonly days?: number;
  readonly product: MagazineId;
  readonly title?: string;
  readonly sub: string;
}

export interface SurfaceRow {
  readonly lead: SurfaceLead;
  readonly product?: MagazineId;
  readonly reason?: string;
  readonly tile?: { readonly title1: string; readonly title2: string };
  readonly tileFirstStage?: { readonly title1: string; readonly title2: string };
  readonly seasons?: readonly SurfaceSeason[];
}

const ROWS = (ledger as unknown as { qualifications: Record<string, SurfaceRow> }).qualifications;
const DAY_MS = 86_400_000;

export function surfaceRow(category: string): SurfaceRow | undefined {
  return ROWS[category];
}

/** 季節の窓 [開始, 終了) の UTC ミリ秒。before-exam は行事の日の終わりまで、after-event は行事の日の始めから */
export function seasonWindow(category: string, season: SurfaceSeason): { start: number; end: number } {
  if (season.kind === 'before-exam') {
    const end = examDayEndUtcMs(category, season.event);
    return { start: season.days === undefined ? Number.NEGATIVE_INFINITY : end - season.days * DAY_MS, end };
  }
  const start = examDayStartUtcMs(category, season.event);
  return { start, end: start + (season.days ?? 0) * DAY_MS };
}

/** いま出す季節の商品（無ければ null）。kind を渡すとその種類だけを見る */
export function activeSeason(category: string, nowMs = Date.now(), kind?: SeasonKind): SurfaceSeason | null {
  for (const season of ROWS[category]?.seasons ?? []) {
    if (kind && season.kind !== kind) continue;
    const { start, end } = seasonWindow(category, season);
    if (nowMs >= start && nowMs < end) return season;
  }
  return null;
}

/** 資格トップの商品（季節の商品 → product の資格の主商品）。もくじへ案内する資格は季節外なら undefined */
export function surfaceLeadProductId(category: string, nowMs = Date.now()): MagazineId | undefined {
  const row = ROWS[category];
  if (!row) return undefined;
  return activeSeason(category, nowMs)?.product ?? (row.lead === 'product' ? row.product : undefined);
}
