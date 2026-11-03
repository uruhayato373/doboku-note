/**
 * product-sales.mjs — 暦月 × 商品の販売台帳（data/business/product-sales/{month}.json）を作る純関数と、その読み手（DN-0947）。
 * 入出力は scripts/product-sales.mjs。
 *
 * 目的: GA4 の product_impression / product_click（販売先での商品 ID）と販売を、同じ商品 ID でつなぐ。
 *   行の productId は販売記録の ID（note は data/note/sales.json の productId を canonicalize したもの・
 *   ほかは config/products.json の id）。destinationIds は販売先での ID（note のキー・ASIN・ココナラのサービス番号）で、
 *   GA4 の product_id はこちらに当たる。売れていない商品の引き当ては productIdOfDestination（config/products.json）。
 *
 * 欠測を 0 にしない: 販売先ごとに計測の範囲 coverage を持つ。
 *   measured     その月の販売記録を取り切った。行が無い商品は「計測済み・0 件」
 *   partial      取れた分だけ（note の締まっていない月・KDP の書籍の一部が欠けた月・月末より前の取得）。行が無い商品は判定しない
 *   account-only 口座全体の月次だけ（A8）。商品別は未計測
 *   unmeasured   その月の記録が無い。0 件ではない
 * provisional は「月が締まっていない・金額が推計」（note の未確定月・KDP の当月推計）。
 *
 * KDP は stats47 と同じ口座。doboku-note の ASIN（config/products.json の kindle の catalog.asin）に当たる本だけを数え、
 *   kdp-report が書籍 ID を付けられなかった行（stats47 の本）は excluded に件数と金額だけ残す。
 * アトリビューションはしない（クリックした人が買ったかは分からない。広告費も使っていない）。
 */
import { canonicalizeProductId } from './sales-normalize.mjs';

export const COVERAGE_STATUSES = ['measured', 'partial', 'account-only', 'unmeasured'];

const noteKeyOf = (url) => String(url ?? '').match(/note\.com\/[^/]+\/[nm]\/([nm][0-9a-f]+)/i)?.[1] ?? null;
const serviceIdOf = (url) => String(url ?? '').match(/coconala\.com\/services\/(\d+)/)?.[1] ?? null;
const monthOf = (iso) => String(iso ?? '').slice(0, 7);
const lastDayOf = (month) => {
  const [y, m] = month.split('-').map(Number);
  return `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`;
};

/** config/products.json → 販売先 ID の索引（自社 ID → 販売先 ID、販売先 ID → 自社 ID） */
export function buildProductIndex(products) {
  const toDestination = new Map();
  const fromDestination = new Map();
  const add = (id, destination, destinationId) => {
    if (!destinationId) return;
    const list = toDestination.get(id) ?? [];
    if (!list.includes(destinationId)) list.push(destinationId);
    toDestination.set(id, list);
    const key = `${destination}:${destinationId}`;
    if (!fromDestination.has(key)) fromDestination.set(key, id);
  };
  const kindleByBookId = new Map();
  for (const p of products ?? []) {
    const c = p.catalog ?? {};
    if (p.channel === 'note') for (const url of [c.noteUrl, c.landingUrl]) add(p.id, 'note', noteKeyOf(url));
    if (p.channel === 'coconala') add(p.id, 'coconala', serviceIdOf(c.serviceUrl));
    if (p.channel === 'kindle') {
      add(p.id, 'amazon', c.asin);
      if (c.id) kindleByBookId.set(c.id, { id: p.id, asin: c.asin ?? null });
    }
  }
  return { toDestination, fromDestination, kindleByBookId };
}

/** GA4 の product_destination・product_id → 自社の商品 ID（無ければ null。A8・もしもは案件で、商品台帳に無い） */
export function productIdOfDestination(index, destination, destinationId) {
  if (destination === 'note' && destinationId === 'membership') return 'membership';
  return index.fromDestination.get(`${destination}:${destinationId}`) ?? null;
}

