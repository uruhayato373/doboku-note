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
 *   account-only 口座全体の月次だけ（A8 の案件別を単月で取っていない月）。商品別は未計測
 *   unmeasured   その月の記録が無い。0 件ではない
 * provisional は「月が締まっていない・金額が推計」（note の未確定月・KDP の当月推計）。
 *
 * KDP は stats47 と同じ口座。doboku-note の ASIN（config/products.json の kindle の catalog.asin）に当たる本だけを数え、
 *   kdp-report が書籍 ID を付けられなかった行（stats47 の本）は excluded に件数と金額だけ残す。
 * アトリビューションはしない（クリックした人が買ったかは分からない。広告費も使っていない）。
 */
import { validateMoshimoReport } from './moshimo-report.mjs';
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
export function buildProductIndex(products, mats = []) {
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
  // A8 は案件（program）が商品にあたる。GA4 の product_id は a8mat なので config/affiliate-mats.json で案件へ引き当てる
  for (const m of mats ?? []) if (m.program && m.mat) add(m.program, m.mat.startsWith('moshimo:') ? 'moshimo' : 'a8', m.mat);
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

/**
 * A8: 単月の期間で取った案件別の行（report-log の programPeriod・period が YYYYMM-YYYYMM）。同じ口座の stats47 の案件は
 * program が付かない（doboku-note の案件の対応表に無い）ので数えず、件数だけ excluded に残す。
 * 金額は確定報酬（revenueYen）。発生額（grossYen）・承認待ち（pendingYen）は別欄。成果の承認は数か月遅れるので、
 * 承認待ちが残る月は provisional。発生 0 の案件は行を作らない（measured の月は 0 件と読む）。
 */
function a8Section(month, reportLog, index) {
  const ym = month.replace('-', '');
  const latest = new Map();
  for (const r of reportLog?.programPeriod ?? []) {
    if (r.period !== `${ym}-${ym}`) continue;
    const prev = latest.get(r.programId);
    if (!prev || String(r.fetchedAt) > String(prev.fetchedAt)) latest.set(r.programId, r);
  }
  const monthly = (reportLog?.monthly ?? []).find((x) => x.month === month);
  if (!latest.size) {
    return monthly
      ? { coverage: { status: 'account-only', fetchedAt: monthly.fetchedAt, reason: 'A8 の案件別を単月で取っていない月（口座全体の月次だけ）。商品別は未計測', account: { clicks: monthly.clicks, conversions: monthly.conversions, approved: monthly.approved, revenueYen: monthly.revenueYen, pendingRevenueYen: monthly.pendingRevenueYen } }, rows: [] }
      : { coverage: { status: 'unmeasured', reason: 'A8 の月次レポート（a8.report-log）に月の行が無い' }, rows: [] };
  }
  const programRows = [...latest.values()];
  const ours = programRows.filter((r) => r.program);
  const fetchedAt = programRows.map((r) => String(r.fetchedAt)).sort().at(-1);
  const pending = ours.some((r) => (r.pendingCount ?? 0) > 0);
  const rows = ours
    .filter((r) => (r.conversions ?? 0) > 0 || (r.approved ?? 0) > 0)
    .map((r) => ({ destination: 'a8', productId: r.program, destinationIds: (index.toDestination.get(r.program) ?? []).filter(id => !id.startsWith('moshimo:')), count: r.conversions ?? 0, amountYen: r.revenueYen ?? 0, grossYen: r.grossRevenueYen ?? 0, approvedCount: r.approved ?? 0, pendingYen: r.pendingRevenueYen ?? 0, clicks: r.clicks ?? 0 }));
  const complete = fetchedAt.slice(0, 10) > lastDayOf(month);
  return {
    coverage: {
      status: complete ? 'measured' : 'partial',
      provisional: pending || !complete,
      amountBasis: 'approved',
      fetchedAt,
      note: '案件別の単月レポート。count は発生件数（キャンセルを含む）、amountYen は確定報酬。発生 0 の案件は行が無い＝計測済み・0 件',
      ...(programRows.length > ours.length ? { otherPrograms: programRows.length - ours.length } : {}),
    },
    rows,
  };
}

/**
 * @param {{ month: string, products: Array, salesLog: object, royalties: object, revenue: object, orders: object, reportLog: object }} input
 */

function moshimoSection(month, report, catalog, index, siteId) {
  if (!report) return { coverage: { status: 'unmeasured', reason: 'もしものサイト別月次成果が未取得' }, rows: [] };
  validateMoshimoReport(report, { month, siteId });
  const programs = new Map(Object.entries(catalog?.programs ?? {}).filter(([, p]) => p.asps?.moshimo?.promotionId).map(([id, p]) => [String(p.asps.moshimo.promotionId), id]));
  const rows = report.records.flatMap(r => {
    const productId = programs.get(r.programId);
    if (!productId) return [];
    return [{ destination: 'moshimo', productId, destinationIds: (index.toDestination.get(productId) ?? []).filter(id => id.startsWith('moshimo:')), count: r.conversions, amountYen: r.revenueYen, grossYen: r.grossRevenueYen, approvedCount: r.approved, clicks: r.clicks }];
  });
  return { coverage: { status: 'partial', provisional: true, amountBasis: 'approved', fetchedAt: report.fetchedAt, note: '画面で観測した案件だけを収録。行のない案件は未計測。承認は後日の取得で変わり得る' }, rows };
}

export function buildProductSales({ month, products, mats = [], salesLog, royalties, revenue, orders, reportLog, moshimoReport, catalog, moshimoSiteId }) {
  if (!/^\d{4}-\d{2}$/.test(String(month))) throw new Error(`月は YYYY-MM で指定する（受領: ${month}）`);
  const index = buildProductIndex(products, mats);
  const note = noteSection(month, salesLog, index);
  const kindle = kindleSection(month, royalties, index);
  const coconala = coconalaSection(month, revenue, orders);
  const a8 = a8Section(month, reportLog, index);
  const moshimo = moshimoSection(month, moshimoReport, catalog, index, moshimoSiteId);
  const rows = [...note.rows, ...kindle.rows, ...coconala.rows, ...a8.rows, ...moshimo.rows].sort((a, b) => a.destination.localeCompare(b.destination) || b.amountYen - a.amountYen || a.productId.localeCompare(b.productId));
  return {
    schemaVersion: 1,
    month,
    generatedBy: 'npm run product-sales',
    coverage: { note: note.coverage, amazon: kindle.coverage, coconala: coconala.coverage, a8: a8.coverage, moshimo: moshimo.coverage },
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

/**
 * 販売先の ID（GA4 の product_id）で台帳 1 か月分の販売を読む。destinationIds に当たる行を合計する
 * （メンバーシップの複数プラン・単品記事のように、販売記録の商品 ID と販売先の ID が 1 対 1 でないものもまとめて引ける）。
 */
export function salesByDestinationId(ledger, destination, destinationId) {
  const coverage = ledger?.coverage?.[destination];
  const rows = (ledger?.rows ?? []).filter((r) => r.destination === destination && r.destinationIds.includes(destinationId));
  if (rows.length) {
    const counts = rows.map((r) => r.count);
    return { status: 'sold', count: counts.includes(null) ? null : counts.reduce((s, c) => s + c, 0), amountYen: rows.reduce((s, r) => s + r.amountYen, 0), provisional: Boolean(coverage?.provisional) };
  }
  if (coverage?.status === 'measured') return { status: 'measured-zero', count: 0, amountYen: 0, provisional: Boolean(coverage.provisional) };
  return { status: 'unmeasured' };
}

/**
 * 表示 → 販売先クリック → 販売を、販売先の ID で 1 行に並べる（DN-0947・EXP-052）。
 * report は GA4 の product-referrals（窓は日単位）、ledgers は窓の月の販売台帳。販売は暦月なので窓とずれる
 * （同じ人が押して買ったかは分からない＝アトリビューションではない）。
 * @returns {{ window: object, months: string[], rows: Array }}
 */
export function buildProductFunnel({ report, ledgers, index }) {
  const byKey = new Map();
  for (const r of report?.rows ?? []) {
    const key = `${r.destination}\u0000${r.productId}`;
    const row = byKey.get(key) ?? { destination: r.destination, destinationId: r.productId, productId: productIdOfDestination(index, r.destination, r.productId), impressions: 0, clicks: 0, placements: {} };
    const p = row.placements[r.placement] ?? { impressions: 0, clicks: 0 };
    if (r.eventName === 'product_impression') { row.impressions += r.eventCount; p.impressions += r.eventCount; }
    if (r.eventName === 'product_click') { row.clicks += r.eventCount; p.clicks += r.eventCount; }
    row.placements[r.placement] = p;
    byKey.set(key, row);
  }
  const months = (ledgers ?? []).map((l) => l.month);
  const rows = [...byKey.values()].map((row) => ({
    ...row,
    ctr: row.impressions >= 100 ? row.clicks / row.impressions : null,
    sales: Object.fromEntries((ledgers ?? []).map((l) => [l.month, ['note', 'amazon', 'coconala', 'a8', 'moshimo'].includes(row.destination) ? salesByDestinationId(l, row.destination, row.destinationId) : { status: 'unmeasured' }])),
  }));
  rows.sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions || a.destinationId.localeCompare(b.destinationId));
  return { window: { startDate: report?.meta?.startDate ?? null, endDate: report?.meta?.endDate ?? null }, months, rows };
}
