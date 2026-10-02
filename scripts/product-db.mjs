#!/usr/bin/env node
/**
 * product-db.mjs — 商品の正本から検索用の SQLite（.tmp/products.db・生成物・Git 管理外）を作る（DN-0492）。
 * ---------------------------------------------------------------------------
 * 正本は content/products/。この DB は毎回作り直す写しで、ここへ書き込んでも正本には戻らない。
 * sql.js（WASM）なので Windows / Mac / CI で同じに動く（ネイティブのビルド不要）。スキーマは D1（SQLite）と互換。
 *
 * 使い方:
 *   npm run product:db                                   # .tmp/products.db を作り直す
 *   npm run product:db -- --query "SELECT tier, COUNT(*) FROM products GROUP BY tier"   # 作り直して問い合わせる
 *   npm run product:db -- --check                        # 作るだけで書き出さない（CI で完走を確かめる）
 * テーブル: products / product_members（収録の意図・記事）/ product_includes（含む商品）/ note_live（コミット済みの収録記録）/ sales（販売ログ）
 * exit: 0 成功 / 1 正本・入力の読み込み失敗・SQL エラー
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import initSqlJs from 'sql.js';
import { ROOT, SNAPSHOT, loadProducts, articleNoteId, noteKeyOf } from './lib/product-registry.mjs';
import { datasetPath } from './lib/datasets.mjs';

const argv = process.argv.slice(2);
const query = argv.includes('--query') ? argv[argv.indexOf('--query') + 1] : null;
const checkOnly = argv.includes('--check');
const OUT = join(ROOT, '.tmp', 'products.db');

const SCHEMA = `
CREATE TABLE products (
  id TEXT PRIMARY KEY, channel TEXT NOT NULL, qualification TEXT NOT NULL, stage TEXT NOT NULL,
  series TEXT NOT NULL, tier TEXT NOT NULL, persona TEXT, title TEXT, note_title TEXT,
  price_text TEXT, price_yen INTEGER, published INTEGER NOT NULL, retired_at TEXT, note_url TEXT, note_key TEXT
);
CREATE TABLE product_members (product_id TEXT NOT NULL, path TEXT NOT NULL, note_id TEXT, PRIMARY KEY (product_id, path));
CREATE TABLE product_includes (product_id TEXT NOT NULL, child_id TEXT NOT NULL, PRIMARY KEY (product_id, child_id));
CREATE TABLE note_live (magazine_key TEXT NOT NULL, note_id TEXT NOT NULL, title TEXT, price INTEGER, PRIMARY KEY (magazine_key, note_id));
CREATE TABLE sales (date TEXT, product_id TEXT, title TEXT, type TEXT, price INTEGER);
`;

const yen = (s) => {
  const m = String(s ?? '').match(/¥\s*([\d,]+)/);
  return m ? Number(m[1].replace(/,/g, '')) : null;
};

const { products, errors } = loadProducts();
if (errors.length || products.length === 0) {
  console.error(`[product-db] 正本に問題がある（npm run check-products）${errors.length ? `:\n  ${errors.join('\n  ')}` : '（0 件）'}`);
  process.exit(1);
}

const require = createRequire(import.meta.url);
const SQL = await initSqlJs({ locateFile: (f) => join(require.resolve('sql.js'), '..', f) });
const db = new SQL.Database();
db.run(SCHEMA);

const ins = (sql, rows) => {
  const st = db.prepare(sql);
  for (const r of rows) st.run(r);
  st.free();
  return rows.length;
};

const n = {};
n.products = ins(
  'INSERT INTO products VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
  products.map((p) => [
    p.id, p.channel, p.qualification, p.stage, p.series, p.tier, p.persona, p.catalog.title ?? null, p.catalog.noteTitle ?? null,
    p.catalog.price ?? null, yen(p.catalog.price), p.catalog.published ? 1 : 0, p.catalog.retiredAt ?? null, p.catalog.noteUrl || null, noteKeyOf(p.catalog.noteUrl),
  ]),
);
n.members = ins('INSERT INTO product_members VALUES (?,?,?)', products.flatMap((p) => p.members.map((m) => [p.id, m, articleNoteId(m) || null])));
n.includes = ins('INSERT INTO product_includes VALUES (?,?)', products.flatMap((p) => p.includes.map((c) => [p.id, c])));

try {
  const snap = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
  n.note_live = ins('INSERT OR IGNORE INTO note_live VALUES (?,?,?,?)', snap.magazines.flatMap((m) => (m.notes ?? []).map((x) => [m.key, x.key, x.name, x.price])));
} catch (e) {
  console.error(`[product-db] 収録記録を読めない: ${e.message}`);
  process.exit(1);
}
try {
  const s = JSON.parse(readFileSync(join(ROOT, datasetPath('note.sales')), 'utf8'));
  const rows = Array.isArray(s) ? s : (s.sales ?? []);
  n.sales = ins('INSERT INTO sales VALUES (?,?,?,?,?)', rows.map((r) => [r.date ?? null, r.productId ?? null, r.title ?? null, r.type ?? null, r.price ?? null]));
} catch (e) {
  console.error(`[product-db] 販売ログを読めない: ${e.message}`);
  process.exit(1);
}

console.log(`[product-db] products ${n.products} / members ${n.members} / includes ${n.includes} / note_live ${n.note_live} / sales ${n.sales}`);
if (query) {
  try {
    for (const res of db.exec(query)) {
      console.log(res.columns.join('\t'));
      for (const row of res.values) console.log(row.join('\t'));
    }
  } catch (e) {
    console.error(`[product-db] SQL エラー: ${e.message}`);
    process.exit(1);
  }
}
if (!checkOnly) {
  mkdirSync(join(ROOT, '.tmp'), { recursive: true });
  writeFileSync(OUT, Buffer.from(db.export()));
  console.log(`[product-db] → .tmp/products.db`);
}
