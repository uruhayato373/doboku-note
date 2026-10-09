// 商品の正本（DN-0492）: Windows / Mac で同じバイト列になる書き出しと、note-magazines.ts の生成ブロックの回帰テスト
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  Product, canonicalJson, canonicalFile, renderKindleCatalog, kindleProductId, renderCoconalaBlock, frontmatterPrice, renderCatalogEntry, renderBlock, replaceBlock, BLOCK_BEGIN, BLOCK_END, productGroups, blockGroupsIn, articleNoteId,
} from '../scripts/lib/product-registry.mjs';

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

test('productGroups は正本にある資格ごとに id 順でまとめ、blockGroupsIn は note-magazines.ts の生成ブロックの資格を返す', () => {
  const a = Product.parse(base);
  const b = Product.parse({ ...base, id: 'rccm-x', qualification: 'rccm', catalog: { ...base.catalog, id: 'rccm-x' } });
  const c = Product.parse({ ...base, id: 'civil-2-a', catalog: { ...base.catalog, id: 'civil-2-a' } });
  assert.deepEqual(productGroups([b, a, c]).map(([q, ps]) => [q, ps.map((p) => p.id)]), [
    ['civil-construction-2', ['civil-2-sample-pack', 'civil-2-a']],
    ['rccm', ['rccm-x']],
  ]);
  const ts = `${BLOCK_BEGIN('rccm')}\nx\n${BLOCK_END('rccm')}\n${BLOCK_BEGIN('civil-construction-2')}\n${BLOCK_END('civil-construction-2')}\n`;
  assert.deepEqual(blockGroupsIn(ts), ['rccm', 'civil-construction-2']);
});

test('原稿と結び付かない note 上の収録は note:<noteId> で書き、その noteId を返す', () => {
  assert.equal(articleNoteId('note:n123cf1c5f8f0'), 'n123cf1c5f8f0');
  assert.equal(articleNoteId('content/note/does-not-exist/article.md'), null);
});

test('canonicalFile は全商品を channel → id の順に並べ、schemaVersion と _doc を先頭に LF で書く（入力の順に依らない）', () => {
  const a = Product.parse(base);
  const b = Product.parse({ ...base, id: 'civil-2-a', catalog: { ...base.catalog, id: 'civil-2-a' } });
  const out = canonicalFile([a, b]);
  assert.equal(out, canonicalFile([b, a]));
  const json = JSON.parse(out);
  assert.deepEqual(Object.keys(json), ['schemaVersion', '_doc', 'products']);
  assert.deepEqual(json.products.map((p) => p.id), ['civil-2-a', 'civil-2-sample-pack']);
  assert.ok(out.endsWith('}\n') && !out.includes('\r'));
});

test('Kindle の商品は書籍の欄の並びを保ち、catalog.json は order の順で books を作る', () => {
  const book = (id, order) => Product.parse({
    id: kindleProductId(id), channel: 'kindle', qualification: 'rccm', stage: 'written', series: 'other', tier: 'book', order,
    catalog: { id, asin: 'B0X', title: `t-${id}`, priceJpy: 1250, status: 'live' },
  });
  const a = book('h-01', 1);
  const b = book('A-00', 0);
  assert.equal(b.id, 'kindle-a-00');
  assert.deepEqual(Object.keys(a.catalog), ['id', 'asin', 'title', 'priceJpy', 'status']);
  const out = JSON.parse(renderKindleCatalog([a, b], { kindle: { catalogComment: 'c', catalogSchemaVersion: 1, updatedAt: '2026-10-06' } }));
  assert.deepEqual(Object.keys(out), ['_comment', 'schemaVersion', 'updatedAt', 'books']);
  assert.deepEqual(out.books.map((x) => x.id), ['A-00', 'h-01']);
  assert.equal(Product.safeParse({ ...a, catalog: { ...a.catalog, priceJpy: -1 } }).success, false);
});

test('ココナラの生成ブロックは order の順で、読み手（parseCatalog）が欄を切り出せる書式で書く', async () => {
  const { parseCatalog } = await import('../scripts/lib/coconala-catalog.mjs');
  const svc = (id, order, extra = {}) => Product.parse({
    id, channel: 'coconala', qualification: 'rccm', stage: 'written', series: 'other', tier: 'service', order,
    catalog: { id, status: 'listed', serviceUrl: `https://coconala.com/services/${order + 1}`, title: `題名${order}ます`, shortTitle: 's', priceYen: 5000, examScope: ['rccm'], weeklyCapacity: 2, ...extra },
    memo: ['経緯のメモ'],
  });
  const a = svc('coconala-b', 1, { pauseReason: 'absence' });
  const b = svc('coconala-a', 0);
  const block = renderCoconalaBlock([a, b]);
  assert.ok(block.indexOf("'coconala-a': {") < block.indexOf("'coconala-b': {"), 'order の順でない');
  assert.match(block, /^ {2}\/\/ 経緯のメモ$/m);
  const parsed = parseCatalog(`const SERVICES_RAW = {\n${block}\n} as const;`);
  assert.deepEqual(Object.keys(parsed), ['coconala-a', 'coconala-b']);
  assert.equal(parsed['coconala-b'].priceYen, 5000);
  assert.equal(parsed['coconala-b'].pauseReason, 'absence');
  assert.equal(Product.safeParse({ ...a, catalog: { ...a.catalog, priceYen: 0 } }).success, false, 'priceYen 0 を通した');
});

test('記事の単品価格: frontmatter の price を読み（CRLF でも）、正本の articlePrices はキーの順に並べて書く', () => {
  assert.equal(frontmatterPrice('---\r\ntitle: "x"\r\nprice: 1480\r\n---\r\n本文 price: 9999\r\n'), 1480);
  assert.equal(frontmatterPrice('---\ntitle: x\n---\nprice: 1480\n'), null, '本文の price を拾った');
  const out = JSON.parse(canonicalFile([Product.parse(base)], {}, { 'content/note/b/article.md': 980, 'content/note/a/article.md': 1480 }));
  assert.deepEqual(Object.keys(out), ['schemaVersion', '_doc', 'products', 'articlePrices']);
  assert.deepEqual(Object.keys(out.articlePrices), ['content/note/a/article.md', 'content/note/b/article.md']);
  assert.ok(!('articlePrices' in JSON.parse(canonicalFile([Product.parse(base)]))), '空の articlePrices を書いた');
});
