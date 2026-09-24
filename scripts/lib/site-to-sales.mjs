/**
 * site-to-sales.mjs — サイトの note 送客クリック × note 側のサイト経由閲覧 × 商品別売上を
 * 暦月 × note 商品で突き合わせる純関数（入出力は scripts/report-site-to-sales.mjs）。
 *
 * 結合キー = note 商品 ID:
 *   - カタログ商品（マガジン・/n/ 単品・メンバーシップ）: src/lib/note-magazines.ts の id
 *   - カタログ外の単品記事: sales-log の `article:<slug>`（収録マガジンは live snapshot の題名一致で求める）
 * 各データからの解決:
 *   - GA4 event_label: `<id>:<面>` / 裸の `<id>` / `category-<資格>-hub-seasonal-*`（hub-cta.ts の seasonal.product）/
 *     `note-n<key>`（カタログ noteUrl・landingUrl → live snapshot の題名 → sales-log の productId）
 *   - sales-log productId: `article:` を外してカタログにあればその id、建設部門の `bk-*` は CTA 側 id へ、
 *     `membership:civil-lab-*` は civil-membership-lab へ
 *   - note 流入元: アカウント全体の月次値しか無い（記事別の流入元は note が出さない）→ 商品別は常に解決不能
 *
 * 欠測を 0 にしない: GA4 窓が月と重ならなければ clicks は null、流入元が測れない月は null。
 * 解決できないクリック・売上は「未解決」として件数と理由を残す（除外して黙らない）。
 * これはクリックと購入者を結合した attribution ではない（note の販売履歴に流入識別子が無い）。
 */
import { ctaProductIdFromSalesProductId } from './note-funnel-efficiency.mjs';
import { canonicalizeProductId } from './sales-normalize.mjs';
import { normalizeNoteTitle } from './business-direction.mjs';

/** doboku-note → note のリンクが referrer を渡すようになった月（fe41d58cd・2026-09-15 commit）。前月までは no referrer に溶けている。 */
export const NOTE_REFERRER_MEASURABLE_FROM_MONTH = '2026-09';

/** マガジン CTA の data-cta-label が `<商品ID>:<面>` になった日（5b3e29f9d）。それ以前のクリックは面だけで商品を持たない。 */
export const LABEL_PRODUCT_ID_FROM = '2026-08-22';

const MEMBERSHIP_PRODUCTS =[[/^membership:civil-lab-/, 'civil-membership-lab']];

export function monthBounds(month) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(month ?? ''));
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) throw new Error(`月は YYYY-MM で指定する（受領: ${month}）`);
  const days = new Date(Date.UTC(Number(m[1]), Number(m[2]), 0)).getUTCDate();
  return { startDate: `${month}-01`, endDate: `${month}-${String(days).padStart(2, '0')}`, days };
}

/** JST の今日から見た直近の完了月。 */
export function previousMonth(todayJst) {
  const [y, mo] = String(todayJst).slice(0, 7).split('-').map(Number);
  const d = new Date(Date.UTC(y, mo - 2, 1));
  return d.toISOString().slice(0, 7);
}

const dayNumber = (iso) => Date.parse(`${iso}T00:00:00Z`) / 86400000;
function overlapDays(a, b) {
  const start = Math.max(dayNumber(a.startDate), dayNumber(b.startDate));
  const end = Math.min(dayNumber(a.endDate), dayNumber(b.endDate));
  return end >= start ? end - start + 1 : 0;
}

/** note-magazines.ts 本文 → [{id, published, noteUrl, landingUrl}]（各エントリ先頭は id/published/noteUrl の順で固定）。 */
export function parseNoteCatalog(source) {
  const heads = [...String(source).matchAll(/\bid:\s*'([^']+)',\s*published:\s*(true|false),\s*noteUrl:\s*'([^']*)'/g)];
  return heads.map((h, i) => {
    const slice = source.slice(h.index, heads[i + 1]?.index ?? source.length);
    return { id: h[1], published: h[2] === 'true', noteUrl: h[3], landingUrl: slice.match(/landingUrl:\s*'([^']+)'/)?.[1] ?? null };
  });
}

