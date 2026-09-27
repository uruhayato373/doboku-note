/**
 * net-receipts.test.mjs — 月の受取額（NSM）の組み立て（note の控除後・KDP の catalog 対象・欠測を 0 にしない）を固定する
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNoteSalesDetail, kdpCatalogRoyalty, buildNetReceiptsMeasurement, monthEnd } from '../scripts/lib/net-receipts.mjs';

test('note の売上詳細から売上・手数料・手数料控除後売上を読む（2026-08 の実ページ）', () => {
  const text = '2026年8月の売上詳細\n合計\n売上\n¥71,640\n手数料\n¥-11,011\n手数料控除後売上\n¥60,629\n手数料領収書';
  assert.deepEqual(parseNoteSalesDetail(text), { gross: 71640, fee: -11011, net: 60629 });
});

test('KDP は catalog 対象（bookId あり）だけを合計する', () => {
  assert.deepEqual(kdpCatalogRoyalty({ estimated: false, books: [{ bookId: 'c-04', royalty: 450 }, { bookId: null, royalty: 254 }, { bookId: 'a-01', royalty: 100 }] }), { royalty: 550, estimated: false });
});

test('3 つそろい KDP が確定なら complete で合計する（2026-08 は 74,218）', () => {
  const r = buildNetReceiptsMeasurement({ month: '2026-08', note: { gross: 71640, fee: -11011, net: 60629 }, coconala: 7800, kdp: { royalty: 5789, estimated: false } });
  assert.equal(r.coverage, 'complete');
  assert.equal(r.values.netReceipts, 74218);
  assert.deepEqual(r.period, { startDate: '2026-08-01', endDate: '2026-08-31' });
});

test('欠けたもの・KDP の推計は 0 にせず partial で値を空にする', () => {
  const r = buildNetReceiptsMeasurement({ month: '2026-09', note: { gross: 92560, fee: -14000, net: 78560 }, coconala: null, kdp: { royalty: 3000, estimated: true } });
  assert.equal(r.coverage, 'partial');
  assert.equal(r.values.netReceipts, null);
  assert.match(r.source, /欠測: ココナラ・KDP（推計のみ・確定前）/);
  assert.equal(monthEnd('2026-02'), '2026-02-28');
});
