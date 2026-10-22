// note の単品（products.json の channel=note・tier=single）の価格照合（DN-0704）。
// 取得結果（fetchNote の戻り）を注入して、一致・価格ドリフト・取得失敗・検査不成立の判定だけを見る。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priceNum, singleTargets, fetchable, reconcileSinglePrices } from '../scripts/lib/note-single-price.mjs';

const single = (id, catalog) => ({ id, channel: 'note', tier: 'single', catalog: { id, published: true, ...catalog } });
const alive = (price, status = 'published') => ({ state: 'alive', status, price, error: null });
const unknown = { state: 'unknown', status: null, price: null, error: 'curl: (28) timeout' };

test('priceNum は先頭の ¥金額を読む', () => {
  assert.equal(priceNum('¥2,480（予想模試3回・PDF6冊）'), 2480);
  assert.equal(priceNum('¥980'), 980);
  assert.equal(priceNum(null), null);
  assert.equal(priceNum('未定'), null);
});

test('対象は公開中の単品だけ。マガジン・未公開・販売終了は外し、price 欄なしは 0 円扱い', () => {
  const { targets, skipped } = singleTargets([
    single('a', { noteUrl: 'https://note.com/x/n/n0123456789ab', price: '¥1,480' }),
    single('free', { noteUrl: 'https://note.com/x/n/nabcdef012345' }),
    single('draft', { published: false, noteUrl: '', price: '¥980' }),
    single('old', { noteUrl: 'https://note.com/x/n/n111111111111', price: '¥980', retiredAt: '2026-09-01' }),
    { id: 'mag', channel: 'note', tier: 'magazine', catalog: { published: true, noteUrl: 'https://note.com/x/m/m0123456789ab', price: '¥980' } },
    { id: 'kdp', channel: 'kindle', tier: 'single', catalog: { published: true } },
  ]);
  assert.deepEqual(targets.map((t) => [t.id, t.key, t.expected]), [
    ['a', 'n0123456789ab', 1480],
    ['free', 'nabcdef012345', 0],
  ]);
  assert.deepEqual(skipped, [{ id: 'draft', reason: '未公開' }, { id: 'old', reason: '販売終了' }]);
});

test('価格が一致すれば一致に数え、違えば価格ドリフトを出す', () => {
  const { targets } = singleTargets([
    single('a', { noteUrl: 'https://note.com/x/n/n0123456789ab', price: '¥1,480' }),
    single('b', { noteUrl: 'https://note.com/x/n/nabcdef012345', price: '¥1,980' }),
    single('free', { noteUrl: 'https://note.com/x/n/n222222222222' }),
  ]);
  const r = reconcileSinglePrices(targets, new Map([['a', alive(1480)], ['b', alive(1480)], ['free', alive(500)]]));
  assert.deepEqual(r.matched.map((m) => m.id), ['a']);
  assert.equal(r.issues.length, 2);
  assert.match(r.issues[0], /\[価格ドリフト\] b: 正本¥1980 ≠ note¥1480/);
  assert.match(r.issues[1], /\[価格ドリフト\] free: 正本¥0（price 欄なし＝無料扱い） ≠ note¥500/);
  assert.equal(r.checked, 3);
  assert.equal(r.inconclusive, false);
});

test('公開 API で見えない・published でない記事はズレとして出す（取得失敗とは分ける）', () => {
  const { targets } = singleTargets([
    single('gone', { noteUrl: 'https://note.com/x/n/n0123456789ab', price: '¥980' }),
    single('draft', { noteUrl: 'https://note.com/x/n/nabcdef012345', price: '¥980' }),
  ]);
  const r = reconcileSinglePrices(targets, new Map([
    ['gone', { state: 'dead', status: null, price: null, error: 'not-found' }],
    ['draft', alive(980, 'draft')],
  ]));
  assert.equal(r.failed.length, 0);
  assert.equal(r.checked, 2);
  assert.match(r.issues[0], /\[非公開化\?\] gone/);
  assert.match(r.issues[1], /\[公開状態\] draft: .*status=draft/);
});

test('取得失敗は一致にもズレにも数えず、支配的なら検査不成立', () => {
  const urls = Array.from({ length: 5 }, (_, i) => single(`p${i}`, { noteUrl: `https://note.com/x/n/n00000000000${i}`, price: '¥980' }));
  const { targets } = singleTargets(urls);
  // 5 件中 1 件の失敗（20%）はちょうど上限で成立
  const one = reconcileSinglePrices(targets, new Map(targets.map((t, i) => [t.id, i === 0 ? unknown : alive(980)])));
  assert.equal(one.failed.length, 1);
  assert.equal(one.matched.length, 4);
  assert.equal(one.issues.length, 0);
  assert.equal(one.inconclusive, false);
  // 5 件中 2 件の失敗は支配的
  const two = reconcileSinglePrices(targets, new Map(targets.map((t, i) => [t.id, i < 2 ? unknown : alive(980)])));
  assert.equal(two.inconclusive, true);
  // 結果が無い（読んでいない）ものも取得失敗
  const none = reconcileSinglePrices(targets, new Map());
  assert.equal(none.failed.length, 5);
  assert.equal(none.checked, 0);
  assert.equal(none.inconclusive, true);
});

test('検査ゼロは成立にしない（対象 0 件・記事 URL なしだけ）', () => {
  assert.equal(reconcileSinglePrices([], new Map()).inconclusive, true);
  const { targets } = singleTargets([single('m', { noteUrl: 'https://note.com/x/m/m0123456789ab', price: '¥980' })]);
  assert.equal(fetchable(targets[0]), false);
  const r = reconcileSinglePrices(targets, new Map());
  assert.match(r.issues[0], /\[記事URLなし\] m/);
  assert.equal(r.attempted, 0);
  assert.equal(r.inconclusive, true);
});
