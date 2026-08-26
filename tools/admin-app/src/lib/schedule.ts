import { findRepoRoot } from './repo-root';
// schedule-events.mjs / jst-date.mjs は .d.ts を持たないが、allowJs の JSDoc 推論で
// 型は解決できるため @ts-expect-error は不要（todo.ts の backlog-lib.mjs import と同じ扱い）。
// 戻り値は下の interface へ手動で当て直す（アダプタ層のここだけの責務）。
import {
  collectScheduleEvents as collectScheduleEventsImpl,
  buildMonthMatrix as buildMonthMatrixImpl,
  groupByDay as groupByDayImpl,
  summarize as summarizeImpl,
  weekdayLabel as weekdayLabelImpl,
} from '../../../../scripts/lib/schedule-events.mjs';
import { todayJst as todayJstImpl } from '../../../../scripts/lib/jst-date.mjs';

/**
 * schedule.ts — admin `/schedule` 用アダプタ（読み取り専用）。
 *
 * 写像ロジックは一切ここに書かない。集約は scripts/lib/schedule-events.mjs の
 * collectScheduleEvents が唯一の実装（パーサ二重実装禁止・CLAUDE.md「全体の制約」）。
 * ここはフィルタ（月）と型付けだけを行うアダプタに徹する。
 */

export type ScheduleChannel = 'exam' | 'x' | 'instagram' | 'youtube' | 'todo';
export type ScheduleKind = 'exam' | 'post' | 'plan-slot' | 'todo-due';
export type ScheduleStatus = 'planned' | 'reserved' | 'posted' | 'overdue';
export type ScheduleSourceId =
  | 'exam-calendar'
  | 'x-campaign'
  | 'x-status'
  | 'ig-status'
  | 'youtube-schedule'
  | 'backlog';

export interface ScheduleEventView {
  id: string;
  date: string;
  time: string | null;
  channel: ScheduleChannel;
  kind: ScheduleKind;
  status: ScheduleStatus;
  label: string;
  detail: string | null;
  sourceId: ScheduleSourceId;
  sourcePath: string;
  ref: string;
}

export interface SourceReportView {
  id: ScheduleSourceId;
  label: string;
  path: string;
  ok: boolean;
  count: number;
  dateless: number;
  legacy: number;
  errors: Array<{ path: string; message: string }>;
}

export interface ScheduleBoard {
  /** 指定月にフィルタ済みのイベント（月グリッド・日別ドリルダウン用）。 */
  events: ScheduleEventView[];
  /**
   * 全期間（未フィルタ）のイベント。YouTube の超過は特定の月に属さない横断の懸念（DN-0131）
   * なので、健全性ストリップ・超過一覧カードの YouTube 集計だけはここから計算する。
   */
  allEvents: ScheduleEventView[];
  sources: SourceReportView[];
  generatedAt: string;
}

/** 月表示補助。純関数（fs 禁止）を schedule-events.mjs からそのまま素通しする。 */
export function buildMonthMatrix(monthKey: string): (string | null)[][] {
  return buildMonthMatrixImpl(monthKey) as (string | null)[][];
}

export function groupByDay(events: ScheduleEventView[]): Map<string, ScheduleEventView[]> {
  return groupByDayImpl(events) as Map<string, ScheduleEventView[]>;
}

export function summarize(events: ScheduleEventView[]): Record<string, Record<string, number>> {
  return summarizeImpl(events) as Record<string, Record<string, number>>;
}

export function weekdayLabel(dateKey: string): string {
  return weekdayLabelImpl(dateKey) as string;
}

/** JST の「今日」（'YYYY-MM-DD'）。日付ロジックの真実源は scripts/lib/jst-date.mjs。 */
export function todayJst(): string {
  return todayJstImpl() as string;
}

/**
 * 指定月（'YYYY-MM'）のスケジュールを集約する。
 * ソース健全性（sources）は月フィルタ前の全期間の値をそのまま返す
 * （schedule-view.mjs CLI と同じ設計＝健全性は「ソース全体」の話、月は「見る範囲」の話）。
 */
export async function scheduleBoard(month: string): Promise<ScheduleBoard> {
  const { events, sources, generatedAt } = (await collectScheduleEventsImpl(findRepoRoot())) as {
    events: ScheduleEventView[];
    sources: SourceReportView[];
    generatedAt: string;
  };
  const monthEvents = events.filter((e) => e.date.startsWith(month));
  return { events: monthEvents, allEvents: events, sources, generatedAt };
}
