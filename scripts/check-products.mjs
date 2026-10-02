#!/usr/bin/env node
/**
 * check-products.mjs — 商品の正本（content/products/）のゲート（DN-0492・quality-audit ci:true）。
 * ---------------------------------------------------------------------------
 * 結果は PR の差分（正本・note-magazines.ts・コミット済みの収録記録 data/note/magazines.json・原稿）だけで決まる。
 * ネットワークは使わない（note の実物との照合は verify-note-magazines の担当）。
 *   1. 型・ファイル名と id・正規化（canonicalJson）
 *   2. id の重複・includes の参照先・members の原稿の実在
 *   3. note-magazines.ts の生成ブロックが正本と一致（npm run product -- gen --check と同じ判定）
 *   4. 収録の意図（members＋includes を展開）と、コミット済みの収録記録の突き合わせ（公開中のマガジンだけ）
 *      未公開の原稿（noteId 無し）は数えず「公開待ち」として件数だけ出す
 * exit: 0 合格 / 1 違反あり・正本 0 件（検査不成立）
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT, NOTE_MAGAZINES_TS, SNAPSHOT, GROUPS, loadProducts, expectedMembers, renderBlock, replaceBlock, BLOCK_BEGIN, noteKeyOf,
} from './lib/product-registry.mjs';

const { products, errors } = loadProducts();
const violations = [...errors];
if (products.length === 0) {
  console.error(`[check-products] 正本を 1 件も読めなかった（検査不成立）${errors.length ? `: ${errors.join(' / ')}` : ''}`);
  process.exit(1);
}

const byId = new Map();
for (const p of products) {
  if (byId.has(p.id)) violations.push(`${p.id}: id が重複`);
  byId.set(p.id, p);
}
for (const p of products) {
  for (const inc of p.includes) if (!byId.has(inc)) violations.push(`${p.id}: includes の ${inc} が正本に無い`);
  for (const m of p.members) if (!existsSync(join(ROOT, m))) violations.push(`${p.id}: members の原稿が無い ${m}`);
}

// 3. 生成ブロック
const ts = readFileSync(NOTE_MAGAZINES_TS, 'utf8');
let blocks = 0;
for (const [group, pick] of Object.entries(GROUPS)) {
  const mine = products.filter(pick);
  if (!mine.length) continue;
  blocks++;
  if (!ts.includes(BLOCK_BEGIN(group))) {
    violations.push(`note-magazines.ts に生成ブロックが無い（${group}）→ npm run product -- gen`);
    continue;
  }
  if (replaceBlock(ts, group, renderBlock(group, mine)) !== ts) violations.push(`note-magazines.ts の生成ブロックが正本と違う（${group}）→ npm run product -- gen`);
}

// 4. 収録の意図 × コミット済みの収録記録
let snap = null;
try {
  snap = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
} catch (e) {
  violations.push(`収録記録を読めない（${e.message}）`);
}
const live = new Map((snap?.magazines ?? []).map((m) => [m.key, new Set((m.notes ?? []).map((n) => n.key))]));
let compared = 0;
let pendingTotal = 0;
for (const p of products) {
  const key = noteKeyOf(p.catalog.noteUrl);
  if (!key || !p.catalog.published || p.catalog.retiredAt || p.tier === 'membership') continue;
  const { ids, pending, missing } = expectedMembers(p, byId);
  for (const m of missing) violations.push(`${p.id}: 収録の意図に解決できないものがある ${m}`);
  pendingTotal += pending.length;
  const got = live.get(key);
  if (!got) {
    violations.push(`${p.id}: 収録記録に ${key} が無い（npm run verify-note-magazines -- --contents --json で取り直す）`);
    continue;
  }
  compared++;
  const notIn = [...ids].filter((k) => !got.has(k));
  const extra = [...got].filter((k) => !ids.has(k));
  if (notIn.length) violations.push(`${p.id}: note に未収録 ${notIn.length} 本（${notIn.slice(0, 5).join(', ')}${notIn.length > 5 ? ' …' : ''}）`);
  if (extra.length) violations.push(`${p.id}: 意図に無い収録 ${extra.length} 本（${extra.slice(0, 5).join(', ')}${extra.length > 5 ? ' …' : ''}）`);
}

console.log(`[check-products] 正本 ${products.length} 件 / 生成ブロック ${blocks} / 収録を照合 ${compared} 件（公開待ちの原稿 ${pendingTotal} 本は数えない）/ 違反 ${violations.length} 件`);
if (violations.length) {
  for (const v of violations) console.error(`  ✗ ${v}`);
  process.exit(1);
}
console.log('[check-products] ✓ 正本・生成ブロック・収録の意図はそろっている');
