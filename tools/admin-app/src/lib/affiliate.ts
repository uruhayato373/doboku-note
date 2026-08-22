import { readFileSync } from 'node:fs';
import { repoPath } from './repo-root';

/**
 * affiliate.ts — A8 アフィリ成果（読み取り専用）。
 * .claude/state/metrics/affiliate/a8-report-log.json を読む。
 * データ供給は /a8-report（npm run a8-ui:fetch → a8-ui:normalize）。
 *
 * ★ 表示上の最重要ルール: A8 のこの口座は stats47（統計で見る都道府県）と共用で、
 *   **doboku-note に分離できるのはサイト別レポート（siteSummary）だけ**。
 *   monthly / daily は口座横断（stats47 込み）なので、そうと分かる形でしか出さない。
 *   programPeriod は口座横断から allowlist で抽出した doboku 分（crossCheck が担保）。
 */

const AFF = ['.claude', 'state', 'metrics', 'affiliate'] as const;

export interface SiteTotals {
  site: string;
  impressions: number | null;
  clicks: number | null;
  conversions: number | null;
  grossRevenueYen: number | null;
  approved: number | null;
  revenueYen: number | null;
  cancelledCount: number | null;
  cancelledYen: number | null;
  pendingCount: number | null;
  pendingRevenueYen: number | null;
  epc: number | null;
}
export interface ProgramRow {
  program: string | null;
  programId: string | null;
  programRaw: string;
  clicks: number | null;
  conversions: number | null;
  grossRevenueYen: number | null;
  approved: number | null;
  revenueYen: number | null;
  epc: number | null;
}
export interface MonthRow {
  month: string;
  clicks: number | null;
  conversions: number | null;
  grossRevenueYen: number | null;
  revenueYen: number | null;
}
export interface DayRow {
  date: string;
  clicks: number | null;
  conversions: number | null;
  grossRevenueYen: number | null;
}
export interface CrossCheck {
  comparable: boolean;
  exceeded?: boolean;
  deltas?: Record<string, { site: number | null; picked: number; delta: number | null }>;
}
export interface AffiliateSummary {
  collected: boolean;
  site: string | null;
  period: { raw: string; start: string; end: string; singleMonth: string | null } | null;
  updatedAt: string | null;
  lastRun: string | null;
  siteTotals: SiteTotals | null;
  programs: ProgramRow[];
  accountWideMonths: MonthRow[];
  accountWideDays: DayRow[];
  crossCheck: CrossCheck | null;
  unmapped: { programId: string | null; programRaw: string }[];
  notAttributable: number;
}

interface RawRow {
  site?: string;
  month?: string;
  date?: string;
  program?: string | null;
  programId?: string | null;
  programRaw?: string;
  impressions?: number | null;
  clicks?: number | null;
  conversions?: number | null;
  grossRevenueYen?: number | null;
  approved?: number | null;
  revenueYen?: number | null;
  cancelledCount?: number | null;
  cancelledYen?: number | null;
  pendingCount?: number | null;
  pendingRevenueYen?: number | null;
}

function readJson<T>(...seg: string[]): T | null {
  try {
    return JSON.parse(readFileSync(repoPath(...seg), 'utf8')) as T;
  } catch {
    return null;
  }
}

const n = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
/** EPC = 確定金額 ÷ クリック。クリック 0 は算出不能（0 でなく null）。 */
const epcOf = (revenue: number | null, clicks: number | null) =>
  clicks != null && clicks > 0 ? n(revenue) / clicks : null;

const EMPTY: AffiliateSummary = {
  collected: false,
  site: null,
  period: null,
  updatedAt: null,
  lastRun: null,
  siteTotals: null,
  programs: [],
  accountWideMonths: [],
  accountWideDays: [],
  crossCheck: null,
  unmapped: [],
  notAttributable: 0,
};

export function affiliateSummary(): AffiliateSummary {
  const log = readJson<{
    site?: string;
    period?: AffiliateSummary['period'];
    updatedAt?: string;
    lastRun?: string;
    siteSummary?: RawRow[];
    monthly?: RawRow[];
    daily?: RawRow[];
    programPeriod?: RawRow[];
    crossCheck?: CrossCheck;
    unmapped?: { programId?: string | null; programRaw?: string }[];
    notAttributable?: unknown[];
  }>(...AFF, 'a8-report-log.json');

  if (!log || !(log.siteSummary?.length || log.programPeriod?.length)) return EMPTY;

  const target = log.site ?? 'doboku-note';
  const s = (log.siteSummary ?? []).find((r) => String(r.site ?? '').includes(target)) ?? null;

  const siteTotals: SiteTotals | null = s
    ? {
        site: s.site ?? target,
        impressions: s.impressions ?? null,
        clicks: s.clicks ?? null,
        conversions: s.conversions ?? null,
        grossRevenueYen: s.grossRevenueYen ?? null,
        approved: s.approved ?? null,
        revenueYen: s.revenueYen ?? null,
        cancelledCount: s.cancelledCount ?? null,
        cancelledYen: s.cancelledYen ?? null,
        pendingCount: s.pendingCount ?? null,
        pendingRevenueYen: s.pendingRevenueYen ?? null,
        epc: epcOf(s.revenueYen ?? null, s.clicks ?? null),
      }
    : null;

  const programs: ProgramRow[] = (log.programPeriod ?? [])
    .filter((r) => r.program) // allowlist で doboku 分と判定できた行のみ
    .map((r) => ({
      program: r.program ?? null,
      programId: r.programId ?? null,
      programRaw: r.programRaw ?? '',
      clicks: r.clicks ?? null,
      conversions: r.conversions ?? null,
      grossRevenueYen: r.grossRevenueYen ?? null,
      approved: r.approved ?? null,
      revenueYen: r.revenueYen ?? null,
      epc: epcOf(r.revenueYen ?? null, r.clicks ?? null),
    }))
    .sort((a, b) => n(b.clicks) - n(a.clicks));

  const accountWideMonths: MonthRow[] = (log.monthly ?? [])
    .map((r) => ({
      month: r.month ?? '',
      clicks: r.clicks ?? null,
      conversions: r.conversions ?? null,
      grossRevenueYen: r.grossRevenueYen ?? null,
      revenueYen: r.revenueYen ?? null,
    }))
    .filter((r) => r.month)
    .sort((a, b) => (a.month < b.month ? -1 : 1));

  const accountWideDays: DayRow[] = (log.daily ?? [])
    .map((r) => ({ date: r.date ?? '', clicks: r.clicks ?? null, conversions: r.conversions ?? null, grossRevenueYen: r.grossRevenueYen ?? null }))
    .filter((r) => r.date)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 31);

  return {
    collected: true,
    site: target,
    period: log.period ?? null,
    updatedAt: log.updatedAt ?? null,
    lastRun: log.lastRun ?? null,
    siteTotals,
    programs,
    accountWideMonths,
    accountWideDays,
    crossCheck: log.crossCheck ?? null,
    unmapped: (log.unmapped ?? []).map((u) => ({ programId: u.programId ?? null, programRaw: u.programRaw ?? '' })),
    notAttributable: (log.notAttributable ?? []).length,
  };
}
