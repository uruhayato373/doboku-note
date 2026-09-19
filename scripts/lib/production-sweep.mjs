/**
 * 本番全 URL スイープの純関数群（判定ロジック）。実行は scripts/check-production-sweep.mjs。
 */

export const REQUIRED_HEADERS = ['strict-transport-security', 'x-content-type-options', 'x-frame-options', 'referrer-policy'];

export function parseSitemapLocs(xml) {
  return [...String(xml).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

/** curl の `-w` で付けたフッタ（code / redirect_url / content_type）を本文から切り出す。 */
export function splitCurlOutput(out) {
  const i = out.lastIndexOf('\n__META__');
  if (i < 0) return { code: '000', redirectUrl: '', contentType: '', body: out };
  const meta = out.slice(i + '\n__META__'.length).trim().split('\t');
  return { code: meta[0] ?? '000', redirectUrl: meta[1] ?? '', contentType: meta[2] ?? '', body: out.slice(0, i) };
}

export function extractSeo(html) {
  const canonical = (html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ?? [])[1] ?? null;
  const ogImage = (html.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ?? [])[1] ?? null;
  const robots = (html.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i) ?? [])[1] ?? null;
  return { hasMain: /<main[\s>]/.test(html), canonical, ogImage, noindex: /noindex/i.test(robots ?? '') };
}

/**
 * 1 URL の判定。sitemap 掲載 URL は「200・自分自身が canonical・<main あり・noindex 無し」でなければ問題。
 * @returns {{url:string, level:'ok'|'fail'|'unreachable', reasons:string[], ogImage:string|null}}
 */
export function classifyPage(url, { code, redirectUrl, body }) {
  if (code === '000') return { url, level: 'unreachable', reasons: ['接続失敗（000）'], ogImage: null };
  const reasons = [];
  if (/^3\d\d$/.test(code)) reasons.push(`sitemap 掲載 URL が ${code} → ${redirectUrl || '?'}（転送元を sitemap に載せている）`);
  else if (code !== '200') reasons.push(`HTTP ${code}`);
  const seo = code === '200' ? extractSeo(body) : { hasMain: false, canonical: null, ogImage: null, noindex: false };
  if (code === '200') {
    if (!seo.hasMain) reasons.push('<main> が無い（SSR 破壊）');
    if (seo.noindex) reasons.push('noindex が sitemap 掲載 URL に付いている');
    const norm = (u) => (u ?? '').replace(/\/+$/, '');
    if (seo.canonical && norm(seo.canonical) !== norm(url)) reasons.push(`canonical が自分自身でない: ${seo.canonical}`);
    if (!seo.canonical) reasons.push('canonical が無い');
  }
  return { url, level: reasons.length ? 'fail' : 'ok', reasons, ogImage: seo.ogImage };
}

export function missingHeaders(headerText) {
  const present = new Set(
    String(headerText)
      .split(/\r?\n/)
      .map((l) => l.split(':')[0]?.trim().toLowerCase())
      .filter(Boolean),
  );
  return REQUIRED_HEADERS.filter((h) => !present.has(h));
}

/** 全体判定。unreachable が 5% 超なら検査不成立（exit 2）。1 件でも fail なら exit 1。 */
export function summarize({ pages, ogImages, headersMissing }) {
  const total = pages.length;
  const unreachable = pages.filter((p) => p.level === 'unreachable').length;
  const failed = pages.filter((p) => p.level === 'fail').length;
  const ogFailed = ogImages.filter((o) => o.code !== '200').length;
  let exitCode = 0;
  if (total === 0 || unreachable > total * 0.05) exitCode = 2;
  else if (failed > 0 || ogFailed > 0 || headersMissing.length > 0) exitCode = 1;
  return { total, ok: total - unreachable - failed, failed, unreachable, ogImages: ogImages.length, ogFailed, headersMissing, exitCode };
}
