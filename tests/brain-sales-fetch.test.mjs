import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBrainSales, mergeMonth } from '../scripts/brain-sales-fetch.mjs';

const LISTINGS = [
  { id: 'brain-civil-essay-kit', title: 'Claude Codeで作る 1級・2級土木「施工経験記述」設計キット｜設問整理・答案案・字数検査まで' },
  { id: 'brain-sokan-policy-bank', title: 'Claude Codeで作る 技術士総監「出題テーマ分析・国家施策バンク」設計キット｜設問3の施策を根拠つきで備蓄' },
];

test('normalizeBrainSales はタイトル完全一致で productId を解決する', () => {
  const rows = [
    { title: LISTINGS[0].title, date: '2026-09-05', amount: 7980 },
    { title: LISTINGS[1].title, date: '2026-09-12', amount: 9800 },
  ];
  const result = normalizeBrainSales(rows, LISTINGS, '2026-09');
  assert.equal(result.productsListed, 2);
  assert.equal(result.totalYen, 17780);
  assert.equal(result.rows[0].productId, 'brain-civil-essay-kit');
  assert.equal(result.rows[1].productId, 'brain-sokan-policy-bank');
});

test('normalizeBrainSales は未一致タイトルを brain:unknown-<slug> で保留する（捏造しない）', () => {
  const rows = [{ title: '新商品テスト販売', date: '2026-09-05', amount: 1000 }];
  const result = normalizeBrainSales(rows, LISTINGS, '2026-09');
  assert.equal(result.productsListed, 1);
  assert.match(result.rows[0].productId, /^brain:unknown-/);
});

test('normalizeBrainSales は対象月以外の行を除外する', () => {
  const rows = [
    { title: LISTINGS[0].title, date: '2026-08-30', amount: 7980 },
    { title: LISTINGS[0].title, date: '2026-09-01', amount: 7980 },
  ];
  const result = normalizeBrainSales(rows, LISTINGS, '2026-09');
  assert.equal(result.productsListed, 1);
  assert.equal(result.rows[0].date, '2026-09-01');
});

test('normalizeBrainSales は 0 件のとき productsListed:0・rows:[]・totalYen:0 を返す（0 件と未取得の区別は呼び出し側の責務）', () => {
  const result = normalizeBrainSales([], LISTINGS, '2026-09');
  assert.deepEqual(result, { productsListed: 0, rows: [], totalYen: 0 });
});

test('normalizeBrainSales は rows が未定義でも例外を投げない', () => {
  const result = normalizeBrainSales(undefined, LISTINGS, '2026-09');
  assert.equal(result.productsListed, 0);
});

test('mergeMonth は既存 state が無いとき新規に schemaVersion 1 の state を作る', () => {
  const incoming = { month: '2026-09', productsListed: 1, rows: [{ productId: 'brain-civil-essay-kit', title: 't', date: '2026-09-05', amount: 7980 }], totalYen: 7980 };
  const state = mergeMonth(null, incoming, '2026-09-21T10:00:00.000Z');
  assert.equal(state.schemaVersion, 1);
  assert.equal(state.updatedAt, '2026-09-21');
  assert.equal(state.months['2026-09'].productsListed, 1);
  assert.equal(state.months['2026-09'].fetchedAt, '2026-09-21T10:00:00.000Z');
  assert.equal(state.months['2026-09'].supersedes, undefined);
});

test('mergeMonth は同月の再取得で前回値を supersedes へ退避してから差し替える（追記専用）', () => {
  const existing = {
    schemaVersion: 1,
    updatedAt: '2026-09-10',
    months: {
      '2026-09': { productsListed: 1, rows: [{ productId: 'a', title: 'a', date: '2026-09-05', amount: 100 }], totalYen: 100, fetchedAt: '2026-09-10T00:00:00.000Z' },
    },
  };
  const incoming = { month: '2026-09', productsListed: 2, rows: [{ productId: 'a', title: 'a', date: '2026-09-05', amount: 100 }, { productId: 'b', title: 'b', date: '2026-09-15', amount: 200 }], totalYen: 300 };
  const state = mergeMonth(existing, incoming, '2026-09-21T10:00:00.000Z');
  assert.equal(state.months['2026-09'].productsListed, 2);
  assert.equal(state.months['2026-09'].totalYen, 300);
  assert.ok(state.months['2026-09'].supersedes);
  assert.equal(state.months['2026-09'].supersedes.productsListed, 1);
  assert.equal(state.months['2026-09'].supersedes.totalYen, 100);
  assert.equal(state.months['2026-09'].supersedes.fetchedAt, '2026-09-10T00:00:00.000Z');
});

test('mergeMonth は他の月のエントリを保持したまま対象月だけ更新する', () => {
  const existing = {
    schemaVersion: 1,
    updatedAt: '2026-08-31',
    months: {
      '2026-08': { productsListed: 1, rows: [], totalYen: 500, fetchedAt: '2026-08-31T00:00:00.000Z' },
    },
  };
  const incoming = { month: '2026-09', productsListed: 1, rows: [], totalYen: 700 };
  const state = mergeMonth(existing, incoming, '2026-09-21T10:00:00.000Z');
  assert.ok(state.months['2026-08']);
  assert.equal(state.months['2026-08'].totalYen, 500);
  assert.equal(state.months['2026-09'].totalYen, 700);
});

test('mergeMonth は incoming.month が無いと例外を投げる', () => {
  assert.throws(() => mergeMonth(null, { productsListed: 0, rows: [], totalYen: 0 }, '2026-09-21T00:00:00.000Z'));
});
