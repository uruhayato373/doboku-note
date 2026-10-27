/**
 * dataset-refs.mjs — 台帳の各データセットに宣言した参照（資格 id・商品 id・記事 slug・実験 id・提携案件・KPI）が、参照先に実在するかを見る（DN-0586・段階 3）。
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
 *   qualification     … config/qualification-registry.json の資格・まとまり・資格ファミリー（isQualificationRef）
 *   product           … config/products.json の products[].id
 *   article           … content/site/<資格>/<slug>/article.mdx か content/site/<資格>/<slug>.mdx
 *   experiment        … data/business/experiments.json の experiments[].id
 *   affiliate-program … data/affiliate/catalog.json の programs のキー
 *   metric            … config/business-direction.json の metrics[].id
 *
 * 任意の欄（2026-10-27 に足した）:
 *   keys: true          … 場所の値（オブジェクト）のキーを参照として数える（例: 商品 id をキーにした写しの表）
 *   prefix: '資格/'      … 値の前に付けてから照らす（記事 slug を資格なしで持つ索引）
 *   ignore: ['all']     … 参照ではない予約語（全体を表す 'all'・アカウント全体の 'account' など）
 *   severity: 'warn'    … 参照切れを警告に下げる（生成した索引の過去分など、書き換えない記録）。既定は error
 *   copies: { 欄: '参照先の欄' } … 参照元の行（値を持つオブジェクト）の欄が、参照先の欄と同じ値か（写しの不一致）。
 *                         参照先の欄は「.」区切り（例 'catalog.noteUrl'）。不一致は severity に従う
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { isQualificationRef } from './qualification-names.mjs';

export const REF_TARGETS = ['qualification', 'product', 'article', 'experiment', 'affiliate-program', 'metric'];
export const REF_OPTION_KEYS = ['at', 'to', 'keys', 'prefix', 'ignore', 'severity', 'copies'];

/**
 * 場所 at の値を集める。parent は値を持つオブジェクト（copies の参照元の行）。keys のときは value がキーで parent がその値。
 * @returns {{ value: unknown, where: string, parent: unknown }[]} where は実際の場所（例 books.civil1.expansions[2].article）
 */
export function valuesAt(data, at, { keys = false } = {}) {
  let cur = [{ value: data, where: '', parent: null }];
  for (const raw of String(at).split('.')) {
    const isArray = raw.endsWith('[]');
    const key = isArray ? raw.slice(0, -2) : raw;
    const next = [];
    for (const { value, where } of cur) {
      if (value == null || typeof value !== 'object') continue;
      const step = (v, w) => {
        if (!isArray) { next.push({ value: v, where: w, parent: value }); return; }
        if (Array.isArray(v)) v.forEach((item, i) => next.push({ value: item, where: `${w}[${i}]`, parent: value }));
      };
      if (key === '*') for (const [k, v] of Object.entries(value)) step(v, where ? `${where}.${k}` : k);
      else if (key === '') step(value, where);
      else if (key in value) step(value[key], where ? `${where}.${key}` : key);
    }
    cur = next;
  }
  const flat = keys
    ? cur.flatMap(({ value, where }) => (value && typeof value === 'object' && !Array.isArray(value)
      ? Object.entries(value).map(([k, v]) => ({ value: k, where: `${where}.${k}`, parent: v }))
      : []))
    : cur.flatMap(({ value, where, parent }) => (Array.isArray(value) ? value.map((v, i) => ({ value: v, where: `${where}[${i}]`, parent })) : [{ value, where, parent }]));
  return flat.filter(({ value }) => value !== null && value !== undefined && value !== '');
}

const pick = (obj, path) => String(path).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

/**
 * 参照先を引く関数を作る。見つかれば参照先の行（copies の比較に使う）、無ければ undefined を返す。
 * @param {{ root: string, registry: object, products: { products?: { id: string }[] }, experiments?: object, catalog?: object, direction?: object }} ctx
 * @returns {Record<string, (value: unknown) => unknown>}
 */
