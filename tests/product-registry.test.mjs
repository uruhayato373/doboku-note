// 商品の正本（DN-0492）: Windows / Mac で同じバイト列になる書き出しと、note-magazines.ts の生成ブロックの回帰テスト
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Product, canonicalJson, renderCatalogEntry, renderBlock, replaceBlock, BLOCK_BEGIN, BLOCK_END } from '../scripts/lib/product-registry.mjs';

const base = {
  id: 'civil-2-sample-pack',
  channel: 'note',
  qualification: 'civil-construction-2',
  stage: 'second',
  series: 'keiken',
  tier: 'magazine',
  catalog: { id: 'civil-2-sample-pack', published: true, noteUrl: 'https://note.com/dobokunote/m/m123', title: "It's ¥2,480", badge: 'x' },
};

test('canonicalJson はキー順を固定し LF・末尾改行で書く（入力のキー順に依らない）', () => {
  const a = Product.parse(base);
  const b = Product.parse({ catalog: base.catalog, tier: 'magazine', series: 'keiken', stage: 'second', qualification: base.qualification, channel: 'note', id: base.id });
  assert.equal(canonicalJson(a), canonicalJson(b));
  assert.ok(canonicalJson(a).endsWith('}\n'));
  assert.ok(!canonicalJson(a).includes('\r'));
  assert.ok(canonicalJson(a).indexOf('"id"') < canonicalJson(a).indexOf('"catalog"'));
});

test('id は英小文字・数字・ハイフンだけ', () => {
  assert.equal(Product.safeParse({ ...base, id: '2級-pack' }).success, false);
});

test('生成エントリは id / published / noteUrl の順で、引用符をエスケープする', () => {
  const e = renderCatalogEntry(Product.parse(base));
  assert.match(e, /id: 'civil-2-sample-pack',\n {4}published: true,\n {4}noteUrl: 'https:\/\/note\.com\/dobokunote\/m\/m123',/);
  assert.match(e, /title: 'It\\'s ¥2,480',/);
});

test('replaceBlock は枠の中だけを差し替え、枠が無ければ null', () => {
  const g = 'civil-construction-2';
  const ts = `head\n${BLOCK_BEGIN(g)}\nold\n${BLOCK_END(g)}\ntail\n`;
  const block = renderBlock(g, [Product.parse(base)]);
  const out = replaceBlock(ts, g, block);
  assert.ok(out.startsWith('head\n') && out.endsWith('\ntail\n'));
  assert.ok(out.includes("'civil-2-sample-pack': {"));
  assert.equal(replaceBlock('no block', g, block), null);
});
