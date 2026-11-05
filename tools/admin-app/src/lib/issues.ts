import { addDays, buildReport, reviewPeriod } from '../../../../scripts/lib/business-direction.mjs';
import { readDataset } from '../../../../scripts/lib/dataset-io.mjs';
import { judgmentDue, judgmentTiming, dnTiming, loadDnIndex } from '../../../../scripts/lib/issue-map.mjs';
import { todayJst } from '../../../../scripts/lib/jst-date.mjs';
import { qualificationShortLabel } from '../../../../scripts/lib/qualification-names.mjs';
import { loadRegistry } from '../../../../scripts/lib/qualification-registry.mjs';
import { salesByQualification } from '../../../../scripts/lib/sales-by-qualification.mjs';
import { loadChannelView } from './channels';
import { yen } from './format';
import { findRepoRoot } from './repo-root';

/**
 * issues.ts — `/strategy/issues`（事業イシューマップ・人が見る画面）の表示モデル。
 * 正本は config/issue-map.json。DN の解決は scripts/lib/issue-map.mjs（npm run check-issue-map と同じ実装）、
 * 指標の現在値は事業レポート（buildReport）、受取は channels.ts。値を足さない・推計しない。未計測は null のまま渡す。
 */

export type IssueState = 'seen' | 'open' | 'unknown' | 'decided' | 'estimate';
type MetricRef = { id: string; qualification?: string };
type Leaf = {
  id: string;
  question: string;
  state: IssueState;
  evidence: string;
  next?: string;
  focusMonth?: string;
  dns?: string[];
  metrics?: MetricRef[];
  proposedMetrics?: string[];
  competitors?: string[];
  map?: string;
};
type Cell = { mark: CalendarMark; head?: string; text?: string; dns?: string[] };
export type CalendarMark = 'hot' | 'ok' | 'weak' | 'open' | 'zero' | 'prep' | 'empty';
type Judgment = { issues: string[]; dns?: string[]; window?: string; metrics?: MetricRef[]; picture: string };
export type Stage = {
  title: string;
  lead?: string;
  facts?: { label: string; value?: string; metric?: string }[];
  claim?: string;
  subs?: string[];
  checks?: { state: IssueState; hypothesis: string; evidence: string; sketch: string; judge: string }[];
  implications?: string[];
  forks?: string[];
};
type RawMap = {
  id: string;
  label: string;
  title: string;
  asOf: string;
  parentIssue?: string;
  question: string;
  stance: string;
  criteria: string[];
  branches: { id: string; tag: string; title: string; lead?: string; premise?: boolean; leaves: Leaf[] }[];
  calendar?: {
    columns: { id: string; label: string; sub: string }[];
    rows: { id: string; qualifications?: string[]; label?: string; sub?: string; cells: Cell[] }[];
    notes: string[];
  };
  comparison?: {
    title: string;
    salesFrom: string;
    qualifications: string[];
    rows: { label: string; live?: 'examinees' | 'passRate' | 'sales' | 'salesPerExaminee'; cells?: string[] }[];
    note: string;
  };
  tables?: { title: string; columns: string[]; rows: string[][]; note?: string }[];
  judgments: Judgment[];
  storyline: Stage[];
  notes: { title: string; body: string }[];
  asks?: string;
};
type RawDoc = { proposedMetrics: { id: string; label: string; definition: string; why: string; dn: string }[]; maps: RawMap[] };

/** value は KPI の月の値。その月の値が無ければ、別の期間の最新の値を asOf（その期間の終わり）つきで出す。按分・換算はしない */
export type MetricValue = { key: string; label: string; scope: string | null; unit: string; value: number | null; asOf: string | null };
export type DnRef = { id: string; title: string | null; status: string; label: string };
export type CompetitorLink = { ref: string; label: string; href: string };
export type LeafView = {
  id: string;
  question: string;
  state: IssueState;
  evidence: string;
  next: string | null;
  focus: boolean;
  metrics: MetricValue[];
  dns: DnRef[];
  competitors: CompetitorLink[];
  proposed: string[];
  map: { id: string; label: string } | null;
};
export type JudgmentView = { key: string; issues: string[]; picture: string; timing: DnRef[]; metrics: MetricValue[]; due: string | null };
export type CalendarView = {
  columns: { id: string; label: string; sub: string }[];
  rows: { id: string; label: string; sub: string | null; receiptsYen: number | null; cells: (Omit<Cell, 'dns'> & { dns: DnRef[] })[] }[];
  notes: string[];
};
export type ComparisonView = { title: string; note: string; columns: string[]; rows: { label: string; cells: string[] }[] };
export type ReceiptRow = { month: string; total: number | null; complete: boolean; gap: number | null };

