/* global URL -- ブラウザと Node の両方にある（src の .mjs は eslint の環境が未設定） */
/**
 * 商品への送客（GA4 `product_impression` / `product_click`）の語彙と、販売先の URL → 販売先での商品 ID の読み取り。
 * DN-0947。stats47 の同名イベント（PRODUCT-REFERRAL-MEASURE-01）と名前・意味をそろえる。
 *
 * - product_destination: 販売先（note / coconala / amazon / a8 / moshimo）。URL のホストから決める。
 * - product_id: 販売先での ID（note は記事・マガジンのキー n…/m…・メンバーシップは membership、ココナラはサービス番号、
 *   Amazon は ASIN、A8 は a8mat、もしもは p_id）。販売台帳（data/business/product-sales/）が同じ ID を
 *   config/products.json で自社の商品 ID に引き当てる（A8・もしもは案件の ID。config/affiliate-mats.json）。
 *   クライアントに商品の索引を持たせないため、サイト内の ID ではなく URL から取れる ID を送る。
 * - 置き場所は既存の登録済みパラメータ cta_placement（data-cta-placement）を使う（stats47 の link_position に当たる）。
 *
 * 形が合わない URL は null（推測した ID を送らない）。サイト内リンクも null。
 */
import { NOTE_CREATOR } from '../config/site-identity.mjs';

export const PRODUCT_DESTINATIONS = ['note', 'coconala', 'amazon', 'a8', 'moshimo'];
export const PRODUCT_IMPRESSION_EVENT = 'product_impression';
export const PRODUCT_CLICK_EVENT = 'product_click';
/** 表示とみなす条件（案内の 50% 以上が 1 秒続けて見えた）。stats47 の createImpressionWatcher と同じ */
export const PRODUCT_IMPRESSION_RATIO = 0.5;
export const PRODUCT_IMPRESSION_DWELL_MS = 1000;


/**
 * @param {string} href 絶対 URL（相対 URL・サイト内リンクは null）
 * @returns {{ destination: string, productId: string } | null}
 */
export function productReferralOf(href) {
  let url;
  try {
    url = new URL(String(href ?? ''));
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, '');
  if (host === 'note.com') {
    const [account, kind, key] = url.pathname.split('/').filter(Boolean);
    if (account !== NOTE_CREATOR) return null;
    if (kind === 'membership') return { destination: 'note', productId: 'membership' };
    if ((kind === 'n' || kind === 'm') && /^[nm][0-9a-f]+$/i.test(key ?? '')) return { destination: 'note', productId: key };
    return null;
  }
  if (host === 'coconala.com') {
    const id = url.pathname.match(/^\/services\/(\d+)\/?$/)?.[1];
    return id ? { destination: 'coconala', productId: id } : null;
  }
  if (host === 'amazon.co.jp') {
    const asin = url.pathname.match(/\/dp\/([A-Z0-9]{10})(?:\/|$)/)?.[1];
    return asin ? { destination: 'amazon', productId: asin } : null;
  }
  if (host === 'px.a8.net') {
    // searchParams は + を空白に戻すので、生のクエリから読む（config/affiliate-mats.json の mat と同じ表記）
    const mat = url.search.match(/[?&]a8mat=([0-9A-Z]+(?:\+[0-9A-Z]+){3})(?:&|$)/)?.[1];
    return mat ? { destination: 'a8', productId: mat } : null;
  }
  if (host === 'af.moshimo.com') {
    const pid = url.searchParams.get('p_id');
    return pid && /^\d+$/.test(pid) ? { destination: 'moshimo', productId: pid } : null;
  }
  return null;
}

/** GA4 に送るパラメータ。cta_placement が無い案内は (unknown) */
export function productReferralParams(referral, placement) {
  return {
    product_destination: referral.destination,
    product_id: referral.productId,
    cta_placement: placement || '(unknown)',
  };
}