function noteSection(month, salesLog, index) {
  const meta = salesLog?.months?.[month];
  if (!meta) return { coverage: { status: 'unmeasured', reason: 'note の販売履歴（note.sales）に月の取得記録（months）が無い' }, rows: [] };
  const byId = new Map();
  for (const sale of salesLog.sales ?? []) {
    if (monthOf(sale.date) !== month) continue;
    const productId = canonicalizeProductId(String(sale.productId ?? ''));
    const row = byId.get(productId) ?? { destination: 'note', productId, type: sale.type, destinationIds: [], count: 0, amountYen: 0 };
    row.count += 1;
    row.amountYen += Number(sale.price) || 0;
    byId.set(productId, row);
  }
  for (const row of byId.values()) {
    const bare = row.productId.replace(/^article:/, '');
    row.destinationIds = row.type === 'membership' ? ['membership'] : (index.toDestination.get(row.productId) ?? index.toDestination.get(bare) ?? []);
  }
  const rows = [...byId.values()];
  const counted = rows.reduce((s, r) => s + r.count, 0);
  return {
    coverage: {
      // 締まっていない月（finalized でない）は月末までの販売が入り切っていないので partial
      status: meta.finalized === true ? 'measured' : 'partial',
      provisional: meta.finalized !== true,
      amountBasis: 'price',
      fetchedAt: meta.fetchedAt,
      dashboardCount: meta.count,
      recordedCount: counted,
      ...(meta.count !== undefined && meta.count !== counted ? { note: `ダッシュボードの件数 ${meta.count} と明細 ${counted} が合わない（明細の取り込み漏れ）` } : {}),
    },
    rows,
  };
}

function kindleSection(month, royalties, index) {
  const meta = royalties?.months?.[month];
  if (!meta) return { coverage: { status: 'unmeasured', reason: 'KDP のロイヤリティ（kdp.royalties）に月の取得が無い' }, rows: [], excluded: null };
  const rows = [];
  const excluded = { rows: 0, royaltyYen: 0, reason: '書籍 ID が付かない行（stats47 など同じ KDP 口座のほかの本。doboku-note の ASIN に当たらない）' };
  const unresolved = [];
  for (const b of meta.books ?? []) {
    if (!b.bookId) {
      excluded.rows += 1;
      excluded.royaltyYen += Number(b.royalty) || 0;
      continue;
    }
    const hit = index.kindleByBookId.get(b.bookId);
    if (!hit?.asin) {
      unresolved.push(b.bookId);
      continue;
    }
    rows.push({ destination: 'amazon', productId: hit.id, bookId: b.bookId, destinationIds: [hit.asin], count: null, amountYen: Number(b.royalty) || 0, kenpYen: Number(b.kenp) || 0 });
  }
  const missing = meta.scope?.missingDobokuBookIds ?? [];
  const beforeMonthEnd = String(meta.fetchedAt ?? '').slice(0, 10) <= lastDayOf(month);
  const status = missing.length || unresolved.length || beforeMonthEnd ? 'partial' : 'measured';
  return {
    coverage: {
      status,
      provisional: meta.estimated === true,
      amountBasis: 'royalty',
      fetchedAt: meta.fetchedAt,
      note: '件数は KDP レポートに無い（推計ロイヤリティの円だけ）。行の無い doboku-note の本は計測済み・0 円',
      ...(beforeMonthEnd ? { reason: '月末より前の取得（残りの日の販売が入っていない）' } : {}),
      ...(missing.length ? { missingBookIds: missing } : {}),
      ...(unresolved.length ? { unresolvedBookIds: unresolved } : {}),
    },
    rows,
    excluded,
  };
}

