import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildReport, records, reviewPeriod } from '../../../../scripts/lib/business-direction.mjs';
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

type IndexEntry = { date: string; indexed_ratio: number; batch_file?: string };
type InspectRow = { url: string; index?: { verdict?: string } };

/** 期間の末日以前で最新のインデックス検査から、全体と資格別（/exam/<id>/ 配下）の登録率を出す。 */
function indexRatios(root: string, endDate: string, scopes: Scope[]): Record<string, number | null> {
  const out: Record<string, number | null> = Object.fromEntries(scopes.map((s) => [s.id, null]));
  const histPath = join(root, '.claude/state/metrics/gsc/index-coverage-history.json');
  if (!existsSync(histPath)) return out;
  const entries = (JSON.parse(readFileSync(histPath, 'utf8')).entries ?? []) as IndexEntry[];
  const latest = entries.filter((e) => e.date <= endDate).sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  if (!latest) return out;
  out.all = latest.indexed_ratio;
  const batchPath = latest.batch_file ? join(root, '.claude/state/metrics/url-inspection', latest.batch_file) : '';
  if (!batchPath || !existsSync(batchPath)) return out;
  const batch = JSON.parse(readFileSync(batchPath, 'utf8'));
  const rows = (Array.isArray(batch) ? batch : batch.results ?? []) as InspectRow[];
  for (const s of scopes) {
    if (s.id === 'all') continue;
    const mine = rows.filter((r) => r.url.includes(`/exam/${s.id}/`));
    if (mine.length) out[s.id] = mine.filter((r) => r.index?.verdict === 'PASS').length / mine.length;
  }
  return out;
}

export function loadKpiView(month?: string): KpiView {
  const root = findRepoRoot();
  const period = kpiPeriod(month);
  const report = buildReport(root, period) as {
    strategy: { qualifications: Scope[]; metrics: { id: string; label: string; unit: string }[] };
    cells: { qualification: string; metric: string; value: number | null; coverage: string; applicable: boolean }[];
  };
  const scopes: Scope[] = [{ id: 'all', label: '全体' }, ...report.strategy.qualifications.map((q) => ({ id: q.id, label: q.label }))];
  const idx = indexRatios(root, period.endDate, scopes);
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

  return {
    period,
    month: period.startDate.slice(0, 7),
    scopes,
    receipts: groups[0]!.rows[0]!.cells.all!.value,
    goal: target ? { value: target.value, direction: target.direction, effectiveDate: target.effectiveDate, reviewDate: target.reviewDate } : null,
    groups,
  };
}
