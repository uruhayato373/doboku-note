/**
 * url-normalization.mjs — GSC/GA4 突合のための URL キー生成（純関数・テスト対象）
 * ---------------------------------------------------------------------------
 * 2 種類のキーを提供する。用途を明確に分ける。
 *
 *  1. comparisonKey（保守的・GSC UI 行の「同一性」）
 *     - scheme + host を除去したサイト相対の path + query。
 *     - fragment (#...) のみ除去。
 *     - 末尾スラッシュ・重複スラッシュ・percent-encoding は**保持**（別 URL を勝手に同一視しない）。
 *     - www などホスト差は同一プロパティ上の別名なので path キーとしては吸収する（host は落とす）。
 *     用途: GSC UI CSV 行の正規化・重複判定・レポートの安定表示キー。
 *
 *  2. joinKey（積極的・既存メトリクスとの突合用）
 *     - report-ga4-gsc-crosswalk.mjs の normPath と同じ規則。
 *     - host（www 含む）除去・query/fragment 除去・末尾スラッシュ除去・小文字化なし。
 *     用途: GA4 page / GSC page / URL Inspection / sitemap との join。
 *     これらは既に path 正規化済みの前提なので積極的に寄せる。
 *
 * comparisonKey は「壊さない」、joinKey は「寄せる」。両者を混同しない。
 */

const SITE_HOST_RE = /^https?:\/\/(www\.)?doboku-note\.com/i;

/**
 * URL 文字列を安全に URL オブジェクトへ。相対パス（先頭 /）も site origin 基準で解釈する。
 * parse 不能なら null（呼び出し側で rejects へ送る）。
 */
export function tryParseUrl(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  try {
    if (s.startsWith("/")) return new URL(s, "https://doboku-note.com");
    return new URL(s);
  } catch {
    return null;
  }
}

/**
 * comparisonKey: サイト相対の path(+query)。fragment 除去のみ。
 * 末尾/重複スラッシュ・percent-encoding は保持する（別 URL を同一視しない）。
 * host は落とす（www 差など同一プロパティの別名を吸収）。parse 不能なら null。
 */
export function toComparisonKey(raw) {
  const u = tryParseUrl(raw);
  if (!u) return null;
  // u.pathname は URL API が percent-encoding を正規化するため、原文の path をそのまま使う。
  const s = String(raw).trim();
  // scheme+host を除去。相対パスはそのまま。
  let rest = s.replace(/^https?:\/\/[^/]+/i, "");
  if (!rest.startsWith("/")) rest = "/" + rest;
  // fragment 除去（query は保持）。
  rest = rest.split("#")[0];
  // 末尾/重複スラッシュ・query・encoding はいじらない。空なら "/"。
  return rest || "/";
}

/**
 * joinKey: 既存メトリクス（GA4/GSC page・sitemap）との突合用に積極正規化。
 * host(www)・query・fragment を除去、末尾スラッシュを削る（"/" は残す）。parse 不能なら ""。
 */
export function toJoinKey(raw) {
  if (!raw) return "";
  let p = String(raw).replace(SITE_HOST_RE, "");
  // 相対でない外部 host（別ドメイン）はそのまま比較キーにする（同一視事故を避ける）。
  if (/^https?:\/\//i.test(p)) {
    const u = tryParseUrl(p);
    if (!u) return "";
    p = u.pathname;
  }
  p = p.split("#")[0].split("?")[0];
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p || "/";
}

/** 絶対 URL へ（site origin 補完）。表示・HTTP チェック用。parse 不能なら null。 */
export function toAbsoluteUrl(raw, origin = "https://doboku-note.com") {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/")) return origin.replace(/\/$/, "") + s;
  return null;
}

/** /docs/{slug} の slug を取り出す（doc-meta-index との突合用）。無ければ null。 */
export function slugFromKey(key) {
  if (!key) return null;
  const m = String(key).match(/^\/docs\/([^/?#]+)\/?$/);
  return m ? m[1] : null;
}
