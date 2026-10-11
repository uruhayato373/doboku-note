/**
 * net-receipts.mjs — 月の受取額（NSM・netReceipts）を組み立てる唯一の実装（純関数）。
 * ---------------------------------------------------------------------------
 * 受取額 = note の手数料控除後売上 ＋ ココナラの手数料控除後売上（トークルームのクローズ日で計上）
 *        ＋ KDP ロイヤリティ確定値（catalog 対象書籍のみ）。振込手数料は含めない（15_KPIツリー.md）。
 * 読み手: scripts/record-net-receipts.mjs（月次の記録）・scripts/note-sales-fetch.mjs（集計中の判定）・scripts/kdp-report.mjs（推計か・取る月）・
 *         管理画面のトップ（net-receipts-ledger.mjs 経由で月の受取額と途中経過）・tests/net-receipts.test.mjs。
 * ---------------------------------------------------------------------------
 */

import { todayJst } from './jst-date.mjs';

/**
 * note は前月の売上を毎月 2 日に確定する。それまで売上管理は「ただいま前月の売上を集計中です」と出し、
 * 処理済みの表に前月の行が無く、月別詳細にも合計・手数料控除後売上が出ない（2026-10-01 実画面）。
 */
export function noteSalesFinalizeDate(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 2)).toISOString().slice(0, 10);
}

/** day（JST の YYYY-MM-DD）の時点で、note の month の売上・アクセスが確定しているか。 */
export function isNoteMonthFinalized(month, day) {
  return typeof day === 'string' && day >= noteSalesFinalizeDate(month);
}

/** 期間（startDate〜endDate）にかかる月のうち、day の時点で note がまだ確定していない月と確定日。 */
export function noteMonthsPendingFinalization(period, day) {
  const months = [...new Set([period.startDate.slice(0, 7), period.endDate.slice(0, 7)])];
  return months.filter((month) => !isNoteMonthFinalized(month, day)).map((month) => ({ source: 'note', month, finalizeDate: noteSalesFinalizeDate(month) }));
}

/** 売上管理の本文が「前月の売上を集計中」か。 */
export function isNoteSalesAggregating(text) {
  return /前月の売上を集計中/.test(String(text ?? ''));
}

/** 集計中で止めるときの 1 行（YYYY-MM と確定日を示す）。 */
export function noteSalesPendingMessage(month) {
  return `${month} の note 売上はまだ集計中（note は毎月 2 日に確定）。${noteSalesFinalizeDate(month)} 以降に再実行する`;
}

/** note の月別売上詳細ページ（/dashboard/salesmanage?datespan=YYYYMM）の本文から売上・手数料・控除後を読む。 */
export function parseNoteSalesDetail(text) {
  const yen = (label) => {
    const m = new RegExp(`${label}\\s*¥\\s*(-?[\\d,]+)`).exec(String(text));
    return m ? Number(m[1].replace(/,/g, '')) : null;
  };
  return { gross: yen('売上'), fee: yen('手数料'), net: yen('手数料控除後売上') };
}

/**
 * KDP は前月の KENP を翌月 15 日ごろ確定する。翌月 16 日（JST）以降に取った値だけを確定とみなす
 * （2026-10-11: 前月分を 15 日より前に取ると確定前の値が estimated:false で残る経路があった）。
 */
export function kdpRoyaltyFinalizeDate(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 16)).toISOString().slice(0, 10);
}

/** day（JST の YYYY-MM-DD）に取った month の KDP ロイヤリティが推計か（当月分は常に推計）。 */
export function isKdpEstimated(month, day) {
  return !(typeof day === 'string' && day >= kdpRoyaltyFinalizeDate(month));
}

/** YYYY-MM を delta か月ずらす。 */
export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * 週次の KDP 取得で取る月（古い順）。当月は毎回、前月は確定値（estimated:false）が入るまで毎回取り直す。
 * kdp-report は当月と前月しか取れない。royalties は data/kdp/royalties.json。day は JST の YYYY-MM-DD。
 */
export function kdpMonthsDue(royalties, day) {
  const cur = day.slice(0, 7);
  const prev = shiftMonth(cur, -1);
  return royalties?.months?.[prev]?.estimated === false ? [cur] : [prev, cur];
}

