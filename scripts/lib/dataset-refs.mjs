/**
 * dataset-refs.mjs — 台帳の各データセットに宣言した参照（資格 id・商品 id・記事 slug）が、参照先に実在するかを見る（DN-0586・段階 3）。
 *
 * DB の外部キーに当たるもの。台帳（scripts/lib/datasets.mjs）の行に
 *   refs: [{ at: 'books.*.expansions[].article', to: 'article' }]
 * と書くと、check-datasets がそのデータセットの全ファイルで、その場所の値を参照先と照らす。
 *
 * 場所（at）の書き方: 「.」で区切る。`*` はオブジェクトの全ての値、`名前[]` は配列の全ての要素、`[]` だけなら今の配列の要素。
 *   'qualifications[].id'          … qualifications 配列の各要素の id
 *   'books.*.expansions[].article' … books の各値の expansions 配列の各要素の article
 * 値が null・空文字のときは数えない（任意の参照）。値が配列なら各要素を参照として数える。
 *
 * 参照先（to）:
 *   qualification … config/qualification-registry.json の資格・まとまり・資格ファミリー（isQualificationRef）
 *   product       … config/products.json の products[].id
 *   article       … content/site/<資格>/<slug>/article.mdx か content/site/<資格>/<slug>.mdx
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { isQualificationRef } from './qualification-names.mjs';

export const REF_TARGETS = ['qualification', 'product', 'article'];

/**
 * 場所 at の値を集める。
 * @returns {{ value: unknown, where: string }[]} where は実際の場所（例 books.civil1.expansions[2].article）
 */
export function valuesAt(data, at) {
  let cur = [{ value: data, where: '' }];
  for (const raw of String(at).split('.')) {
    const isArray = raw.endsWith('[]');
    const key = isArray ? raw.slice(0, -2) : raw;
    const next = [];
    for (const { value, where } of cur) {
      if (value == null || typeof value !== 'object') continue;
      const step = (v, w) => {
        if (!isArray) { next.push({ value: v, where: w }); return; }
        if (Array.isArray(v)) v.forEach((item, i) => next.push({ value: item, where: `${w}[${i}]` }));
      };
      if (key === '*') for (const [k, v] of Object.entries(value)) step(v, where ? `${where}.${k}` : k);
      else if (key === '') step(value, where);
      else if (key in value) step(value[key], where ? `${where}.${key}` : key);
    }
    cur = next;
  }
  return cur.flatMap(({ value, where }) => (Array.isArray(value) ? value.map((v, i) => ({ value: v, where: `${where}[${i}]` })) : [{ value, where }]))
    .filter(({ value }) => value !== null && value !== undefined && value !== '');
}

/**
 * 参照先が実在するかの判定を作る。
 * @param {{ root: string, registry: object, products: { products?: { id: string }[] } }} ctx
 * @returns {Record<string, (value: unknown) => boolean>}
 */
export function refResolvers({ root, registry, products }) {
  const productIds = new Set((products?.products ?? []).map((p) => p.id));
  return {
    qualification: (v) => typeof v === 'string' && isQualificationRef(registry, v),
    product: (v) => typeof v === 'string' && productIds.has(v),
    article: (v) => typeof v === 'string' && /^[a-z0-9-]+\/[a-z0-9-]+$/.test(v)
      && (existsSync(join(root, 'content/site', v, 'article.mdx')) || existsSync(join(root, 'content/site', `${v}.mdx`))),
  };
}

/**
 * データセット 1 つのファイル群の参照を照らす。
 * @param {{ id: string, refs: { at: string, to: string }[] }} dataset
 * @param {{ file: string, data: unknown }[]} files
 * @param {Record<string, (value: unknown) => boolean>} resolvers
 * @returns {{ checked: number, broken: { file: string, where: string, value: unknown, to: string }[] }}
 */
export function checkRefs(dataset, files, resolvers) {
  let checked = 0;
  const broken = [];
  for (const { file, data } of files) {
    for (const ref of dataset.refs) {
      const exists = resolvers[ref.to];
      if (!exists) throw new Error(`${dataset.id}: 参照先 ${ref.to} は未知（${REF_TARGETS.join('・')}）`);
      for (const { value, where } of valuesAt(data, ref.at)) {
        checked += 1;
        if (!exists(value)) broken.push({ file, where, value, to: ref.to });
      }
    }
  }
  return { checked, broken };
}
