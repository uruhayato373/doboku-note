/**
 * net-receipts.test.mjs — 月の受取額（NSM）の組み立て（note の控除後・KDP の catalog 対象・欠測を 0 にしない）を固定する
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseNoteSalesDetail, kdpCatalogRoyalty, buildNetReceiptsMeasurement, monthEnd, netReceiptsSupersedes, monthReceipts, kdpMonthsDue, isKdpEstimated, kdpRoyaltyFinalizeDate,
  isNoteSalesAggregating, noteSalesFinalizeDate, noteSalesPendingMessage,
} from '../scripts/lib/net-receipts.mjs';

test('note の前月売上は翌月 2 日に確定し、集計中の文言を見分ける（2026-10-01 実画面）', () => {
  assert.equal(noteSalesFinalizeDate('2026-09'), '2026-10-02');
  assert.equal(noteSalesFinalizeDate('2026-12'), '2027-01-02');
  assert.equal(isNoteSalesAggregating('未振込の売上\n集計中\nただいま前月の売上を集計中です。売上は毎月2日に確定します。'), true);
  assert.equal(isNoteSalesAggregating('処理済みの売上\n2026年8月\t2026年9月末予定\t¥71,640'), false);
  assert.match(noteSalesPendingMessage('2026-09'), /2026-10-02 以降/);
});

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

test('同じ月の記録があれば訂正先にし、complete を partial で上書きしない（2026-10-11 の取り直し）', () => {
  const partial = buildNetReceiptsMeasurement({ month: '2026-09', note: { net: 89402 }, coconala: 13650, kdp: null });
  const complete = buildNetReceiptsMeasurement({ month: '2026-09', note: { net: 89402 }, coconala: 13650, kdp: { royalty: 4000, estimated: false } });
  const file = (r, name) => ({ ...r, file: `data/business/records/${name}.json` });
  const other = file(buildNetReceiptsMeasurement({ month: '2026-08', note: { net: 60629 }, coconala: 7800, kdp: { royalty: 5789, estimated: false } }), 'm-08');
  assert.deepEqual(netReceiptsSupersedes([other], partial), { supersedes: null });
  assert.deepEqual(netReceiptsSupersedes([other, file(partial, 'm-09p')], complete), { supersedes: 'data/business/records/m-09p.json' });
  assert.deepEqual(netReceiptsSupersedes([file(partial, 'm-09p')], partial), { supersedes: 'data/business/records/m-09p.json' });
  assert.match(netReceiptsSupersedes([file(complete, 'm-09c')], partial).error, /complete/);
});

test('KDP は翌月 16 日以降に取った値だけ確定。週次は当月と確定前の前月を取る（2026-10-11）', () => {
  assert.equal(kdpRoyaltyFinalizeDate('2026-09'), '2026-10-16');
  assert.equal(kdpRoyaltyFinalizeDate('2026-12'), '2027-01-16');
  assert.equal(isKdpEstimated('2026-09', '2026-10-11'), true);
  assert.equal(isKdpEstimated('2026-09', '2026-10-16'), false);
  assert.equal(isKdpEstimated('2026-10', '2026-10-11'), true);
  assert.deepEqual(kdpMonthsDue({ months: { '2026-08': { estimated: false } } }, '2026-10-11'), ['2026-09', '2026-10']);
  assert.deepEqual(kdpMonthsDue({ months: { '2026-09': { estimated: true } } }, '2026-10-20'), ['2026-09', '2026-10']);
  assert.deepEqual(kdpMonthsDue({ months: { '2026-09': { estimated: false } } }, '2026-10-20'), ['2026-10']);
  assert.deepEqual(kdpMonthsDue(null, '2027-01-05'), ['2026-12', '2027-01']);
});

const noteSales = {
  updatedAt: '2026-10-08',
  sales: [{ date: '2026-09-03', price: 106800 }, { date: '2026-10-02', price: 8420 }],
  months: {
    '2026-08': { fetchedAt: '2026-10-01T06:32:05.835Z', count: 26, total: 71640, finalized: true, net: 60629, fee: 11011 },
    '2026-09': { fetchedAt: '2026-10-02T13:57:22.522Z', count: 35, total: 106800, finalized: true, net: 89402, fee: 17398 },
    '2026-10': { fetchedAt: '2026-10-08T01:10:33.000Z', count: 10, total: 25400, finalized: false },
  },
};
const coconalaRevenue = {
  fetchedAt: '2026-10-11T00:52:58.178Z',
  rows: [
    { closedAt: '2026-09-25', talkroomId: '18351970', kind: 'tip', netYen: 7020 },
    { closedAt: '2026-09-25', talkroomId: '18351970', kind: 'service', netYen: 4680 },
    { closedAt: '2026-09-10', talkroomId: '18194267', kind: 'service', netYen: 1950 },
  ],
};
const kdpRoyalties = { months: { '2026-09': { fetchedAt: '2026-10-16T21:50:00.000Z', estimated: false, books: [{ bookId: 'J01', royalty: 4000 }, { bookId: null, royalty: 999 }] } } };

test('月の受取額は台帳の取得分を合計し、チャネルごとに確定・途中・推計・未取得を持つ（欠けたチャネルは 0 にしない）', () => {
  const sep = monthReceipts({ month: '2026-09', noteSales, coconalaRevenue, kdpRoyalties });
  assert.deepEqual(sep.channels.map((c) => [c.id, c.value, c.status]), [['note', 89402, 'final'], ['coconala', 13650, 'final'], ['kdp', 4000, 'final']]);
  assert.equal(sep.total, 107052);
  assert.equal(sep.complete, true);

  const oct = monthReceipts({ month: '2026-10', noteSales, coconalaRevenue, kdpRoyalties });
  const [note, coco, kdp] = oct.channels;
  // 確定前の note は直近の確定月（9 月: 89,402 / 106,800）の割合で推計する
  assert.equal(note.status, 'estimate');
  assert.equal(note.value, Math.round(25400 * (89402 / 106800)));
  assert.equal(note.asOf, '2026-10-08');
  assert.deepEqual([coco.value, coco.status, coco.asOf], [0, 'to-date', '2026-10-11']);
  assert.deepEqual([kdp.value, kdp.status], [null, 'missing']);
  assert.equal(oct.total, note.value);
  assert.equal(oct.complete, false);

  const none = monthReceipts({ month: '2026-11', noteSales: null, coconalaRevenue: null, kdpRoyalties: null });
  assert.equal(none.total, null);
  assert.ok(none.channels.every((c) => c.status === 'missing'));
});

test('KDP は最初の本の出版月より前を 0 円で確定にする（未取得と区別する）', () => {
  const jun = monthReceipts({ month: '2026-06', noteSales: null, coconalaRevenue: null, kdpRoyalties: { months: {} }, kdpFirstMonth: '2026-07' });
  assert.deepEqual([jun.channels[2].value, jun.channels[2].status], [0, 'final']);
  const jul = monthReceipts({ month: '2026-07', noteSales: null, coconalaRevenue: null, kdpRoyalties: { months: {} }, kdpFirstMonth: '2026-07' });
  assert.equal(jul.channels[2].status, 'missing');
});

test('過去月の note は直前に確定月が無ければ直後の確定月の割合で推計する', () => {
  const log = { sales: [{ date: '2026-06-10', price: 10000 }], months: { '2026-08': { fetchedAt: '2026-10-01T00:00:00.000Z', count: 1, total: 20000, finalized: true, net: 17000 } } };
  const r = monthReceipts({ month: '2026-06', noteSales: log, coconalaRevenue: null, kdpRoyalties: null });
  assert.deepEqual([r.channels[0].value, r.channels[0].status], [8500, 'estimate']);
  assert.match(r.channels[0].note, /2026-08 の実績/);
});
