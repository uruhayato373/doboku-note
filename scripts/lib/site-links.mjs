/**
 * note・SNS 原稿に書くサイトへの絶対リンク（https://doboku-note.com/...）の新旧判定と張り替え。
 *
 * 2026-08-22 の情報設計移行で `/docs/<slug>` は `/exam` `/practice` `/standards` `/topics` へ 301 になった。
 * 旧 URL へのリンクは届くが、読者は毎回 301 を 1 回挟み、Google は被リンク先の旧 URL を正規に選び続ける
 * （2026-09-23 の URL Inspection で新 URL 18 件が「重複・Google が旧 /docs を正規に選択」）。
 * 真実源は `public/_redirects` の静的 301 行（`legacy-routes.mjs` が読む）。判定はここに集約し、
 * check-note-site-utm / check-x-utm / check-sns-urls / fix-legacy-site-links が共用する。
 */
import { existsSync, readFileSync } from "node:fs";
import { parseLegacyRedirects } from "./legacy-routes.mjs";

export const SITE_ORIGIN = "https://doboku-note.com";

// group1 = パス（クエリ・フラグメントを含まない）、group2 = クエリ／フラグメント。
// パスの文字は ASCII に限る（日本語の句読点や閉じ括弧をパスに巻き込まない）。`{slug}` のような
// テンプレートはパスがそこで切れ、旧 URL の表に無いので「張り替え不能」として残る。
const SITE_LINK_SOURCE =
  String.raw`https?:\/\/(?:www\.)?doboku-note\.com(\/(?:docs|exam|practice|standards|topics)\/[A-Za-z0-9_\-\/%]*)([?#][^\s)>\]"'<\x60]*)?`;

/** サイトの記事系 URL にマッチする正規表現（呼ぶたびに新しい g フラグ付きインスタンス）。 */
export function siteLinkRegex() {
  return new RegExp(SITE_LINK_SOURCE, "g");
}

/**
 * `public/_redirects` から旧→新の対応表と、新 URL（記事）の集合を作る。
 * `hubs` は新 URL のパス接頭辞（/exam/<資格> や /exam/<資格>/<種別>）で、資格ハブへのリンクを実在扱いにする。
 */
const routesCache = new Map();

export function loadSiteRoutes(redirectsPath = "public/_redirects") {
  // 1 プロセス中に _redirects は変わらないので、行ごとに呼ばれても 1 回だけ読む。
  if (!routesCache.has(redirectsPath)) routesCache.set(redirectsPath, buildSiteRoutes(redirectsPath));
  return routesCache.get(redirectsPath);
}

function buildSiteRoutes(redirectsPath) {
  const text = existsSync(redirectsPath) ? readFileSync(redirectsPath, "utf8") : "";
  const legacy = parseLegacyRedirects(text);
  const canonical = new Set(legacy.values());
  const hubs = new Set();
  for (const p of canonical) {
    const segs = p.split("/").filter(Boolean);
    for (let i = 1; i < segs.length; i++) hubs.add(`/${segs.slice(0, i).join("/")}`);
  }
  return { legacy, canonical, hubs, loaded: legacy.size > 0 };
}

const trimSlash = (p) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

/**
 * パスを分類する。
 *   legacy     … 旧 /docs（`to` に新パス、張り替え先が無ければ null）
 *   ok         … 新 URL の記事か資格ハブ（_redirects の転送先から実在を確認できる）
 *   unverified … /standards・/topics の独自ページ（_redirects に載らないので実在はここでは判定しない）
 *   unknown    … /exam・/practice なのに転送先の集合に無い（打ち間違い・リンク切れの疑い）
 */
export function classifySitePath(path, routes) {
  const p = trimSlash(path);
  if (p.startsWith("/docs/")) return { kind: "legacy", path: p, to: routes.legacy.get(p) ?? null };
  if (routes.canonical.has(p) || routes.hubs.has(p)) return { kind: "ok", path: p };
  if (/^\/(standards|topics)(\/|$)/.test(p)) return { kind: "unverified", path: p };
  return { kind: "unknown", path: p, suggestion: suggestCanonical(p, routes) };
}

/**
 * エラーメッセージ用の提案。(1) 資格以降をハイフンでつないだ旧スラッグの転送先
 * （`/exam/<資格>/textbook-mix-design` → `/docs/<資格>-textbook-mix-design` → `/exam/<資格>/textbook/mix-design`・
 * 2026-09-24 に note 原稿で実在した 404）、(2) 末尾のスラッグが一致する新 URL が 1 件だけならそれ。
 */
function suggestCanonical(path, routes) {
  const segs = path.split("/").filter(Boolean);
  if (segs.length >= 2) {
    const viaLegacy = routes.legacy.get(`/docs/${segs.slice(1).join("-")}`);
    if (viaLegacy) return viaLegacy;
  }
  const last = segs.at(-1);
  if (!last) return null;
  const hits = [...routes.canonical].filter((c) => c.endsWith(`/${last}`));
  return hits.length === 1 ? hits[0] : null;
}

/**
 * テキスト中の旧 /docs リンクを新 URL に置き換える。クエリ（UTM）とフラグメントは保持する。
 * 張り替え先が無いものは触らずに `unmapped` へ返す（黙って捨てない）。
 */
export function rewriteLegacySiteLinks(text, routes) {
  const unmapped = [];
  let replaced = 0;
  const out = String(text).replace(siteLinkRegex(), (whole, path, rest = "") => {
    const c = classifySitePath(path, routes);
    if (c.kind !== "legacy") return whole;
    if (!c.to) {
      unmapped.push(c.path);
      return whole;
    }
    replaced += 1;
    return `${SITE_ORIGIN}${c.to}${rest}`;
  });
  return { text: out, replaced, unmapped };
}

/** 旧 /docs スラッグから新 URL（絶対）を返す。表に無ければ旧 URL のまま返す。 */
export function siteUrlForSlug(slug, routes) {
  const to = routes.legacy.get(`/docs/${slug}`);
  return `${SITE_ORIGIN}${to ?? `/docs/${slug}`}`;
}
