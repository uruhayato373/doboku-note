import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildResolver,
  buildSiteToSales,
  monthBounds,
  parseHubSeasonalProducts,
  parseNoteCatalog,
  pickGa4Snapshot,
  pickNoteReferral,
  planOutput,
  previousMonth,
  resolveCtaLabel,
  resolveSale,
} from '../scripts/lib/site-to-sales.mjs';

const CATALOG_TS = `
const MAGAZINES_RAW = {
  'civil-1-pack': {
    id: 'civil-1-pack',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m111',
    landingUrl: 'https://note.com/dobokunote/n/nfront1',
    title: 'パック',
  },
  'civil-1-anki-note': {
    id: 'civil-1-anki-note',
    published: true,
    noteUrl: 'https://note.com/dobokunote/n/nanki1',
    title: '暗記ノート',
  },
  'pe-construction-road-pack': { id: 'pe-construction-road-pack', published: true, noteUrl: 'https://note.com/dobokunote/m/m222', title: '道路' },
  'civil-membership-lab': { id: 'civil-membership-lab', published: true, noteUrl: 'https://note.com/dobokunote/membership/join', title: 'ラボ' },
};`;

const HUB_TS = `
const HUB: Partial<Record<string, HubCtaSpec>> = {
  'civil-construction-1': {
    mokuji: { url: 'https://note.com/dobokunote/n/nmokuji', title1: 'a', title2: 'b' },
    seasonal: {
      switchUtcMs: 0,
      product: 'civil-1-anki-note',
      sub: 'x',
    },
  },
  'pe-construction': {
    mokuji: { url: 'https://note.com/dobokunote/n/nmokuji2', title1: 'a', title2: 'b' },
  },
};
`;

const SNAPSHOT = {
  magazines: [
    { sotId: 'civil-1-pack', notes: [{ key: 'nsingle1', name: '1級｜工事A 完成答案' }, { key: 'nunsold', name: '売れていない単品' }] },
    { sotId: 'unknown-magazine', notes: [{ key: 'nsingle1', name: '1級｜工事A 完成答案' }] },
  ],
};

const SALES = {
  sales: [
    { date: '2026-08-03', productId: 'civil-1-pack', title: 'パック', type: 'magazine', price: 9800 },
    { date: '2026-08-04', productId: 'article:civil-1-single-a', title: '1級｜工事A 完成答案', type: 'article', price: 1980 },
    { date: '2026-08-05', productId: 'bk-road-pack', title: '道路パック', type: 'magazine', price: 4980 },
    { date: '2026-08-06', productId: 'membership:civil-lab-annual', title: '通年プラン', type: 'membership', price: 1480 },
    { date: '2026-08-07', productId: 'mystery-magazine', title: '謎', type: 'magazine', price: 500 },
    { date: '2026-07-31', productId: 'civil-1-pack', title: 'パック', type: 'magazine', price: 9800 },
  ],
};

function resolver() {
  return buildResolver({ catalog: parseNoteCatalog(CATALOG_TS), hubSeasonal: parseHubSeasonalProducts(HUB_TS), magazineSnapshot: SNAPSHOT, salesLog: SALES });
}

test('月の境界と直近の完了月', () => {
  assert.deepEqual(monthBounds('2026-02'), { startDate: '2026-02-01', endDate: '2026-02-28', days: 28 });
  assert.equal(previousMonth('2026-09-25'), '2026-08');
  assert.equal(previousMonth('2026-01-03'), '2025-12');
  assert.throws(() => monthBounds('2026-13'));
});

test('カタログと hub seasonal 商品を解析する', () => {
  const catalog = parseNoteCatalog(CATALOG_TS);
  assert.deepEqual(catalog.map((c) => c.id), ['civil-1-pack', 'civil-1-anki-note', 'pe-construction-road-pack', 'civil-membership-lab']);
  assert.equal(catalog[0].landingUrl, 'https://note.com/dobokunote/n/nfront1');
  assert.equal(catalog[1].landingUrl, null);
  assert.deepEqual(parseHubSeasonalProducts(HUB_TS), { 'civil-construction-1': 'civil-1-anki-note' });
});