export type IssueView = {
  maps: { id: string; label: string }[];
  map: Omit<RawMap, 'branches' | 'calendar' | 'comparison' | 'judgments'>;
  parent: { mapId: string; issue: string } | null;
  period: { startDate: string; endDate: string };
  branches: { id: string; tag: string; title: string; lead: string | null; premise: boolean; leaves: LeafView[] }[];
  calendar: CalendarView | null;
  comparison: ComparisonView | null;
  judgments: JudgmentView[];
  receipts: { targetYen: number | null; rows: ReceiptRow[] } | null;
  proposed: { id: string; label: string; definition: string; why: string; dn: string }[];
  /** ストーリーラインの facts の metric の現在値 */
  factValues: Record<string, MetricValue>;
};

type Report = {
  strategy: { qualifications: { id: string; label: string }[]; metrics: { id: string; label: string; unit: string }[] };
  cells: { qualification: string; metric: string; value: number | null }[];
  sources: { qualification: string; metric: string; value: number | null; period: { endDate: string } }[];
  observations: { qualification: string; period: { endDate: string }; values: Record<string, number | null> }[];
};
type ExamStat = { examinees?: number | null; passRate?: number | null; stages?: Record<string, { examinees?: number | null; passRate?: number | null }> };

export function loadIssueView(mapId?: string): IssueView {
  const root = findRepoRoot();
  const doc = readDataset(root, 'config.issue-map') as RawDoc;
  const raw = doc.maps.find((m) => m.id === mapId) ?? (doc.maps[0] as RawMap);
  const competitors = readDataset(root, 'config.competitors') as Record<string, { competitors: { handle: string; label: string }[] }>;
  const registry = loadRegistry(root);
  const index = loadDnIndex(root) as Map<string, { id: string; title: string; status: string; due: string | null; when: string | null }>;
  const today = todayJst();
  const month = today.slice(0, 7);
  const period = reviewPeriod('monthly') as { startDate: string; endDate: string };
  const report = buildReport(root, period) as Report;
  const channels = loadChannelView();

  const latestElsewhere = (metric: string, q: string) => {
    // 受取は台帳から月の途中・確定前でも取得分を出す（トップの KPI と同じ）
    if (metric === 'netReceipts' && q === 'all') {
      const m = channels.monthly.find((x) => x.month === period.startDate.slice(0, 7));
      if (m?.total != null) return { value: m.total, asOf: '確定前' };
    }
    const found = [
      ...report.sources.filter((r) => r.metric === metric && r.qualification === q && r.value != null).map((r) => ({ value: r.value as number, end: r.period.endDate })),
      ...report.observations.filter((r) => r.qualification === q && r.values[metric] != null).map((r) => ({ value: r.values[metric] as number, end: r.period.endDate })),
    ].sort((a, b) => b.end.localeCompare(a.end))[0];
    return found ? { value: found.value, asOf: `〜${found.end}` } : null;
  };
  const metricValue = (ref: MetricRef): MetricValue => {
    const meta = report.strategy.metrics.find((m) => m.id === ref.id);
    const q = ref.qualification ?? 'all';
    const cell = report.cells.find((c) => c.metric === ref.id && c.qualification === q);
    const latest = cell?.value == null ? latestElsewhere(ref.id, q) : null;
    return {
      key: `${ref.id}:${q}`,
      label: meta?.label ?? ref.id,
      scope: q === 'all' ? null : (qualificationShortLabel(registry, q) ?? q),
      unit: meta?.unit ?? '',
      value: cell?.value ?? latest?.value ?? null,
      asOf: latest?.asOf ?? null,
    };
  };
  const dnRef = (id: string): DnRef => {
    const dn = index.get(id) ?? null;
    return { id, title: dn?.title ?? null, status: dn?.status ?? 'missing', label: dnTiming(dn).label };
  };
  const competitorLink = (ref: string): CompetitorLink => {
    const [slot, handle] = ref.split(':') as [string, string];
    const label = competitors[slot]?.competitors.find((c) => c.handle === handle)?.label ?? ref;
    const q = new URLSearchParams(slot === 'courses' ? { channel: 'courses', handle } : { handle });
    return { ref, label, href: `/strategy/competitors?${q}` };
  };
  const labelOfQualifications = (ids: string[]) => ids.map((id) => qualificationShortLabel(registry, id) ?? id).join('・');

  const branches = raw.branches.map((b) => ({
    id: b.id,
    tag: b.tag,
    title: b.title,
    lead: b.lead ?? null,
    premise: b.premise ?? false,
    leaves: b.leaves.map((l) => {
      const linked = l.map ? doc.maps.find((m) => m.id === l.map) : null;
      return {
        id: l.id,
        question: l.question,
        state: l.state,
        evidence: l.evidence,
        next: l.next ?? null,
        focus: l.focusMonth === month,
        metrics: (l.metrics ?? []).map(metricValue),
        dns: (l.dns ?? []).map(dnRef),
        competitors: (l.competitors ?? []).map(competitorLink),
        proposed: (l.proposedMetrics ?? []).map((id) => doc.proposedMetrics.find((p) => p.id === id)?.label ?? id),
        map: linked ? { id: linked.id, label: linked.label } : null,
      };
    }),
  }));

  const judgments: JudgmentView[] = raw.judgments.map((j, i) => ({
    key: `${i}`,
    issues: j.issues,
    picture: j.picture,
    timing: (judgmentTiming(j, index) as (DnRef & { id: string | null })[]).map((t) => ({ ...t, id: t.id ?? '' })),
    metrics: (j.metrics ?? []).map(metricValue),
    due: judgmentDue(j, index, today) as string | null,
  }));

  const netOf = new Map(channels.byQualification.map((q) => [q.id, q.note + q.kindle + q.coconala]));
  const calendar: CalendarView | null = raw.calendar
    ? {
        columns: raw.calendar.columns,
        notes: raw.calendar.notes,
        rows: raw.calendar.rows.map((r) => {
          const ids = r.qualifications ?? [];
          return {
            id: r.id,
            label: r.label ?? labelOfQualifications(ids),
            sub: r.sub ?? null,
            receiptsYen: ids.length ? ids.reduce((sum, id) => sum + (netOf.get(id) ?? 0), 0) : null,
            cells: r.cells.map((c) => ({ ...c, dns: (c.dns ?? []).map(dnRef) })),
          };
        }),
      }
    : null;

  let comparison: ComparisonView | null = null;
  if (raw.comparison) {
    const c = raw.comparison;
    const stats = readDataset(root, 'config.exam-stats') as { exams: Record<string, { latest: ExamStat | null }> };
    const sales = salesByQualification(root, { startDate: c.salesFrom, endDate: addDays(today, -1) }) as { id: string; value: number }[];
    const stat = (id: string) => {
      const latest = stats.exams[id]?.latest ?? null;
      return latest?.stages?.second ?? latest;
    };
    const salesOf = (id: string) => sales.find((s) => s.id === id)?.value ?? null;
    const perExaminee = (id: string) => {
      const n = stat(id)?.examinees;
      const s = salesOf(id);
      return n && s != null ? s / n : null;
    };
    const live = {
      examinees: (id: string) => stat(id)?.examinees?.toLocaleString('ja-JP') ?? '—',
      passRate: (id: string) => (stat(id)?.passRate != null ? `${stat(id)?.passRate}%` : '—'),
      sales: (id: string) => yen(salesOf(id)),
      salesPerExaminee: (id: string) => {
        const v = perExaminee(id);
        return yen(v == null ? null : v >= 10 ? Math.round(v) : Math.round(v * 10) / 10);
      },
    };
    comparison = {
      title: c.title,
      note: c.note,
      columns: c.qualifications.map((id) => qualificationShortLabel(registry, id) ?? id),
      rows: c.rows.map((r) => ({ label: r.label, cells: r.live ? c.qualifications.map(live[r.live]) : (r.cells as string[]) })),
    };
  }

  const target = channels.kgi.targetYen ?? null;
  const receipts =
    raw.id === 'overall'
      ? {
          targetYen: target,
          rows: channels.monthly
            .filter((m) => m.total != null)
            .map((m) => ({ month: m.month, total: m.total, complete: m.complete, gap: m.total != null && target != null ? m.total - target : null })),
        }
      : null;

  const usedProposed = new Set(raw.branches.flatMap((b) => b.leaves.flatMap((l) => l.proposedMetrics ?? [])));
  const factValues: Record<string, MetricValue> = {};
  for (const s of raw.storyline) for (const f of s.facts ?? []) if (f.metric) factValues[f.metric] = metricValue({ id: f.metric });

  const parentMap = raw.parentIssue ? doc.maps.find((m) => m.branches.some((b) => b.leaves.some((l) => l.id === raw.parentIssue))) : null;
  const { branches: _b, calendar: _c, comparison: _d, judgments: _j, ...head } = raw;
  void _b, _c, _d, _j;
  return {
    maps: doc.maps.map((m) => ({ id: m.id, label: m.label })),
    map: head,
    parent: parentMap && raw.parentIssue ? { mapId: parentMap.id, issue: raw.parentIssue } : null,
    period,
    branches,
    calendar,
    comparison,
    judgments,
    receipts,
    proposed: doc.proposedMetrics.filter((p) => usedProposed.has(p.id)),
    factValues,
  };
}
