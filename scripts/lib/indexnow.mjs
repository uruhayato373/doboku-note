/**
 * IndexNow（Bing / Yandex / Naver / Seznam が共有する更新通知プロトコル）の純関数群。
 * Google は IndexNow に参加していないので、Google の index には効かない（GSC 側は別系統）。
 * 仕様: https://www.indexnow.org/documentation
 */

/** sitemap.xml から {loc,lastmod} を取り出す。 */
export function parseSitemap(xml) {
  const out = [];
  for (const m of String(xml).matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = (m[1].match(/<loc>([^<]+)<\/loc>/) ?? [])[1]?.trim();
    const lastmod = (m[1].match(/<lastmod>([^<]+)<\/lastmod>/) ?? [])[1]?.trim() ?? null;
    if (loc) out.push({ loc, lastmod });
  }
  return out;
}

/**
 * lastmod が `since` 以降の URL を返す。lastmod の無い URL は「更新日不明」なので送らない
 * （毎回全件を送ると IndexNow 側で spam 扱いになる）。
 */
export function selectRecentlyModified(entries, since) {
  const t0 = since instanceof Date ? since.getTime() : Date.parse(since);
  return entries
    .filter((e) => e.lastmod && Number.isFinite(Date.parse(e.lastmod)) && Date.parse(e.lastmod) >= t0)
    .map((e) => e.loc);
}

/** IndexNow の JSON ボディ（1 リクエスト最大 10,000 URL）。 */
export function buildPayload({ host, key, keyLocation, urlList }) {
  if (urlList.length > 10000) throw new Error(`IndexNow は 1 リクエスト 10,000 URL まで（${urlList.length}）`);
  return { host, key, keyLocation, urlList };
}

/** 200 / 202 だけを受理とみなす。それ以外は理由付きで失敗。 */
export function classifyResponse(status) {
  if (status === 200 || status === 202) return { ok: true, label: status === 200 ? "ok" : "accepted" };
  const reasons = {
    400: "bad-request（JSON 形式）",
    403: "forbidden（key ファイルが無い／内容不一致）",
    422: "unprocessable（URL が host と一致しない／key の場所が不正）",
    429: "too-many-requests（spam 判定・間隔を空ける）",
  };
  return { ok: false, label: reasons[status] ?? `http-${status}` };
}
