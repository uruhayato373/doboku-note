/**
 * net-receipts.mjs — 月の受取額（NSM・netReceipts）を組み立てる唯一の実装（純関数）。
 * ---------------------------------------------------------------------------
 * 受取額 = note の手数料控除後売上 ＋ ココナラの手数料控除後売上（トークルームのクローズ日で計上）
 *        ＋ KDP ロイヤリティ確定値（catalog 対象書籍のみ）。振込手数料は含めない（15_KPIツリー.md）。
 * 読み手: scripts/record-net-receipts.mjs（月次レビューの取得手順）・scripts/note-sales-fetch.mjs（集計中の判定）・tests/net-receipts.test.mjs。
 * ---------------------------------------------------------------------------
 */

/**
 * note は前月の売上を毎月 2 日に確定する。それまで売上管理は「ただいま前月の売上を集計中です」と出し、
 * 処理済みの表に前月の行が無く、月別詳細にも合計・手数料控除後売上が出ない（2026-10-01 実画面）。
 */
export function noteSalesFinalizeDate(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 2)).toISOString().slice(0, 10);
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

/** kdp-royalties.json の 1 か月分から、catalog 対象書籍（bookId あり）のロイヤリティ合計と確定か否かを返す。 */
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
