#!/usr/bin/env node
/**
 * product-sales.mjs — 暦月 × 商品の販売台帳を作る（DN-0947）。
 *
 * 入力（すべてコミット済み・creds 不要）: config/products.json・data/note/sales.json・data/kdp/royalties.json・
 *   data/coconala/revenue.json・data/coconala/orders.json・data/a8/report-log.json（案件別の単月）・config/affiliate-mats.json（a8mat → 案件）
 * 出力: data/business/product-sales/{month}.json（同じ月は作り直して上書きする。入力が正本で、これは引き当ての結果）
 * 中身・計測の範囲（coverage）の読み方は scripts/lib/product-sales.mjs。GA4 の product_click と同じ商品 ID でつなぐ。
 *
 * Usage:
 *   npm run product-sales                     # 直近の完了月（JST）と当月
 *   npm run product-sales -- --month 2026-10
 *   npm run product-sales -- --all            # 入力に記録がある全月
 *   npm run product-sales -- --check          # 書かずに作れるかだけ確かめる（入力の破損は exit 2）
 *
 * npm run product-sales — 暦月×商品の販売台帳→data/business/product-sales/YYYY-MM.json（既定は前月と当月・`--month`・`--all`・`--check`）。note・KDP（doboku-note の ASIN だけ。stats47 の本は excluded）・ココナラ・A8（案件別の単月レポート。a8mat → 案件は config/affiliate-mats.json・金額は確定報酬、発生額と承認待ちは別欄）を販売先ごとの coverage つきで並べ、measured の月だけ「行が無い＝0 件」と読む。読み手は scripts/lib/product-sales.mjs の salesOf。土曜の収集の product-sales 段が回す（DN-0947）
 */
import { buildProductSales } from './lib/product-sales.mjs';
import { affiliateMatEntries } from './lib/affiliate-catalog-mats.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { readJson, readJsonIf, writeJson } from './lib/json-io.mjs';
import { jst } from './lib/business-direction.mjs';
import { previousMonth } from './lib/site-to-sales.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const args = parseCliArgs({ month: { type: 'string' }, all: { type: 'boolean' }, check: { type: 'boolean' } });

let input;
try {
  input = {
    products: readJson(ROOT, datasetPath('config.products')).products,
    mats: affiliateMatEntries(readJson(ROOT, datasetPath('affiliate.catalog')), readJsonIf(ROOT, datasetPath('config.affiliate-mats'))?.mats ?? []),
    salesLog: readJson(ROOT, datasetPath('note.sales')),
    royalties: readJsonIf(ROOT, datasetPath('kdp.royalties')),
    revenue: readJsonIf(ROOT, datasetPath('coconala.revenue')),
    orders: readJsonIf(ROOT, datasetPath('coconala.orders')),
    catalog: readJson(ROOT, datasetPath('affiliate.catalog')),
    moshimoSiteId: readJson(ROOT, datasetPath('config.affiliate-asp')).asps.moshimo.sites['doboku-note'],
    reportLog: readJsonIf(ROOT, datasetPath('a8.report-log')),
  };
} catch (e) {
  console.error(`[product-sales] 検査不成立: 入力を読めない（${e.message}）`);
  process.exit(2);
}
if (!input.products?.length) {
  console.error('[product-sales] 検査不成立: 商品の正本（config.products）の商品が 0 件');
  process.exit(2);
}

const today = jst();
const months = args.month
  ? [args.month]
  : args.all
    ? [...new Set([...Object.keys(input.salesLog.months ?? {}), ...Object.keys(input.royalties?.months ?? {})])].sort()
    : [previousMonth(today), today.slice(0, 7)];

for (const month of months) {
  const moshimoReport = readJsonIf(ROOT, datasetPath('moshimo.reports', { month }));
  const ledger = buildProductSales({ month, ...input, moshimoReport });
  const covered = Object.entries(ledger.coverage).map(([k, c]) => `${k}=${c.status}${c.provisional ? '(暫定)' : ''}`).join(' ');
  const yen = ledger.rows.reduce((s, r) => s + r.amountYen, 0);
  console.log(`[product-sales] ${month}: ${ledger.rows.length} 商品・¥${yen.toLocaleString('ja-JP')} / ${covered}`);
  if (!args.check) writeJson(ROOT, datasetPath('business.product-sales', { month }), ledger);
}
