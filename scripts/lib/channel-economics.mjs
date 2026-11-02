// channel-economics.mjs — 販売チャネル（note・KDP・ココナラ）ごとの売上・1 件あたりの手取り・資格別・KPI の実績を組み立てる唯一の実装。
//
// 読み手: npm run channel-economics（scripts/channel-economics.mjs）と管理画面 戦略＞資格と市場＞チャネル設計（tools/admin-app/src/lib/channels.ts）。
// 正本: config/channel-strategy.json（役割・手数料・SWOT・4C・KGI/KPI）。売上は note.sales（販売額）・kdp.royalties（ロイヤリティ＝手取り）・
// coconala.revenue（手数料控除後）・coconala.orders（販売額）・coconala.analytics（過去 30 日の閲覧と受注）。
// 月別の受取は net-receipts.mjs の monthReceipts（唯一の実装・note は確定月の手数料控除後の実績、確定前は推計）をそのまま使う。
// 1 件あたりと資格別の note の手取りは、確定月の実績の控除後の割合（noteKeepActual）を掛ける。公表料率（fees.keepRate）は KDP の推計と参照用。
import { readDataset, readDatasetIf } from './dataset-io.mjs';
import { loadLineupConfig } from './product-lineup.mjs';
import { salesAttribution } from './sales-attribution.mjs';
import { todayJst } from './jst-date.mjs';
import { loadMonthReceipts } from './net-receipts-ledger.mjs';

const round = (n) => Math.round(n);

