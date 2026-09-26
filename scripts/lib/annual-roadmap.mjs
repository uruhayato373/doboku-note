/**
 * annual-roadmap.mjs — 年間ロードマップの設定（.claude/config/annual-roadmap.json・期間と買い場の週数）の読み込み・検証と、
 * 試験カレンダー（exam-calendar.json）を月の横軸に並べる計算。描画は管理画面 /plan/roadmap。
 *
 * 公表済みの日付はそのまま置く。期間の後半（翌年の試験期）でまだ日付が出ていない行事は、
 * 昨年度の同じ行事を 1 年ずらした「推定」として返す（保存しない・表示だけ・estimated=true）。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ROADMAP_PATH = '.claude/config/annual-roadmap.json';
const YM = /^\d{4}-(0[1-9]|1[0-2])$/;

export function loadRoadmap(root) {
  return JSON.parse(readFileSync(join(root, ROADMAP_PATH), 'utf8'));
}

/** 期間の月の配列（'YYYY-MM'）。 */
export function monthsOf(period) {
  const out = [];
  let [y, m] = period.start.split('-').map(Number);
  const [ey, em] = period.end.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

/** 設定の検証（期間と買い場の週数だけ）。重点の中身はバックログの [時期:] が正本で、check-backlog-schema が見る。 */
export function validateRoadmap(cfg) {
  const errors = [];
  if (!YM.test(cfg.period?.start ?? '') || !YM.test(cfg.period?.end ?? '') || cfg.period.start > cfg.period.end) errors.push('period の start / end を確認');
  if (!Number.isInteger(cfg.buyWindowWeeks) || cfg.buyWindowWeeks < 1) errors.push('buyWindowWeeks は 1 以上の整数');
  if ('items' in cfg) errors.push('items を置かない（重点はバックログの [時期:] に書く）');
  return errors;
}

const dayMs = 86_400_000;
const toTime = (d) => Date.parse(`${d}T00:00:00Z`);
const shiftYear = (d, n) => `${Number(d.slice(0, 4)) + n}${d.slice(4)}`;

/**
 * 試験カレンダーを期間の横軸に並べる。位置は期間全体に対する 0〜1 の割合。
 * @returns {{ id: string, label: string, marks: {kind:string,label:string,date:string,at:number,estimated:boolean}[], buys: {from:number,to:number,estimated:boolean,fromDate:string,toDate:string,label:string}[] }[]}
 */
export function examTimeline(calendar, ids, period, buyWindowWeeks) {
  const start = toTime(`${period.start}-01`);
  const [ey, em] = period.end.split('-').map(Number);
  const end = Date.UTC(ey, em, 1); // 期間最終月の翌月1日
  const pos = (t) => (t - start) / (end - start);
  const inside = (t) => t >= start && t < end;
  return ids
    .filter((id) => calendar.exams?.[id])
    .map((id) => {
      const exam = calendar.exams[id];
      const marks = [];
      for (const ev of Object.values(exam.events ?? {})) {
        if (!ev?.date) continue;
        for (const [date, estimated] of [[ev.date, false], [shiftYear(ev.date, 1), true]]) {
          const t = toTime(date);
          if (inside(t)) marks.push({ kind: ev.kind, label: ev.label, date, at: pos(t), estimated });
        }
      }
      marks.sort((a, b) => a.at - b.at);
      const buys = marks
        .filter((m) => m.kind === 'exam')
        .map((m) => {
          const t = toTime(m.date);
          const fromT = t - buyWindowWeeks * 7 * dayMs;
          return {
            from: Math.max(0, pos(fromT)), to: m.at, estimated: m.estimated,
            fromDate: new Date(fromT).toISOString().slice(0, 10), toDate: m.date, label: m.label,
          };
        });
      return { id, label: exam.label, marks, buys };
    });
}
