/**
 * 台帳に宣言した参照（資格 id・商品 id・記事 slug）の実在検査（DN-0586・外部キー相当）のテスト。
 *
 * 守りたい事故:
 *   A. 記事の改名・統合・資格 id の変更で、データの中の参照が切れても誰も気づかない。
 *   B. 場所（at）の書き間違いで値を 1 件も拾わず、検査ゼロが PASS に見える。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { readDataset } from '../scripts/lib/dataset-io.mjs';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATASETS, datasetDir } from '../scripts/lib/datasets.mjs';
import { REF_TARGETS, checkRefs, refContext, refDeclarationError, refResolvers, valuesAt } from '../scripts/lib/dataset-refs.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

test('valuesAt: 「*」「名前[]」「[]」で入れ子の値を集め、空の参照は数えない（B）', () => {
  const data = {
    books: {
      a: { expansions: [{ article: 'x/one' }, { article: 'x/two' }] },
      b: { expansions: [{ article: null }, { article: '' }] },
    },
    list: [{ ids: ['p', 'q'] }, { ids: 'r' }],
  };
  assert.deepEqual(valuesAt(data, 'books.*.expansions[].article').map((v) => v.value), ['x/one', 'x/two']);
  assert.equal(valuesAt(data, 'books.*.expansions[].article')[1].where, 'books.a.expansions[1].article');
  assert.deepEqual(valuesAt(data, 'list[].ids').map((v) => v.value), ['p', 'q', 'r'], '値が配列なら各要素を数える');
  assert.deepEqual(valuesAt([{ id: 'z' }], '[].id').map((v) => v.value), ['z']);
  assert.deepEqual(valuesAt(data, 'books.*.missing[].article'), [], '無い場所は 0 件（呼び手が検査ゼロを違反にする）');
});

test('checkRefs: 参照先に無い値を参照切れとして場所つきで返す（A）', () => {
  const resolvers = { qualification: (v) => (v === 'civil-construction-1' ? true : undefined), product: () => ({}), article: () => true };
  const r = checkRefs(
    { id: 'demo', refs: [{ at: 'items[].qualification', to: 'qualification' }] },
    [{ file: 'demo.json', data: { items: [{ qualification: 'civil-construction-1' }, { qualification: 'civil-construction-9' }] } }],
    resolvers,
  );
  assert.equal(r.checked, 2);
  assert.deepEqual(r.broken, [{ file: 'demo.json', where: 'items[1].qualification', value: 'civil-construction-9', to: 'qualification', severity: 'error' }]);
  assert.throws(() => checkRefs({ id: 'demo', refs: [{ at: 'a', to: 'nope' }] }, [{ file: 'f', data: { a: 1 } }], resolvers), /未知/);
});

test('refResolvers: 実在の資格・商品・記事（Convention A/B）を見分ける（A）', () => {
  const r = refResolvers({ root: REPO_ROOT, ...refContext((id) => readDataset(REPO_ROOT, id)) });
  assert.equal(r.qualification('civil-construction-1'), true);
  assert.equal(r.qualification('no-such-qualification'), undefined);
  const product = readDataset(REPO_ROOT, 'config.products').products[0].id;
  assert.equal(r.product(product)?.id, product, '商品は行を返す（copies の比較に使う）');
  assert.equal(r.product('no-such-product'), undefined);
  assert.ok(r.experiment('EXP-043'));
  assert.equal(r.experiment('EXP-999'), undefined);
  assert.ok(r['affiliate-program']('buildjob'));
  assert.equal(r['affiliate-program']('toString'), undefined, 'プロトタイプの名前を案件として通さない');
  assert.ok(r.metric('netReceipts'));
  assert.equal(r.article('civil-construction-1/guide-strategy'), true);
  assert.equal(r.article('civil-construction-1/no-such-article'), undefined);
  assert.equal(r.article('../../package'), undefined, 'slug の形でないものは通さない');
});

test('台帳: refs の宣言は形が正しく、宣言したデータセットの参照は実在する（A・B）', () => {
  const declared = DATASETS.filter((x) => x.refs);
  assert.ok(declared.length >= 3, `refs を宣言したデータセットが少ない（${declared.length}）`);
  const resolvers = refResolvers({ root: REPO_ROOT, ...refContext((id) => readDataset(REPO_ROOT, id)) });
  for (const x of declared) {
    for (const ref of x.refs) assert.equal(refDeclarationError(ref), null, `${x.id}: ${JSON.stringify(ref)}`);
    // パスに {name} などの可変部分があるデータセットは、置き場の全ファイルを読む（例: 過去問の問題台帳は資格ごとに 1 ファイル）
    const files = x.path.includes('{')
      ? readdirSync(join(REPO_ROOT, datasetDir(x.id))).filter((f) => f.endsWith('.json')).map((f) => ({ file: `${datasetDir(x.id)}/${f}`, data: JSON.parse(readFileSync(join(REPO_ROOT, datasetDir(x.id), f), 'utf8')) }))
      : [{ file: x.path, data: readDataset(REPO_ROOT, x.id) }];
    const r = checkRefs(x, files, resolvers);
    assert.ok(r.checked > 0, `${x.id}: 参照を 1 件も拾えない（場所の書き間違い）`);
    assert.deepEqual(r.broken.filter((b) => b.severity === 'error'), [], `${x.id}: 参照切れ`);
    assert.deepEqual(r.mismatched.filter((m) => m.severity === 'error'), [], `${x.id}: 写しの不一致`);
  }
});

test('参照の任意の欄: keys・prefix・ignore・severity・copies（2026-10-27）', () => {
  const products = { p1: { id: 'p1', catalog: { noteUrl: 'https://note.com/a' } } };
  const resolvers = { product: (v) => products[v], article: (v) => (v === 'x/one' ? true : undefined), qualification: () => true };
  const keyed = checkRefs(
    { id: 'demo', refs: [{ at: 'mags', to: 'product', keys: true, ignore: ['mokuji'], copies: { url: 'catalog.noteUrl' } }] },
    [{ file: 'f', data: { mags: { p1: { url: 'https://note.com/old' }, gone: { url: 'u' }, mokuji: { url: 'm' } } } }],
    resolvers,
  );
  assert.equal(keyed.checked, 2, 'ignore の値は数えない');
  assert.deepEqual(keyed.broken.map((b) => b.value), ['gone'], 'キーを参照として照らす');
  assert.deepEqual(keyed.mismatched.map((m) => [m.where, m.value, m.expected]), [['mags.p1.url', 'https://note.com/old', 'https://note.com/a']], '写しの値の違いを場所つきで返す');
  const prefixed = checkRefs({ id: 'demo', refs: [{ at: 'a.*', to: 'article', prefix: 'x/', severity: 'warn' }] }, [{ file: 'f', data: { a: { k: ['one', 'two'] } } }], resolvers);
  assert.deepEqual(prefixed.broken, [{ file: 'f', where: 'a.k[1]', value: 'x/two', to: 'article', severity: 'warn' }], 'prefix を付けて照らし、severity を引き継ぐ');
});

test('refDeclarationError: 宣言の書き間違いを止める（未知の欄・参照先・severity・行を持たない参照先への copies）', () => {
  assert.equal(refDeclarationError({ at: 'a', to: 'product' }), null);
  assert.match(refDeclarationError({ at: 'a', to: 'nope' }), /to は/);
  assert.match(refDeclarationError({ at: 'a', to: 'product', sevrity: 'warn' }), /未知の欄/);
  assert.match(refDeclarationError({ at: 'a', to: 'product', severity: 'info' }), /severity/);
  assert.match(refDeclarationError({ at: 'a', to: 'article', copies: { x: 'y' } }), /copies を使えない/);
  assert.deepEqual(REF_TARGETS, ['qualification', 'product', 'article', 'experiment', 'affiliate-program', 'metric']);
});
