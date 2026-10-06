/**
 * product-registry.mjs — 商品の正本（config/products.json・全チャネルの全商品を 1 ファイル）の唯一の実装（DN-0492）。
 * ---------------------------------------------------------------------------
 * 正本は Git 上の JSON 1 ファイル（2026-10-06 に content/products/<channel>/<id>.json の 1 商品 1 ファイルから集約）。
 * SQLite（npm run product:db）は検索用の生成物で、正本ではない。型（zod）は dataset-schemas-config-business.mjs の
 * Product・ConfigProducts（台帳 config.products）。
 * ここに置くもの: 読み込み・正規化した書き出し（並び channel → id・キー順・字下げ 2・LF）・収録の意図の解決・
 * note-magazines.ts の生成ブロック（読み手は変えないため、正本から TS の該当エントリを書き出す）。
 * 判定はこの lib に集約し、CLI（scripts/product.mjs）・検査（scripts/check-products.mjs）・DB 生成から呼ぶ。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { datasetPath } from './datasets.mjs';
import { Product } from './dataset-schemas-config-business.mjs';

export { Product };
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PRODUCTS_REL = datasetPath('config.products');
export const PRODUCTS_FILE = join(ROOT, PRODUCTS_REL);
export const NOTE_MAGAZINES_TS = join(ROOT, 'src', 'lib', 'note-magazines.ts');
export const SNAPSHOT = join(ROOT, datasetPath('note.magazines'));
export const PRODUCTS_DOC = '商品の正本（全チャネルの全商品・DN-0492）。手で書かず npm run product で読み書きする（並びは channel → id）。note-magazines.ts の生成ブロックは npm run product -- gen。説明は .claude/knowledge/reference/data-storage-decision.md「商品の正本」';

const KEY_ORDER = ['id', 'channel', 'qualification', 'stage', 'series', 'tier', 'persona', 'order', 'catalog', 'members', 'includes', 'memo'];

function ordered(product) {
  const out = {};
  for (const k of KEY_ORDER) if (k in product) out[k] = product[k];
  return out;
}

/** 1 商品の正規化した JSON（キー順を固定・字下げ 2・LF・末尾改行）。show の表示用 */
export function canonicalJson(product) {
  return JSON.stringify(ordered(product), null, 2) + '\n';
}

const byChannelId = (a, b) => a.channel.localeCompare(b.channel) || a.id.localeCompare(b.id);

/**
 * 正本ファイル全体の正規化した JSON（並び channel → id・字下げ 2・LF・末尾改行）。Windows / Mac で同じバイト列になる。
 * channels はチャネルごとの生成物の付帯情報（Kindle カタログの先頭の欄など）。空なら書かない
 */
export function canonicalFile(products, channels = {}) {
  const body = { schemaVersion: 1, _doc: PRODUCTS_DOC };
  if (Object.keys(channels).length) body.channels = channels;
  body.products = [...products].sort(byChannelId).map(ordered);
  return JSON.stringify(body, null, 2) + '\n';
}

/** 正本を全部読む。型エラーは throw せず errors に集める（検査は件数を出して止める） */
export function loadProducts() {
  const products = [];
  const errors = [];
  if (!existsSync(PRODUCTS_FILE)) return { products, channels: {}, errors: [`${PRODUCTS_REL} が無い`] };
  let raw;
  let json;
  try {
    raw = readFileSync(PRODUCTS_FILE, 'utf8');
    json = JSON.parse(raw);
  } catch (e) {
    return { products, channels: {}, errors: [`${PRODUCTS_REL}: 読めない・JSON でない ${e.message}`] };
  }
  const channels = json?.channels ?? {};
  if (json?.schemaVersion !== 1) errors.push(`${PRODUCTS_REL}: schemaVersion が 1 でない`);
  if (!Array.isArray(json?.products)) return { products, channels, errors: [...errors, `${PRODUCTS_REL}: products が配列でない`] };
  const seen = new Set();
  for (const item of json.products) {
    const label = `${PRODUCTS_REL}#${item?.id ?? '?'}`;
    const parsed = Product.safeParse(item);
    if (!parsed.success) {
      errors.push(`${label}: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join(' / ')}`);
      continue;
    }
    const p = parsed.data;
    if (seen.has(p.id)) errors.push(`${label}: id が重複`);
    seen.add(p.id);
    if (p.channel === 'note' && p.catalog.id !== p.id) errors.push(`${label}: catalog.id（${p.catalog.id}）と id が違う`);
    if (p.channel === 'kindle' && p.id !== kindleProductId(p.catalog.id)) errors.push(`${label}: id は ${kindleProductId(p.catalog.id)}（書籍 id ${p.catalog.id} の小文字に kindle- を付ける）`);
    products.push(p);
  }
  const kindleOrders = products.filter((p) => p.channel === 'kindle').map((p) => p.order);
  if (new Set(kindleOrders).size !== kindleOrders.length) errors.push(`${PRODUCTS_REL}: Kindle の order が重複`);
  if (!errors.length && raw !== canonicalFile(products, channels)) errors.push(`${PRODUCTS_REL}: 正規化されていない（npm run product -- fmt）`);
  return { products, channels, errors };
}

