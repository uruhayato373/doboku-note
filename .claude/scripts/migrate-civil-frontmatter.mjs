#!/usr/bin/env node
// .claude/scripts/migrate-civil-frontmatter.mjs
//
// 1級土木施工管理技士 (civil-construction-1) の Docusaurus 旧 frontmatter を一括削除。
//
// 削除対象フィールド:
//   - id
//   - sidebar_label
//   - toc_min_heading_level
//   - toc_max_heading_level
//
// AdSense 不合格対策プラン P2-1。詳細: /Users/minamidaisuke/.claude/plans/gentle-questing-sketch.md
//
// Usage:
//   node .claude/scripts/migrate-civil-frontmatter.mjs --dry-run
//   node .claude/scripts/migrate-civil-frontmatter.mjs            # 実行

import { transformMdxFile, readMdxFile } from './lib/mdx-io.mjs';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const baseArg = process.argv.find((a) => a.startsWith('--base='));
const BASE = resolve(baseArg ? baseArg.slice('--base='.length) : 'content/site/civil-construction-1');
const LEGACY_FIELDS = ['id', 'sidebar_label', 'toc_min_heading_level', 'toc_max_heading_level'];
const DRY_RUN = process.argv.includes('--dry-run');

function collectMdx(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) collectMdx(p, out);
    else if (entry === 'article.mdx') out.push(p);
  }
  return out;
}

function removeLegacyFields(raw) {
  const fmMatch = raw.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)/);
  if (!fmMatch) return null;
  const [, openTag, fmBody, closeTag] = fmMatch;

  const lines = fmBody.split(/\r?\n/);
  const removed = [];
  const kept = lines.filter((line) => {
    for (const field of LEGACY_FIELDS) {
      if (new RegExp(`^${field}\\s*:`).test(line)) {
        removed.push(field);
        return false;
      }
    }
    return true;
  });

  if (removed.length === 0) return null;
  const newFm = openTag + kept.join('\n') + closeTag;
  return { newRaw: newFm + raw.slice(openTag.length + fmBody.length + closeTag.length), removed };
}

function main() {
  const files = collectMdx(BASE);
  let changedCount = 0;
  let totalRemoved = 0;
  const summary = [];

  for (const file of files) {
    const { raw } = readMdxFile(file);
    const result = removeLegacyFields(raw);
    if (!result) continue;

    if (DRY_RUN) {
      console.log(`[dry-run] ${file}: would remove [${result.removed.join(', ')}]`);
    } else {
      transformMdxFile(file, () => result.newRaw);
      console.log(`[migrated] ${file}: removed [${result.removed.join(', ')}]`);
    }
    changedCount++;
    totalRemoved += result.removed.length;
    summary.push({ file: file.replace(BASE + '/', ''), removed: result.removed });
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Files scanned: ${files.length}`);
  console.log(`Files ${DRY_RUN ? 'would-change' : 'changed'}: ${changedCount}`);
  console.log(`Legacy fields ${DRY_RUN ? 'would-remove' : 'removed'}: ${totalRemoved}`);
  if (DRY_RUN) console.log('\n(--dry-run mode, no files modified)');
}

main();
