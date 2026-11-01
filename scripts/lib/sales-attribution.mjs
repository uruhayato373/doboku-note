/**
 * sales-attribution.mjs — 販売明細を資格・型へ帰属させた件数と、公開中で販売 0 の商品を数える（DN-0930）。
 * ---------------------------------------------------------------------------
 * 判定は product-lineup.mjs の classifySale（商品の正本に結びつけば products.json の資格・区分、
 * 結びつかない単品記事・会員は salesRules の正規表現）を唯一の実装として使い、ここで再実装しない。
 * 帰属の根拠 via は product（商品の id に結びついた）/ rule（正規表現）/ none（未帰属）。
 * ---------------------------------------------------------------------------
 */
import { classifySale, joinSaleProduct } from './product-lineup.mjs';
import { qualificationKey } from './sales-by-qualification.mjs';

/**
 * @param {any} config loadLineupConfig() の結果（saleProducts 付き）
 * @param {Array<{date: string, productId: string, price: number}>} sales
 * @param {{startDate: string, endDate: string}} period
 * @param {Array<any>} products config/products.json の products
 */
export function salesAttribution(config, sales, period, products) {
  const inPeriod = (s) => String(s.date).slice(0, 10) >= period.startDate && String(s.date).slice(0, 10) <= period.endDate;
  const rows = sales.filter(inPeriod);
  const via = { product: 0, rule: 0, none: 0 };
  const byQualification = {};
  const unattributedIds = new Set();
  const soldProductIds = new Set();
  for (const s of rows) {
    const product = joinSaleProduct(config, s.productId);
    const cells = classifySale(config, s.productId);
    const kind = product ? 'product' : cells ? 'rule' : 'none';
    via[kind] += 1;
    if (product) soldProductIds.add(product.id);
    if (kind === 'none') unattributedIds.add(s.productId);
    const key = qualificationKey(cells);
    byQualification[key] = (byQualification[key] ?? 0) + 1;
  }
  // 公開中で、期間内に 1 件も売れていない note 商品（資格別）。無料の商品（price に「無料」「¥0」）も数に含め、別に数える
  const unsold = {};
  for (const p of products ?? []) {
    if (p.channel !== 'note' || p.catalog?.published !== true) continue;
    if (soldProductIds.has(p.id)) continue;
    const price = String(p.catalog?.price ?? '');
    (unsold[p.qualification] ??= []).push({ id: p.id, tier: p.tier, free: /無料|¥0\b|会員/.test(price) });
  }
  return { total: rows.length, via, byQualification, unattributedIds: [...unattributedIds], unsold };
}
