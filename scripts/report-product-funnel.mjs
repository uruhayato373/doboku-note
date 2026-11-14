#!/usr/bin/env node
/**
 * report-product-funnel.mjs — 商品ごとに「案内の表示 → 販売先クリック → 販売」を販売先の ID で並べる（DN-0947・EXP-052）。
 *
 * 入力: 最新の GA4 レポート product-referrals（fetch-ga4-cta-clicks --by-product）と、その窓の月の販売台帳
 *   data/business/product-sales/（npm run product-sales）。書き込みはしない（標準出力だけ）。
 * クリック率は表示 100 件未満なら出さない。販売は暦月の値で、GA4 の窓とはずれる（アトリビューションではない）。
 *
 * Usage:
 *   npm run report-product-funnel                       # 全商品
 *   npm run report-product-funnel -- --product mfa3fcffdd85d   # 販売先の ID か自社の商品 ID で絞る
 *   npm run report-product-funnel -- --json
 * exit: 0 / 2 = 取得がまだ無い（未デプロイ・未取得）
 */
import { buildProductFunnel, buildProductIndex } from './lib/product-sales.mjs';
import { affiliateMatEntries } from './lib/affiliate-catalog-mats.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { listReports } from './lib/metric-reports.mjs';
import { readJson, readJsonIf } from './lib/json-io.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const args = parseCliArgs({ product: { type: 'string' }, json: { type: 'boolean' } });
const latest = listReports(ROOT, 'ga4.product-referrals')[0];
if (!latest) {
  console.error('[report-product-funnel] GA4 の product-referrals がまだ無い（本番デプロイの後、週次の fetch-metrics が取る）');
  process.exit(2);
}
const { startDate, endDate } = latest.data.meta;
const months = [];
for (let m = startDate.slice(0, 7); m <= endDate.slice(0, 7); ) {
  months.push(m);
  const [y, mo] = m.split('-').map(Number);
  m = new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 7);
}
const ledgers = months.map((month) => readJsonIf(ROOT, datasetPath('business.product-sales', { month })) ?? { month, coverage: {}, rows: [] });
const index = buildProductIndex(readJson(ROOT, datasetPath('config.products')).products, affiliateMatEntries(readJson(ROOT, datasetPath('affiliate.catalog')), readJsonIf(ROOT, datasetPath('config.affiliate-mats'))?.mats ?? []));
const funnel = buildProductFunnel({ report: latest.data, ledgers, index });
if (args.product) funnel.rows = funnel.rows.filter((r) => r.destinationId === args.product || r.productId === args.product);

if (args.json) {
  console.log(JSON.stringify({ source: latest.ref, ...funnel }, null, 2));
} else {
  console.log(`GA4 ${startDate}〜${endDate}（${latest.ref}）・販売は暦月 ${months.join('・')}`);
  const fmt = (s) => (s.status === 'sold' ? `${s.count ?? '?'}件 ¥${s.amountYen.toLocaleString('ja-JP')}${s.provisional ? '(暫定)' : ''}` : s.status === 'measured-zero' ? '0件' : '未計測');
  for (const r of funnel.rows) {
    const ctr = r.ctr === null ? '—' : `${(r.ctr * 100).toFixed(2)}%`;
    console.log(`${r.destination}:${r.destinationId}（${r.productId ?? '商品台帳に無い'}）表示 ${r.impressions}・クリック ${r.clicks}・率 ${ctr}・販売 ${months.map((m) => `${m} ${fmt(r.sales[m])}`).join(' / ')}`);
  }
  if (!funnel.rows.length) console.log('（行が無い。awaiting-data なら本番に届く前）');
}
