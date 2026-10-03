/**
 * product-registry.mjs — 商品の正本（content/products/<channel>/<id>.json・1商品1ファイル）の唯一の実装（DN-0492）。
 * ---------------------------------------------------------------------------
 * 正本は Git 上の JSON。SQLite（npm run product:db）は検索用の生成物で、正本ではない。
 * ここに置くもの: 型（zod）・読み込み・正規化した書き出し（キー順・字下げ 2・LF）・収録の意図の解決・
 * note-magazines.ts の生成ブロック（段階1は読み手を変えないため、正本から TS の該当エントリを書き出す）。
 * 判定はこの lib に集約し、CLI（scripts/product.mjs）・検査（scripts/check-products.mjs）・DB 生成から呼ぶ。
 */
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { datasetPath } from './datasets.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PRODUCTS_DIR = join(ROOT, 'content', 'products');
export const NOTE_MAGAZINES_TS = join(ROOT, 'src', 'lib', 'note-magazines.ts');
export const SNAPSHOT = join(ROOT, datasetPath('note.magazines'));

/** note-magazines.ts の 1 エントリ（キーの並びは保持する。id / published / noteUrl の順は読み手との契約） */
const CatalogValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const Catalog = z
  .object({ id: z.string(), published: z.boolean(), noteUrl: z.string() })
  .catchall(z.union([CatalogValue, z.array(CatalogValue), z.record(z.string(), CatalogValue)]));

export const Product = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, '英小文字・数字・ハイフンだけ'),
    channel: z.enum(['note']),
    qualification: z.string(),
    stage: z.string(),
    /** 系列: 経験記述・学科記述・横断・一次 など */
    series: z.enum(['keiken', 'gakka', 'cross', 'first', 'other']),
    /** 設計上の層 */
    tier: z.enum(['pack', 'magazine', 'single', 'membership']),
    persona: z.string().nullable().default(null),
    /** note-magazines.ts の該当エントリ（そのまま書き出す） */
    catalog: Catalog,
    /**
     * note 上で収録すべき記事（リポジトリ相対の article.md パス）。原稿の noteId と結び付かない note 上の記事は
     * `note:<noteId>`（同じ題名の別 ID が収録されているなど。check-products が件数を出す）
     */
    members: z.array(z.string()).default([]),
    /** 丸ごと含む商品の id（パックが含むマガジン・単品） */
    includes: z.array(z.string()).default([]),
    /** 経緯のメモ（旧 note-magazines.ts のコメント） */
    memo: z.array(z.string()).default([]),
  })
  .strict();

const KEY_ORDER = ['id', 'channel', 'qualification', 'stage', 'series', 'tier', 'persona', 'catalog', 'members', 'includes', 'memo'];

/** 正規化した JSON（キー順を固定・字下げ 2・LF・末尾改行）。Windows / Mac で同じバイト列になる */
export function canonicalJson(product) {
  const ordered = {};
  for (const k of KEY_ORDER) if (k in product) ordered[k] = product[k];
  return JSON.stringify(ordered, null, 2) + '\n';
}

export function productPath(channel, id) {
  return join(PRODUCTS_DIR, channel, `${id}.json`);
}

/** 正本を全部読む。型エラーは throw せず errors に集める（検査は件数を出して止める） */
export function loadProducts() {
  const products = [];
  const errors = [];
  if (!existsSync(PRODUCTS_DIR)) return { products, errors: ['content/products/ が無い'] };
  for (const channel of readdirSync(PRODUCTS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
    for (const f of readdirSync(join(PRODUCTS_DIR, channel)).filter((x) => x.endsWith('.json')).sort()) {
      const rel = `content/products/${channel}/${f}`;
      let raw;
      try {
        raw = readFileSync(join(PRODUCTS_DIR, channel, f), 'utf8');
      } catch (e) {
        errors.push(`${rel}: 読めない ${e.message}`);
        continue;
      }
      let json;
      try {
        json = JSON.parse(raw);
      } catch (e) {
        errors.push(`${rel}: JSON でない ${e.message}`);
        continue;
      }
      const parsed = Product.safeParse(json);
      if (!parsed.success) {
        errors.push(`${rel}: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join(' / ')}`);
        continue;
      }
      const p = parsed.data;
      if (f !== `${p.id}.json`) errors.push(`${rel}: ファイル名と id（${p.id}）が違う`);
      if (p.catalog.id !== p.id) errors.push(`${rel}: catalog.id（${p.catalog.id}）と id が違う`);
      if (p.channel !== channel) errors.push(`${rel}: channel（${p.channel}）と置き場が違う`);
      if (raw !== canonicalJson(p)) errors.push(`${rel}: 正規化されていない（npm run product -- fmt）`);
      products.push(p);
    }
  }
  return { products, errors };
}

export function saveProduct(product) {
  const p = Product.parse(product);
  const path = productPath(p.channel, p.id);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, canonicalJson(p));
  return path;
}

// ---- 収録の意図 ----

