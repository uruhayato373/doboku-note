/**
 * coconala-live-parity.test.mjs — ココナラの公開ページ照合と価格ルール判定の境界を固定する
 * ---------------------------------------------------------------------------
 * - 公開ページの構造化データ（Product）とカタログ／listings の食い違いを取りこぼさないか
 *   （価格 select が失敗しても ok:true を返す偽成功の前例があるため、価格の不一致は必ず拾う）
 * - 空白・改行の違いだけでは食い違いにしないか（ココナラは本文の改行を詰めて表示する）
 * - 「note で同じ中身を最安で買う価格 × 1.1」を刻みで切り上げた下限を正しく計算し、下回りを止めるか
 * - 部門ごとに1冊を送る商品（each:）は、高い方を基準にするか
 * ---------------------------------------------------------------------------
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseServiceProduct, diffLiveService } from '../scripts/lib/coconala-live.mjs';
import {
  parseNotePrices,
  evalNoteBasis,
  ceilToCoconalaStep,
  isCoconalaPriceStep,
  minCoconalaPrice,
  checkPriceParity,
} from '../scripts/lib/coconala-price-parity.mjs';

const product = (over = {}) => ({
  '@type': 'Product',
  name: '1級土木の模試を送ります 本番形式3回',
  description: '本番形式の模試です。\n\n【収録内容】\n・3回分',
  offers: { price: 3500, availability: 'https://schema.org/InStock', seller: { name: 'dobokunote' } },
  ...over,
});
const service = { id: 'coconala-x-pdf', title: '1級土木の模試を送ります', priceYen: 3500 };
const listing = { catchphrase: '本番形式3回', body: '本番形式の模試です。\n【収録内容】\n・3回分' };

test('parseServiceProduct: 複数の JSON-LD から Product を拾い、壊れたブロックは読み飛ばす', () => {
  const html = [
    '<script type="application/ld+json">{broken</script>',
    '<script type="application/ld+json">{"@type":"BreadcrumbList"}</script>',
    `<script data-n-head="ssr" type="application/ld+json">${JSON.stringify(product())}</script>`,
  ].join('');
  assert.equal(parseServiceProduct(html).offers.price, 3500);
  assert.equal(parseServiceProduct('<html></html>'), null);
});

test('diffLiveService: 一致なら空。改行と空白の違いは食い違いにしない', () => {
  assert.deepEqual(diffLiveService(service, listing, product(), { sellerName: 'dobokunote' }), []);
});

test('diffLiveService: 価格・本文・キャッチコピー・販売状態の食い違いを拾う', () => {
  const issues = diffLiveService(
    service,
    listing,
    product({
      name: '1級土木の模試を送ります 旧キャッチ',
      description: '古い本文です。',
      offers: { price: 2500, availability: 'https://schema.org/OutOfStock', seller: { name: 'dobokunote' } },
    }),
    { sellerName: 'dobokunote' },
  );
  assert.ok(issues.some((i) => i.startsWith('価格')));
  assert.ok(issues.some((i) => i.startsWith('本文')));
  assert.ok(issues.some((i) => i.startsWith('キャッチコピー')));
  assert.ok(issues.some((i) => i.startsWith('販売状態')));
});

test('diffLiveService: 構造化データが無い（削除・非公開）ページは食い違いとして扱う', () => {
  assert.equal(diffLiveService(service, listing, null).length, 1);
});

const notePrices = parseNotePrices(`
  { id: 'pack', price: '¥2,980（模試＋暗記）' },
  { id: 'mock', price: '¥2,480（模試3回）' },
  { id: 'anki', price: '¥980' },
  { id: 'soukan-oral', price: '¥2,980' },
  { id: 'kensetsu-oral', price: '¥1,980' },
  { id: 'member', price: '会員特典（単体購入不可）' },
`);

test('parseNotePrices: 先頭の金額を読み、金額の無い商品は null', () => {
  assert.equal(notePrices.pack, 2980);
  assert.equal(notePrices.member, null);
});

test('evalNoteBasis: | は安い方、+ は合計、each: は高い方', () => {
  assert.equal(evalNoteBasis('pack | mock + anki', notePrices).floor, 2980);
  assert.equal(evalNoteBasis('each: soukan-oral | kensetsu-oral', notePrices).floor, 2980);
  assert.match(evalNoteBasis('pack | nothing', notePrices).error, /無い id/);
  assert.match(evalNoteBasis('member', notePrices).error, /金額が読めない/);
});

test('ceilToCoconalaStep / minCoconalaPrice: ¥10,000 以下は ¥500、超は ¥1,000 刻み', () => {
  assert.equal(ceilToCoconalaStep(3278), 3500);
  assert.equal(ceilToCoconalaStep(10000), 10000);
  assert.equal(ceilToCoconalaStep(11462), 12000);
  assert.equal(minCoconalaPrice(2980), 3500); // 3,278 → 3,500
  assert.equal(minCoconalaPrice(10420), 12000); // 11,462 → 12,000
});

test('checkPriceParity: 下限を割る PDF と、基準も対象外理由も無い PDF を止める', () => {
  const r = checkPriceParity(
    [
      { id: 'coconala-ok-pdf', status: 'listed', priceYen: 3500, notePriceBasis: 'pack | mock + anki' },
      { id: 'coconala-cheap-pdf', status: 'listed', priceYen: 3000, notePriceBasis: 'pack' },
      { id: 'coconala-nobasis-pdf', status: 'draft', priceYen: 3000 },
      { id: 'coconala-exempt-pdf', status: 'listed', priceYen: 2500, notePriceExempt: 'note に同じ中身が無い' },
      { id: 'coconala-retired-pdf', status: 'paused', priceYen: 100 },
      { id: 'coconala-tensaku-set', status: 'listed', priceYen: 6000 },
    ],
    notePrices,
  );
  assert.equal(r.violations.length, 2);
  assert.ok(r.violations.some((v) => v.includes('coconala-cheap-pdf') && v.includes('¥3500')));
  assert.ok(r.violations.some((v) => v.includes('coconala-nobasis-pdf')));
  assert.deepEqual(r.exempt, ['coconala-exempt-pdf']);
  assert.equal(r.rows.length, 2);
});

test('isCoconalaPriceStep: ¥10,000 以下は500円刻み、超は1,000円刻み（¥10,500 は設定不可）', () => {
  for (const ok of [500, 1500, 9500, 10000, 11000, 20000]) assert.equal(isCoconalaPriceStep(ok), true, String(ok));
  for (const ng of [0, -500, 1200, 10500, 12500, 7500.5]) assert.equal(isCoconalaPriceStep(ng), false, String(ng));
});
