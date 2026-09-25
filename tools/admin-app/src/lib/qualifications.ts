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
 * 区分（一次・二次など）のキーは exam-calendar の events と exam-stats の stages で共通なので、
 * 区分ごとに試験日・合格発表・受験者数・合格率を 1 行に揃える。
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
type Latest = StatRow & { year?: string; stage?: string; stages?: Record<string, StatRow> };
type CalEvent = { label: string; date: string; kind: string };
type CalExam = { events?: Record<string, CalEvent>; periods?: Record<string, { label: string; window: string }> };
type RegistryEntry = { id: string; label: string; family: string; portfolio: string };

/** 区分（一次・二次など）ごとの 1 行。試験日・合格発表・受験者数・合格率を横に揃える。 */
export interface StageLine {
  stage: string;
  exam: { date: string; past: boolean } | null;
  /** 試験日が期間でしか発表されていないときの文言 */
  examWindow?: string;
  /** date が null のときは window（日付未発表の期間の文言） */
  result: { date: string | null; window?: string; past: boolean } | null;
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
  lines: StageLine[];
  /** 並べ替え用の受験者数（区分が複数あれば最も多い区分。同じ人の二重計上を避けるため合計しない） */
  examineesMax: number | null;
}

export interface QualificationsView {
  families: Record<string, string>;
  rows: QualificationView[];
  errors: string[];
}

/** 区分キー（exam-calendar の events と exam-stats の stages で共通）と画面用の短い名前。この順で並べる。 */
const STAGES: [string, string][] = [
  ['firstEarly', '一次前期'],
  ['firstLate', '一次後期'],
  ['first', '一次'],
  ['second', '二次'],
  ['written', '筆記'],
  ['final', '最終'],
];
/** 区分が無い資格で、試験日として採るイベントの優先順。 */
const MAIN_EXAM_KEYS = ['exam', 'written', 'cbtStart', 'training'];

/** 画面で 1 行にまとめる技術士第二次の部門（総監・第一次を除く）。 */
const PE_SEPARATE = new Set(['pe-first-stage', 'pe-comprehensive-management']);
const isPeDivision = (q: RegistryEntry) => q.family === 'professional-engineer' && !PE_SEPARATE.has(q.id);

/** 期間の文言を画面用に短くする（例: 2027年2月（日付未発表）→ 2月予定、2026年9月末日（予定）→ 9月末日予定）。 */
function shortWindow(w: string): string {
  const m = w.match(/^\d{4}年(\d{1,2}月[^（(]*)[（(](?:日付未発表|予定)[）)]$/);
  return m ? `${m[1]}予定` : w;
}

const readConfig = <T,>(name: string): T => JSON.parse(readFileSync(repoPath('.claude', 'config', name), 'utf8')) as T;

const fmtCount = (r: StatRow | null | undefined) => (r?.examinees != null ? `${r.examinees.toLocaleString('ja-JP')}人` : '—');
const fmtRate = (r: StatRow | null | undefined) =>
  r?.passRate != null ? `${r.passRate.toFixed(1)}%` : r?.competitionRatio != null ? `倍率 ${r.competitionRatio}` : '—';

function stageLines(cal: CalExam | undefined, latest: Latest | null, today: string): StageLine[] {
  const events = cal?.events ?? {};
  const at = (e: CalEvent | undefined) => (e ? { date: e.date, past: e.date < today } : null);
  // 区分の統計: stages があればそのキー、無ければ latest.stage（final・written）が一致する区分に置く
  const statFor = (k: string) => latest?.stages?.[k] ?? (latest && !latest.stages && latest.stage === k ? latest : undefined);
  // 日付が期間でしか発表されていない区分（実技・口頭など）は、区分キーで始まる periods の文言を出す
  const periodFor = (k: string) => Object.entries(cal?.periods ?? {}).find(([pk]) => pk.startsWith(k))?.[1];
  const staged = STAGES.filter(([k]) => k in events || `${k}Result` in events || statFor(k));
  if (staged.length > 0) {
    return staged.map(([k, name]) => ({
      stage: name,
      exam: at(events[k]),
      examWindow: events[k] ? undefined : (w => w && shortWindow(w))(periodFor(k)?.window),
      result: at(events[`${k}Result`]),
      examinees: fmtCount(statFor(k)),
      rate: fmtRate(statFor(k)),
    }));
  }
  // 区分が無い資格は 1 行。合格発表は次の予定（無ければ今年度で最後）、日付未発表なら期間の文言。
  const examKey = MAIN_EXAM_KEYS.find((k) => k in events);
  const results = Object.values(events).filter((e) => e.kind === 'result').sort((a, b) => a.date.localeCompare(b.date));
  const nextResult = results.find((e) => e.date >= today);
  const period = Object.entries(cal?.periods ?? {}).find(([k]) => /result/i.test(k))?.[1];
  return [
    {
      stage: '',
      exam: at(examKey ? events[examKey] : undefined),
      result: nextResult ? at(nextResult) : period ? { date: null, window: shortWindow(period.window), past: false } : at(results.at(-1)),
      examinees: fmtCount(latest),
      rate: fmtRate(latest),
    },
  ];
}

export function loadQualificationsView(): QualificationsView {
  const registry = readConfig<{ families: Record<string, string>; qualifications: RegistryEntry[] }>('qualification-registry.json');
  const calendar = readConfig<{ exams: Record<string, CalExam> }>('exam-calendar.json');
  const examStats = readConfig<{ exams: Record<string, { latest: Latest | null }>; peSecondaryDivisions: Record<string, { totals?: { excludingCem20?: StatRow } }> }>('exam-stats.json');
  const lineupConfig = readConfig<unknown>('product-lineup.json');
  const errors = validateQualificationRegistry({ registry, calendar, examStats, lineupConfig }) as string[];
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());

  const view = (q: RegistryEntry, latest: Latest | null): QualificationView => {
    const counts = (latest?.stages ? Object.values(latest.stages) : latest ? [latest] : [])
      .map((r) => r.examinees)
      .filter((n): n is number => typeof n === 'number');
    return {
      id: q.id,
      label: q.label,
      family: q.family,
      portfolio: q.portfolio,
      portfolioNote: null,
      lines: stageLines(calendar.exams[q.id], latest, today),
      examineesMax: counts.length ? Math.max(...counts) : null,
    };
  };

  const rows: QualificationView[] = [];
  const divisions = registry.qualifications.filter(isPeDivision);
  for (const q of registry.qualifications) {
    if (isPeDivision(q)) {
      if (q !== divisions[0]) continue;
      // 総監以外の部門を 1 行に。日程は代表（展開中の部門、無ければ先頭）から、統計は 20 部門合計。
      const lead = divisions.find((d) => d.portfolio === 'active') ?? divisions[0]!;
      const year = examStats.exams[lead.id]?.latest?.year ?? null;
      const total = year ? examStats.peSecondaryDivisions[year]?.totals?.excludingCem20 ?? null : null;
      const active = divisions.filter((d) => d.portfolio === 'active');
      rows.push({
        ...view(lead, total ? { ...total, stage: 'final' } : null),
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
