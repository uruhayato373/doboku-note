import { readFileSync } from 'node:fs';
import { repoPath } from './repo-root';
import { datasetPath, freshnessDays } from '../../../../scripts/lib/datasets.mjs';
import { siteMonthsFromReportLog } from '../../../../scripts/lib/a8-report-csv.mjs';
import { classifyCrossCheck } from '../../../../scripts/lib/report-honesty.mjs';

/**
 * affiliate.ts — A8 アフィリ成果（読み取り専用）。
 * data/a8/report-log.json を読む。
 * データ供給は login-collectors.yml（週次・JST の前月と当月）。手動は workflow の month 入力か /a8-report。
 *
 * ★ 表示上の最重要ルール: A8 のこの口座は stats47（統計で見る都道府県）と共用で、
 *   **doboku-note に分離できるのはサイト別レポート（siteSummary）だけ**。
 *   monthly / daily は口座横断（stats47 込み）なので、そうと分かる形でしか出さない。
 *   programPeriod は口座横断から allowlist で抽出した doboku 分（crossCheck が担保）。
 */


/** doboku の副サイト（note 等）の A8 サイト名。正本は config/a8-report-automation.json の a8.relatedSites。 */
function readRelatedSites(): string[] {
  try {
    const c = JSON.parse(readFileSync(repoPath(datasetPath('config.a8-report-automation')), 'utf8'));
    return Array.isArray(c?.a8?.relatedSites) ? c.a8.relatedSites : [];
  } catch {
    return [];
  }
}

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
/** サイト別（doboku-note に分離できる唯一の実績）の単月の行。掲載先はサイトか note */
export interface SiteMonthRow {
  month: string;
  label: string;
  clicks: number | null;
  conversions: number | null;
  approved: number | null;
  pendingCount: number | null;
  cancelledCount: number | null;
  revenueYen: number | null;
}
export interface CrossCheck {
  comparable: boolean;
  exceeded?: boolean;
  hasShortfall?: boolean;
  shortfall?: { clicks?: number; revenueYen?: number };
  deltas?: Record<string, { site: number | null; picked: number; delta: number | null }>;
}
/** 検算（サイト別とプログラム別の突き合わせ）で人が見るべきときだけ出す */
export interface CrossCheckBadge {
  tone: 'warn' | 'bad' | 'info';
  text: string;
}
export interface AffiliateSummary {
  collected: boolean;
  site: string | null;
  period: { raw: string; start: string; end: string; singleMonth: string | null } | null;
  updatedAt: string | null;
  lastRun: string | null;
  siteTotals: SiteTotals | null;
  /** A8 のサイト別レポートを掲載先（サイト／note）ごとに。note は a8-report-automation.json の relatedSites */
  surfaceTotals: { label: string; site: string; clicks: number | null; conversions: number | null; approved: number | null; revenueYen: number | null; collected: boolean }[];
  programs: ProgramRow[];
  /** 直近 3 か月の単月（サイト・note） */
  siteMonths: SiteMonthRow[];
  crossCheckBadge: CrossCheckBadge | null;
  /** サイト別を説明しきれないときだけ出る取りこぼし候補（他サイト分を除く）。report-log の missingProgramCandidates */
  missingPrograms: { programId: string | null; programRaw: string }[];
  notAttributable: number;
}

interface RawRow {
  site?: string;
  period?: string;
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
  surfaceTotals: [],
  programs: [],
  siteMonths: [],
  crossCheckBadge: null,
  missingPrograms: [],
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
    missingProgramCandidates?: { programId?: string | null; programRaw?: string }[];
    notAttributable?: unknown[];
  }>(datasetPath('a8.report-log'));

  if (!log || !(log.siteSummary?.length || log.programPeriod?.length)) return EMPTY;

  const target = log.site ?? 'doboku-note';
  // siteSummary / programPeriod は期間ごとに蓄積される。表示は対象期間（log.period）の行だけ（normalize-a8-csv の inCurrentPeriod と同じ）
  const inPeriod = (r: RawRow) => r.period === log.period?.raw;
  // サイト名は完全一致（部分一致だと 'doboku-note' が 'doboku-note（note）' にも当たる）
  const rowsInPeriod = (log.siteSummary ?? []).filter(inPeriod);
  const s = rowsInPeriod.find((r) => String(r.site ?? '').trim() === target) ?? null;
  const related = readRelatedSites();
  const surfaceTotals = [
    { label: 'サイト', site: target },
    ...related.map((site) => ({ label: 'note', site })),
  ].map(({ label, site }) => {
    const r = rowsInPeriod.find((x) => String(x.site ?? '').trim() === site) ?? null;
    return { label, site, clicks: r?.clicks ?? null, conversions: r?.conversions ?? null, approved: r?.approved ?? null, revenueYen: r?.revenueYen ?? null, collected: r !== null };
  });

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
    .filter(inPeriod)
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

  // 単月の行は対象期間（log.period）に限らず直近 3 か月を出す（確定は発生月へ遡って反映されるので、前月の確定・取消を見る）
  const siteMonths: SiteMonthRow[] = siteMonthsFromReportLog(log, { sites: [target, ...related], months: 3 }).map((r) => ({
    month: r.month,
    label: r.site === target ? 'サイト' : 'note',
    clicks: r.clicks,
    conversions: r.conversions,
    approved: r.approved,
    pendingCount: r.pendingCount,
    cancelledCount: r.cancelledCount,
    revenueYen: r.revenueYen,
  }));

  // 検算: 不足（allowlist で説明しきれない＝未登録の案件の疑い）と想定を超える超過だけを出す。想定内の超過（stats47 分）は出さない
  const cc = classifyCrossCheck((log.crossCheck ?? null) as Parameters<typeof classifyCrossCheck>[0]);
  const crossCheckBadge: CrossCheckBadge | null = cc.shortfall
    ? { tone: 'warn', text: `検算 不足 ${log.crossCheck?.shortfall?.clicks ?? '?'} click` }
    : cc.abnormal
      ? { tone: 'bad', text: `検算 超過 ${cc.excessRatio != null ? Math.round(cc.excessRatio * 100) : '?'}%` }
      : null;

  return {
    collected: true,
    site: target,
    period: log.period ?? null,
    updatedAt: log.updatedAt ?? null,
    lastRun: log.lastRun ?? null,
    siteTotals,
    surfaceTotals,
    programs,
    siteMonths,
    crossCheckBadge,
    missingPrograms: (log.missingProgramCandidates ?? []).map((u) => ({ programId: u.programId ?? null, programRaw: u.programRaw ?? '' })),
    notAttributable: (log.notAttributable ?? []).length,
  };
}

