/**
 * review-week.mjs — 週次レビューの「回」（レビューの週・ISO 週 YYYY-Www）と、その回が振り返る期間（前の月曜〜日曜）の換算。
 * 依存ゼロ（SessionStart フックと npm ci をしない workflow からも読む）。
 *
 * なぜ 1 か所に置くか: 換算が business-direction・review-wiring・管理画面・check-weekly-review・check-weekly-review-due・
 * build-weekly-review-draft の 6 か所に別々に書かれ、管理画面は「振り返った期間」、レポートは「レビューの週」で
 * 呼ぶずれが起きた（2026-10-10。W41 のレビューが画面では「09/28〜10/04」と出ていた）。
 *
 * 用語:
 *   回（run）＝レビューの週。docs/reviews/weekly/<回>-review.md のファイル名と同じ（例 2026-W41＝10/05〜10/11）
 *   振り返り期間（window）＝その回が読む前の完了週（例 W41 の窓は 2026-W40＝09/28〜10/04）。事業レビュー記録の period
 */

const DAY = 86_400_000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 'YYYY-MM-DD' に n 日足す（UTC の暦日として数える） */
export function addDays(day, n) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
}

/** ISO 8601 の週キー（'2026-09-14' → '2026-W38'）。月曜始まり・木曜が属する年が ISO 年 */
export function isoWeekKey(day) {
  if (!DAY_RE.test(String(day))) throw new Error(`日付が不正です（${day}）`);
  const t = new Date(`${day}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / DAY + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}

/** 週キーの月〜日（'2026-W38' → { startDate: '2026-09-14', endDate: '2026-09-20' }） */
export function weekPeriod(key) {
  const m = /^(\d{4})-W(\d{2})$/.exec(String(key));
  if (!m) throw new Error(`週キーが不正です（YYYY-Www・${key}）`);
  const jan4 = Date.UTC(+m[1], 0, 4);
  const monday = jan4 - ((new Date(jan4).getUTCDay() || 7) - 1) * DAY + (+m[2] - 1) * 7 * DAY;
  const startDate = new Date(monday).toISOString().slice(0, 10);
  return { startDate, endDate: addDays(startDate, 6) };
}

/** 回（レビューの週）が振り返る期間＝その前の月曜〜日曜（'2026-W41' → 09-28〜10-04） */
export function reviewWindowOfWeek(key) {
  const { startDate } = weekPeriod(key);
  return { startDate: addDays(startDate, -7), endDate: addDays(startDate, -1) };
}

/** 振り返り期間から回（レビューの週）＝期間の翌日が属する週（09-28〜10-04 → '2026-W41'） */
export function reviewWeekOfWindow(period) {
  return isoWeekKey(addDays(period.endDate, 1));
}

/** 今日（JST の YYYY-MM-DD）を含む回 */
export const reviewWeekOfDay = (day) => isoWeekKey(day);

/** 画面・レポートでの呼び方: 'W41（10/05〜10/11）' と '振り返り 09/28〜10/04' */
export function reviewWeekLabel(key) {
  const p = weekPeriod(key);
  const md = (d) => d.slice(5).replace('-', '/');
  const w = reviewWindowOfWeek(key);
  return { week: `${key.slice(5)}（${md(p.startDate)}〜${md(p.endDate)}）`, window: `振り返り ${md(w.startDate)}〜${md(w.endDate)}` };
}
