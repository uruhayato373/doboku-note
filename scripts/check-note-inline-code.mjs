#!/usr/bin/env node
/**
 * check-note-inline-code.mjs — note 記事の本文にインラインのバッククォートが無いかを全件検査する。
 *
 * note はインラインコードを描画せず `〇〇` を記号のまま出す（判定と経緯は scripts/lib/note-inline-code.mjs）。
 * pre-commit の note-lint 規則 11 は staged の記事しか見ないので、既存記事への再混入はここで CI が止める。
 *
 * 使い方: node scripts/check-note-inline-code.mjs
 * 終了コード: 0 = 無し / 1 = あり、または検査対象 0 件（検査不成立）
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findInlineCode } from './lib/note-inline-code.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir, acc) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    // 型別ファイル（article-<型>.md）も対象。判定はファイル名で行う（パス全体は OS で区切りが変わる）
    else if (e.isFile() && /^article(-[^/\\]+)?\.md$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const files = walk(join(ROOT, 'content/note'), []);
const hits = [];
for (const f of files) {
  for (const h of findInlineCode(readFileSync(f, 'utf8'))) hits.push({ file: relative(ROOT, f).replaceAll('\\', '/'), ...h });
}

if (files.length === 0) {
  console.error('[check-note-inline-code] ✗ 検査対象 0 件（content/note の article*.md が見つからない＝検査不成立）');
  process.exit(1);
}
if (hits.length === 0) {
  console.log(`[check-note-inline-code] ✓ ${files.length} 記事を検査・インラインのバッククォートなし`);
  process.exit(0);
}
console.error(`[check-note-inline-code] ✗ ${new Set(hits.map((h) => h.file)).size} 記事にインラインのバッククォート ${hits.length} 件（${files.length} 記事を検査）:`);
for (const h of hits.slice(0, 50)) console.error(`  ${h.file}:${h.line}  ${h.text}`);
if (hits.length > 50) console.error(`  … 他 ${hits.length - 50} 件`);
console.error('  note はバッククォートを記号のまま出す。目印は【〇〇】、数値・式はバッククォートを外して書く。');
process.exit(1);
