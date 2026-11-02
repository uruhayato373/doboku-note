// tests/sales-attribution.test.mjs
//
// 売上台帳の productId と商品の正本（products.json）の id の系統差を、結合して資格・型へ帰属させる（DN-0930）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { classifySale, joinSaleProduct, loadLineupConfig, withSaleProducts } from '../scripts/lib/product-lineup.mjs';
import { salesAttribution } from '../scripts/lib/sales-attribution.mjs';
import { readDataset } from '../scripts/lib/dataset-io.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const BASE = {
  qualifications: [
    { id: 'pe-construction', stages: [{ id: 'written' }] },
    { id: 'civil-1', stages: [{ id: 'second' }] },
  ],
  salesRules: [{ match: '^bk-', cells: ['pe-construction:written'] }],
  rules: { note: [{ match: '^civil-1-', cells: ['civil-1:second'] }] },
};
const PRODUCTS = [
  { id: 'pe-construction-road-pack', channel: 'note', qualification: 'pe-construction', stage: 'written', catalog: { published: true } },
  { id: 'civil-1-x-pack', channel: 'note', qualification: 'civil-1', stage: 'second', catalog: { published: true } },
  { id: 'civil-1-unsold', channel: 'note', qualification: 'civil-1', stage: 'second', catalog: { published: true, price: '¥980' } },
  { id: 'civil-1-draft', channel: 'note', qualification: 'civil-1', stage: 'second', catalog: { published: false } },
  { id: 'odd-membership', channel: 'note', qualification: 'civil-1-2', stage: 'second', catalog: { published: true } },
];

test('建設部門の商品 id は台帳の bk-* 系統で結合する', () => {
  const config = withSaleProducts(BASE, PRODUCTS);
  assert.equal(joinSaleProduct(config, 'bk-road-pack')?.id, 'pe-construction-road-pack');
  assert.equal(joinSaleProduct(config, 'civil-1-x-pack')?.id, 'civil-1-x-pack');
  assert.equal(joinSaleProduct(config, 'article:bk-01-road-r8-yosou-ii1'), null, '単品記事は商品ではない');
});

test('資格・区分がマスに無い商品は結合しない（正規表現へ回す）', () => {
  const config = withSaleProducts(BASE, PRODUCTS);
  assert.equal(joinSaleProduct(config, 'odd-membership'), null);
});

test('classifySale: 結合できれば商品のマス、できなければ規則', () => {
  const config = withSaleProducts(BASE, PRODUCTS);
  assert.deepEqual(classifySale(config, 'bk-road-pack'), ['pe-construction:written']);
  assert.deepEqual(classifySale(config, 'article:civil-1-keiken-pack-3'), ['civil-1:second']);
  assert.equal(classifySale(config, 'article:unknown-20260101-0'), null);
});

test('salesAttribution: 帰属の根拠・未帰属・販売 0 の公開商品を数える', () => {
  const config = withSaleProducts(BASE, PRODUCTS);
  const sales = [
    { date: '2026-06-01', productId: 'bk-road-pack', price: 100 },
    { date: '2026-06-02', productId: 'article:civil-1-keiken-pack-3', price: 100 },
    { date: '2026-06-03', productId: 'article:unknown-20260603-0', price: 100 },
    { date: '2026-12-01', productId: 'civil-1-x-pack', price: 100 },
  ];
  const r = salesAttribution(config, sales, { startDate: '2026-05-01', endDate: '2026-10-31' }, PRODUCTS);
  assert.equal(r.total, 3);
  assert.deepEqual(r.via, { product: 1, rule: 1, none: 1 });
  assert.deepEqual(r.unattributedIds, ['article:unknown-20260603-0']);
  assert.deepEqual(r.unsold['civil-1'].map((i) => i.id), ['civil-1-x-pack', 'civil-1-unsold']);
  assert.equal(r.unsold['pe-construction'], undefined);
});

test('実データ: sales.json の全件がマスに帰属し、結合した商品の台帳が実 config と矛盾しない', () => {
  const config = loadLineupConfig(REPO_ROOT);
  const sales = readDataset(REPO_ROOT, 'note.sales').sales;
  const products = readDataset(REPO_ROOT, 'config.products').products;
  const r = salesAttribution(config, sales, { startDate: '0000-01-01', endDate: '9999-12-31' }, products);
  assert.ok(r.total > 0 && r.via.product > 0, '結合した販売が 1 件以上ある');
  assert.deepEqual(r.unattributedIds, [], '未帰属の productId がある');
  // 結合は規則と同じ資格に着く（結合を足しても規則の判定を変えない）
  const ruleOnly = { ...config, saleProducts: undefined };
  for (const s of sales) {
    if (!joinSaleProduct(config, s.productId)) continue;
    assert.deepEqual(classifySale(config, s.productId), classifySale(ruleOnly, s.productId), s.productId);
  }
});
