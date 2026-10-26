/**
 * 試験日程（config/exam-calendar.json）から CTA が使う時刻と文言を作る（DN-0795）。
 * hub-cta の直前期の切り替えと offsite-cta の「◯/◯の本試験前に」を、日付の直書きでなくここから引く。
 * 試験日程は 1 年分しか持たないので、試験日を過ぎたら日付を含まない文言に戻す（作るだけでは試験後にまた古くなる）。
 */
import examCalendar from '../../config/exam-calendar.json';

type Calendar = { exams: Record<string, { events: Record<string, { date?: string }> }> };
const CALENDAR = examCalendar as unknown as Calendar;

function eventDate(examId: string, eventId: string): string {
  const date = CALENDAR.exams[examId]?.events[eventId]?.date;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`試験日程（config.exam-calendar）に ${examId}.${eventId} の日付が無い`);
  }
  return date;
}

/** 試験日の終わり（JST 23:59:59）の UTC ミリ秒 */
export function examDayEndUtcMs(examId: string, eventId: string): number {
  return Date.parse(`${eventDate(examId, eventId)}T23:59:59+09:00`);
}

/** 試験日の翌日以降か（試験日の終わり JST 23:59:59 を過ぎたか）。直前向けの商品・文言をやめる境目に使う */
export function isAfterExamDay(examId: string, eventId: string, now: number = Date.now()): boolean {
  return now > examDayEndUtcMs(examId, eventId);
}

/**
 * ココナラ添削の受付を締める日は、試験日の 4 日前。
 * 納品まで 48 時間かかるので、受付の締めの日に頼んだ答案が試験日の 2 日前（締めの 2 日後）に戻り、
 * 戻った答案を読み直して直す 1 日を試験の前に残せる。
 * 例: 試験が 11/29 なら 11/25（水）受付まで・11/27 納品。
 */
const TENSAKU_CLOSE_DAYS_BEFORE_EXAM = 4;

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

/**
 * text の後ろに「M/D（曜）までの受付なら、M/Dの本試験に間に合います。」を付ける。
 * 受付の締めの日が過ぎたら（試験日の前でも）付けない。間に合うと言えなくなるため。
 */
export function withTensakuDeadline(examId: string, eventId: string, text: string, now: number = Date.now()): string {
  const [year, month, day] = eventDate(examId, eventId).split('-').map(Number) as [number, number, number];
  const close = new Date(Date.UTC(year, month - 1, day - TENSAKU_CLOSE_DAYS_BEFORE_EXAM));
  const closeEndMs = Date.parse(`${close.toISOString().slice(0, 10)}T23:59:59+09:00`);
  if (now > closeEndMs) return text;
  return `${text}${close.getUTCMonth() + 1}/${close.getUTCDate()}（${WEEKDAYS[close.getUTCDay()]}）までの受付なら、${month}/${day}の本試験に間に合います。`;
}

/** 試験日の前（当日を含む）なら「M/Dの本試験前に、」を前に付け、翌日からは text だけを返す */
export function beforeExamCatch(examId: string, eventId: string, text: string, now: number = Date.now()): string {
  if (now > examDayEndUtcMs(examId, eventId)) return text;
  const [, month, day] = eventDate(examId, eventId).split('-').map(Number);
  return `${month}/${day}の本試験前に、${text}`;
}
