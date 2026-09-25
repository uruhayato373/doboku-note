import { readFileSync } from 'node:fs';

import { validateQualificationRegistry } from '../../../../scripts/lib/qualification-registry.mjs';
import { repoPath } from './repo-root';

/**
 * qualifications.ts — `/strategy/qualifications`（read-only・人が見る画面）の表示モデル。
 *
 * 資格の一覧と展開状態は `.claude/config/qualification-registry.json`、日程は `exam-calendar.json`、
 * 受験者数は `exam-stats.json` が正本。ここでは三者を id で結び、画面に要る値だけを短く整形する。
 * 出典・照合記録・未確認の理由は正本と `npm run exam-ssot-status` が持つ（画面には出さない）。
 */

type StatRow = {
  label?: string;
  examinees?: number | null;
  passers?: number | null;
  passRate?: number | null;
  competitionRatio?: number;
};
type Stats = { latest: (StatRow & { year?: string; stages?: Record<string, StatRow> }) | null };
type CalEvent = { label: string; date: string; kind: string };
type CalExam = { events?: Record<string, CalEvent>; periods?: Record<string, { label: string; window: string }> };
type RegistryEntry = { id: string; label: string; family: string; portfolio: string };

export interface QualificationView {
  id: string;
  label: string;
  family: string;
  portfolio: string;
  nextEvent: { label: string; date: string; daysLeft: number } | null;
  periods: { label: string; window: string }[];
  statsYear: string | null;
  statsLines: string[];
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

const readConfig = <T,>(name: string): T => JSON.parse(readFileSync(repoPath('.claude', 'config', name), 'utf8')) as T;

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function fmtRow(name: string, r: StatRow): string | null {
  const parts: string[] = [];
  if (r.examinees != null) parts.push(`${r.examinees.toLocaleString('ja-JP')}人`);
  if (r.passRate != null) parts.push(`${r.passRate.toFixed(1)}%`);
  if (r.competitionRatio != null) parts.push(`倍率${r.competitionRatio}`);
  if (parts.length === 0) return null;
  return [name, ...parts].filter(Boolean).join(' ');
}

export function loadQualificationsView(): QualificationsView {
  const registry = readConfig<{ families: Record<string, string>; portfolioStatuses: Record<string, string>; qualifications: RegistryEntry[] }>('qualification-registry.json');
  const calendar = readConfig<{ exams: Record<string, CalExam> }>('exam-calendar.json');
  const examStats = readConfig<{ exams: Record<string, Stats> }>('exam-stats.json');
  const lineupConfig = readConfig<unknown>('product-lineup.json');
  const errors = validateQualificationRegistry({ registry, calendar, examStats, lineupConfig }) as string[];
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());

  const rows = registry.qualifications.map((q): QualificationView => {
    const cal = calendar.exams[q.id];
    const latest = examStats.exams[q.id]?.latest ?? null;
    const upcoming = Object.values(cal?.events ?? {})
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    const statsLines = !latest
      ? []
      : latest.stages
        ? Object.entries(latest.stages).map(([k, r]) => fmtRow(STAGE_SHORT[k] ?? r.label ?? k, r))
        : [fmtRow('', latest)];
    return {
      id: q.id,
      label: q.label,
      family: q.family,
      portfolio: q.portfolio,
      nextEvent: upcoming ? { label: upcoming.label, date: upcoming.date, daysLeft: daysBetween(today, upcoming.date) } : null,
      periods: Object.values(cal?.periods ?? {}),
      statsYear: latest?.year ?? null,
      statsLines: statsLines.filter((l): l is string => Boolean(l)),
    };
  });
  return { families: registry.families, rows, errors };
}
