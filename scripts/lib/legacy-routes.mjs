/**
 * 旧 `/docs/<slug>` URL を情報設計移行後（2026-08-22）の正規パスへそろえる。
 * 真実源は `public/_redirects` の静的 301 行（`/docs/x  /exam/y  301`）。
 */

/** `_redirects` のテキストから 旧 /docs パス → 正規パス の Map を作る。 */
export function parseLegacyRedirects(text) {
  const map = new Map();
  for (const line of String(text).split(/\r?\n/)) {
    const m = line.match(/^(\/docs\/[a-z0-9-]+)\s+(\/\S+)\s+301\b/);
    if (m) map.set(m[1], m[2]);
  }
  return map;
}

/**
 * 入力（絶対 URL / パス / 旧 /docs/slug / 裸の slug）を正規パスにする。
 * 旧 /docs で転送先が無いものはそのまま返す（呼出側が検査結果で気づけるように捨てない）。
 */
export function normalizeTargetPath(input, legacyRoutes) {
  let p = String(input ?? "").trim();
  if (!p) return null;
  // Git Bash（MSYS）は "/exam/..." のような引数を "C:/Program Files/Git/exam/..." に書き換えて渡す。
  // そのまま送ると存在しない URL を GSC に検査させるので、サイトのルート直前までを剥がす。
  p = p.replace(/^[A-Za-z]:\/(?:[^/]+\/)*?Git(?=\/(?:exam|practice|standards|topics|tools|docs|category)\/)/, "");
  p = p.replace(/^https?:\/\/[^/]+/, "");
  if (!p.startsWith("/")) p = `/docs/${p}`;
  p = p.replace(/[?#].*$/, "");
  if (p.length > 1) p = p.replace(/\/+$/, "");
  if (p.startsWith("/docs/")) return legacyRoutes.get(p) ?? p;
  return p;
}
