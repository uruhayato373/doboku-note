/**
 * 旧 /docs URL の一時 sitemap（sitemap-legacy.xml）の中身を決める（純関数・DN-0290）。
 *
 * Google の「Move a site with URL changes」（2026-08-20 更新）は、URL 移転時に旧 URL の sitemap も送り、
 * 旧 URL の登録が新 URL へ移ったら外す手順を示している（旧 sitemap のリダイレクト警告は無視してよい、とも明記）。
 * doboku-note は 2026-08-22 の移転から 1 か月経っても旧 /docs が表示の 32% を取り、新 URL 18 件が
 * 「Google が旧 URL を正規に選択」の重複だった（2026-09-23）。旧 URL を再クロールさせて 301 を早く処理させる。
 *
 * - sitemap.xml（index-coverage・IndexNow・check-seo-build の母集合）には混ぜない。robots.txt の Sitemap 行だけで知らせる。
 * - 期限（LEGACY_SITEMAP_UNTIL）を過ぎたビルドでは出さない＝外し忘れを構造的に防ぐ。
 * - 転送先が今の sitemap に載っている（＝index させたい）ものだけを出す。
 * - 移転日（LEGACY_REDIRECTED_AT）より後に作った記事の /docs/<slug> は出さない。_redirects は現行の全記事ぶん
 *   /docs/<slug> の 301 を作るので、移転後の記事まで載せると「実在したことの無い旧 URL」を Google に送ることになり、
 *   GSC の「検出 - インデックス未登録」を 173 件水増ししていた（2026-10-11・DN-0666）。作成日の分からない slug は残す。
 */
import { jstDayOf } from "./jst-date.mjs";

export const LEGACY_SITEMAP_FILE = "sitemap-legacy.xml";
/** 旧 URL の sitemap を出す最終日（JST の日付）。この日を過ぎたビルドでは出さない。 */
export const LEGACY_SITEMAP_UNTIL = "2026-11-30";
/** 旧 /docs が 301 になった日（lastmod に使う＝旧 URL が最後に変わった日）。 */
export const LEGACY_REDIRECTED_AT = "2026-08-22";

/**
 * 移転前から存在した記事か（旧 /docs/<slug> が実在したか）。created が無い記事は旧 URL を残す側に倒す。
 * 移転後の記事の /docs は一度も存在しないので、301（_redirects）も sitemap-legacy も作らない（DN-0675）。
 * @param {string|Date|undefined|null} created frontmatter の created
 */
export function existedBeforeRedirect(created) {
  if (!created) return true;
  const day = created instanceof Date ? created.toISOString().slice(0, 10) : String(created).slice(0, 10);
  return day <= LEGACY_REDIRECTED_AT;
}

/** 期限内か（JST の日付で比較）。 */
export function legacySitemapActive(now = new Date(), until = LEGACY_SITEMAP_UNTIL) {
  return jstDayOf(now) <= until;
}

/**
 * @param {{ docRoutes: Map<string,string>, sitemapLocs: Set<string>, siteUrl: string, createdBySlug?: Map<string,string>, now?: Date, until?: string }} p
 *   docRoutes = 旧 slug → 新パス（generate-sitemap.mjs の parseRedirects）、sitemapLocs = sitemap.xml の loc 集合、
 *   createdBySlug = slug → 作成日（YYYY-MM-DD・記事の frontmatter created）
 * @returns {{ active: boolean, urls: string[] }} urls は旧 URL（絶対・ソート済み）。期限切れなら空
 */
export function buildLegacySitemapUrls({ docRoutes, sitemapLocs, siteUrl, createdBySlug = new Map(), now = new Date(), until = LEGACY_SITEMAP_UNTIL }) {
  if (!legacySitemapActive(now, until)) return { active: false, urls: [] };
  const urls = [];
  for (const [slug, to] of docRoutes) {
    const created = createdBySlug.get(slug);
    if (!existedBeforeRedirect(created)) continue;
    if (sitemapLocs.has(`${siteUrl}${to}`)) urls.push(`${siteUrl}/docs/${slug}`);
  }
  urls.sort();
  return { active: true, urls };
}

export function renderLegacySitemap(urls, lastmod = LEGACY_REDIRECTED_AT) {
  // 書式は sitemap.xml（renderSitemapEntry）と同じ 1 行 1 エントリ。
  const body = urls.map((loc) => `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}