/** hub-cta.ts の HUB 定義 → { 資格カテゴリ: seasonal.product }。 */
export function parseHubSeasonalProducts(source) {
  const start = String(source).indexOf('const HUB');
  if (start < 0) return {};
  const block = source.slice(start, source.indexOf('\n};', start));
  const heads = [...block.matchAll(/^\s{2}'([a-z0-9-]+)':\s*\{/gm)];
  const out = {};
  heads.forEach((h, i) => {
    const slice = block.slice(h.index, heads[i + 1]?.index ?? block.length);
    const product = slice.match(/product:\s*'([^']+)'/)?.[1];
    if (product) out[h[1]] = product;
  });
  return out;
}

const noteKeyOf = (url) => String(url ?? '').match(/\/n\/(n[0-9a-z]+)/)?.[1] ?? null;

/**
 * 解決に使う索引を作る。
 * @param {{catalog: Array, hubSeasonal: object, magazineSnapshot: object|null, salesLog: object}} input
 */
export function buildResolver({ catalog, hubSeasonal = {}, magazineSnapshot = null, salesLog = { sales: [] } }) {
  const catalogIds = new Set(catalog.map((c) => c.id));
  const catalogByNoteKey = new Map();
  for (const c of catalog) for (const url of [c.noteUrl, c.landingUrl]) {
    const key = noteKeyOf(url);
    if (key && !catalogByNoteKey.has(key)) catalogByNoteKey.set(key, c.id);
  }
  const containers = new Map(); // 正規化題名 → [{productId, key}]
  const titleByNoteKey = new Map();
  for (const mag of magazineSnapshot?.magazines ?? []) {
    if (!mag.sotId) continue;
    for (const note of mag.notes ?? []) {
      const t = normalizeNoteTitle(note.name);
      titleByNoteKey.set(note.key, t);
      const list = containers.get(t) ?? [];
      if (!list.some((x) => x.productId === mag.sotId)) list.push({ productId: mag.sotId, key: note.key });
      containers.set(t, list);
    }
  }
  const productIdByTitle = new Map();
  for (const sale of salesLog.sales ?? []) {
    if (String(sale.productId ?? '').startsWith('article:')) productIdByTitle.set(normalizeNoteTitle(sale.title), canonicalizeProductId(sale.productId));
  }
  return { catalogIds, catalogByNoteKey, containers, titleByNoteKey, productIdByTitle, hubSeasonal, hasSnapshot: Boolean(magazineSnapshot) };
}

/** GA4 event_label → { productId|null, via, placement, reason } */
export function resolveCtaLabel(label, r) {
  const value = String(label ?? '');
  const hub = Object.keys(r.hubSeasonal).find((cat) => value.startsWith(`category-${cat}-hub-`));
  if (value.startsWith('category-')) {
    if (hub && value.startsWith(`category-${hub}-hub-seasonal`)) {
      const productId = r.hubSeasonal[hub];
      return r.catalogIds.has(productId)
        ? { productId, via: 'hub-seasonal', placement: value }
        : { productId: null, via: 'hub-seasonal', placement: value, reason: 'hub seasonal の商品がカタログに無い' };
    }
    if (/-hub-mokuji/.test(value)) return { productId: null, via: 'hub-mokuji', placement: value, reason: '無料もくじ記事への送客（商品を特定しない）' };
    return { productId: null, via: 'hub', placement: value, reason: 'hub ラベルの資格が hub-cta.ts に無い' };
  }
  const noteKey = value.match(/^note-(n[0-9a-z]+)$/)?.[1];
  if (noteKey) {
    const catalogId = r.catalogByNoteKey.get(noteKey);
    if (catalogId) return { productId: catalogId, via: 'note-key', placement: '(none)' };
    const title = r.titleByNoteKey.get(noteKey);
    if (!title) return { productId: null, via: 'note-key', placement: '(none)', reason: 'note 記事キーがカタログ・マガジン snapshot に無い' };
    // 販売実績の無い単品は sales-log に productId が無いので、記事キーそのものを商品 ID にする（売上 0 は照合済みの 0）。
    const containedIn = (r.containers.get(title) ?? []).map((x) => x.productId).filter((id) => r.catalogIds.has(id)).sort();
    return { productId: r.productIdByTitle.get(title) ?? `note:${noteKey}`, via: 'note-key', placement: '(none)', containedIn };
  }
  const withPlacement = value.match(/^([a-z0-9][a-z0-9-]+):(.+)$/);
  const id = withPlacement ? withPlacement[1] : value;
  if (r.catalogIds.has(id)) return { productId: id, via: 'label', placement: withPlacement ? withPlacement[2] : '(none)' };
  return {
    productId: null,
    via: 'label',
    placement: withPlacement?.[2] ?? value,
    reason: withPlacement ? 'label の商品IDがカタログに無い' : `面だけの label（商品IDを含まない。${LABEL_PRODUCT_ID_FROM} より前の形式か、商品を持たない導線）`,
  };
}

