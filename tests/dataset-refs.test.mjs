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
import { REF_TARGETS, checkRefs, refResolvers, valuesAt } from '../scripts/lib/dataset-refs.mjs';
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
  const resolvers = { qualification: (v) => v === 'civil-construction-1', product: () => true, article: () => true };
  const r = checkRefs(
    { id: 'demo', refs: [{ at: 'items[].qualification', to: 'qualification' }] },
    [{ file: 'demo.json', data: { items: [{ qualification: 'civil-construction-1' }, { qualification: 'civil-construction-9' }] } }],
    resolvers,
  );
  assert.equal(r.checked, 2);
  assert.deepEqual(r.broken, [{ file: 'demo.json', where: 'items[1].qualification', value: 'civil-construction-9', to: 'qualification' }]);
  assert.throws(() => checkRefs({ id: 'demo', refs: [{ at: 'a', to: 'nope' }] }, [{ file: 'f', data: { a: 1 } }], resolvers), /未知/);
});

test('refResolvers: 実在の資格・商品・記事（Convention A/B）を見分ける（A）', () => {
  const r = refResolvers({ root: REPO_ROOT, registry: readDataset(REPO_ROOT, 'config.qualification-registry'), products: readDataset(REPO_ROOT, 'config.products') });
  assert.equal(r.qualification('civil-construction-1'), true);
  assert.equal(r.qualification('no-such-qualification'), false);
  const product = readDataset(REPO_ROOT, 'config.products').products[0].id;
  assert.equal(r.product(product), true);
  assert.equal(r.product('no-such-product'), false);
  assert.equal(r.article('civil-construction-1/guide-strategy'), true);
  assert.equal(r.article('civil-construction-1/no-such-article'), false);
  assert.equal(r.article('../../package'), false, 'slug の形でないものは通さない');
});

test('台帳: refs の宣言は形が正しく、宣言したデータセットの参照は実在する（A・B）', () => {
  const declared = DATASETS.filter((x) => x.refs);
  assert.ok(declared.length >= 3, `refs を宣言したデータセットが少ない（${declared.length}）`);
  const resolvers = refResolvers({ root: REPO_ROOT, registry: readDataset(REPO_ROOT, 'config.qualification-registry'), products: readDataset(REPO_ROOT, 'config.products') });
  for (const x of declared) {
    for (const ref of x.refs) assert.ok(REF_TARGETS.includes(ref.to) && ref.at, `${x.id}: ${JSON.stringify(ref)}`);
    // パスに {name} などの可変部分があるデータセットは、置き場の全ファイルを読む（例: 過去問の問題台帳は資格ごとに 1 ファイル）
    const files = x.path.includes('{')
      ? readdirSync(join(REPO_ROOT, datasetDir(x.id))).filter((f) => f.endsWith('.json')).map((f) => ({ file: `${datasetDir(x.id)}/${f}`, data: JSON.parse(readFileSync(join(REPO_ROOT, datasetDir(x.id), f), 'utf8')) }))
      : [{ file: x.path, data: readDataset(REPO_ROOT, x.id) }];
    const r = checkRefs(x, files, resolvers);
    assert.ok(r.checked > 0, `${x.id}: 参照を 1 件も拾えない（場所の書き間違い）`);
    assert.deepEqual(r.broken, [], `${x.id}: 参照切れ`);
  }
});
