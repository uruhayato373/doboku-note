import { buildReport, records, reviewPeriod } from '../../../../scripts/lib/business-direction.mjs';
import { salesByQualification } from '../../../../scripts/lib/sales-by-qualification.mjs';
import { latestIndexAsOf } from '../../../../scripts/lib/index-coverage.mjs';
import { buildSearchOpportunities } from '../../../../scripts/lib/search-opportunities.mjs';
import { findRepoRoot } from './repo-root';

/**
 * kpi-tree.ts — トップ（KPI）の表示モデル。docs/strategy/15_KPIツリー.md のツリーを、
 * 事業レポート（scripts/lib/business-direction.mjs の buildReport）の資格別セルから組み立てる。
 * 値は足さない・推計しない。未計測は null のまま渡す。
 */

export type Scope = { id: string; label: string };
export type KpiCell = { value: number | null; coverage: string; applicable: boolean };
export type KpiRow = { id: string; label: string; unit: string; depth: 0 | 1 | 2; cells: Record<string, KpiCell> };
export type KpiGroup = { label: string; rows: KpiRow[] };
export type Goal = { value: number; direction: string; effectiveDate: string; reviewDate: string } | null;
export type KpiView = {
  period: { startDate: string; endDate: string };
  month: string;
  scopes: Scope[];
  receipts: number | null;
  goal: Goal;
  groups: KpiGroup[];
  /** 概要: チャネル別と資格別の販売額（受取ではなく販売額。受取はチャネル別に記録していない）。 */
  channels: { label: string; value: number | null }[];
  qualifications: { label: string; value: number | null }[];
  site: { indexRatio: number | null; gscClicks: number | null; organicUsers: number | null };
  /** 検索クラスター別の 1 桁の検索語数（GSC の 28 日集計。KPI の暦月とは期間が違う）。 */
  search: { period: string | null; clusters: { label: string; top10: number; prevTop10: number | null; impressions: number }[] };
};

/** ツリーの並び（15_KPIツリー.md）。depth 0 は頂点、1 はチャネルの金額、2 はその入口。 */
const TREE: { label: string; rows: { id: string; depth: 0 | 1 | 2 }[] }[] = [
  { label: '受取', rows: [{ id: 'netReceipts', depth: 0 }] },
  { label: 'note', rows: [{ id: 'noteRevenue', depth: 1 }, { id: 'noteSales', depth: 2 }, { id: 'notePv', depth: 2 }, { id: 'noteImpressions', depth: 2 }] },
  { label: 'ココナラ', rows: [{ id: 'coconalaRevenue', depth: 1 }, { id: 'coconalaOrders', depth: 2 }, { id: 'coconalaInquiries', depth: 2 }, { id: 'coconalaViews', depth: 2 }] },
  { label: 'KDP', rows: [{ id: 'kdpRoyalty', depth: 1 }] },
  { label: 'サイト', rows: [{ id: 'indexRatio', depth: 2 }, { id: 'gscClicks', depth: 2 }, { id: 'organicUsers', depth: 2 }, { id: 'quizStarts', depth: 2 }, { id: 'quizCompletions', depth: 2 }, { id: 'noteCtaClicks', depth: 2 }] },
  { label: '運営', rows: [{ id: 'costYen', depth: 1 }, { id: 'workMinutes', depth: 2 }, { id: 'qualityDefects', depth: 2 }] },
];

/** ?month=YYYY-MM があればその暦月、無ければ直近の完了した暦月。 */
export function kpiPeriod(month?: string): { startDate: string; endDate: string } {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number) as [number, number];
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { startDate: `${month}-01`, endDate: `${month}-${String(last).padStart(2, '0')}` };
  }
  return reviewPeriod('monthly');
}

