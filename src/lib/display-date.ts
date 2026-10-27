/**
 * 画面に出す日付の整形（カード・記事のメタ行・人気の集計期間・著者欄）。整形はここだけに置く。
 *
 * frontmatter の日付（YYYY-MM-DD）は暦日としてそのまま使い、時刻つき（記録の UTC など）は日本時間の暦日にする。
 * `new Date(iso).getDate()` はビルドする環境のタイムゾーンに依存し、時刻つきの値を 1 日ずらす（2026-10-27 に 5 か所の別実装を集約）。
 * 日本時間の計算は scripts/lib/jst-date.mjs（スクリプトと同じ実装）。
 */
import { jstDayOf } from '../../scripts/lib/jst-date.mjs';

/** 暦日 [年, 月, 日]。読めなければ null */
function calendarDay(value: string | null | undefined): [number, number, number] | null {
  if (!value) return null;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : Number.isNaN(Date.parse(value)) ? null : jstDayOf(value);
  if (!day) return null;
  return [Number(day.slice(0, 4)), Number(day.slice(5, 7)), Number(day.slice(8, 10))];
}

/** 2026.10.27 の形。読めなければ null */
export function formatDotDate(value: string | null | undefined): string | null {
  const day = calendarDay(value);
  return day ? `${day[0]}.${String(day[1]).padStart(2, '0')}.${String(day[2]).padStart(2, '0')}` : null;
}

/** 2026年10月27日 の形。読めなければ null */
export function formatJaDate(value: string | null | undefined): string | null {
  const day = calendarDay(value);
  return day ? `${day[0]}年${day[1]}月${day[2]}日` : null;
}
