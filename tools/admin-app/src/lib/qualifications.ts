import { readFileSync } from 'node:fs';

import { summarizeSsotStatus, validateQualificationRegistry } from '../../../../scripts/lib/qualification-registry.mjs';
import { repoPath } from './repo-root';

/**
 * qualifications.ts — `/strategy/qualifications`（read-only）の表示モデル。
 *
 * 資格の一覧と展開状態は `.claude/config/qualification-registry.json`、日程は `exam-calendar.json`、
 * 受験者数は `exam-stats.json` が正本。ここでは三者を id で結んで並べるだけで、値を持たない。
 * 整合の判定は `scripts/lib/qualification-registry.mjs`（check-exam-calendar と同じ実装）。
 */

type StatRow = {
  label?: string;
  applicants?: number | null;
  examinees?: number | null;
  passers?: number | null;
  passRate?: number | null;
  competitionRatio?: number;
};
type Stats = { latest: (StatRow & { year?: string; stage?: string; stages?: Record<string, StatRow> }) | null; note?: string; source?: string };
type CalEvent = { label: string; date: string; kind: string };
type CalExam = { label: string; source?: string; events?: Record<string, CalEvent>; periods?: Record<string, { label: string; window: string }>; note?: string };
type RegistryEntry = { id: string; label: string; family: string; portfolio: string; decision?: { summary: string; ref: string } };

export interface QualificationView {
  id: string;
  label: string;
  family: string;
  portfolio: string;
  decision: { summary: string; ref: string } | null;
  nextEvent: { label: string; date: string; kind: string; daysLeft: number } | null;
  periods: { label: string; window: string }[];
  /** 今年度の確定日（過去を含む）が 1 件以上あるか。無ければ日程が公式で確認できていない */
  hasEvents: boolean;
  scheduleNote: string | null;
  statsYear: string | null;
  statsLines: string[];
  statsNote: string | null;
  statsUnverified: boolean;
  scheduleSource: string | null;
  statsSource: string | null;
  /** 照合状態（summarizeSsotStatus・月次レビューの exam-ssot-status と同じ判定） */
  verification: {
    calendarCheckedAt: string | null;
    statsCheckedAt: string | null;
    selfChecked: boolean;
    actions: string[];
    records: string[];
  };
}

export interface QualificationsView {
  families: Record<string, string>;
  statuses: Record<string, string>;
  eventKinds: Record<string, string>;
  rows: QualificationView[];
  errors: string[];
  today: string;
}

const readConfig = <T,>(name: string): T => JSON.parse(readFileSync(repoPath('.claude', 'config', name), 'utf8')) as T;

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function fmtRow(r: StatRow): string {
  const parts: string[] = [];
  if (r.examinees != null) parts.push(`受験 ${r.examinees.toLocaleString('ja-JP')}人`);
  if (r.passRate != null) parts.push(`合格率 ${r.passRate.toFixed(1)}%`);
  if (r.competitionRatio != null) parts.push(`倍率 ${r.competitionRatio}`);
  if (parts.length === 0 && r.passers != null) parts.push(`合格 ${r.passers.toLocaleString('ja-JP')}人`);
  return parts.join('・') || '公式未掲載';
}

export function loadQualificationsView(): QualificationsView {
  const registry = readConfig<{ families: Record<string, string>; portfolioStatuses: Record<string, string>; qualifications: RegistryEntry[] }>('qualification-registry.json');
  const calendar = readConfig<{ eventKinds: Record<string, string>; exams: Record<string, CalExam> }>('exam-calendar.json');
  const examStats = readConfig<{ exams: Record<string, Stats> }>('exam-stats.json');
  const lineupConfig = readConfig<unknown>('product-lineup.json');
  const errors = validateQualificationRegistry({ registry, calendar, examStats, lineupConfig }) as string[];
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
  type Part = { checkedAt: string; checkedBy: string; pending: string[]; notPublished: string[] } | null;
  const status = new Map(
    (summarizeSsotStatus({ registry, calendar, examStats, today }) as { rows: { id: string; calendar: Part; stats: Part; actions: string[] }[] }).rows.map((r) => [r.id, r]),
  );

  const rows = registry.qualifications.map((q): QualificationView => {
    const cal = calendar.exams[q.id];
    const st = examStats.exams[q.id];
    const upcoming = Object.values(cal?.events ?? {})
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    const latest = st?.latest ?? null;
    const statsLines = !latest
      ? []
      : latest.stages
        ? Object.values(latest.stages).map((r) => `${r.label ?? ''} ${fmtRow(r)}`.trim())
        : [fmtRow(latest)];
    return {
      id: q.id,
      label: q.label,
      family: q.family,
      portfolio: q.portfolio,
      decision: q.decision ?? null,
      nextEvent: upcoming ? { ...upcoming, daysLeft: daysBetween(today, upcoming.date) } : null,
      periods: Object.values(cal?.periods ?? {}),
      hasEvents: Object.keys(cal?.events ?? {}).length > 0,
      scheduleNote: cal?.note ?? null,
      statsYear: latest?.year ?? null,
      statsLines,
      statsNote: st?.note ?? null,
      statsUnverified: !latest,
      scheduleSource: cal?.source ?? null,
      statsSource: st?.source ?? null,
      verification: (() => {
        const v = status.get(q.id);
        return {
          calendarCheckedAt: v?.calendar?.checkedAt ?? null,
          statsCheckedAt: v?.stats?.checkedAt ?? null,
          selfChecked: v?.calendar?.checkedBy === 'self' && v?.stats?.checkedBy === 'self',
          actions: v?.actions ?? [],
          records: [
            ...(v?.calendar?.pending ?? []).map((x) => `日程 発表待ち: ${x}`),
            ...(v?.stats?.pending ?? []).map((x) => `統計 発表待ち: ${x}`),
            ...(v?.calendar?.notPublished ?? []).map((x) => `日程 非公表: ${x}`),
            ...(v?.stats?.notPublished ?? []).map((x) => `統計 非公表: ${x}`),
          ],
        };
      })(),
    };
  });
  return { families: registry.families, statuses: registry.portfolioStatuses, eventKinds: calendar.eventKinds, rows, errors, today };
}
