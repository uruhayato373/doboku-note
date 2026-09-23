#!/usr/bin/env node
/**
 * check-note-duplicate-images.mjs — note 記事の本文で同じ画像を 2 回以上使っていないかを全件検査する。
 *
 * 同じ画像の 2 枚目は note の CDN 確定に至らず、全文更新が中断してその記事を再公開できなくなる
 * （判定と経緯は scripts/lib/note-duplicate-images.mjs）。pre-commit の note-lint は staged の記事しか
 * 見ないので、既存記事の重複はここで CI が止める。
 *
 * 使い方: node scripts/check-note-duplicate-images.mjs
 * 終了コード: 0 = 重複なし / 1 = 重複あり、または検査対象 0 件（検査不成立）
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findDuplicateImages } from './lib/note-duplicate-images.mjs';

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
  for (const d of findDuplicateImages(readFileSync(f, 'utf8'))) {
    hits.push({ file: relative(ROOT, f).replaceAll('\\', '/'), ...d });
  }
}

if (files.length === 0) {
  console.error('[check-note-duplicate-images] ✗ 検査対象 0 件（content/note の article*.md が見つからない＝検査不成立）');
  process.exit(1);
}
if (hits.length === 0) {
  console.log(`[check-note-duplicate-images] ✓ ${files.length} 記事を検査・同じ画像の重複なし`);
  process.exit(0);
}
console.error(`[check-note-duplicate-images] ✗ ${new Set(hits.map((h) => h.file)).size} 記事で同じ画像を重複使用（${files.length} 記事を検査）:`);
for (const h of hits) console.error(`  ${h.file}:${h.line}  ${h.path}（初出 ${h.firstLine} 行目）`);
console.error('  同じ画像の 2 枚目は note の CDN 確定に至らず、全文更新が中断する。2 回目以降の画像行を削除する。');
process.exit(1);