/** sales-log 1 行 → { productId|null, kind, containedIn, reason } */
export function resolveSale(sale, r) {
  const raw = canonicalizeProductId(String(sale.productId ?? ''));
  for (const [re, id] of MEMBERSHIP_PRODUCTS) if (re.test(raw)) return { productId: id, kind: 'membership', containedIn: [] };
  if (raw.startsWith('membership:')) return { productId: null, kind: 'membership', containedIn: [], reason: 'メンバーシップのプランがカタログ商品に対応しない' };
  const bare = raw.replace(/^article:/, '');
  const catalogId = ctaProductIdFromSalesProductId(bare);
  const kind = sale.type === 'magazine' ? 'magazine' : 'article';
  if (r.catalogIds.has(catalogId)) return { productId: catalogId, kind, containedIn: [] };
  if (raw.startsWith('article:')) {
    const containedIn = (r.containers.get(normalizeNoteTitle(sale.title)) ?? []).map((x) => x.productId).filter((id) => r.catalogIds.has(id)).sort();
    return { productId: raw, kind: 'article', containedIn, ...(r.hasSnapshot && containedIn.length === 0 ? { note: '収録マガジンを題名で特定できない' } : {}) };
  }
  return { productId: null, kind, containedIn: [], reason: raw ? 'マガジン productId がカタログに無い' : 'productId が空' };
}

/**
 * 月に使う GA4 by-label スナップショットを選ぶ。月と一致する窓 → exact。
 * 無ければ重なり日数最大（同数なら月外日数が少ない→新しい）→ window-mismatch。重なり 0 → missing。
 * @param {Array<{file: string, meta: object}>} snapshots
 */
export function pickGa4Snapshot(snapshots, month) {
  const bounds = monthBounds(month);
  const scored = snapshots
    .filter((s) => s.meta?.startDate && s.meta?.endDate)
    .map((s) => {
      const overlap = overlapDays(bounds, s.meta);
      const span = dayNumber(s.meta.endDate) - dayNumber(s.meta.startDate) + 1;
      return { ...s, overlap, outside: span - overlap, exact: s.meta.startDate === bounds.startDate && s.meta.endDate === bounds.endDate };
    })
    .filter((s) => s.overlap > 0 && s.meta.truncated !== true);
  const exact = scored.filter((s) => s.exact).sort((a, b) => a.file.localeCompare(b.file)).at(-1);
  if (exact) return { status: 'exact', file: exact.file, window: { startDate: exact.meta.startDate, endDate: exact.meta.endDate }, overlapDays: bounds.days, outsideDays: 0 };
  const best = scored.sort((a, b) => b.overlap - a.overlap || a.outside - b.outside || b.file.localeCompare(a.file))[0];
  if (!best) return { status: 'missing', file: null, window: null, overlapDays: 0, outsideDays: 0 };
  return { status: 'window-mismatch', file: best.file, window: { startDate: best.meta.startDate, endDate: best.meta.endDate }, overlapDays: best.overlap, outsideDays: best.outside };
}

/**
 * 対象月の note 流入元（アカウント全体）を、取得時刻が最も新しいファイルの monthly から取る。
 * @param {Array<{file: string, data: object}>} referrerFiles
 */
