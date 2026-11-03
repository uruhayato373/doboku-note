// tests/product-sales.test.mjs
//
// 暦月 × 商品の販売台帳（DN-0947）の計測の範囲を固定する。
// 守りたい事故: 取っていない月・締まっていない月の「行が無い」を売上 0 と読む／stats47 の本を doboku-note の売上に混ぜる／
// GA4 の product_id（販売先の ID）と台帳の商品がつながらない。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildProductIndex, buildProductSales, productIdOfDestination, salesOf } from '../scripts/lib/product-sales.mjs';

const products = [
  { id: 'pe1-chokuzen-pack', channel: 'note', catalog: { noteUrl: 'https://note.com/dobokunote/m/mfa3fcffdd85d' } },
  { id: 'kindle-a-00', channel: 'kindle', catalog: { id: 'A-00', asin: 'B0H8HW139T' } },
  { id: 'coconala-1kyu-moshi-pdf', channel: 'coconala', catalog: { serviceUrl: 'https://coconala.com/services/111' } },
];
const salesLog = {
  months: { '2026-09': { fetchedAt: '2026-10-14T08:49:01.281Z', count: 2, finalized: true }, '2026-10': { fetchedAt: '2026-10-31T00:40:31.551Z', count: 1, finalized: false } },
  sales: [
    { date: '2026-09-02', productId: 'pe1-chokuzen-pack', type: 'magazine', price: 1980 },
    { date: '2026-09-03', productId: 'membership:civil-lab-annual', type: 'membership', price: 1480 },
    { date: '2026-10-01', productId: 'pe1-chokuzen-pack', type: 'magazine', price: 1980 },
  ],
};
const royalties = {
  months: {
    '2026-09': {
      fetchedAt: '2026-10-05T00:00:00.000Z',
      estimated: false,
      scope: { missingDobokuBookIds: [] },
      books: [
        { bookId: 'A-00', royalty: 870, kenp: 20 },
        { bookId: null, title: 'データで見る47都道府県', royalty: 159, kenp: 0 },
      ],
    },
  },
};
const revenue = { fetchedAt: '2026-10-31T00:45:29.275Z', rows: [{ closedAt: '2026-09-10', talkroomId: '9', kind: 'service', netYen: 1950 }] };
const orders = { orders: [{ talkroomId: '9', serviceId: 'coconala-1kyu-moshi-pdf' }] };
const reportLog = { monthly: [{ month: '2026-09', clicks: 10, conversions: 0, approved: 0, revenueYen: 0, pendingRevenueYen: 0, fetchedAt: '2026-10-01T00:00:00.000Z' }] };
const build = (month) => buildProductSales({ month, products, salesLog, royalties, revenue, orders, reportLog });

test('締まった月は販売先ごとに measured、売れた商品は販売先の ID を持つ', () => {
  const l = build('2026-09');
  assert.equal(l.coverage.note.status, 'measured');
  assert.equal(l.coverage.amazon.status, 'measured');
  assert.equal(l.coverage.coconala.status, 'measured');
  assert.equal(l.coverage.a8.status, 'account-only');
  assert.deepEqual(l.rows.find((r) => r.productId === 'pe1-chokuzen-pack').destinationIds, ['mfa3fcffdd85d']);
  assert.deepEqual(l.rows.find((r) => r.productId === 'membership:civil-lab-annual').destinationIds, ['membership']);
  assert.deepEqual(l.rows.find((r) => r.destination === 'amazon'), { destination: 'amazon', productId: 'kindle-a-00', bookId: 'A-00', destinationIds: ['B0H8HW139T'], count: null, amountYen: 870, kenpYen: 20 });
  assert.equal(l.rows.find((r) => r.destination === 'coconala').amountYen, 1950);
});

test('KDP の書籍 ID が付かない行（stats47 の本）は売上に入れず除外として残す', () => {
  const l = build('2026-09');
  assert.equal(l.rows.filter((r) => r.destination === 'amazon').length, 1);
  assert.equal(l.excluded.amazon.rows, 1);
  assert.equal(l.excluded.amazon.royaltyYen, 159);
});

test('行が無い商品: measured の月は計測済み・0 件、締まっていない月・取っていない月は未計測', () => {
  assert.deepEqual(salesOf(build('2026-09'), 'coconala', 'coconala-other'), { status: 'measured-zero', count: 0, amountYen: 0, provisional: false });
  const oct = build('2026-10');
  assert.equal(oct.coverage.note.status, 'partial');
  assert.deepEqual(salesOf(oct, 'note', 'civil-2-anki-note'), { status: 'unmeasured' });
  assert.equal(salesOf(oct, 'note', 'pe1-chokuzen-pack').status, 'sold');
  const aug = build('2026-08');
  assert.equal(aug.coverage.note.status, 'unmeasured');
  assert.equal(aug.coverage.amazon.status, 'unmeasured');
  assert.deepEqual(salesOf(aug, 'amazon', 'kindle-a-00'), { status: 'unmeasured' });
});

test('月末より前に取った KDP の月は partial', () => {
  const r = { months: { '2026-09': { ...royalties.months['2026-09'], fetchedAt: '2026-09-28T00:00:00.000Z' } } };
  const l = buildProductSales({ month: '2026-09', products, salesLog, royalties: r, revenue, orders, reportLog });
  assert.equal(l.coverage.amazon.status, 'partial');
});

test('GA4 の販売先 ID から自社の商品 ID を引ける', () => {
  const index = buildProductIndex(products);
  assert.equal(productIdOfDestination(index, 'note', 'mfa3fcffdd85d'), 'pe1-chokuzen-pack');
  assert.equal(productIdOfDestination(index, 'amazon', 'B0H8HW139T'), 'kindle-a-00');
  assert.equal(productIdOfDestination(index, 'coconala', '111'), 'coconala-1kyu-moshi-pdf');
  assert.equal(productIdOfDestination(index, 'note', 'membership'), 'membership');
  assert.equal(productIdOfDestination(index, 'note', 'n0000'), null);
});
