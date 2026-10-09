/**
 * http-range.mjs — HTTP Range ヘッダーの解析（単一範囲のみ・依存ゼロ）。管理画面の /media ルートが使う。
 *
 * parseRange(header, size):
 *   null            範囲なし扱い（ヘッダー無し・bytes 以外の単位・複数範囲・書式不正）→ 呼び側は 200 で全体を返す
 *   'unsatisfiable' 範囲が実体の外 → 416
 *   {start,end}     両端を含む（end は size-1 に丸める）
 */
export function parseRange(header, size) {
  if (typeof header !== 'string' || !header.trim()) return null;
  const m = /^\s*bytes\s*=\s*(.+?)\s*$/i.exec(header);
  if (!m) return null;
  if (m[1].includes(',')) return null;
  const r = /^(\d*)-(\d*)$/.exec(m[1]);
  if (!r || (r[1] === '' && r[2] === '')) return null;
  if (r[1] === '') {
    const n = Number(r[2]);
    if (!Number.isSafeInteger(n)) return null;
    if (n === 0 || size === 0) return 'unsatisfiable';
    return { start: Math.max(0, size - n), end: size - 1 };
  }
  const start = Number(r[1]);
  if (!Number.isSafeInteger(start)) return null;
  if (r[2] === '') {
    if (start >= size) return 'unsatisfiable';
    return { start, end: size - 1 };
  }
  const end = Number(r[2]);
  if (!Number.isSafeInteger(end) || end < start) return null;
  if (start >= size) return 'unsatisfiable';
  return { start, end: Math.min(end, size - 1) };
}