/** 期間の開始（note の記録の最初の月）から今月までの YYYY-MM */
function monthsBetween(from, to) {
  const out = [];
  let [y, m] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

/**
 * @param {string} root リポジトリのルート
 * @param {{ today?: string }} [opts]
 */
export function buildChannelView(root, { today = todayJst() } = {}) {
  const strategy = readDataset(root, 'config.channel-strategy');
  const products = readDataset(root, 'config.products').products ?? [];
  const noteLog = readDataset(root, 'note.sales');
  const sales = noteLog.sales ?? [];
  // note の確定月の実績から、販売額に対する手数料控除後の割合（携帯キャリア決済などの混ざり方を含む）
  const settled = Object.values(noteLog.months ?? {}).filter((r) => r.net != null && r.total > 0);
  const noteKeepActual = settled.length ? settled.reduce((a, r) => a + r.net, 0) / settled.reduce((a, r) => a + r.total, 0) : null;
  const kdp = readDatasetIf(root, 'kdp.royalties')?.months ?? {};
  const cocoRevenue = readDatasetIf(root, 'coconala.revenue')?.rows ?? [];
  const cocoOrders = readDatasetIf(root, 'coconala.orders')?.orders ?? [];
  const analytics = readDatasetIf(root, 'coconala.analytics');
  const keep = Object.fromEntries(Object.entries(strategy.fees).map(([id, f]) => [id, f.keepRate]));
  if (noteKeepActual != null) keep.note = noteKeepActual;

  const firstMonth = sales.map((s) => String(s.date).slice(0, 7)).sort()[0] ?? today.slice(0, 7);
  const months = monthsBetween(firstMonth, today.slice(0, 7));
  const period = { startDate: `${firstMonth}-01`, endDate: today };
  const attribution = salesAttribution(loadLineupConfig(root), sales, period, products);

  // ---- 月別（チャネルごとの販売額と手取り） ----
  const kindleByCatalogId = new Map(products.filter((p) => p.channel === 'kindle').map((p) => [String(p.catalog?.id ?? '').toLowerCase(), p]));
  const cocoById = new Map(products.filter((p) => p.channel === 'coconala').map((p) => [p.id, p]));
  const monthly = months.map((month) => {
    const r = loadMonthReceipts(root, month);
    const ch = Object.fromEntries(r.channels.map((c) => [c.id, c]));
    return {
      month,
      noteGross: ch.note?.gross ?? null,
      note: ch.note?.value ?? null,
      kdp: ch.kdp?.value ?? null,
      coconala: ch.coconala?.value ?? null,
      status: Object.fromEntries(r.channels.map((c) => [c.id, c.status])),
      total: r.total,
      complete: r.complete,
    };
  });

  // ---- 資格別（チャネル×資格の手取り。note は推計） ----
  const byQualification = {};
  const add = (q, ch, yen) => { (byQualification[q] ??= { note: 0, kindle: 0, coconala: 0 })[ch] += yen; };
  for (const [q, yen] of Object.entries(attribution.yenByQualification)) add(q, 'note', round(yen * keep.note));
  for (const v of Object.values(kdp)) {
    for (const b of v.books ?? []) add(kindleByCatalogId.get(String(b.bookId).toLowerCase())?.qualification ?? 'unknown', 'kindle', b.royalty ?? 0);
  }
  for (const o of cocoOrders) {
    if (!['closed', 'delivered'].includes(o.status)) continue;
    add(cocoById.get(o.serviceId)?.qualification ?? 'unknown', 'coconala', round((o.priceYen ?? 0) * keep.coconala));
  }

  // ---- 1 件あたりの手取り（型ごと） ----
  const noteTier = {};
  const tierOf = new Map(products.filter((p) => p.channel === 'note').map((p) => [p.id, p.tier]));
  for (const s of sales) {
    const tier = tierOf.get(s.productId) ?? s.type ?? 'other';
    (noteTier[tier] ??= { n: 0, yen: 0 });
    noteTier[tier].n += 1;
    noteTier[tier].yen += Number(s.price) || 0;
  }
  const unit = [];
  for (const [tier, v] of Object.entries(noteTier).sort((a, b) => b[1].yen - a[1].yen)) {
    const avg = v.yen / v.n;
    unit.push({ channel: 'note', item: `note・${{ pack: 'パック', magazine: 'マガジン', article: '単品', single: '単品', membership: '会員' }[tier] ?? tier}`, sales: v.n, avgPrice: round(avg), netPerSale: round(avg * keep.note), estimated: noteKeepActual == null });
  }
  const liveKindle = products.filter((p) => p.channel === 'kindle' && p.catalog?.status === 'live' && p.catalog?.priceJpy);
  const kPrices = liveKindle.map((p) => p.catalog.priceJpy).sort((a, b) => a - b);
  const kMedian = kPrices.length ? kPrices[Math.floor(kPrices.length / 2)] : null;
  if (kMedian) unit.push({ channel: 'kindle', item: `KDP・公開中 ${kPrices.length} 冊の中央値`, sales: null, avgPrice: kMedian, netPerSale: round(kMedian * keep.kindle), estimated: true });
  const doneOrders = cocoOrders.filter((o) => ['closed', 'delivered'].includes(o.status));
  if (doneOrders.length) {
    const avg = doneOrders.reduce((a, o) => a + (o.priceYen ?? 0), 0) / doneOrders.length;
    unit.push({ channel: 'coconala', item: 'ココナラ・受注', sales: doneOrders.length, avgPrice: round(avg), netPerSale: round(avg * keep.coconala), estimated: false });
  }

  // ---- ココナラの入口（過去 30 日） ----
  const cocoCatalog = products.filter((p) => p.channel === 'coconala');
  const coconala = {
    listed: cocoCatalog.filter((p) => p.catalog?.status === 'listed').length,
    paused: cocoCatalog.filter((p) => p.catalog?.status === 'paused').length,
    views: analytics?.totals?.views ?? null,
    favorites: analytics?.totals?.favorites ?? null,
    orders: analytics?.totals?.orders ?? null,
    period: analytics?.period?.services ? `${analytics.period.services.from}〜${analytics.period.services.to}` : null,
    lastRevenueAt: cocoRevenue.map((r) => r.closedAt).sort().at(-1) ?? null,
  };

  // ---- KPI の実績（測れるものだけ。測れないものは null＝未計測） ----
  const lastFull = monthly.at(-2) ?? monthly.at(-1);
  const packYen = (noteTier.pack?.yen ?? 0) + (noteTier.magazine?.yen ?? 0);
  const allNoteYen = Object.values(noteTier).reduce((a, v) => a + v.yen, 0);
  const unsoldPaid = Object.values(attribution.unsold).flat().filter((i) => !i.free).length;
  const actual = {
    'note-gross': { value: lastFull?.noteGross ?? null, at: lastFull?.month },
    'note-pack-share': { value: allNoteYen ? Math.round((packYen / allNoteYen) * 100) : null, at: `${firstMonth}〜` },
    'note-unsold-paid': { value: unsoldPaid, at: `${firstMonth}〜` },
    'kdp-royalty': { value: lastFull?.kdp ?? null, at: lastFull?.month },
    'coconala-reviews': { value: null, at: null },
    'coconala-order-rate': { value: coconala.views ? Math.round((coconala.orders / coconala.views) * 1000) / 10 : null, at: coconala.period },
  };
  const kpis = strategy.kpis.map((k) => ({ ...k, actual: actual[k.id]?.value ?? null, actualAt: actual[k.id]?.at ?? null }));

  return { today, strategy, noteKeepActual, monthly, byQualification, unit, coconala, kpis, kgi: { ...strategy.kgi, lastFullMonth: lastFull?.month ?? null, lastFullTotal: lastFull?.total ?? null, lastFullComplete: lastFull?.complete ?? false } };
}