export function pickNoteReferral(referrerFiles, month) {
  const bounds = monthBounds(month);
  const candidates = [];
  for (const { file, data } of referrerFiles) {
    const row = (data?.monthly ?? []).find((m) => m.month === month) ?? (data?.targetMonth?.month === month ? data.targetMonth : null);
    if (row) candidates.push({ file, fetchedAt: data.fetchedAt ?? '', row, salesYen: data.month === month ? data.summary?.salesYen ?? null : null });
  }
  const latest = candidates.sort((a, b) => a.fetchedAt.localeCompare(b.fetchedAt)).at(-1);
  const salesYen = candidates.filter((c) => c.salesYen != null).sort((a, b) => a.fetchedAt.localeCompare(b.fetchedAt)).at(-1) ?? null;
  if (!latest) return { status: 'missing', file: null, fetchedAt: null, siteReferredViews: null, totalViews: null, noReferrerViews: null, dashboardSales: null };
  const complete = latest.fetchedAt.slice(0, 10) > bounds.endDate;
  const measurable = month >= NOTE_REFERRER_MEASURABLE_FROM_MONTH;
  const src = latest.row.sources ?? {};
  return {
    status: !measurable ? 'not-measurable' : complete ? 'measured' : 'partial-month',
    file: latest.file,
    fetchedAt: latest.fetchedAt,
    siteReferredViews: measurable ? Number(src['doboku-note.com'] ?? 0) : null,
    totalViews: latest.row.total ?? null,
    noReferrerViews: src['no referrer'] ?? null,
    note: measurable
      ? (month === NOTE_REFERRER_MEASURABLE_FROM_MONTH ? 'referrer を渡す修正は 2026-09 月途中から。月前半のサイト経由は no referrer に含まれる' : null)
      : 'サイト→note リンクが rel=noreferrer だったため、サイト経由は no referrer に含まれ分離できない',
    dashboardSales: salesYen ? { yen: salesYen.salesYen, file: salesYen.file, fetchedAt: salesYen.fetchedAt } : null,
  };
}

function blankRow(productId, kind, inCatalog) {
  return { productId, kind, inCatalog, clicks: 0, impressions: 0, placements: {}, sales: 0, revenue: 0, containedIn: [], containedArticleSales: 0, containedArticleRevenue: 0 };
}

/**
 * @param {{month: string, resolver: object, ga4: {pick: object, rows: Array}|null, salesLog: object, referral: object}} input
 */
