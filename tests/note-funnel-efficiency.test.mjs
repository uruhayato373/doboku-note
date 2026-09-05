import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildNoteFunnelEfficiency,
  ctaProductIdFromSalesProductId,
  productIdFromLabel,
  renderNoteFunnelEfficiencyMarkdown,
} from '../scripts/lib/note-funnel-efficiency.mjs';

test('商品ID付きlabelだけを安定して解決する', () => {
  assert.equal(productIdFromLabel('civil-1-pack:article-top'), 'civil-1-pack');
  assert.equal(productIdFromLabel('category-civil-1-hub'), null);
  assert.equal(productIdFromLabel('plain-label'), null);
});

test('sales-log独自の建設部門IDをCTAの商品IDへ正規化する', () => {
  assert.equal(ctaProductIdFromSalesProductId('bk-i-required-essay-magazine'), 'pe-construction-required-magazine');
  assert.equal(ctaProductIdFromSalesProductId('bk-railway-secondary-magazine'), 'pe-construction-railway-magazine');
  assert.equal(ctaProductIdFromSalesProductId('bk-road-pack'), 'pe-construction-road-pack');
  assert.equal(ctaProductIdFromSalesProductId('civil-1-pack'), 'civil-1-pack');
});

test('同一窓のマガジン売上と商品別CTAを集計し、単品記事を除外する', () => {
  const report = buildNoteFunnelEfficiency({
    ga4: {
      meta: { startDate: '2026-08-07', endDate: '2026-09-03' },
      rows: [
        { label: 'civil-1-pack:top', eventName: 'note_cta_impression', eventCount: 100 },
        { label: 'civil-1-pack:top', eventName: 'note_cta_click', eventCount: 10 },
        { label: 'category-civil-1-hub', eventName: 'note_cta_click', eventCount: 3 },
      ],
    },
    salesLog: {
      sales: [
        { date: '2026-08-20', type: 'magazine', productId: 'civil-1-pack', price: 2980 },
        { date: '2026-08-21', type: 'article', productId: 'article:single', price: 980 },
        { date: '2026-07-01', type: 'magazine', productId: 'civil-1-pack', price: 2980 },
      ],
    },
  });
  assert.deepEqual(report.rows[0], {
    productId: 'civil-1-pack',
    impressions: 100,
    clicks: 10,
    ctr: 0.1,
    sales: 1,
    revenue: 2980,
    salesPerClick: 0.1,
    salesProductIds: ['civil-1-pack'],
  });
  assert.equal(report.summary.excludedGa4Rows, 1);
  assert.equal(report.summary.excludedArticleSales, 1);
  assert.equal(report.summary.excludedOutsideWindow, 1);
});

test('Markdownは期間効率をCVRと誤認しない注意書きを持つ', () => {
  const report = buildNoteFunnelEfficiency({
    ga4: { meta: { startDate: '2026-08-01', endDate: '2026-08-31' }, rows: [] },
    salesLog: { sales: [] },
  });
  const markdown = renderNoteFunnelEfficiencyMarkdown(report);
  assert.match(markdown, /CVR・因果 attribution とは呼びません/);
});
