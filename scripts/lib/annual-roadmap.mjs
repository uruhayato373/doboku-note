/**
 * annual-roadmap.mjs — 年間ロードマップ（.claude/config/annual-roadmap.json）の読み込み・検証と、
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

/**
 * 形式の検証。domainIds は領域の正本、backlogIds は今バックログにある ID の集合。
 * done:true の項目はバックログから消えていてよい（完了したカードは削除する運用）。
 */
export function validateRoadmap(cfg, { domainIds, backlogIds }) {
  const errors = [];
  if (!YM.test(cfg.period?.start ?? '') || !YM.test(cfg.period?.end ?? '') || cfg.period.start > cfg.period.end) errors.push('period の start / end を確認');
  if (!Number.isInteger(cfg.buyWindowWeeks) || cfg.buyWindowWeeks < 1) errors.push('buyWindowWeeks は 1 以上の整数');
  const seen = new Set();
  for (const it of cfg.items ?? []) {
    const at = it.id ?? it.label;
    if (!it.id || seen.has(it.id)) errors.push(`${at}: id が無いか重複`);
    seen.add(it.id);
    if (!domainIds.has(it.domain)) errors.push(`${at}: domain ${it.domain} は領域の正本にない`);
    if (!YM.test(it.start ?? '') || !YM.test(it.end ?? '') || it.start > it.end) errors.push(`${at}: start / end は YYYY-MM で start ≦ end`);
    else if (it.start < cfg.period.start || it.end > cfg.period.end) errors.push(`${at}: 期間（${cfg.period.start}〜${cfg.period.end}）の外`);
    if (!it.label?.trim()) errors.push(`${at}: label が無い`);
    if (!it.done) for (const b of it.backlogIds ?? []) if (!backlogIds.has(b)) errors.push(`${at}: ${b} はバックログに無い（完了なら done: true を付けるか ID を外す）`);
  }
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
