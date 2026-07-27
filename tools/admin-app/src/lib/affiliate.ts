import { readFileSync } from 'node:fs';
import { repoPath } from './repo-root';

/**
 * affiliate.ts — A8 アフィリ成果（読み取り専用）。
 * .claude/state/metrics/affiliate/a8-report-log.json（正規化 SSOT）と
 * a8-results.json（プログラム別 rollup）を集計する。
 * データは npm run a8-ui:fetch → a8-ui:normalize（/a8-report スキル）が供給する。
 */

const AFF = ['.claude', 'state', 'metrics', 'affiliate'] as const;

export interface ProgramRow {
  program: string | null;
  programRaw: string;
  clicks: number | null;
  conversions: number | null;
  approved: number | null;
  revenueYen: number | null;
  epc: number | null;
}
export interface MonthRow {
  month: string;
  clicks: number;
  conversions: number;
  approved: number;
  revenueYen: number;
  epc: number | null;
  programs: ProgramRow[];
}
export interface DayRow {
  date: string;
  clicks: number | null;
  conversions: number | null;
  revenueYen: number | null;
}
export interface UnmappedRow {
  month: string;
  programRaw: string;
  reason: string;
}
export interface AffiliateSummary {
  collected: boolean;
  site: string | null;
  updatedAt: string | null;
  lastRun: string | null;
  months: MonthRow[];
  recentDays: DayRow[];
  unmapped: UnmappedRow[];
  total: { clicks: number; approved: number; revenueYen: number; epc: number | null };
}

interface ProgramMonthly {
  month: string;
  programRaw: string;
  program: string | null;
  clicks: number | null;
  conversions: number | null;
  approved: number | null;
  revenueYen: number | null;
}
interface Daily {
  date: string;
  clicks: number | null;
  conversions: number | null;
  revenueYen: number | null;
}

function readJson<T>(...seg: string[]): T | null {
  try {
    return JSON.parse(readFileSync(repoPath(...seg), 'utf8')) as T;
  } catch {
    return null;
  }
}

const num = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
/** EPC = 確定報酬 ÷ クリック。クリック 0 は算出不能（0 でなく null）。 */
const epcOf = (revenue: number, clicks: number) => (clicks > 0 ? revenue / clicks : null);

const EMPTY: AffiliateSummary = {
  collected: false,
  site: null,
  updatedAt: null,
  lastRun: null,
  months: [],
  recentDays: [],
  unmapped: [],
  total: { clicks: 0, approved: 0, revenueYen: 0, epc: null },
};

export function affiliateSummary(): AffiliateSummary {
  const log = readJson<{
    site?: string;
    updatedAt?: string;
    lastRun?: string;
    daily?: Daily[];
    programMonthly?: ProgramMonthly[];
    unmapped?: UnmappedRow[];
  }>(...AFF, 'a8-report-log.json');

  if (!log || !(log.programMonthly?.length || log.daily?.length)) return EMPTY;

  const byMonth = new Map<string, MonthRow>();
  for (const r of log.programMonthly ?? []) {
    let m = byMonth.get(r.month);
    if (!m) {
      m = { month: r.month, clicks: 0, conversions: 0, approved: 0, revenueYen: 0, epc: null, programs: [] };
      byMonth.set(r.month, m);
    }
    m.clicks += num(r.clicks);
    m.conversions += num(r.conversions);
    m.approved += num(r.approved);
    m.revenueYen += num(r.revenueYen);
    m.programs.push({
      program: r.program ?? null,
      programRaw: r.programRaw,
      clicks: r.clicks ?? null,
      conversions: r.conversions ?? null,
      approved: r.approved ?? null,
      revenueYen: r.revenueYen ?? null,
      epc: epcOf(num(r.revenueYen), num(r.clicks)),
    });
  }

  const months = [...byMonth.values()]
    .map((m) => ({ ...m, epc: epcOf(m.revenueYen, m.clicks), programs: m.programs.sort((a, b) => num(b.revenueYen) - num(a.revenueYen)) }))
    .sort((a, b) => (a.month < b.month ? -1 : 1));

  const recentDays = (log.daily ?? [])
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 31)
    .map((d) => ({ date: d.date, clicks: d.clicks ?? null, conversions: d.conversions ?? null, revenueYen: d.revenueYen ?? null }));

  const clicks = months.reduce((s, m) => s + m.clicks, 0);
  const revenueYen = months.reduce((s, m) => s + m.revenueYen, 0);

  return {
    collected: true,
    site: log.site ?? null,
    updatedAt: log.updatedAt ?? null,
    lastRun: log.lastRun ?? null,
    months,
    recentDays,
    unmapped: log.unmapped ?? [],
    total: {
      clicks,
      approved: months.reduce((s, m) => s + m.approved, 0),
      revenueYen,
      epc: epcOf(revenueYen, clicks),
    },
  };
}
