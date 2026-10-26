/**
 * 管理画面の表示の書式（DN-0851）。金額・数・日時の書き方を各画面で書き写さない。
 * 日時は記録が UTC の ISO 8601（末尾 Z）なので、表示は必ず Asia/Tokyo で出す（文字列を切って出すと UTC のまま見える）。
 */

/** 金額（円）。null・undefined は '—' */
export const yen = (n: number | null | undefined) => (n == null ? '—' : `¥${n.toLocaleString('ja-JP')}`);

/** 数（桁区切り）。null・undefined は '—' */
export const num = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('ja-JP'));

/** 単位つきの値（KPI の表示）。円は yen、% は末尾に %、それ以外は数だけ */
export const withUnit = (v: number | null, unit: string) => (v == null ? '—' : unit === '円' ? yen(v) : `${num(v)}${unit === '%' ? '%' : ''}`);

/** 日時（JST）。short で「2026/10/24 14:25」、既定は秒まで。無ければ '—' */
export const jstDateTime = (iso: string | null | undefined, { short = false }: { short?: boolean } = {}) =>
  iso
    ? new Date(iso).toLocaleString('ja-JP', short ? { timeZone: 'Asia/Tokyo', dateStyle: 'short', timeStyle: 'short' } : { timeZone: 'Asia/Tokyo' })
    : '—';

/** 日付（YYYY-MM-DD）を「10/5」の形に。無ければ空文字 */
export const monthDay = (date: string | null | undefined) => (date ? `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}` : '');