test('CTA label を商品へ解決し、解決できないものは理由を返す', () => {
  const r = resolver();
  assert.deepEqual(resolveCtaLabel('civil-1-pack:secondary-r07-q1', r), { productId: 'civil-1-pack', via: 'label', placement: 'secondary-r07-q1' });
  assert.equal(resolveCtaLabel('civil-1-pack', r).productId, 'civil-1-pack');
  assert.equal(resolveCtaLabel('category-civil-construction-1-hub-seasonal-docs-sb', r).productId, 'civil-1-anki-note');
  const mokuji = resolveCtaLabel('category-pe-construction-hub-mokuji-footer', r);
  assert.equal(mokuji.productId, null);
  assert.match(mokuji.reason, /もくじ/);
  assert.equal(resolveCtaLabel('note-nanki1', r).productId, 'civil-1-anki-note');
  assert.equal(resolveCtaLabel('note-nfront1', r).productId, 'civil-1-pack', 'landingUrl の記事キーも商品へ戻す');
  assert.equal(resolveCtaLabel('note-nsingle1', r).productId, 'article:civil-1-single-a');
  const unsold = resolveCtaLabel('note-nunsold', r);
  assert.equal(unsold.productId, 'note:nunsold');
  assert.deepEqual(unsold.containedIn, ['civil-1-pack']);
  assert.match(resolveCtaLabel('secondary-r07-q1', r).reason, /面だけの label/);
  assert.match(resolveCtaLabel('gone-product:top', r).reason, /カタログに無い/);
  assert.match(resolveCtaLabel('note-nzzz', r).reason, /snapshot に無い/);
});

test('売上 productId をカタログ商品・単品・メンバーシップへ解決する', () => {
  const r = resolver();
  assert.equal(resolveSale(SALES.sales[0], r).productId, 'civil-1-pack');
  assert.deepEqual(resolveSale(SALES.sales[1], r), { productId: 'article:civil-1-single-a', kind: 'article', containedIn: ['civil-1-pack'] });
  assert.equal(resolveSale(SALES.sales[2], r).productId, 'pe-construction-road-pack', 'bk-* は CTA 側 id へ');
  assert.equal(resolveSale(SALES.sales[3], r).productId, 'civil-membership-lab');
  assert.equal(resolveSale(SALES.sales[4], r).productId, null);
  assert.equal(resolveSale({ productId: 'article:civil-1-anki-note', title: 'x', type: 'article' }, r).productId, 'civil-1-anki-note');
});

test('GA4 窓は月一致を優先し、無ければ重なり最大・重なり 0 は欠測', () => {
  const snaps = [
    { file: 'a.json', meta: { startDate: '2026-07-31', endDate: '2026-08-27' } },
    { file: 'b.json', meta: { startDate: '2026-08-06', endDate: '2026-09-02' } },
    { file: 'c.json', meta: { startDate: '2026-08-01', endDate: '2026-08-31', truncated: true } },
  ];
  const mismatch = pickGa4Snapshot(snaps, '2026-08');
  assert.equal(mismatch.status, 'window-mismatch');
  assert.equal(mismatch.file, 'a.json');
  assert.equal(mismatch.overlapDays, 27);
  assert.equal(mismatch.outsideDays, 1);
  const exact = pickGa4Snapshot([...snaps, { file: 'd.json', meta: { startDate: '2026-08-01', endDate: '2026-08-31', windowKind: 'month' } }], '2026-08');
  assert.equal(exact.status, 'exact');
  assert.equal(exact.file, 'd.json');
  assert.equal(pickGa4Snapshot(snaps, '2026-11').status, 'missing');
});

test('note 流入元: 2026-09 より前は測定不能、月途中の取得は partial、取得が新しいファイルを使う', () => {
  const files = [
    { file: 'referrers-2026-08.json', data: { month: '2026-08', fetchedAt: '2026-09-23T00:00:00Z', summary: { salesYen: 14240 }, monthly: [
      { month: '2026-08', sources: { 'no referrer': 10, 'doboku-note.com': 0 }, total: 30 },
      { month: '2026-09', sources: { 'no referrer': 20, 'doboku-note.com': 34 }, total: 90 },
    ] } },
    { file: 'referrers-2026-09.json', data: { month: '2026-09', fetchedAt: '2026-09-15T00:00:00Z', summary: { salesYen: 500 }, monthly: [
      { month: '2026-09', sources: { 'no referrer': 5 }, total: 50 },
    ] } },
  ];
  const aug = pickNoteReferral(files, '2026-08');
  assert.equal(aug.status, 'not-measurable');
  assert.equal(aug.siteReferredViews, null, '測れない月を 0 にしない');
  assert.equal(aug.dashboardSales.yen, 14240);
  const sep = pickNoteReferral(files, '2026-09');
  assert.equal(sep.status, 'partial-month');
  assert.equal(sep.siteReferredViews, 34);
  assert.equal(sep.file, 'referrers-2026-08.json');
  assert.equal(sep.dashboardSales.yen, 500, '売上表示は対象月のファイルからだけ取る');
  assert.equal(pickNoteReferral(files, '2026-10').status, 'missing');
});

