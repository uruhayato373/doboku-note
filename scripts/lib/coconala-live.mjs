/**
 * coconala-live.mjs — ココナラの公開サービスページとカタログ／listings SoT の突合（純粋関数）
 * ---------------------------------------------------------------------------
 * 公開ページ（ログイン不要）は schema.org の Product を JSON-LD で持つ（2026-09-23 実測）:
 *   name = タイトル＋空白＋キャッチコピー／description = サービス内容（改行・空白以外は投入本文と一致）
 *   offers.price = 出品価格（手数料込みの ×1.1 ではない）／offers.seller.name = 出品者名
 * DOM の見た目ではなく構造化データを読むので、デザイン変更に強い。
 * ---------------------------------------------------------------------------
 */

/** HTML から @type=Product の JSON-LD を取り出す。見つからなければ null */
export function parseServiceProduct(html) {
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    let data;
    try {
      data = JSON.parse(m[1]);
    } catch {
      continue;
    }
    for (const item of Array.isArray(data) ? data : [data]) {
      if (item && item['@type'] === 'Product') return item;
    }
  }
  return null;
}

/** 空白・改行の違いを無視して比べるための正規化 */
export const squash = (s) => String(s ?? '').replace(/\s+/g, '');

/**
 * カタログの1サービスと listings、公開ページの Product を突合し、食い違いを列挙する。
 * @param {{id:string,title:string,priceYen:number}} service カタログ
 * @param {{catchphrase?:string, body?:string}|undefined} listing 投入本文
 * @param {object|null} product parseServiceProduct の戻り値
 * @param {{sellerName?:string}} opts
 * @returns {string[]} 食い違いの説明（空配列なら一致）
 */
export function diffLiveService(service, listing, product, { sellerName } = {}) {
  if (!product) return ['公開ページに Product の構造化データが無い（非公開・削除・ページ構造の変更）'];
  const issues = [];
  const price = Number(product.offers?.price);
  if (price !== service.priceYen) issues.push(`価格: live ¥${product.offers?.price} ≠ カタログ ¥${service.priceYen}`);
  const name = String(product.name ?? '');
  if (!name.startsWith(service.title)) issues.push(`タイトル: live「${name}」がカタログのタイトル「${service.title}」で始まらない`);
  if (listing?.catchphrase && squash(name) !== squash(`${service.title}${listing.catchphrase}`)) {
    issues.push(`キャッチコピー: live「${name}」≠「${service.title} ${listing.catchphrase}」`);
  }
  if (listing?.body && squash(product.description) !== squash(listing.body)) {
    const a = squash(product.description);
    const b = squash(listing.body);
    let i = 0;
    while (i < a.length && a[i] === b[i]) i++;
    issues.push(`本文: ${i}文字目から不一致（live「${a.slice(i, i + 24)}」／SoT「${b.slice(i, i + 24)}」）`);
  }
  if (sellerName && product.offers?.seller?.name && product.offers.seller.name !== sellerName) {
    issues.push(`出品者: live「${product.offers.seller.name}」≠「${sellerName}」`);
  }
  if (product.offers?.availability && !/InStock/.test(product.offers.availability)) {
    issues.push(`販売状態: ${product.offers.availability}（listed なのに購入できない）`);
  }
  return issues;
}
