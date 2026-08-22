#!/usr/bin/env node
// .claude/scripts/remove-civil-primary-callouts.mjs
//
// civil-construction-1/primary-* から <Callout> ブロックを一括削除。
//
// 背景:
//   - primary 過去問の Callout は試験本番の「※問題番号 No.X〜No.Y のうち○問選択」案内文
//   - doboku-note は学習サイトであり、本番の選択指示は学習価値ゼロ（ノイズ）
//   - ページがクリーンになり読みやすくなる
//
// AdSense 不合格対策の追加施策 (2026-05-16)
//
// Usage:
//   node .claude/scripts/remove-civil-primary-callouts.mjs --dry-run
//   node .claude/scripts/remove-civil-primary-callouts.mjs

import { transformMdxFile, readMdxFile } from './lib/mdx-io.mjs';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const BASE = resolve('content/site/civil-construction-1');
const DRY_RUN = process.argv.includes('--dry-run');

function collectMdx(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (!entry.startsWith('primary-')) continue;
      collectMdx(p, out);
    } else if (entry === 'article.mdx') {
      out.push(p);
    }
  }
  return out;
}

function removeCallouts(raw) {
  // <Callout ...> ... </Callout> ブロックを削除（複数行）
  const re = /[ \t]*<Callout\b[\s\S]*?<\/Callout>\s*\n?/g;
  let count = 0;
  let result = raw.replace(re, () => { count++; return ''; });
  // 連続空行を 1 行に圧縮
  result = result.replace(/\n{3,}/g, '\n\n');
  return { newRaw: result, removed: count };
}

function main() {
  const files = collectMdx(BASE);
  let totalRemoved = 0;
  let filesChanged = 0;

  for (const file of files) {
    const { raw } = readMdxFile(file);
    const { newRaw, removed } = removeCallouts(raw);
    if (removed === 0) continue;
    const rel = file.replace(BASE + '/', '');
    if (DRY_RUN) {
      console.log(`[dry-run] ${rel}: would remove ${removed} <Callout>`);
    } else {
      transformMdxFile(file, () => newRaw);
      console.log(`[removed] ${rel}: removed ${removed} <Callout>`);
    }
    totalRemoved += removed;
    filesChanged++;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Files scanned: ${files.length}`);
  console.log(`Files ${DRY_RUN ? 'would-change' : 'changed'}: ${filesChanged}`);
  console.log(`<Callout> ${DRY_RUN ? 'would-remove' : 'removed'}: ${totalRemoved}`);
  if (DRY_RUN) console.log('\n(--dry-run mode, no files modified)');
}

main();
