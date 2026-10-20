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

/** 試験日の前（当日を含む）なら「M/Dの本試験前に、」を前に付け、翌日からは text だけを返す */
export function beforeExamCatch(examId: string, eventId: string, text: string, now: number = Date.now()): string {
  if (now > examDayEndUtcMs(examId, eventId)) return text;
  const [, month, day] = eventDate(examId, eventId).split('-').map(Number);
  return `${month}/${day}の本試験前に、${text}`;
}
