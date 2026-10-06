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
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
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
 * channels はチャネルごとの生成物の付帯情報（Kindle カタログの先頭の欄など）、articlePrices は note の記事ごとの単品価格
 * （キーの順に並べる）。どちらも空なら書かない
 */
export function canonicalFile(products, channels = {}, articlePrices = {}) {
  const body = { schemaVersion: 1, _doc: PRODUCTS_DOC };
  if (Object.keys(channels).length) body.channels = channels;
  body.products = [...products].sort(byChannelId).map(ordered);
  const keys = Object.keys(articlePrices).sort();
  if (keys.length) body.articlePrices = Object.fromEntries(keys.map((k) => [k, articlePrices[k]]));
  return JSON.stringify(body, null, 2) + '\n';
}

/** 正本を全部読む。型エラーは throw せず errors に集める（検査は件数を出して止める） */
export function loadProducts() {
  const products = [];
  const errors = [];
  if (!existsSync(PRODUCTS_FILE)) return { products, channels: {}, articlePrices: {}, errors: [`${PRODUCTS_REL} が無い`] };
  let raw;
  let json;
  try {
    raw = readFileSync(PRODUCTS_FILE, 'utf8');
    json = JSON.parse(raw);
  } catch (e) {
    return { products, channels: {}, articlePrices: {}, errors: [`${PRODUCTS_REL}: 読めない・JSON でない ${e.message}`] };
  }
  const channels = json?.channels ?? {};
  const articlePrices = json?.articlePrices ?? {};
  for (const [path, yen] of Object.entries(articlePrices)) {
    if (!ARTICLE_PATH.test(path)) errors.push(`${PRODUCTS_REL}#articlePrices: 記事のパスでない ${path}`);
    if (!(Number.isInteger(yen) && yen >= 0)) errors.push(`${PRODUCTS_REL}#articlePrices: ${path} の価格が 0 以上の整数でない（${yen}）`);
  }
  if (json?.schemaVersion !== 1) errors.push(`${PRODUCTS_REL}: schemaVersion が 1 でない`);
  if (!Array.isArray(json?.products)) return { products, channels, articlePrices, errors: [...errors, `${PRODUCTS_REL}: products が配列でない`] };
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
    if (p.channel === 'coconala' && p.catalog.id !== p.id) errors.push(`${label}: catalog.id（${p.catalog.id}）と id が違う`);
    if (p.channel === 'kindle' && p.id !== kindleProductId(p.catalog.id)) errors.push(`${label}: id は ${kindleProductId(p.catalog.id)}（書籍 id ${p.catalog.id} の小文字に kindle- を付ける）`);
    products.push(p);
  }
  for (const ch of ['kindle', 'coconala']) {
    const orders = products.filter((p) => p.channel === ch).map((p) => p.order);
    if (new Set(orders).size !== orders.length) errors.push(`${PRODUCTS_REL}: ${ch} の order が重複`);
  }
  if (!errors.length && raw !== canonicalFile(products, channels, articlePrices)) errors.push(`${PRODUCTS_REL}: 正規化されていない（npm run product -- fmt）`);
  return { products, channels, articlePrices, errors };
}

const blockingErrors = (errors) => errors.filter((e) => !/正規化されていない/.test(e));

/** 商品を足す・置き換える（id で照合）。正本に正規化以外の問題があれば書かない。書いたファイルのパスを返す */
export function saveProducts(list, { channels: nextChannels, articlePrices: nextPrices } = {}) {
  const next = list.map((p) => Product.parse(p));
  const { products, channels, articlePrices, errors } = loadProducts();
  const blocking = blockingErrors(errors);
  if (blocking.length) throw new Error(`正本に問題があるので書かない（npm run check-products）:\n  ${blocking.join('\n  ')}`);
  const byId = new Map(products.map((p) => [p.id, p]));
  for (const p of next) byId.set(p.id, p);
  writeFileSync(PRODUCTS_FILE, canonicalFile([...byId.values()], nextChannels ?? channels, nextPrices ?? articlePrices));
  return PRODUCTS_FILE;
}