export function loadKpiView(month?: string): KpiView {
  const root = findRepoRoot();
  const period = kpiPeriod(month);
  const report = buildReport(root, period) as {
    strategy: { qualifications: Scope[]; metrics: { id: string; label: string; unit: string }[] };
    cells: { qualification: string; metric: string; value: number | null; coverage: string; applicable: boolean }[];
  };
  const scopes: Scope[] = [{ id: 'all', label: '全体' }, ...report.strategy.qualifications.map((q) => ({ id: q.id, label: q.label }))];
  const latest = latestIndexAsOf(root, period.endDate, scopes.filter((s) => s.id !== 'all').map((s) => s.id));
  const idx: Record<string, number | null> = Object.fromEntries(scopes.map((s) => [s.id, s.id === 'all' ? latest?.all.ratio ?? null : latest?.byQualification[s.id]?.ratio ?? null]));
  const metricMeta = (id: string) =>
    id === 'indexRatio' ? { label: 'インデックス率', unit: '%' } : report.strategy.metrics.find((m) => m.id === id) ?? { label: id, unit: '' };

  const groups: KpiGroup[] = TREE.map((g) => ({
    label: g.label,
    rows: g.rows.map(({ id, depth }) => {
      const meta = metricMeta(id);
      const cells: Record<string, KpiCell> = {};
      for (const s of scopes) {
        if (id === 'indexRatio') {
          const v = idx[s.id];
          cells[s.id] = { value: v == null ? null : Math.round(v * 1000) / 10, coverage: v == null ? 'missing' : 'complete', applicable: true };
          continue;
        }
        const c = report.cells.find((x) => x.qualification === s.id && x.metric === id);
        cells[s.id] = { value: c?.value ?? null, coverage: c?.coverage ?? 'missing', applicable: c?.applicable !== false };
      }
      return { id, label: meta.label, unit: meta.unit, depth, cells };
    }),
  }));

  // 目標は適用日にかかわらず最新の全体目標を示す（達成の判定には使わない）。
  const target = (records(root) as { kind: string; qualification: string; metric: string; value: number; direction: string; effectiveDate: string; reviewDate: string; createdAt?: string }[])
    .filter((r) => r.kind === 'target' && r.qualification === 'all' && r.metric === 'netReceipts')
    .sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')))
    .at(-1);

  const cell = (metric: string, scope: string) => groups.flatMap((g) => g.rows).find((r) => r.id === metric)?.cells[scope]?.value ?? null;
  let search: KpiView['search'] = { period: null, clusters: [] };
  try {
    const so = buildSearchOpportunities(root) as { period: { startDate: string; endDate: string } | null; clusters: { label: string; top10: number; impressions: number; previous: { top10: number } | null }[] };
    search = { period: so.period ? `${so.period.startDate}〜${so.period.endDate}` : null, clusters: so.clusters.map((c) => ({ label: c.label, top10: c.top10, prevTop10: c.previous?.top10 ?? null, impressions: c.impressions })) };
  } catch { /* 検索の集計が無ければ空 */ }

  return {
    channels: [
      { label: 'note', value: cell('noteRevenue', 'all') },
      { label: 'ココナラ', value: cell('coconalaRevenue', 'all') },
      { label: 'KDP', value: cell('kdpRoyalty', 'all') },
    ],
    // 重点資格に限らず全資格へ振り分ける（product-lineup.json）。行の合計はチャネル別の合計と一致する
    qualifications: (salesByQualification(root, period) as { label: string; value: number }[]).map((q) => ({ label: q.label, value: q.value })),
    site: { indexRatio: cell('indexRatio', 'all'), gscClicks: cell('gscClicks', 'all'), organicUsers: cell('organicUsers', 'all') },
    search,
    period,
    month: period.startDate.slice(0, 7),
    scopes,
    receipts: groups[0]!.rows[0]!.cells.all!.value,
    goal: target ? { value: target.value, direction: target.direction, effectiveDate: target.effectiveDate, reviewDate: target.reviewDate } : null,
    groups,
  };
}
