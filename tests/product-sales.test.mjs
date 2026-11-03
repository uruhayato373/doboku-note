// tests/product-sales.test.mjs
//
// 暦月 × 商品の販売台帳（DN-0947）の計測の範囲を固定する。
// 守りたい事故: 取っていない月・締まっていない月の「行が無い」を売上 0 と読む／stats47 の本を doboku-note の売上に混ぜる／
// GA4 の product_id（販売先の ID）と台帳の商品がつながらない。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildProductFunnel, buildProductIndex, buildProductSales, productIdOfDestination, salesByDestinationId, salesOf } from '../scripts/lib/product-sales.mjs';

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

test('表示 → クリック → 販売を販売先の ID で並べ、販売は月の範囲どおりに読む', () => {
  const report = {
    meta: { startDate: '2026-09-20', endDate: '2026-10-17' },
    rows: [
      { destination: 'note', productId: 'mfa3fcffdd85d', placement: 'article-top', eventName: 'product_impression', eventCount: 150 },
      { destination: 'note', productId: 'mfa3fcffdd85d', placement: 'article-top', eventName: 'product_click', eventCount: 3 },
      { destination: 'note', productId: 'mfa3fcffdd85d', placement: 'article-sidebar', eventName: 'product_impression', eventCount: 50 },
      { destination: 'a8', productId: '4B5OO5+FHBA2+5B0Y+NTZCH', placement: 'article-mid', eventName: 'product_impression', eventCount: 40 },
    ],
  };
  const f = buildProductFunnel({ report, ledgers: [build('2026-09'), build('2026-10')], index: buildProductIndex(products) });
  const note = f.rows.find((r) => r.destination === 'note');
  assert.equal(note.productId, 'pe1-chokuzen-pack');
  assert.equal(note.impressions, 200);
  assert.equal(note.clicks, 3);
  assert.equal(note.ctr, 3 / 200);
  assert.deepEqual(note.placements['article-sidebar'], { impressions: 50, clicks: 0 });
  assert.equal(note.sales['2026-09'].status, 'sold');
  assert.equal(note.sales['2026-10'].status, 'sold');
  const a8 = f.rows.find((r) => r.destination === 'a8');
  assert.equal(a8.productId, null);
  assert.equal(a8.ctr, null, '表示 100 件未満はクリック率を出さない');
  assert.deepEqual(a8.sales['2026-09'], { status: 'unmeasured' });
});

test('販売先の ID で引く: メンバーシップは複数プランを合わせ、measured の月の未販売は 0 件', () => {
  const sep = build('2026-09');
  assert.equal(salesByDestinationId(sep, 'note', 'membership').amountYen, 1480);
  assert.deepEqual(salesByDestinationId(sep, 'note', 'n0000'), { status: 'measured-zero', count: 0, amountYen: 0, provisional: false });
  assert.deepEqual(salesByDestinationId(build('2026-10'), 'note', 'n0000'), { status: 'unmeasured' });
});

test('A8 は単月の案件別の行を数え、a8mat から案件へ引き当てる。stats47 の案件（program 無し）は数えない', () => {
  const mats = [{ mat: '4B5OO5+FHBA2+5B0Y+NTZCH', program: 'buildjob' }];
  const log = {
    monthly: [{ month: '2026-10', clicks: 900, conversions: 1, approved: 0, revenueYen: 0, pendingRevenueYen: 0, fetchedAt: '2026-11-01T00:00:00.000Z' }],
    programPeriod: [
      { period: '202610-202610', programId: 's1', program: 'buildjob', clicks: 70, conversions: 1, grossRevenueYen: 13534, approved: 0, revenueYen: 0, pendingCount: 0, pendingRevenueYen: 0, fetchedAt: '2026-10-20T00:00:00.000Z' },
      { period: '202610-202610', programId: 's1', program: 'buildjob', clicks: 72, conversions: 1, grossRevenueYen: 13534, approved: 0, revenueYen: 0, pendingCount: 0, pendingRevenueYen: 0, fetchedAt: '2026-11-01T00:00:00.000Z' },
      { period: '202610-202610', programId: 's2', program: 'kensetsu-jobs', clicks: 27, conversions: 0, grossRevenueYen: 0, approved: 0, revenueYen: 0, pendingCount: 0, fetchedAt: '2026-11-01T00:00:00.000Z' },
      { period: '202610-202610', programId: 's9', program: null, clicks: 40, conversions: 2, grossRevenueYen: 900, approved: 1, revenueYen: 300, fetchedAt: '2026-11-01T00:00:00.000Z' },
      { period: '202601-202610', programId: 's1', program: 'buildjob', clicks: 500, conversions: 3, fetchedAt: '2026-11-01T00:00:00.000Z' },
    ],
  };
  const l = buildProductSales({ month: '2026-10', products, mats, salesLog, royalties, revenue, orders, reportLog: log });
  assert.equal(l.coverage.a8.status, 'measured');
  assert.equal(l.coverage.a8.otherPrograms, 1);
  const rows = l.rows.filter((r) => r.destination === 'a8');
  assert.deepEqual(rows, [{ destination: 'a8', productId: 'buildjob', destinationIds: ['4B5OO5+FHBA2+5B0Y+NTZCH'], count: 1, amountYen: 0, grossYen: 13534, approvedCount: 0, pendingYen: 0, clicks: 72 }]);
  assert.deepEqual(salesByDestinationId(l, 'a8', '4B5OO5+FHBA2+5B0Y+NTZCH'), { status: 'sold', count: 1, amountYen: 0, provisional: false });
  assert.equal(productIdOfDestination(buildProductIndex(products, mats), 'a8', '4B5OO5+FHBA2+5B0Y+NTZCH'), 'buildjob');
  // 案件別を単月で取っていない月は口座全体だけ
  assert.equal(buildProductSales({ month: '2026-09', products, mats, salesLog, royalties, revenue, orders, reportLog: log }).coverage.a8.status, 'unmeasured');
});
