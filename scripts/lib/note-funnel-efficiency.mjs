const PRODUCT_LABEL_RE = /^([a-z0-9][a-z0-9-]+):(.+)$/;

export function productIdFromLabel(label) {
  const match = String(label ?? '').match(PRODUCT_LABEL_RE);
  if (!match) return null;
  const productId = match[1];
  if (productId.startsWith('category-')) return null;
  return productId;
}

export function ctaProductIdFromSalesProductId(productId) {
  const value = String(productId ?? '');
  if (value === 'bk-i-required-essay-magazine') return 'pe-construction-required-magazine';
  const secondary = value.match(/^bk-(.+)-secondary-magazine$/);
  if (secondary) return `pe-construction-${secondary[1]}-magazine`;
  const pack = value.match(/^bk-(.+)-pack$/);
  if (pack) return `pe-construction-${pack[1]}-pack`;
  return value;
}

function blankProduct(productId) {
  return {
    productId,
    impressions: 0,
    clicks: 0,
    ctr: null,
    sales: 0,
    revenue: 0,
    salesPerClick: null,
    salesProductIds: [],
  };
}

export function buildNoteFunnelEfficiency({ ga4, salesLog }) {
  const startDate = ga4?.meta?.startDate ?? null;
  const endDate = ga4?.meta?.endDate ?? null;
  if (!startDate || !endDate) throw new Error('GA4 snapshot meta.startDate/endDate が必要です');

  const products = new Map();
  let excludedGa4Rows = 0;
  for (const row of ga4.rows ?? ga4.data ?? []) {
    if (!['note_cta_click', 'note_cta_impression'].includes(row.eventName)) continue;
    const productId = productIdFromLabel(row.label);
    if (!productId) {
      excludedGa4Rows += 1;
      continue;
    }
    const product = products.get(productId) ?? blankProduct(productId);
    const count = Number(row.eventCount ?? 0);
    if (row.eventName === 'note_cta_click') product.clicks += count;
    if (row.eventName === 'note_cta_impression') product.impressions += count;
    products.set(productId, product);
  }

  let excludedArticleSales = 0;
  let excludedOutsideWindow = 0;
  for (const sale of salesLog?.sales ?? []) {
    const date = String(sale.date ?? '').slice(0, 10);
    if (date < startDate || date > endDate) {
      excludedOutsideWindow += 1;
      continue;
    }
    if (sale.type !== 'magazine' || String(sale.productId ?? '').startsWith('article:')) {
      excludedArticleSales += 1;
      continue;
    }
    const salesProductId = String(sale.productId ?? '');
    if (!salesProductId) continue;
    const productId = ctaProductIdFromSalesProductId(salesProductId);
    const product = products.get(productId) ?? blankProduct(productId);
    product.sales += 1;
    product.revenue += Number(sale.price ?? 0);
    if (!product.salesProductIds.includes(salesProductId)) product.salesProductIds.push(salesProductId);
    products.set(productId, product);
  }

  const rows = [...products.values()]
    .map((row) => ({
      ...row,
      ctr: row.impressions > 0 ? row.clicks / row.impressions : null,
      salesPerClick: row.clicks > 0 ? row.sales / row.clicks : null,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.sales - a.sales || b.clicks - a.clicks || a.productId.localeCompare(b.productId));

  return {
    schemaVersion: 1,
    window: { startDate, endDate },
    generatedAt: new Date().toISOString(),
    rows,
    summary: {
      products: rows.length,
      impressions: rows.reduce((sum, row) => sum + row.impressions, 0),
      clicks: rows.reduce((sum, row) => sum + row.clicks, 0),
      sales: rows.reduce((sum, row) => sum + row.sales, 0),
      revenue: rows.reduce((sum, row) => sum + row.revenue, 0),
      excludedGa4Rows,
      excludedArticleSales,
      excludedOutsideWindow,
    },
    interpretation: {
      metric: '同一期間のマガジン売上件数 ÷ 商品ID付きnote CTAクリック数',
      limitation: 'クリックと購入者を結合していない期間集計であり、個別購入の因果attributionやCVRではない。',
    },
  };
}

function pct(value) {
  return value == null ? 'n.d.' : `${(value * 100).toFixed(1)}%`;
}

export function renderNoteFunnelEfficiencyMarkdown(report, sources = {}) {
  const lines = [
    '# note 商品別ファネル効率',
    '',
    `期間: ${report.window.startDate}〜${report.window.endDate}`,
    '',
    '> この表は同一期間のクリックと売上を並べた診断指標です。購入者単位で結合していないため、CVR・因果 attribution とは呼びません。',
    '',
    '| 商品ID | 表示 | クリック | CTR | 売上 | 売上高 | 売上÷クリック |',
    '|---|---:|---:|---:|---:|---:|---:|',
  ];
  for (const row of report.rows) {
    const alias = row.salesProductIds.length > 0 && !row.salesProductIds.includes(row.productId)
      ? `（sales: ${row.salesProductIds.join(', ')}）`
      : '';
    lines.push(`| ${row.productId}${alias} | ${row.impressions} | ${row.clicks} | ${pct(row.ctr)} | ${row.sales} | ¥${row.revenue.toLocaleString('ja-JP')} | ${pct(row.salesPerClick)} |`);
  }
  if (report.rows.length === 0) lines.push('| （対象なし） | 0 | 0 | n.d. | 0 | ¥0 | n.d. |');
  lines.push(
    '',
    `除外: 商品IDを持たないGA4行 ${report.summary.excludedGa4Rows}、単品記事売上 ${report.summary.excludedArticleSales}。`,
    '',
    `入力: GA4=${sources.ga4 ?? 'n.d.'} / sales=${sources.sales ?? 'n.d.'}`,
    '',
  );
  return lines.join('\n');
}
