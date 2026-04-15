#!/usr/bin/env node
// 技術士総合技術監理部門のキーワードページの title を SEO 統一フォーマットへ書き換える。
//
// 対象: .local/r2/posts/pe-comprehensive-management/*/article.mdx のうち
//       frontmatter で group: keyword のもののみ
// 除外: group: guide, group が無いその他（過去問など）
//
// 変換ルール:
//   {既存 title} → {既存 title} ｜ 総合技術監理 キーワード集 2026
//
// 冪等性: 既に「｜ 総合技術監理 キーワード集 2026」を含む title はスキップ
//
// 使い方:
//   node scripts/unify-pe-keyword-titles.mjs           # dry-run（変更内容を表示するだけ）
//   node scripts/unify-pe-keyword-titles.mjs --apply   # 実際に書き込む

import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { transformMdxFile, readMdxFile } from './lib/mdx-io.mjs';

const ROOT = '.local/r2/posts/pe-comprehensive-management';
const SUFFIX = ' ｜ 総合技術監理 キーワード集 2026';
const APPLY = process.argv.includes('--apply');

const dirs = readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const stats = {
  total: 0,
  keyword: 0,
  skippedGroup: 0,
  skippedAlreadySuffixed: 0,
  changed: 0,
  errors: 0,
};
const changes = [];
const skippedGroups = new Map();

for (const slug of dirs) {
  const path = join(ROOT, slug, 'article.mdx');
  if (!existsSync(path)) continue;
  stats.total++;

  const { raw } = readMdxFile(path);
  const { data } = matter(raw);
  const group = data.group || '(none)';

  if (group !== 'keyword') {
    stats.skippedGroup++;
    skippedGroups.set(group, (skippedGroups.get(group) || 0) + 1);
    continue;
  }
  stats.keyword++;

  const oldTitle = String(data.title || '').trim();
  if (!oldTitle) {
    stats.errors++;
    console.warn(`[WARN] ${slug}: title is empty`);
    continue;
  }
  if (oldTitle.includes('総合技術監理 キーワード集 2026')) {
    stats.skippedAlreadySuffixed++;
    continue;
  }

  const newTitle = oldTitle + SUFFIX;
  changes.push({ slug, oldTitle, newTitle });

  if (APPLY) {
    const written = transformMdxFile(path, (raw) => {
      // frontmatter の title 行のみを書き換える。
      // クォート有無の両パターンに対応。
      const fmEnd = raw.indexOf('\n---', 4);
      if (fmEnd === -1) return null;
      const fm = raw.slice(0, fmEnd);
      const body = raw.slice(fmEnd);

      const titleLineRegex = /^title:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|.+)$/m;
      const match = fm.match(titleLineRegex);
      if (!match) return null;

      const escapedNewTitle = newTitle.includes(':') || newTitle.includes('"')
        ? `'${newTitle.replace(/'/g, "''")}'`
        : `"${newTitle}"`;

      const newFm = fm.replace(titleLineRegex, `title: ${escapedNewTitle}`);
      return newFm + body;
    });
    if (written) stats.changed++;
  }
}

console.log('=== Title unification summary ===');
console.log(`Total scanned:           ${stats.total}`);
console.log(`  group=keyword:         ${stats.keyword}`);
console.log(`  skipped (other group): ${stats.skippedGroup}`);
console.log(`  skipped (already):     ${stats.skippedAlreadySuffixed}`);
console.log(`  pending change:        ${changes.length}`);
console.log(`  errors:                ${stats.errors}`);
console.log('');
console.log('Skipped group breakdown:');
for (const [g, n] of [...skippedGroups.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${g}: ${n}`);
}
console.log('');

if (APPLY) {
  console.log(`✅ Applied: ${stats.changed} files written`);
} else {
  console.log('=== DRY RUN — first 15 sample changes ===');
  for (const c of changes.slice(0, 15)) {
    console.log(`  ${c.slug}`);
    console.log(`    OLD: ${c.oldTitle}`);
    console.log(`    NEW: ${c.newTitle}`);
  }
  if (changes.length > 15) {
    console.log(`  ... and ${changes.length - 15} more`);
  }
  console.log('');
  console.log('Run with --apply to write changes.');
}