export function saveProduct(product) {
  return saveProducts([product]);
}

/** 正本を正規化して書き直す（型エラーの商品は落とさないよう、問題があれば書かない） */
export function formatProducts() {
  const { products, channels, articlePrices, errors } = loadProducts();
  const blocking = blockingErrors(errors);
  if (blocking.length) return { written: 0, errors: blocking };
  writeFileSync(PRODUCTS_FILE, canonicalFile(products, channels, articlePrices));
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

// ---- ココナラ（src/lib/coconala-services.ts の SERVICES_RAW の中身は正本から作る生成ブロック） ----

export const COCONALA_TS = join(ROOT, 'src', 'lib', 'coconala-services.ts');
export const COCONALA_GROUP = 'coconala';

/** ココナラの生成ブロック（SERVICES_RAW の中身。order の順・読み手の正規表現が切り出せる書式＝キーは 2 字下げ・欄は 4 字下げ） */
export function renderCoconalaBlock(products) {
  const body = products
    .filter((p) => p.channel === 'coconala')
    .sort((a, b) => a.order - b.order)
    .map((p) => {
      const lines = p.memo.map((m) => `  // ${m}`);
      lines.push(`  ${tsString(p.id)}: {`);
      for (const [k, v] of Object.entries(p.catalog)) lines.push(`    ${k}: ${tsValue(v, 4)},`);
      lines.push('  },');
      return lines.join('\n');
    })
    .join('\n');
  return `${BLOCK_BEGIN(COCONALA_GROUP)}\n${body}\n${BLOCK_END(COCONALA_GROUP)}`;
}

/** 正本から coconala-services.ts の生成ブロックを書く（check なら書かずに差分の有無だけ返す）。差分があれば true */
export function writeCoconalaBlock({ check = false } = {}) {
  const { products } = loadProducts();
  const raw = readFileSync(COCONALA_TS, 'utf8');
  const crlf = raw.includes('\r\n');
  const ts = raw.replace(/\r\n/g, '\n');
  const next = replaceBlock(ts, COCONALA_GROUP, renderCoconalaBlock(products));
  if (next === null) throw new Error('coconala-services.ts に生成ブロックの枠が無い');
  if (next === ts) return false;
  if (!check) writeFileSync(COCONALA_TS, crlf ? next.replace(/\n/g, '\r\n') : next);
  return true;
}

/**
 * ココナラのサービスを書き換える唯一の入口（出品の書き戻し・休止/再開）。mutator は catalog（SERVICES_RAW の 1 エントリと
 * 同じ形）を受け取りその場で書き換える。正本（config/products.json）へ戻し、生成ブロックを作り直す。mutator の戻り値を返す
 */
export function updateCoconalaService(id, mutator) {
  const { products, errors } = loadProducts();
  const blocking = blockingErrors(errors);
  if (blocking.length) throw new Error(`正本に問題があるので書かない（npm run check-products）:\n  ${blocking.join('\n  ')}`);
  const p = products.find((x) => x.channel === 'coconala' && x.id === id);
  if (!p) return undefined;
  const catalog = structuredClone(p.catalog);
  const result = mutator(catalog);
  if (JSON.stringify(catalog) !== JSON.stringify(p.catalog)) {
    saveProducts([{ ...p, catalog }]);
    writeCoconalaBlock();
  }
  return result;
}

// ---- note の記事ごとの単品価格（正本の articlePrices。記事の frontmatter の price は写し） ----

export const ARTICLE_PATH = /^content\/note\/.+\/article(-[^/]+)?\.md$/;
const ARTICLE_FILE = /^article(-[^/\\]+)?\.md$/;
const FM_PRICE = /^price:[ \t]*(\d+)[ \t]*$/m;

/** content/note の記事（リポジトリ相対・/ 区切り・並びは名前順） */
export function articleFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (ARTICLE_FILE.test(e.name)) out.push(relative(ROOT, p).split('\\').join('/'));
    }
  };
  walk(join(ROOT, 'content', 'note'));
  return out.sort();
}

