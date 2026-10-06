#!/usr/bin/env node
/**
 * check-products.mjs — 商品の正本（config/products.json）のゲート（DN-0492・quality-audit ci:true）。
 * ---------------------------------------------------------------------------
 * 結果は PR の差分（正本・note-magazines.ts・コミット済みの収録記録 data/note/magazines.json・原稿）だけで決まる。
 * ネットワークは使わない（note の実物との照合は verify-note-magazines の担当）。
 *   1. 型・id の重複・正規化（canonicalFile）
 *   2. id の重複・includes の参照先・members の原稿の実在
 *   3. note-magazines.ts の生成ブロックが正本と一致（npm run product -- gen --check と同じ判定）
 *   4. 収録の意図（members＋includes を展開）と、コミット済みの収録記録の突き合わせ（公開中のマガジンだけ）
 *      未公開の原稿（noteId 無し）は数えず「公開待ち」として件数だけ出す
 * exit: 0 合格 / 1 違反あり・正本 0 件（検査不成立）
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT, NOTE_MAGAZINES_TS, SNAPSHOT, NOTE_ONLY_MEMBER, productGroups, blockGroupsIn, loadProducts, expectedMembers, renderBlock, replaceBlock, BLOCK_BEGIN, noteKeyOf,
  writeKindleCatalog, writeCoconalaBlock,
} from './lib/product-registry.mjs';

const { products, errors } = loadProducts();
const violations = [...errors];
if (products.length === 0) {
  console.error(`[check-products] 正本を 1 件も読めなかった（検査不成立）${errors.length ? `: ${errors.join(' / ')}` : ''}`);
  process.exit(1);
}

const byId = new Map();
/** 原稿の noteId と結び付かない note 上の収録（note:<noteId>）。違反ではないが件数と中身を毎回出す */
const noteOnly = [];
for (const p of products) {
  if (byId.has(p.id)) violations.push(`${p.id}: id が重複`);
  byId.set(p.id, p);
}
for (const p of products) {
  for (const inc of p.includes) if (!byId.has(inc)) violations.push(`${p.id}: includes の ${inc} が正本に無い`);
  for (const m of p.members) {
    if (NOTE_ONLY_MEMBER.test(m)) noteOnly.push(`${p.id}: ${m}`);
    else if (!existsSync(join(ROOT, m))) violations.push(`${p.id}: members の原稿が無い ${m}`);
  }
}

// 3. 生成ブロック
const ts = readFileSync(NOTE_MAGAZINES_TS, 'utf8');
let blocks = 0;
const groups = productGroups(products);
for (const g of blockGroupsIn(ts)) if (!groups.some(([q]) => q === g)) violations.push(`note-magazines.ts に正本の無い資格の生成ブロックが残っている（${g}）`);
for (const [group, mine] of groups) {
  blocks++;
  if (!ts.includes(BLOCK_BEGIN(group))) {
    violations.push(`note-magazines.ts に生成ブロックが無い（${group}）→ npm run product -- gen`);
    continue;
  }
  if (replaceBlock(ts, group, renderBlock(group, mine)) !== ts) violations.push(`note-magazines.ts の生成ブロックが正本と違う（${group}）→ npm run product -- gen`);
}

// 3b. Kindle の catalog.json（正本からの生成物）
const kindleCount = products.filter((p) => p.channel === 'kindle').length;
try {
  if (kindleCount && writeKindleCatalog({ check: true })) violations.push('scripts/kindle-published/catalog.json が正本と違う → npm run product -- gen');
} catch (e) {
  violations.push(`Kindle カタログを作れない（${e.message}）`);
}
// 3c. ココナラの coconala-services.ts（SERVICES_RAW の生成ブロック）
const coconalaCount = products.filter((p) => p.channel === 'coconala').length;
try {
  if (coconalaCount && writeCoconalaBlock({ check: true })) violations.push('src/lib/coconala-services.ts の生成ブロックが正本と違う → npm run product -- gen');
} catch (e) {
  violations.push(`ココナラの生成ブロックを作れない（${e.message}）`);
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
  if (p.channel !== 'note') continue;
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

console.log(`[check-products] 正本 ${products.length} 件（Kindle ${kindleCount} 冊・ココナラ ${coconalaCount} 件）/ 生成ブロック ${blocks} / 収録を照合 ${compared} 件（公開待ちの原稿 ${pendingTotal} 本は数えない）/ 原稿と結び付かない収録 ${noteOnly.length} 本 / 違反 ${violations.length} 件`);
if (noteOnly.length) console.log(`[check-products] 原稿の noteId と結び付かない収録（note 上で同じ題名の別 ID が入っているなど）:\n  ${noteOnly.join("\n  ")}`);
if (violations.length) {
  for (const v of violations) console.error(`  ✗ ${v}`);
  process.exit(1);
}
console.log('[check-products] ✓ 正本・生成ブロック・収録の意図はそろっている');
