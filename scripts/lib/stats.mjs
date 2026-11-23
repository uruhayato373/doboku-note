/**
 * stats.mjs — 集計の共通部品（依存ゼロ）。中央値の書き写しが scripts/ に 12 か所あった。
 * 空配列・偶数個・丸めの扱いが違うので、呼び方ごとに別名にしてある（違う定義を 1 つにまとめて挙動を変えない）。
 */

/** 中央値。空は null。偶数個は中央 2 つの平均を四捨五入して整数にする（価格・再生数などの整数の集計用）。 */
export function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/** 中央値。空は 0。偶数個は中央 2 つの平均をそのまま返す（丸めない）。 */
export function medianOrZero(values) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