test('月次突合: 未解決を件数で残し、GA4 欠測は null、収録単品は非加算で載せる', () => {
  const r = resolver();
  const referral = { status: 'not-measurable', siteReferredViews: null, dashboardSales: { yen: 18740, file: 'referrers-2026-08.json', fetchedAt: '2026-09-23T00:00:00Z' } };
  const ga4 = {
    pick: { status: 'window-mismatch', file: 'a.json', window: { startDate: '2026-07-31', endDate: '2026-08-27' }, overlapDays: 27, outsideDays: 1 },
    rows: [
      { label: 'civil-1-pack:top', eventName: 'note_cta_click', eventCount: 5 },
      { label: 'civil-1-pack:mid', eventName: 'note_cta_click', eventCount: 2 },
      { label: 'civil-1-pack:top', eventName: 'note_cta_impression', eventCount: 100 },
      { label: 'secondary-r07-q1', eventName: 'note_cta_click', eventCount: 4 },
      { label: 'BuildJob-sidebar', eventName: 'affiliate_cta_click', eventCount: 9 },
    ],
  };
  const report = buildSiteToSales({ month: '2026-08', resolver: r, ga4, salesLog: SALES, referral });
  assert.equal(report.clicks.total, 11);
  assert.equal(report.clicks.resolved, 7);
  assert.deepEqual(report.clicks.unresolved.map((u) => [u.label, u.clicks]), [['secondary-r07-q1', 4]]);
  assert.equal(report.sales.count, 5, '月外の売上は数えない');
  assert.equal(report.sales.revenue, 18740);
  assert.equal(report.sales.resolved, 4);
  assert.equal(report.sales.unresolved[0].productId, 'mystery-magazine');
  assert.equal(report.sales.reconciliation.status, 'match');
  const pack = report.products.find((p) => p.productId === 'civil-1-pack');
  assert.equal(pack.clicks, 7);
  assert.equal(pack.impressions, 100);
  assert.deepEqual(pack.topPlacements, [{ placement: 'top', clicks: 5 }, { placement: 'mid', clicks: 2 }]);
  assert.equal(pack.sales, 1);
  assert.equal(pack.containedArticleSales, 1);
  assert.equal(pack.containedArticleRevenue, 1980);
  assert.equal(pack.status.sales, 'reconciled');
  assert.equal(pack.siteReferredViews, null);
  const single = report.products.find((p) => p.productId === 'article:civil-1-single-a');
  assert.equal(single.clicks, 0, 'GA4 を取れている窓での 0 は計測済みの 0');
  assert.equal(report.products.reduce((s, p) => s + p.revenue, 0), 18740 - 500, '直接売上の合計は解決済み売上と一致（収録単品は二重計上しない）');

  const noGa4 = buildSiteToSales({ month: '2026-08', resolver: r, ga4: { pick: { status: 'missing' }, rows: [] }, salesLog: SALES, referral: { ...referral, dashboardSales: null } });
  assert.equal(noGa4.clicks.total, null);
  assert.ok(noGa4.products.every((p) => p.clicks === null), 'GA4 欠測を 0 に丸めない');
  assert.equal(noGa4.sales.reconciliation.status, 'unverified');

  const partial = buildSiteToSales({ month: '2026-08', resolver: r, ga4, salesLog: SALES, referral: { ...referral, dashboardSales: { yen: 18740, file: 'x', fetchedAt: '2026-08-20T00:00:00Z' } } });
  assert.equal(partial.sales.reconciliation.status, 'match-partial-month');
});

test('出力先: 初回は月ファイル、同内容は書かない、内容が変われば改訂ファイルを足す', () => {
  const read = (files) => (name) => files[name];
  assert.deepEqual(planOutput(['measurement-x.json'], '2026-08', read({}), 'A'), { action: 'write', name: 'site-to-sales-2026-08.json', supersedes: null });
  assert.equal(planOutput(['site-to-sales-2026-08.json'], '2026-08', read({ 'site-to-sales-2026-08.json': 'A' }), 'A').action, 'unchanged');
  const files = { 'site-to-sales-2026-08.json': 'A', 'site-to-sales-2026-08-r2.json': 'B', 'site-to-sales-2026-09.json': 'Z' };
  assert.deepEqual(planOutput(Object.keys(files), '2026-08', read(files), 'C'), { action: 'write', name: 'site-to-sales-2026-08-r3.json', supersedes: 'site-to-sales-2026-08-r2.json' });
  assert.equal(planOutput(Object.keys(files), '2026-08', read(files), 'B').action, 'unchanged');
});
