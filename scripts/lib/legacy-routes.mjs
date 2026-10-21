/**
 * 旧 `/docs/<slug>` URL を情報設計移行後（2026-08-22）の正規パスへそろえる。
 * 真実源は `public/_redirects` の静的 301 行（`/docs/x  /exam/y  301`）。
 */

/**
 * 旧 /docs/<slug> の大半は、管理ブロックの動的ルール（`/docs/<接頭辞>* → <正規パス接頭辞>:splat`）でまとめて 301 にする（DN-0675）。
 * 動的ルールからは slug 一覧を引けないので、同じ内容を「# route /docs/<slug> <正規パス>」のコメントで並べる。
 * コメントは Cloudflare のルールに数えない。sitemap・RSS・URL 実在検査はこの表から slug → 正規パスを引く。
 * 表と動的ルールの一致は tests/public-route-redirects.test.mjs が検査する。
 */
export const ROUTE_TABLE_PREFIX = "# route ";

/** 情報設計移行前の旧 URL の接頭辞。旧 URL かどうかはここ（isLegacyPath）だけで判定する（tests/legacy-prefix-ratchet.test.mjs） */
export const LEGACY_PREFIX = "/docs/";
export const isLegacyPath = (path) => String(path ?? "").startsWith(LEGACY_PREFIX);

/** `_redirects` のテキストから、動的ルールがまとめて 301 にする slug → 正規パス の表（# route 行）を取り出す。 */
export function parseRouteTable(text) {
  const map = new Map();
  for (const line of String(text).split(/\r?\n/)) {
    if (!line.startsWith(ROUTE_TABLE_PREFIX)) continue;
    const m = line.slice(ROUTE_TABLE_PREFIX.length).match(/^\/docs\/([a-z0-9-]+)\s+(\/\S+)\s*$/);
    if (m) map.set(m[1], m[2]);
  }
  return map;
}

/** `_redirects` のテキストから 旧 /docs パス → 正規パス の Map を作る（# route の表も含む）。 */
export function parseLegacyRedirects(text) {
  const map = new Map();
  for (const [slug, to] of parseRouteTable(text)) map.set(`/docs/${slug}`, to);
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
  p = p.replace(/^[A-Za-z]:\/(?:[^/]+\/)*?Git(?=\/(?:exam|practice|standards|topics|laws|tools|docs|category)\/)/, "");
  p = p.replace(/^https?:\/\/[^/]+/, "");
  if (!p.startsWith("/")) p = `/docs/${p}`;
  p = p.replace(/[?#].*$/, "");
  if (p.length > 1) p = p.replace(/\/+$/, "");
  if (p.startsWith("/docs/")) return legacyRoutes.get(p) ?? p;
  return p;
}
