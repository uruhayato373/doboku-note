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
 */

export const LEGACY_SITEMAP_FILE = "sitemap-legacy.xml";
/** 旧 URL の sitemap を出す最終日（JST の日付）。この日を過ぎたビルドでは出さない。 */
export const LEGACY_SITEMAP_UNTIL = "2026-11-30";
/** 旧 /docs が 301 になった日（lastmod に使う＝旧 URL が最後に変わった日）。 */
export const LEGACY_REDIRECTED_AT = "2026-08-22";

/** 期限内か（JST の日付で比較）。 */
export function legacySitemapActive(now = new Date(), until = LEGACY_SITEMAP_UNTIL) {
  const jst = new Date(now.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  return jst <= until;
}

/**
 * @param {{ docRoutes: Map<string,string>, sitemapLocs: Set<string>, siteUrl: string, now?: Date, until?: string }} p
 *   docRoutes = 旧 slug → 新パス（generate-sitemap.mjs の parseRedirects）、sitemapLocs = sitemap.xml の loc 集合
 * @returns {{ active: boolean, urls: string[] }} urls は旧 URL（絶対・ソート済み）。期限切れなら空
 */
export function buildLegacySitemapUrls({ docRoutes, sitemapLocs, siteUrl, now = new Date(), until = LEGACY_SITEMAP_UNTIL }) {
  if (!legacySitemapActive(now, until)) return { active: false, urls: [] };
  const urls = [];
  for (const [slug, to] of docRoutes) {
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
