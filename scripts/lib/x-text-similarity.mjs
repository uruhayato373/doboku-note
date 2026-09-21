/**
 * x-text-similarity.mjs — X 投稿文の近傍重複検出（正規化 → 文字トライグラム Jaccard）
 * ---------------------------------------------------------------------------
 * scripts/x-schedule-guard.mjs のロジックをそのまま lib へ切り出したもの（挙動不変）。
 * scripts/lib/x-frequency-gate.mjs の near-dup 判定もこれを使う。
 * ---------------------------------------------------------------------------
 */

/** URL・ハッシュタグ・数字・空白を除去して小文字化する。 */
export function normalize(text) {
  return (text || "")
    .replace(/https?:\/\/\S+/g, " ")     // URL 除去
    .replace(/#\S+/g, " ")               // ハッシュタグ除去
    .replace(/[0-9０-９]+/g, "#")         // 数字を正規化（カウントダウンの日数差を無視）
    .replace(/\s+/g, "")                 // 空白除去
    .toLowerCase();
}

/** 文字トライグラム集合を作る。 */
export function trigrams(s) {
  const g = new Set();
  for (let i = 0; i < s.length - 2; i++) g.add(s.slice(i, i + 3));
  return g;
}

/** Jaccard 係数（両方空なら 0）。 */
export function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
