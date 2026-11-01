/**
 * revenue-calendar.mjs — 試験日から「制作の開始・CTA の切り替え・販売の山・判定」の日付を出す（DN-0931）
 * 設定: config/revenue-calendar.json（試験の何週前・何日後）。試験日: config/exam-calendar.json（正本）。
 * 純関数（fs 禁止）。schedule-events.mjs が collectScheduleEvents に束ねる（日付の出し方はここだけ）。
 * 試験日が過ぎている（次の試験日が未発表）の起点は日付を推測せず pending に積む。
 */
import { qualificationShortLabel } from './qualification-names.mjs';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

/** 'YYYY-MM-DD' に日数を足す（暦日の計算なのでタイムゾーンに依らない） */
export function addDays(ymd, days) {
  return new Date(Date.parse(`${ymd}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** 設定 1 件と試験日から 5 つの節目を出す */
export function phasesFor(target, examDate) {
  const w = (n) => addDays(examDate, -7 * n);
  return [
    { phase: 'production-start', date: w(target.productionStartWeeks), label: '制作の開始', detail: `試験の ${target.productionStartWeeks} 週前` },
    { phase: 'cta-switch', date: w(target.ctaSwitchWeeks), label: 'サイトの CTA と note 導線の切り替え', detail: `試験の ${target.ctaSwitchWeeks} 週前` },
    { phase: 'peak-start', date: w(target.peakFromWeeks), label: '販売の山 開始', detail: `試験の ${target.peakFromWeeks} 週前〜${target.peakToWeeks} 週前` },
    { phase: 'peak-end', date: w(target.peakToWeeks), label: '販売の山 終了', detail: `試験の ${target.peakToWeeks} 週前` },
    { phase: 'judgment', date: addDays(examDate, target.judgmentDaysAfter), label: '判定（売上の山と原因を見る）', detail: `試験の ${target.judgmentDaysAfter} 日後` },
  ];
}

/**
 * @param {object} config revenue-calendar.json
 * @param {object} examCalendar exam-calendar.json
 * @param {string} relPath 設定の repo 相対パス
 * @param {string} todayKey 'YYYY-MM-DD'（JST）
 * @param {object} registry qualification-registry.json（資格の名前は registry から引く）
 * @returns {{events: object[], pending: {ref: string, label: string, reason: string}[], errors: {path: string, message: string}[]}}
 *   試験日が今日より前 = 次の試験日が未発表（pending）。起点の資格・イベントが無い設定は errors（黙って捨てない）
 */
export function mapRevenueCalendar(config, examCalendar, relPath, todayKey, registry) {
  const events = [];
  const pending = [];
  const errors = [];
  for (const t of config?.targets ?? []) {
    const ref = `${t.qualification}/${t.examEvent}`;
    const label = `${qualificationShortLabel(registry ?? {}, t.qualification)} ${examCalendar?.exams?.[t.qualification]?.events?.[t.examEvent]?.label ?? t.examEvent}`;
    const ev = examCalendar?.exams?.[t.qualification]?.events?.[t.examEvent];
    if (!ev || typeof ev.date !== 'string' || !YMD_RE.test(ev.date)) {
      errors.push({ path: relPath, message: `${ref}: exam-calendar に起点の日付が無い` });
      continue;
    }
    if (ev.date < todayKey) {
      pending.push({ ref, label, reason: `登録済みの試験日 ${ev.date} は過去。次回の試験日は公式未発表（exam-calendar へ公式発表後に登録）` });
      continue;
    }
    for (const p of phasesFor(t, ev.date)) {
      events.push({
        id: `revenue-calendar:${ref}:${p.phase}`,
        date: p.date,
        time: null,
        channel: 'revenue',
        kind: 'check',
        status: 'planned',
        label: `${label} ${p.label}`,
        detail: `${p.detail}（試験日 ${ev.date}）`,
        sourceId: 'revenue-calendar',
        sourcePath: relPath,
        ref: `${ref}:${p.phase}`,
      });
    }
  }
  return { events, pending, errors };
}