const blockingErrors = (errors) => errors.filter((e) => !/正規化されていない/.test(e));

/** 商品を足す・置き換える（id で照合）。正本に正規化以外の問題があれば書かない。書いたファイルのパスを返す */
export function saveProducts(list, { channels: nextChannels } = {}) {
  const next = list.map((p) => Product.parse(p));
  const { products, channels, errors } = loadProducts();
  const blocking = blockingErrors(errors);
  if (blocking.length) throw new Error(`正本に問題があるので書かない（npm run check-products）:\n  ${blocking.join('\n  ')}`);
  const byId = new Map(products.map((p) => [p.id, p]));
  for (const p of next) byId.set(p.id, p);
  writeFileSync(PRODUCTS_FILE, canonicalFile([...byId.values()], nextChannels ?? channels));
  return PRODUCTS_FILE;
}

export function saveProduct(product) {
  return saveProducts([product]);
}

/** 正本を正規化して書き直す（型エラーの商品は落とさないよう、問題があれば書かない） */
export function formatProducts() {
  const { products, channels, errors } = loadProducts();
  const blocking = blockingErrors(errors);
  if (blocking.length) return { written: 0, errors: blocking };
  writeFileSync(PRODUCTS_FILE, canonicalFile(products, channels));
  return { written: products.length, errors: [] };
}

// ---- Kindle カタログ（scripts/kindle-published/catalog.json は正本から作る生成物） ----

export const KINDLE_CATALOG_FILE = join(ROOT, 'scripts', 'kindle-published', 'catalog.json');
export const kindleProductId = (bookId) => `kindle-${String(bookId).toLowerCase()}`;

/** Kindle カタログの全文（books は order の順・字下げ 2・LF・末尾改行。読み手は今までどおりこのファイルを読む） */
export function renderKindleCatalog(products, channels) {
  const meta = channels?.kindle;
  if (!meta) throw new Error(`${PRODUCTS_REL} に channels.kindle が無い`);
  const books = products.filter((p) => p.channel === 'kindle').sort((a, b) => a.order - b.order).map((p) => p.catalog);
  return JSON.stringify({ _comment: meta.catalogComment, schemaVersion: meta.catalogSchemaVersion, updatedAt: meta.updatedAt, books }, null, 2) + '\n';
}

/**
 * Kindle カタログを書き換える唯一の入口（KDP の提出・価格改定・原稿差し替えの記録）。
 * mutator はカタログと同じ形 { _comment, schemaVersion, updatedAt, books } を受け取り、その場で書き換える。
 * 書き換えた books を正本（config/products.json）へ戻し、カタログを作り直す。正本に無い書籍は足さない（npm run product で先に足す）
 */
export function updateKindleCatalog(mutator) {
  const { products, channels, errors } = loadProducts();
  const blocking = blockingErrors(errors);
  if (blocking.length) throw new Error(`正本に問題があるので書かない（npm run check-products）:\n  ${blocking.join('\n  ')}`);
  const kindle = products.filter((p) => p.channel === 'kindle').sort((a, b) => a.order - b.order);
  const meta = channels.kindle;
  const c = structuredClone({ _comment: meta.catalogComment, schemaVersion: meta.catalogSchemaVersion, updatedAt: meta.updatedAt, books: kindle.map((p) => p.catalog) });
  const result = mutator(c);
  const byBook = new Map(kindle.map((p) => [p.catalog.id, p]));
  const changed = [];
  for (const b of c.books) {
    const p = byBook.get(b.id);
    if (!p) throw new Error(`Kindle の書籍 ${b.id} が正本に無い（npm run product で ${kindleProductId(b.id)} を足す）`);
    if (JSON.stringify(p.catalog) !== JSON.stringify(b)) changed.push({ ...p, catalog: b });
  }
  const nextChannels = { ...channels, kindle: { ...meta, catalogComment: c._comment, catalogSchemaVersion: c.schemaVersion, updatedAt: c.updatedAt } };
  saveProducts(changed, { channels: nextChannels });
  writeKindleCatalog();
  return result;
}

/** 正本から Kindle カタログを書く（gen と updateKindleCatalog が呼ぶ）。書いたら true */
export function writeKindleCatalog({ check = false } = {}) {
  const { products, channels } = loadProducts();
  const next = renderKindleCatalog(products, channels);
  const cur = existsSync(KINDLE_CATALOG_FILE) ? readFileSync(KINDLE_CATALOG_FILE, 'utf8').replace(/\r\n/g, '\n') : null;
  if (cur === next) return false;
  if (check) return true;
  writeFileSync(KINDLE_CATALOG_FILE, next);
  return true;
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
  if (product.channel !== 'note' || seen.has(product.id)) return { ids, pending, missing };
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

export const BLOCK_BEGIN = (group) => `  // <generated:products ${group}> config/products.json から生成（npm run product -- gen）。手で直さない`;
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