/** 記事の frontmatter（先頭の --- から次の --- まで）の範囲 */
function frontmatterRange(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  return m ? { start: 4, end: 4 + m[1].length, head: m[1] } : null;
}

/** frontmatter の price（円）。無ければ null */
export function frontmatterPrice(raw) {
  const fm = frontmatterRange(raw.replace(/\r\n/g, '\n'));
  const m = fm?.head.match(FM_PRICE);
  return m ? Number(m[1]) : null;
}

/** frontmatter の price を書き換える（無ければ frontmatter の末尾に足す）。改行コードは元のまま。書いたら true */
function writeFrontmatterPrice(rel, yen) {
  const abs = join(ROOT, rel);
  const raw = readFileSync(abs, 'utf8');
  const crlf = raw.includes('\r\n');
  const text = raw.replace(/\r\n/g, '\n');
  const fm = frontmatterRange(text);
  if (!fm) throw new Error(`${rel}: frontmatter が無い`);
  const head = FM_PRICE.test(fm.head) ? fm.head.replace(FM_PRICE, `price: ${yen}`) : `${fm.head}\nprice: ${yen}`;
  if (head === fm.head) return false;
  const next = text.slice(0, fm.start) + head + text.slice(fm.end);
  writeFileSync(abs, crlf ? next.replace(/\n/g, '\r\n') : next);
  return true;
}

/**
 * 正本の articlePrices と記事の frontmatter の price を突き合わせる。
 * - 登録済みで frontmatter と違う → check は mismatch に数える／書くときは frontmatter を正本の値に直す
 * - frontmatter に price があるのに未登録（新しい記事）→ check は unregistered に数える／書くときは正本へ取り込む
 * - 正本にあるのに記事が無い（移動・削除）→ check は missingFile に数える／書くときは正本から外す
 */
export function syncArticlePrices({ check = false } = {}) {
  const { articlePrices, errors } = loadProducts();
  const blocking = blockingErrors(errors);
  if (blocking.length) throw new Error(`正本に問題があるので同期しない（npm run check-products）:\n  ${blocking.join('\n  ')}`);
  const files = articleFiles();
  const fileSet = new Set(files);
  const out = { files: files.length, registered: 0, mismatch: [], unregistered: [], missingFile: [], rewritten: 0 };
  const next = { ...articlePrices };
  for (const rel of files) {
    const fmPrice = frontmatterPrice(readFileSync(join(ROOT, rel), 'utf8'));
    const want = articlePrices[rel];
    if (want === undefined) {
      if (fmPrice !== null) {
        out.unregistered.push({ rel, price: fmPrice });
        next[rel] = fmPrice;
      }
      continue;
    }
    out.registered++;
    if (fmPrice !== want) {
      out.mismatch.push({ rel, frontmatter: fmPrice, want });
      if (!check && writeFrontmatterPrice(rel, want)) out.rewritten++;
    }
  }
  for (const rel of Object.keys(articlePrices)) {
    if (fileSet.has(rel)) continue;
    out.missingFile.push(rel);
    delete next[rel];
  }
  if (!check && (out.unregistered.length || out.missingFile.length)) saveProducts([], { articlePrices: next });
  return out;
}

/**
 * 記事の単品価格を変える唯一の入口（正本の articlePrices と frontmatter の price を同時に書く）。
 * note-price-sweep・note-reconcile-title-price・backfill-note-article-meta と npm run product -- price が呼ぶ
 * @param {{ path: string, price: number }[]} entries
 */