/**
 * サイト内の広告クリック（GA4・配置別）。data/analysis/career-funnel.json（fetch-metrics が週次で作る）を読むだけ。
 * 配置の名前と撤去は config/cta-placements.json（語彙）。窓は配置別の 28 日窓。
 */
export interface PlacementRow {
  placement: string;
  label: string;
  impressions: number;
  clicks: number;
  /** 撤去済み（GA4 の窓に過去の表示が残っているだけ）。日付が分かれば retiredAt */
  retired: boolean;
  retiredAt: string | null;
}
export interface PlacementView {
  window: { start: string; end: string } | null;
  generatedAt: string | null;
  /** 生成から台帳の鮮度（analysis.career-funnel の warnDays）を超えた */
  stale: boolean;
  rows: PlacementRow[];
}
function readPlacementVocab(): Record<string, { label: string; status: string; retiredAt?: string }> {
  try {
    return JSON.parse(readFileSync(repoPath(datasetPath('config.cta-placements')), 'utf8')).affiliate ?? {};
  } catch {
    return {};
  }
}
export function affiliatePlacements(): PlacementView {
  try {
    const j = JSON.parse(readFileSync(repoPath(datasetPath('analysis.career-funnel')), 'utf8')) as {
      generatedAt?: string;
      windows?: { ga4?: { start: string; end: string } };
      funnel?: { affiliateCta?: { byPlacement?: Record<string, { impressions?: number; clicks?: number }> } };
    };
    const vocab = readPlacementVocab();
    const rows = Object.entries(j.funnel?.affiliateCta?.byPlacement ?? {})
      .map(([placement, v]) => {
        const known = vocab[placement];
        return {
          placement,
          label: known?.label ?? placement,
          impressions: v.impressions ?? 0,
          clicks: v.clicks ?? 0,
          retired: known?.status === 'retired',
          retiredAt: known?.retiredAt ?? null,
        };
      })
      .sort((a, b) => Number(a.retired) - Number(b.retired) || b.impressions - a.impressions);
    const generatedAt = j.generatedAt ?? null;
    const ageDays = generatedAt ? (Date.now() - Date.parse(generatedAt)) / 86400000 : Infinity;
    return { window: j.windows?.ga4 ?? null, generatedAt, stale: ageDays > freshnessDays('analysis.career-funnel', 'warnDays'), rows };
  } catch {
    return { window: null, generatedAt: null, stale: false, rows: [] };
  }
}

/** アフィリエイトに関わる実行中の実験と次の判定日（data/business/experiments.json）。 */
export function affiliateExperiments(): { id: string; title: string; nextCheck: string | null }[] {
  try {
    const e = JSON.parse(readFileSync(repoPath(datasetPath('business.experiments')), 'utf8'));
    const list = (Array.isArray(e) ? e : e.experiments ?? []) as { id: string; title: string; status: string; target_metric?: string; next_check_date?: string }[];
    return list
      .filter((x) => x.status === 'running' && /affiliate|アフィリ/i.test(`${x.title} ${x.target_metric ?? ''}`))
      .map((x) => ({ id: x.id, title: x.title, nextCheck: x.next_check_date ?? null }));
  } catch {
    return [];
  }
}

/** 掲載先（サイト／note／SNS）ごとのアフィリエイトリンク。数えるのは scripts/lib/affiliate-placements.mjs。 */
export { affiliatePlacements as affiliateSurfaces } from '../../../../scripts/lib/affiliate-placements.mjs';

/** 提携・案件（data/affiliate/catalog.json）＋リンクの期限（config/affiliate-mats.json）。 */
export interface ProgramCatalogRow {
  id: string;
  label: string;
  placement: string;
  asps: { asp: string; status: string; rewardYen: number | null }[];
  expiresAt: string | null;
}
export function affiliateCatalog(): ProgramCatalogRow[] {
  try {
    const c = JSON.parse(readFileSync(repoPath(datasetPath('affiliate.catalog')), 'utf8')) as {
      programs: Record<string, { label: string; placement: string; asps?: Record<string, { status?: string; rewardYen?: number | null }> }>;
    };
    const mats = JSON.parse(readFileSync(repoPath(datasetPath('config.affiliate-mats')), 'utf8')).mats as { program: string; expiresAt: string | null }[];
    return Object.entries(c.programs).map(([id, p]) => {
      const dates = mats.filter((m) => m.program === id).map((m) => m.expiresAt);
      return {
        id,
        label: p.label,
        placement: p.placement,
        asps: Object.entries(p.asps ?? {}).map(([asp, x]) => ({ asp, status: x.status ?? 'unknown', rewardYen: x.rewardYen ?? null })),
        // 期限なしのリンクが1本でもあれば期限なし
        expiresAt: dates.length && dates.every(Boolean) ? (dates as string[]).sort().at(-1)! : null,
      };
    });
  } catch {
    return [];
  }
}