function coconalaSection(month, revenue, orders) {
  if (!revenue?.fetchedAt) return { coverage: { status: 'unmeasured', reason: 'ココナラの売上履歴（coconala.revenue）が無い' }, rows: [] };
  const fetchedDay = revenue.fetchedAt.slice(0, 10);
  if (fetchedDay < `${month}-01`) return { coverage: { status: 'unmeasured', reason: `売上履歴の取得（${fetchedDay}）が月より前` }, rows: [] };
  const serviceByTalkroom = new Map((orders?.orders ?? []).map((o) => [String(o.talkroomId), o.serviceId]));
  const byId = new Map();
  const unresolved = [];
  for (const r of revenue.rows ?? []) {
    if (monthOf(r.closedAt) !== month) continue;
    const productId = serviceByTalkroom.get(String(r.talkroomId));
    if (!productId) {
      unresolved.push(String(r.talkroomId));
      continue;
    }
    const row = byId.get(productId) ?? { destination: 'coconala', productId, destinationIds: [], count: 0, amountYen: 0 };
    if (r.kind === 'service') row.count += 1;
    row.amountYen += Number(r.netYen) || 0;
    byId.set(productId, row);
  }
  const complete = fetchedDay > lastDayOf(month);
  return {
    coverage: {
      status: complete && !unresolved.length ? 'measured' : 'partial',
      provisional: !complete,
      amountBasis: 'net',
      fetchedAt: revenue.fetchedAt,
      note: 'クローズ日で計上・手数料控除後。おひねり（tip）は金額に入れ、件数に数えない',
      ...(unresolved.length ? { unresolvedTalkroomIds: unresolved } : {}),
    },
    rows: [...byId.values()],
  };
}

function a8Section(month, reportLog) {
  const m = (reportLog?.monthly ?? []).find((x) => x.month === month);
  if (!m) return { coverage: { status: 'unmeasured', reason: 'A8 の月次レポート（a8.report-log）に月の行が無い' } };
  return {
    coverage: {
      status: 'account-only',
      fetchedAt: m.fetchedAt,
      reason: 'A8 の月次は口座全体だけ（案件別は期間合計しか取っていない）。商品別は未計測',
      account: { clicks: m.clicks, conversions: m.conversions, approved: m.approved, revenueYen: m.revenueYen, pendingRevenueYen: m.pendingRevenueYen },
    },
  };
}

/**
 * @param {{ month: string, products: Array, salesLog: object, royalties: object, revenue: object, orders: object, reportLog: object }} input
 */
export function buildProductSales({ month, products, salesLog, royalties, revenue, orders, reportLog }) {
  if (!/^\d{4}-\d{2}$/.test(String(month))) throw new Error(`月は YYYY-MM で指定する（受領: ${month}）`);
  const index = buildProductIndex(products);
  const note = noteSection(month, salesLog, index);
  const kindle = kindleSection(month, royalties, index);
  const coconala = coconalaSection(month, revenue, orders);
  const a8 = a8Section(month, reportLog);
  const rows = [...note.rows, ...kindle.rows, ...coconala.rows].sort((a, b) => a.destination.localeCompare(b.destination) || b.amountYen - a.amountYen || a.productId.localeCompare(b.productId));
  return {
    schemaVersion: 1,
    month,
    generatedBy: 'npm run product-sales',
    coverage: { note: note.coverage, amazon: kindle.coverage, coconala: coconala.coverage, a8: a8.coverage },
    rows,
    ...(kindle.excluded?.rows ? { excluded: { amazon: kindle.excluded } } : {}),
  };
}

/**
 * 台帳 1 か月分から、ある商品の販売を読む。行が無いとき、範囲が measured なら計測済み・0 件、そうでなければ未計測。
 * @returns {{ status: 'sold'|'measured-zero'|'unmeasured', count?: number|null, amountYen?: number, provisional?: boolean }}
 */
export function salesOf(ledger, destination, productId) {
  const coverage = ledger?.coverage?.[destination];
  const row = (ledger?.rows ?? []).find((r) => r.destination === destination && r.productId === productId);
  if (row) return { status: 'sold', count: row.count, amountYen: row.amountYen, provisional: Boolean(coverage?.provisional) };
  if (coverage?.status === 'measured') return { status: 'measured-zero', count: 0, amountYen: 0, provisional: Boolean(coverage.provisional) };
  return { status: 'unmeasured' };
}