const fmField = (raw, key) => {
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const m = fm?.[1].match(new RegExp(`^${key}:\\s*"?([^"\\r\\n]*)"?\\s*$`, 'm'));
  return m ? m[1].trim() : '';
};

export const NOTE_ONLY_MEMBER = /^note:(n[0-9a-f]+)$/;

/** 記事パス → note の noteId（未公開は ''）。読めないパスは null。`note:<noteId>` はその noteId */
export function articleNoteId(relPath) {
  const noteOnly = relPath.match(NOTE_ONLY_MEMBER);
  if (noteOnly) return noteOnly[1];
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) return null;
  const raw = readFileSync(abs, 'utf8');
  return fmField(raw, 'noteId') || (fmField(raw, 'noteUrl').match(/\/n\/(n[0-9a-f]+)/)?.[1] ?? '');
}

export const noteKeyOf = (url) => url.match(/\/m\/(m[0-9a-f]+)/)?.[1] ?? null;
export const singleKeyOf = (url) => url.match(/\/n\/(n[0-9a-f]+)/)?.[1] ?? null;

/**
 * 商品が note 上で持つべき記事（noteId の集合）と、未公開で数えられない記事。
 * includes は再帰で展開する（パック → マガジン → 記事）。単品 SKU（noteUrl が /n/）は自身の noteId。
 */
export function expectedMembers(product, byId, seen = new Set()) {
  const ids = new Set();
  const pending = [];
  const missing = [];
  if (seen.has(product.id)) return { ids, pending, missing };
  seen.add(product.id);
  const single = singleKeyOf(product.catalog.noteUrl);
  if (single) ids.add(single);
  for (const path of product.members) {
    const id = articleNoteId(path);
    if (id === null) missing.push(path);
    else if (id === '') pending.push(path);
    else ids.add(id);
  }
  for (const inc of product.includes) {
    const child = byId.get(inc);
    if (!child) {
      missing.push(`product:${inc}`);
      continue;
    }
    const sub = expectedMembers(child, byId, seen);
    for (const id of sub.ids) ids.add(id);
    pending.push(...sub.pending);
    missing.push(...sub.missing);
  }
  return { ids, pending, missing };
}

// ---- note-magazines.ts の生成ブロック ----

const tsString = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
const tsValue = (v, indent) => {
  if (v === null) return 'null';
  if (typeof v === 'string') return tsString(v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return `[${v.map((x) => tsValue(x, indent)).join(', ')}]`;
  const pad = ' '.repeat(indent + 2);
  return `{\n${Object.entries(v).map(([k, x]) => `${pad}${/^[A-Za-z_$][\w$]*$/.test(k) ? k : tsString(k)}: ${tsValue(x, indent + 2)},`).join('\n')}\n${' '.repeat(indent)}}`;
};

export function renderCatalogEntry(product) {
  const lines = [];
  for (const m of product.memo) lines.push(`  // ${m}`);
  lines.push(`  '${product.id}': {`);
  const { id, published, noteUrl, ...rest } = product.catalog;
  lines.push(`    id: ${tsString(id)},`, `    published: ${published},`, `    noteUrl: ${tsString(noteUrl)},`);
  for (const [k, v] of Object.entries(rest)) lines.push(`    ${k}: ${tsValue(v, 4)},`);
  lines.push('  },');
  return lines.join('\n');
}

export const BLOCK_BEGIN = (group) => `  // <generated:products ${group}> content/products から生成（npm run product -- gen）。手で直さない`;
export const BLOCK_END = (group) => `  // </generated:products ${group}>`;

/** 生成ブロックの中身（id 順で決定的） */
export function renderBlock(group, products) {
  const body = [...products].sort((a, b) => a.id.localeCompare(b.id)).map(renderCatalogEntry).join('\n');
  return `${BLOCK_BEGIN(group)}\n${body}\n${BLOCK_END(group)}`;
}

/** note-magazines.ts の該当ブロックを差し替えた全文。ブロックが無ければ null */
export function replaceBlock(ts, group, block) {
  const b = ts.indexOf(BLOCK_BEGIN(group));
  const e = ts.indexOf(BLOCK_END(group));
  if (b < 0 || e < 0 || e < b) return null;
  return ts.slice(0, b) + block + ts.slice(e + BLOCK_END(group).length);
}

/**
 * 生成の単位: note の資格ごと（qualification は資格 id か group id）。正本にある資格だけを id 順で返す
 * @returns {[string, object[]][]} [資格, その資格の商品][]
 */
export function productGroups(products) {
  const note = products.filter((p) => p.channel === 'note');
  return [...new Set(note.map((p) => p.qualification))].sort().map((q) => [q, note.filter((p) => p.qualification === q)]);
}

/** note-magazines.ts にある生成ブロックの資格（正本から消えた資格のブロックが残っていないかを見る） */
export function blockGroupsIn(ts) {
  return [...ts.matchAll(/^ {2}\/\/ <generated:products (\S+)>/gm)].map((m) => m[1]);
}