export function buildSiteToSales({ month, resolver, ga4, salesLog, referral }) {
  const bounds = monthBounds(month);
  const rows = new Map();
  const rowFor = (productId, kind) => {
    if (!rows.has(productId)) rows.set(productId, blankRow(productId, kind, resolver.catalogIds.has(productId)));
    return rows.get(productId);
  };
  const catalogKind = (id) => (id === 'civil-membership-lab' ? 'membership' : 'catalog');

  const ga4Measured = Boolean(ga4?.pick && ga4.pick.status !== 'missing');
  const clickSummary = { status: ga4?.pick?.status ?? 'missing', file: ga4?.pick?.file ?? null, window: ga4?.pick?.window ?? null, overlapDays: ga4?.pick?.overlapDays ?? 0, outsideDays: ga4?.pick?.outsideDays ?? 0, labelRows: 0, total: ga4Measured ? 0 : null, resolved: ga4Measured ? 0 : null, unresolved: [] };
  if (ga4Measured) {
    for (const row of ga4.rows ?? []) {
      if (!['note_cta_click', 'note_cta_impression'].includes(row.eventName)) continue;
      const count = Number(row.eventCount ?? 0);
      const res = resolveCtaLabel(row.label, resolver);
      if (row.eventName === 'note_cta_click') {
        clickSummary.labelRows += 1;
        clickSummary.total += count;
      }
      if (!res.productId) {
        if (row.eventName === 'note_cta_click') clickSummary.unresolved.push({ label: row.label, clicks: count, reason: res.reason });
        continue;
      }
      const target = rowFor(res.productId, /^(article|note):/.test(res.productId) ? 'article' : catalogKind(res.productId));
      if (res.containedIn?.length) target.containedIn = res.containedIn;
      if (row.eventName === 'note_cta_impression') target.impressions += count;
      else {
        target.clicks += count;
        clickSummary.resolved += count;
        target.placements[res.placement] = (target.placements[res.placement] ?? 0) + count;
      }
    }
    clickSummary.unresolved.sort((a, b) => b.clicks - a.clicks || a.label.localeCompare(b.label));
  }

  const monthSales = (salesLog.sales ?? []).filter((s) => String(s.date ?? '').slice(0, 7) === month);
  const salesSummary = { count: monthSales.length, revenue: 0, resolved: 0, unresolved: [], reconciliation: null };
  const articleSales = [];
  for (const sale of monthSales) {
    const price = Number(sale.price ?? 0);
    salesSummary.revenue += price;
    const res = resolveSale(sale, resolver);
    if (!res.productId) {
      salesSummary.unresolved.push({ productId: sale.productId, title: sale.title, price, reason: res.reason });
      continue;
    }
    salesSummary.resolved += 1;
    const target = rowFor(res.productId, res.kind === 'membership' ? 'membership' : res.productId.startsWith('article:') ? 'article' : 'catalog');
    target.sales += 1;
    target.revenue += price;
    if (res.containedIn.length) {
      target.containedIn = res.containedIn;
      articleSales.push({ price, containedIn: res.containedIn });
    }
  }
  // 収録マガジン側に「収録単品の売上」を載せる（複数マガジンに収録された単品は各マガジンへ重複計上＝非加算）。
  for (const sale of articleSales) for (const id of sale.containedIn) {
    const target = rowFor(id, catalogKind(id));
    target.containedArticleSales += 1;
    target.containedArticleRevenue += sale.price;
  }
  const dashboard = referral?.dashboardSales ?? null;
  // 照合は「note の月次売上表示」と sales-log 合計の一致。表示の取得が月末以前なら月途中の一致でしかない。
  salesSummary.reconciliation = dashboard
    ? {
      dashboardYen: dashboard.yen,
      logYen: salesSummary.revenue,
      status: dashboard.yen !== salesSummary.revenue ? 'mismatch' : String(dashboard.fetchedAt).slice(0, 10) > bounds.endDate ? 'match' : 'match-partial-month',
      source: dashboard.file,
      fetchedAt: dashboard.fetchedAt,
    }
    : { dashboardYen: null, logYen: salesSummary.revenue, status: 'unverified', source: null, fetchedAt: null };

  const products = [...rows.values()]
    .map((row) => ({
      ...row,
      clicks: ga4Measured ? row.clicks : null,
      impressions: ga4Measured ? row.impressions : null,
      topPlacements: Object.entries(row.placements).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([placement, clicks]) => ({ placement, clicks })),
      siteReferredViews: null,
      status: {
        clicks: ga4Measured ? clickSummary.status : 'missing',
        sales: { match: 'reconciled', 'match-partial-month': 'partial-month' }[salesSummary.reconciliation.status] ?? salesSummary.reconciliation.status,
        siteReferredViews: 'unresolvable',
      },
    }))
    .map(({ placements, ...row }) => row)
    .sort((a, b) => b.revenue - a.revenue || (b.clicks ?? 0) - (a.clicks ?? 0) || b.containedArticleRevenue - a.containedArticleRevenue || a.productId.localeCompare(b.productId));

  return {
    schemaVersion: 1,
    month,
    period: { startDate: bounds.startDate, endDate: bounds.endDate },
    joinKey: 'note 商品ID（カタログ商品は src/lib/note-magazines.ts の id、カタログ外の単品は sales-log の article:<slug>）',
    clicks: clickSummary,
    noteReferral: { ...referral, perProduct: 'unresolvable', perProductReason: 'note の流入元はアカウント全体の月次値のみで、記事・マガジン別に出ない' },
    sales: salesSummary,
    products,
    summary: {
      products: products.length,
      productsWithClicks: products.filter((p) => (p.clicks ?? 0) > 0).length,
      productsWithSales: products.filter((p) => p.sales > 0).length,
      productsWithClicksAndSales: products.filter((p) => (p.clicks ?? 0) > 0 && (p.sales > 0 || p.containedArticleSales > 0)).length,
    },
    limitations: [
      'クリックと購入者を結合していない（note の販売履歴に流入識別子が無い）。同月に並べた診断値で、因果 attribution ではない。',
      'containedArticleSales は収録単品の売上を各収録マガジンへ重複して載せた非加算値。',
    ],
  };
}

const yen = (n) => (n == null ? '—' : `¥${n.toLocaleString('ja-JP')}`);
const num = (n) => (n == null ? '—' : String(n));

