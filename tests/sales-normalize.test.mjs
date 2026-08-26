import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalizeProductId,
  resolveMagazineId,
  resolveSaleEntry,
  reconcileTotal,
} from '../scripts/lib/sales-normalize.mjs';

test('既知の表記ゆれは同一 id に正規化される（DN-0018 の実例）', () => {
  assert.equal(canonicalizeProductId('bk-i-r08-yosou-4'), 'bk-i-r8-yosou-04-cn-gx');
  assert.equal(canonicalizeProductId('article:bk-i-r08-yosou-4'), 'article:bk-i-r8-yosou-04-cn-gx');
});

test('canonicalizeProductId は article: 接頭辞の有無を保つ', () => {
  assert.equal(canonicalizeProductId('essay-complete-pack'), 'essay-complete-pack');
  assert.equal(canonicalizeProductId('article:tankan-calc-6patterns'), 'article:tankan-calc-6patterns');
});

test('canonicalizeProductId は未知の id をそのまま返す', () => {
  assert.equal(canonicalizeProductId('brand-new-magazine-id'), 'brand-new-magazine-id');
});

test('canonicalizeProductId は空/未定義を素通しする', () => {
  assert.equal(canonicalizeProductId(''), '');
  assert.equal(canonicalizeProductId(undefined), undefined);
});

const MAGAZINES = [
  { id: 'essay-complete-pack', title: '総監記述式 完全パック', shortTitle: '完全パック' },
  { id: 'bk-i-required-essay-magazine', title: '技術士 建設部門 2次｜必須科目I 模範解答集', shortTitle: '必須科目I 模範解答集' },
];

test('resolveMagazineId はタイトル完全一致を最優先で解決する', () => {
  assert.equal(resolveMagazineId('総監記述式 完全パック', MAGAZINES), 'essay-complete-pack');
});

test('resolveMagazineId は shortTitle 一致でも解決する', () => {
  assert.equal(resolveMagazineId('完全パック', MAGAZINES), 'essay-complete-pack');
});

test('resolveMagazineId は部分一致（商品名がタイトルを含む）でも解決する', () => {
  assert.equal(
    resolveMagazineId('技術士 建設部門 2次｜必須科目I 模範解答集（購入）', MAGAZINES),
    'bk-i-required-essay-magazine'
  );
});

test('resolveMagazineId は一致しなければ null（誤推定より保留を優先）', () => {
  assert.equal(resolveMagazineId('まったく無関係の商品名', MAGAZINES), null);
});

test('resolveSaleEntry はマガジン一致を magazine 型で返す', () => {
  const r = resolveSaleEntry({ title: '完全パック', date: '2026-06-17' }, MAGAZINES, 0);
  assert.deepEqual(r, { type: 'magazine', productId: 'essay-complete-pack', resolved: true });
});

test('resolveSaleEntry は未一致を article:unknown-* へ保留する（人手確認用）', () => {
  const r = resolveSaleEntry({ title: '技術士 建設部門｜道路 R8予想 選択科目II-1', date: '2026-06-17' }, MAGAZINES, 2);
  assert.equal(r.resolved, false);
  assert.equal(r.productId, 'article:unknown-20260617-2');
});

test('reconcileTotal は明細合計と月次表示額が一致すれば ok', () => {
  const r = reconcileTotal([{ price: 500 }, { price: 780 }], 1280);
  assert.equal(r.ok, true);
  assert.equal(r.computed, 1280);
});

test('reconcileTotal は不一致を検出する（不一致なら書き込まない判定に使う）', () => {
  const r = reconcileTotal([{ price: 500 }], 1280);
  assert.equal(r.ok, false);
  assert.equal(r.diff, -780);
});