/** data/kdp/royalties.json の 1 か月分から、catalog 対象書籍（bookId あり）のロイヤリティ合計と確定か否かを返す。 */
export function kdpCatalogRoyalty(monthEntry) {
  if (!monthEntry) return null;
  const royalty = (monthEntry.books ?? []).filter((b) => b.bookId).reduce((sum, b) => sum + (Number(b.royalty) || 0), 0);
  return { royalty, estimated: Boolean(monthEntry.estimated) };
}

/** 月末日（YYYY-MM → YYYY-MM-DD）。 */
export function monthEnd(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/**
 * business-review の measurement 記録を組み立てる。3 つそろい、KDP が確定値のときだけ complete。
 * 欠けたものを 0 にしない（欠測は partial で残し、欠けた内訳を source に書く）。
 */
export function buildNetReceiptsMeasurement({ month, note, coconala, kdp }) {
  const parts = [];
  const missing = [];
  if (note?.net != null) parts.push(`note 売上管理 ${month} の売上詳細「手数料控除後売上」${note.net.toLocaleString('ja-JP')}円（売上 ${note.gross?.toLocaleString('ja-JP') ?? '—'}円・手数料 ${note.fee != null ? Math.abs(note.fee).toLocaleString('ja-JP') : '—'}円）`);
  else missing.push('note');
  if (coconala != null) parts.push(`ココナラ 売上履歴 ${month} 計上分 ${coconala.toLocaleString('ja-JP')}円（手数料控除後・トークルームのクローズ日で計上）`);
  else missing.push('ココナラ');
  if (kdp && !kdp.estimated) parts.push(`KDP ロイヤリティ確定値 ${kdp.royalty.toLocaleString('ja-JP')}円（catalog 対象書籍のみ）`);
  else missing.push(kdp ? 'KDP（推計のみ・確定前）' : 'KDP');
  const complete = missing.length === 0;
  const value = complete ? note.net + coconala + kdp.royalty : null;
  return {
    kind: 'measurement',
    qualification: 'all',
    period: { startDate: `${month}-01`, endDate: monthEnd(month) },
    channel: 'operations',
    subject: 'netReceipts',
    coverage: complete ? 'complete' : 'partial',
    source: `${parts.join('＋')}。振込手数料は含めない。${missing.length ? `欠測: ${missing.join('・')}。` : ''}record-net-receipts で取得。`,
    values: { netReceipts: value },
  };
}

const jstDay = (iso) => (iso ? todayJst(new Date(iso)) : null);

/**
 * 月の受取額を 3 つの台帳（note の販売履歴・ココナラの売上履歴・KDP のロイヤリティ）から組み立てる（純関数）。
 * 管理画面のトップと record-net-receipts が使う唯一の実装。チャネルごとの status:
 *   final＝確定 / to-date＝取得日までの分（月の途中）/ estimate＝推計 / missing＝未取得。
 * total は値のあるチャネルの和（欠けたチャネルは 0 にせず足さない）。complete は 3 つとも final のときだけ。
 * note の確定前（翌月 2 日まで）の月は、販売額 ×（1 − 直近の確定月の手数料率）で推計する
 * （手数料率は決済方法で月ごとに揺れる。2026-08 15.4%・2026-09 16.3%）。
 */
export function monthReceipts({ month, noteSales, coconalaRevenue, kdpRoyalties, kdpFirstMonth = null }) {
  const channels = [noteReceipts(month, noteSales), coconalaReceipts(month, coconalaRevenue), kdpReceipts(month, kdpRoyalties, kdpFirstMonth)];
  const valued = channels.filter((c) => c.value != null);
  return {
    month,
    channels,
    total: valued.length ? valued.reduce((sum, c) => sum + c.value, 0) : null,
    complete: channels.every((c) => c.status === 'final'),
  };
}

function noteReceipts(month, log) {
  const base = { id: 'note', label: 'note' };
  const rec = log?.months?.[month];
  const rows = (log?.sales ?? []).filter((s) => String(s.date).startsWith(`${month}-`));
  if (!rec && !rows.length) return { ...base, value: null, status: 'missing', asOf: null, note: '販売履歴が未取得' };
  const gross = rec?.total ?? rows.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
  const asOf = rec ? jstDay(rec.fetchedAt) : log?.updatedAt ?? null;
  if (rec?.net != null) return { ...base, value: rec.net, status: 'final', asOf, gross, fee: rec.fee ?? null, note: `売上管理の手数料控除後売上（販売額 ¥${gross.toLocaleString('ja-JP')}）` };
  // 基準は直前の確定月。それより前に無ければ（過去月を取り込む前）直後の確定月
  const settled = Object.entries(log?.months ?? {}).filter(([m, r]) => m !== month && r.net != null && r.total > 0);
  const ref = settled.filter(([m]) => m < month).sort(([a], [b]) => b.localeCompare(a))[0]
    ?? settled.filter(([m]) => m > month).sort(([a], [b]) => a.localeCompare(b))[0];
  if (!ref) return { ...base, value: null, status: 'missing', asOf, gross, note: `販売額 ¥${gross.toLocaleString('ja-JP')}。手数料率の基準になる確定月が無い` };
  const keep = ref[1].net / ref[1].total;
  return {
    ...base,
    value: Math.round(gross * keep),
    status: 'estimate',
    asOf,
    gross,
    note: `販売額 ¥${gross.toLocaleString('ja-JP')} × 控除後の割合 ${(keep * 100).toFixed(1)}%（${ref[0]} の実績）`,
  };
}

function coconalaReceipts(month, ledger) {
  const base = { id: 'coconala', label: 'ココナラ' };
  const asOf = jstDay(ledger?.fetchedAt);
  if (!ledger || asOf < `${month}-01`) return { ...base, value: null, status: 'missing', asOf, note: '売上履歴が未取得' };
  const rows = ledger.rows.filter((r) => r.closedAt.startsWith(`${month}-`));
  const value = rows.reduce((sum, r) => sum + r.netYen, 0);
  const final = asOf > monthEnd(month);
  return { ...base, value, status: final ? 'final' : 'to-date', asOf, note: `売上履歴の手数料控除後 ${rows.length} 件（クローズ日で計上）` };
}

function kdpReceipts(month, royalties, firstMonth) {
  const base = { id: 'kdp', label: 'KDP' };
  const entry = royalties?.months?.[month];
  // 最初の本の出版月（catalog の publishedDate）より前は売上が無いので 0 円で確定（2026-07-08 に最初の本）
  if (!entry && firstMonth && month < firstMonth) return { ...base, value: 0, status: 'final', asOf: null, note: `出版前（最初の本は ${firstMonth}）` };
  if (!entry) return { ...base, value: null, status: 'missing', asOf: null, note: 'ロイヤリティが未取得' };
  const { royalty, estimated } = kdpCatalogRoyalty(entry);
  return { ...base, value: royalty, status: estimated ? 'estimate' : 'final', asOf: jstDay(entry.fetchedAt), note: estimated ? 'KDP の推計ロイヤリティ（KENP 確定前）' : 'ロイヤリティ確定値（catalog 対象書籍のみ）' };
}

/**
 * 同じ月の現行の受取額記録（business-direction の currentRecords の measurement）から、新しい記録の訂正先を決める。
 * 前の記録が無ければ supersedes:null。complete の月を partial で上書きしない（そろった月を欠測へ戻さない）。
 * 2026-10-11: 9 月を partial で記録した後に同じコマンドを回すと、訂正先が無く「同じ計測があります」で拒まれた。
 */
export function netReceiptsSupersedes(current, record) {
  const prev = current.find((r) => r.kind === 'measurement' && r.subject === 'netReceipts' && r.qualification === record.qualification
    && r.channel === record.channel && r.period?.startDate === record.period.startDate && r.period?.endDate === record.period.endDate);
  if (!prev) return { supersedes: null };
  if (prev.coverage === 'complete' && record.coverage !== 'complete') return { error: `${prev.file} は complete（受取額 ${prev.values?.netReceipts}）。partial で上書きしない` };
  return { supersedes: prev.file };
}