export function renderSiteToSalesTable(report) {
  const c = report.clicks;
  const s = report.sales;
  const r = report.noteReferral;
  const lines = [
    `# サイト送客 → note 売上 ${report.month}（${report.period.startDate}〜${report.period.endDate}）`,
    '',
    `GA4 クリック: ${c.status}${c.window ? `（窓 ${c.window.startDate}〜${c.window.endDate}・月内 ${c.overlapDays} 日／月外 ${c.outsideDays} 日）` : ''} 対象 ${num(c.total)} クリック / ${c.labelRows} label → 商品へ解決 ${num(c.resolved)}・未解決 ${c.total == null ? '—' : c.total - c.resolved}`,
    `note 流入元: ${r.status} doboku-note.com ${num(r.siteReferredViews)} PV / 全体 ${num(r.totalViews)} PV（no referrer ${num(r.noReferrerViews)}）${r.fetchedAt ? `・取得 ${r.fetchedAt.slice(0, 10)}` : ''}${r.note ? `・${r.note}` : ''}。商品別は解決不能（${r.perProductReason}）`,
    `売上: ${s.count} 件 ${yen(s.revenue)} → 商品へ解決 ${s.resolved}・未解決 ${s.unresolved.length}／ダッシュボード照合 ${s.reconciliation.status}${s.reconciliation.dashboardYen != null ? `（note 表示 ${yen(s.reconciliation.dashboardYen)}・取得 ${String(s.reconciliation.fetchedAt).slice(0, 10)}）` : ''}`,
    '',
    '| 商品 | クリック | 主な面 | 販売 | 売上 | 収録単品の販売(非加算) |',
    '|---|---:|---|---:|---:|---:|',
  ];
  const shown = report.products.filter((p) => (p.clicks ?? 0) > 0 || p.sales > 0 || p.containedArticleSales > 0);
  for (const p of shown) {
    const top = p.topPlacements.map((x) => `${x.placement} ${x.clicks}`).join(', ') || '—';
    const contained = p.containedArticleSales ? `${p.containedArticleSales} 件 ${yen(p.containedArticleRevenue)}` : '—';
    const name = p.containedIn.length ? `${p.productId}（収録: ${p.containedIn.join(', ')}）` : p.productId;
    lines.push(`| ${name} | ${num(p.clicks)} | ${top} | ${p.sales} | ${yen(p.revenue)} | ${contained} |`);
  }
  if (!shown.length) lines.push('| （対象なし） | — | — | 0 | ¥0 | — |');
  if (shown.length < report.products.length) lines.push('', `表示のみでクリック・販売の無い商品 ${report.products.length - shown.length} 件は JSON にだけ残す。`);
  if (c.unresolved.length) {
    lines.push('', '未解決クリック（商品へ結べない）:');
    const byReason = {};
    for (const u of c.unresolved) byReason[u.reason] = (byReason[u.reason] ?? 0) + u.clicks;
    for (const [reason, clicks] of Object.entries(byReason).sort((a, b) => b[1] - a[1])) lines.push(`- ${reason}: ${clicks} クリック`);
  }
  if (s.unresolved.length) {
    lines.push('', '未解決売上:');
    for (const u of s.unresolved) lines.push(`- ${u.productId} ${yen(u.price)}: ${u.reason}`);
  }
  lines.push('', ...report.limitations.map((l) => `> ${l}`), '');
  return lines.join('\n');
}

/**
 * 書き出し先を決める。`.claude/state/metrics/business/` は追記専用の台帳
 * （check-business-direction が既存ファイルの変更を拒否する）なので、同月の内容が変わったら
 * 上書きせず `-rN` の改訂ファイルを足す。内容が同じなら書かない。
 * @param {string[]} existingNames ディレクトリ内のファイル名
 * @param {(name: string) => string} readName
 * @param {string} body 書こうとしている JSON（generatedAt を含まない決定的な本文）
 */
export function planOutput(existingNames, month, readName, body) {
  const re = new RegExp(`^site-to-sales-${month}(?:-r(\\d+))?\\.json$`);
  const revisions = existingNames
    .map((name) => ({ name, rev: re.exec(name) }))
    .filter((x) => x.rev)
    .map((x) => ({ name: x.name, n: x.rev[1] ? Number(x.rev[1]) : 1 }))
    .sort((a, b) => a.n - b.n);
  const latest = revisions.at(-1);
  if (!latest) return { action: 'write', name: `site-to-sales-${month}.json`, supersedes: null };
  if (readName(latest.name) === body) return { action: 'unchanged', name: latest.name, supersedes: null };
  return { action: 'write', name: `site-to-sales-${month}-r${latest.n + 1}.json`, supersedes: latest.name };
}
