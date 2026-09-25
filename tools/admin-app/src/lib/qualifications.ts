import { readFileSync } from 'node:fs';

import { validateQualificationRegistry } from '../../../../scripts/lib/qualification-registry.mjs';
import { repoPath } from './repo-root';

/**
 * qualifications.ts — `/strategy/qualifications`（read-only・人が見る画面）の表示モデル。
 *
 * 資格の一覧と展開状態は `.claude/config/qualification-registry.json`、日程は `exam-calendar.json`、
 * 受験者数は `exam-stats.json` が正本。ここでは三者を id で結び、画面に要る値だけを短く整形する。
 * 出典・照合記録・未確認の理由は正本と `npm run exam-ssot-status` が持つ（画面には出さない）。
 *
 * 技術士第二次の総監以外の部門は日程が共通なので、画面では 1 行にまとめる（正本は部門ごとのまま）。
 * 受験者数・合格率は部門別表の 20 部門合計（peSecondaryDivisions.<年度>.totals.excludingCem20）。
 */

type StatRow = {
  label?: string;
  examinees?: number | null;
  passers?: number | null;
  passRate?: number | null;
  competitionRatio?: number;
};
type Latest = StatRow & { year?: string; stages?: Record<string, StatRow> };
type CalEvent = { label: string; date: string; kind: string };
type CalExam = { events?: Record<string, CalEvent>; periods?: Record<string, { label: string; window: string }> };
type RegistryEntry = { id: string; label: string; family: string; portfolio: string };

export interface StatLine {
  stage: string;
  examinees: string;
  rate: string;
}

export interface QualificationView {
  id: string;
  label: string;
  family: string;
  portfolio: string;
  /** 状態の補足（まとめた行で一部だけ展開中など） */
  portfolioNote: string | null;
  exam: { date: string; label: string; past: boolean } | null;
  result: { date: string | null; label: string; past: boolean } | null;
  statsYear: string | null;
  stats: StatLine[];
}

export interface QualificationsView {
  families: Record<string, string>;
  rows: QualificationView[];
  errors: string[];
}

/** exam-stats の段階キー → 画面用の短い名前（正本の label は説明込みで長いため）。 */
const STAGE_SHORT: Record<string, string> = {
  first: '一次',
  firstEarly: '一次前期',
  firstLate: '一次後期',
  second: '二次',
  written: '筆記',
  final: '最終',
  all: '',
};

/** 画面で 1 行にまとめる技術士第二次の部門（総監・第一次を除く）。 */
const PE_SEPARATE = new Set(['pe-first-stage', 'pe-comprehensive-management']);
const isPeDivision = (q: RegistryEntry) => q.family === 'professional-engineer' && !PE_SEPARATE.has(q.id);

const readConfig = <T,>(name: string): T => JSON.parse(readFileSync(repoPath('.claude', 'config', name), 'utf8')) as T;

function statLines(latest: Latest | null): StatLine[] {
  if (!latest) return [];
  const rows = latest.stages ? Object.entries(latest.stages).map(([k, r]) => [STAGE_SHORT[k] ?? r.label ?? k, r] as const) : [['', latest] as const];
  return rows
    .map(([stage, r]) => ({
      stage,
      examinees: r.examinees != null ? `${r.examinees.toLocaleString('ja-JP')}人` : '—',
      rate: r.passRate != null ? `${r.passRate.toFixed(1)}%` : r.competitionRatio != null ? `倍率 ${r.competitionRatio}` : '—',
    }))
    .filter((l) => l.examinees !== '—' || l.rate !== '—');
}

/** 次の該当イベント（無ければ今年度で最後のもの）。 */
function pick(events: CalEvent[], today: string): { date: string; label: string; past: boolean } | null {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const next = sorted.find((e) => e.date >= today);
  const e = next ?? sorted.at(-1);
  return e ? { date: e.date, label: e.label, past: !next } : null;
}

export function loadQualificationsView(): QualificationsView {
  const registry = readConfig<{ families: Record<string, string>; qualifications: RegistryEntry[] }>('qualification-registry.json');
  const calendar = readConfig<{ exams: Record<string, CalExam> }>('exam-calendar.json');
  const examStats = readConfig<{ exams: Record<string, { latest: Latest | null }>; peSecondaryDivisions: Record<string, { totals?: { excludingCem20?: StatRow } }> }>('exam-stats.json');
  const lineupConfig = readConfig<unknown>('product-lineup.json');
  const errors = validateQualificationRegistry({ registry, calendar, examStats, lineupConfig }) as string[];
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());

  const view = (q: RegistryEntry, latest: Latest | null): QualificationView => {
    const cal = calendar.exams[q.id];
    const events = Object.values(cal?.events ?? {});
    const result = pick(events.filter((e) => e.kind === 'result'), today);
    const resultPeriod = Object.entries(cal?.periods ?? {}).find(([k]) => /result/i.test(k))?.[1];
    return {
      id: q.id,
      label: q.label,
      family: q.family,
      portfolio: q.portfolio,
      portfolioNote: null,
      exam: pick(events.filter((e) => e.kind === 'exam'), today),
      result: result && !result.past ? result : resultPeriod ? { date: null, label: `${resultPeriod.label} ${resultPeriod.window}`, past: false } : result,
      statsYear: latest?.year ?? null,
      stats: statLines(latest),
    };
  };

  const rows: QualificationView[] = [];
  const divisions = registry.qualifications.filter(isPeDivision);
  for (const q of registry.qualifications) {
    if (isPeDivision(q)) {
      if (q !== divisions[0]) continue;
      // 総監以外の部門を 1 行に。日程は代表（展開中の部門、無ければ先頭）から、統計は 20 部門合計。
      const lead = divisions.find((d) => d.portfolio === 'active') ?? divisions[0]!;
      const leadLatest = examStats.exams[lead.id]?.latest ?? null;
      const year = leadLatest?.year ?? null;
      const total = year ? examStats.peSecondaryDivisions[year]?.totals?.excludingCem20 ?? null : null;
      const active = divisions.filter((d) => d.portfolio === 'active');
      rows.push({
        ...view(lead, total ? { ...total, year: year ?? undefined } : null),
        id: 'pe-secondary-divisions',
        label: '技術士 第二次（総監以外の20部門）',
        portfolio: active.length ? 'active' : 'candidate',
        portfolioNote: active.length ? `${active.map((d) => d.label.replace('技術士 ', '')).join('・')}のみ` : null,
      });
      continue;
    }
    rows.push(view(q, examStats.exams[q.id]?.latest ?? null));
  }
  return { families: registry.families, rows, errors };
}