export function refResolvers({ root, registry, products, experiments, catalog, direction }) {
  const byId = (rows) => new Map((rows ?? []).map((r) => [r.id, r]));
  const productIds = byId(products?.products);
  const experimentIds = byId(Array.isArray(experiments) ? experiments : experiments?.experiments);
  const metricIds = byId(direction?.metrics);
  const programs = catalog?.programs ?? {};
  return {
    qualification: (v) => (typeof v === 'string' && isQualificationRef(registry, v) ? true : undefined),
    product: (v) => (typeof v === 'string' ? productIds.get(v) : undefined),
    article: (v) => (typeof v === 'string' && /^[a-z0-9-]+\/[a-z0-9-]+$/.test(v)
      && (existsSync(join(root, 'content/site', v, 'article.mdx')) || existsSync(join(root, 'content/site', `${v}.mdx`))) ? true : undefined),
    experiment: (v) => (typeof v === 'string' ? experimentIds.get(v) : undefined),
    'affiliate-program': (v) => (typeof v === 'string' && Object.hasOwn(programs, v) ? programs[v] : undefined),
    metric: (v) => (typeof v === 'string' ? metricIds.get(v) : undefined),
  };
}

/** 宣言 1 つの書き方の誤りを返す（無ければ null） */
export function refDeclarationError(ref) {
  if (!ref || typeof ref.at !== 'string' || !ref.at) return 'at（場所）が要る';
  if (!REF_TARGETS.includes(ref.to)) return `to は ${REF_TARGETS.join('・')} のどれか`;
  const unknown = Object.keys(ref).filter((k) => !REF_OPTION_KEYS.includes(k));
  if (unknown.length) return `未知の欄 ${unknown.join('・')}（使えるのは ${REF_OPTION_KEYS.join('・')}）`;
  if (ref.severity !== undefined && !['error', 'warn'].includes(ref.severity)) return 'severity は error か warn';
  if (ref.ignore !== undefined && !(Array.isArray(ref.ignore) && ref.ignore.every((x) => typeof x === 'string'))) return 'ignore は文字列の配列';
  if (ref.copies !== undefined && !(ref.copies && typeof ref.copies === 'object' && Object.values(ref.copies).every((x) => typeof x === 'string'))) return 'copies は { 欄: 参照先の欄 }';
  if (ref.copies && ['qualification', 'article'].includes(ref.to)) return `${ref.to} は行を持たないので copies を使えない`;
  return null;
}

/**
 * データセット 1 つのファイル群の参照を照らす。
 * @param {{ id: string, refs: object[] }} dataset
 * @param {{ file: string, data: unknown }[]} files
 * @param {Record<string, (value: unknown) => unknown>} resolvers
 * @returns {{ checked: number, broken: object[], mismatched: object[] }}
 *   broken は参照切れ、mismatched は写しの不一致。どちらも severity（error・warn）を持つ
 */
export function checkRefs(dataset, files, resolvers) {
  let checked = 0;
  const broken = [];
  const mismatched = [];
  for (const { file, data } of files) {
    for (const ref of dataset.refs) {
      const resolve = resolvers[ref.to];
      if (!resolve) throw new Error(`${dataset.id}: 参照先 ${ref.to} は未知（${REF_TARGETS.join('・')}）`);
      const severity = ref.severity ?? 'error';
      for (const { value, where, parent } of valuesAt(data, ref.at, { keys: ref.keys })) {
        if (ref.ignore?.includes(value)) continue;
        checked += 1;
        const key = typeof value === 'string' && ref.prefix ? `${ref.prefix}${value}` : value;
        const target = resolve(key);
        if (target === undefined) { broken.push({ file, where, value: key, to: ref.to, severity }); continue; }
        for (const [field, targetPath] of Object.entries(ref.copies ?? {})) {
          const mine = parent?.[field];
          const theirs = pick(target, targetPath);
          if (mine !== undefined && mine !== theirs) mismatched.push({ file, where: `${where}.${field}`, value: mine, expected: theirs, to: `${ref.to} ${key} の ${targetPath}`, severity });
        }
      }
    }
  }
  return { checked, broken, mismatched };
}

/** 参照先の台帳をまとめて読む（check-datasets とテストが同じ組み合わせを使う）。read は台帳 id を受けて中身を返す関数 */
export const refContext = (read) => ({
  registry: read('config.qualification-registry'),
  products: read('config.products'),
  experiments: read('business.experiments'),
  catalog: read('affiliate.catalog'),
  direction: read('config.business-direction'),
});
