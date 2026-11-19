/**
 * a8-code-core.mjs — A8.net 広告コード HTML → creative フィールド抽出 (純関数)。
 *
 * 抽出仕様の SSOT。scout パイプライン (a8-browser harvest) と手動貼付フローの両方から呼ぶ。
 * 仕様を変えるときはここだけ。doboku の creative 形式 (src/config/affiliate-creatives.ts の
 * href=px.a8.net/svt/ejp?a8mat=… / imageSrc=www*.a8.net/svt/bgt / pixelSrc=www*.a8.net/0.gif) と一致。
 *
 * A8 コードの形 (2 種):
 *   - バナー: <a href="https://px.a8.net/svt/ejp?a8mat=..."><img ... src="https://www*.a8.net/svt/bgt?..." width=.. height=.. ...></a>
 *              <img border="0" width="1" height="1" src="https://www*.a8.net/0.gif?a8mat=...">
 *   - テキスト: <a href="https://px.a8.net/svt/ejp?a8mat=...">表示文言</a>
 *              <img border="0" width="1" height="1" src="https://www*.a8.net/0.gif?a8mat=...">
 *
 * ここでは「文字列 (貼付コード)」を受け取り、決定的に抽出する。DOM/ブラウザ非依存。
 */

/** 属性を大文字小文字問わず取り出す (width | Width | WIDTH)。 */
function attr(tag, name) {
  const re = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i");
  const m = tag.match(re);
  return m ? m[1] : null;
}

/** HTML 文字列から <img ...> タグを全て配列で返す。 */
function imgTags(html) {
  return html.match(/<img\b[^>]*>/gi) ?? [];
}

/** A8 クリック URL (px.a8.net/svt/ejp) を抽出。 */
export function extractHref(html) {
  // <a href="..."> を優先。無ければ生 URL を拾う。
  const a = html.match(/<a\b[^>]*\bhref\s*=\s*["']([^"']*px\.a8\.net\/svt\/ejp[^"']*)["']/i);
  if (a) return a[1];
  const raw = html.match(/https:\/\/px\.a8\.net\/svt\/ejp\?a8mat=[A-Za-z0-9+._%-]+/i);
  return raw ? raw[0] : null;
}

/** a8mat トークン (href / 0.gif に共通するプログラム識別子)。dedup の主キー候補。 */
export function extractA8mat(html) {
  const m = html.match(/a8mat=([A-Za-z0-9+._%-]+)/i);
  return m ? m[1] : null;
}

/** バナー画像 URL (www*.a8.net/svt/bgt) を抽出。テキスト広告では null。 */
export function extractImageUrl(html) {
  for (const tag of imgTags(html)) {
    const src = attr(tag, "src");
    if (src && /www\d*\.a8\.net\/svt\/bgt/i.test(src)) return src;
  }
  return null;
}

/** 計測ピクセル URL (www*.a8.net/0.gif = 1x1)。A8 は常に持つ。 */
export function extractPixelUrl(html) {
  for (const tag of imgTags(html)) {
    const src = attr(tag, "src");
    if (src && /www\d*\.a8\.net\/0\.gif/i.test(src)) return src;
  }
  return null;
}

/** バナー画像タグの width/height を数値で返す ({width,height} or {width:null,height:null})。 */
export function extractSize(html) {
  for (const tag of imgTags(html)) {
    const src = attr(tag, "src");
    if (!(src && /www\d*\.a8\.net\/svt\/bgt/i.test(src))) continue;
    const w = Number(attr(tag, "width"));
    const h = Number(attr(tag, "height"));
    if (Number.isFinite(w) && Number.isFinite(h) && w > 1 && h > 1) {
      return { width: w, height: h };
    }
  }
  return { width: null, height: null };
}

const CANONICAL_SIZES = [
  { width: 300, height: 250 },
  { width: 250, height: 250 },
  { width: 320, height: 100 },
];

/** {width,height} が canonical 4種 (banner 3 + text) のどれか。 */
export function isCanonicalSize(width, height) {
  if (width == null || height == null) return true; // text は size なし = 許容
  return CANONICAL_SIZES.some((s) => s.width === width && s.height === height);
}

/**
 * A8 広告コード (貼付 HTML 文字列) を creative の抽出フィールドに変換する。
 * @param {string} html
 * @returns {{ ok: boolean, error?: string, fields?: object, a8mat?: string|null }}
 *   fields = { htmlContent, imageUrl, trackingPixelUrl, width, height, adType }
 *   htmlContent は A8 クリック URL (px.a8.net/svt/ejp?a8mat=...) を保持する。
 */
export function parseA8Code(html) {
  if (typeof html !== "string" || html.trim() === "") {
    return { ok: false, error: "empty-html" };
  }
  const href = extractHref(html);
  if (!href) return { ok: false, error: "no-a8-click-url" };

  const a8mat = extractA8mat(html);
  const imageUrl = extractImageUrl(html);
  const trackingPixelUrl = extractPixelUrl(html);
  const { width, height } = extractSize(html);

  const adType = imageUrl ? "banner" : "text";

  if (adType === "banner") {
    if (width == null || height == null) {
      return { ok: false, error: "banner-size-missing", a8mat };
    }
    if (!isCanonicalSize(width, height)) {
      return {
        ok: false,
        error: `non-canonical-size:${width}x${height}`,
        a8mat,
        fields: { htmlContent: href, imageUrl, trackingPixelUrl, width, height, adType },
      };
    }
  }

  return {
    ok: true,
    a8mat,
    fields: {
      htmlContent: href,
      imageUrl,
      trackingPixelUrl,
      width: adType === "text" ? null : width,
      height: adType === "text" ? null : height,
      adType,
    },
  };
}