export function setArticlePrices(entries) {
  const { articlePrices, errors } = loadProducts();
  const blocking = blockingErrors(errors);
  if (blocking.length) throw new Error(`正本に問題があるので書かない（npm run check-products）:\n  ${blocking.join('\n  ')}`);
  const next = { ...articlePrices };
  for (const { path, price } of entries) {
    const rel = path.split('\\').join('/').replace(/^\.\//, '');
    if (!ARTICLE_PATH.test(rel)) throw new Error(`記事のパスでない: ${rel}`);
    if (!existsSync(join(ROOT, rel))) throw new Error(`記事が無い: ${rel}`);
    if (!(Number.isInteger(price) && price >= 0)) throw new Error(`${rel}: 価格は 0 以上の整数（円）`);
    next[rel] = price;
    writeFrontmatterPrice(rel, price);
  }
  saveProducts([], { articlePrices: next });
  return entries.length;
}

// ---- note マガジンの掲載文（note掲載文.txt）の機械用の欄（セット価格・単品価格）は正本から書く ----

const SET_PRICE_LINE = /^セット価格:[ \t]*(\d*)[ \t]*$/m;
const ARTICLE_PRICE_LINE = /^単品価格:[ \t]*(\d*)[ \t]*$/m;
const yenOf = (s) => {
  const m = String(s ?? '').match(/^¥([\d,]+)/);
  return m ? Number(m[1].replace(/,/g, '')) : null;
};

/** content/note の note掲載文.txt（リポジトリ相対） */
export function magazineTextFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'note掲載文.txt') out.push(relative(ROOT, p).split('\\').join('/'));
    }
  };
  walk(join(ROOT, 'content', 'note'));
  return out.sort();
}

/**
 * 掲載文の「■ マガジンタイトル」と題名（catalog.noteTitle か title）が一致する note 商品を探し、機械用の欄を正本に合わせる。
 * - セット価格: catalog.price の先頭の金額（¥7,980（…）→ 7980）
 * - 単品価格: 直接の収録記事（members）の有料記事がすべて同じ価格のときだけ、その価格
 * 題名で 1 商品に決まらない掲載文・金額の無い商品（会員など）は触らない（unmatched に数える）
 */
export function syncMagazineTexts({ check = false } = {}) {
  const { products, articlePrices } = loadProducts();
  const byTitle = new Map();
  for (const p of products.filter((x) => x.channel === 'note')) {
    for (const t of new Set([p.catalog.noteTitle, p.catalog.title].filter(Boolean))) byTitle.set(t, byTitle.has(t) ? null : p);
  }
  const out = { files: 0, matched: 0, unmatched: [], mismatch: [], rewritten: 0 };
  for (const rel of magazineTextFiles()) {
    out.files++;
    const abs = join(ROOT, rel);
    const raw = readFileSync(abs, 'utf8');
    const crlf = raw.includes('\r\n');
    const text = raw.replace(/\r\n/g, '\n');
    const title = (text.match(/■ マガジンタイトル[^\n]*\n\n([^\n]+)/) || [])[1]?.trim();
    const p = title ? byTitle.get(title) : null;
    const setPrice = p ? yenOf(p.catalog.price) : null;
    if (!p || setPrice === null) {
      out.unmatched.push(rel);
      continue;
    }
    out.matched++;
    const paid = p.members.map((m) => articlePrices[m]).filter((y) => y > 0);
    const articlePrice = paid.length && paid.every((y) => y === paid[0]) ? paid[0] : null;
    let next = text;
    if (SET_PRICE_LINE.test(next)) next = next.replace(SET_PRICE_LINE, `セット価格: ${setPrice}`);
    if (articlePrice !== null && ARTICLE_PRICE_LINE.test(next)) next = next.replace(ARTICLE_PRICE_LINE, `単品価格: ${articlePrice}`);
    if (next === text) continue;
    out.mismatch.push({ rel, id: p.id });
    if (!check) {
      writeFileSync(abs, crlf ? next.replace(/\n/g, '\r\n') : next);
      out.rewritten++;
    }
  }
  return out;
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
