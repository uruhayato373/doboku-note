#!/usr/bin/env node
// .claude/scripts/fix-civil-long-bold-unwrap.mjs
//
// lint 7-1 HIGH/MEDIUM 修正:
//   `**長文 50字超**` の太字ラップを解除（テキストは保持、強調だけ外す）。
//   - primary の <details>解答・解説 内の `**...❌**` `**...✅**` パターンが大半
//   - 太字が長文を覆うと「強調」の意味を失い、視覚ノイズになる
//   - 行頭の `- ` (リストアイテム) と末尾の `❌/✅` マーカーは保持
//
// 例:
//   - **土の一軸圧縮試験は、供試体を一軸（上下）方向に圧縮力を作用させ、…求める試験である ❌**
//   ↓
//   - 土の一軸圧縮試験は、供試体を一軸（上下）方向に圧縮力を作用させ、…求める試験である ❌
//
// AdSense 不合格対策の追加施策 (2026-05-16)

import { transformMdxFile, readMdxFile } from './lib/mdx-io.mjs';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const baseArg = process.argv.find((a) => a.startsWith('--base='));
const BASE = resolve(baseArg ? baseArg.slice('--base='.length) : 'content/site/civil-construction-1');
const DRY_RUN = process.argv.includes('--dry-run');
const thresholdArg = process.argv.find((a) => a.startsWith('--threshold='));
const THRESHOLD = thresholdArg ? Number(thresholdArg.slice('--threshold='.length)) : 50;

function collectMdx(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      // 全 group を対象（primary/secondary/textbook/guide）
      collectMdx(p, out);
    } else if (entry === 'article.mdx') {
      out.push(p);
    }
  }
  return out;
}

function unwrapLongBold(raw) {
  // `**...**` を見つけて、中身が THRESHOLD 字超なら ** を剥がす
  // 中身に ** や改行が含まれないものに限定（ネスト/複数行はスキップ）
  let count = 0;
  const result = raw.replace(/\*\*([^*\n][^*\n]*)\*\*/g, (full, inner) => {
    // 視覚上の文字数（絵文字含む）でカウント
    const len = [...inner].length;
    if (len > THRESHOLD) {
      count++;
      return inner;
    }
    return full;
  });
  return { newRaw: result, fixed: count };
}

function main() {
  const files = collectMdx(BASE);
  let totalFixed = 0;
  let filesChanged = 0;

  for (const file of files) {
    const { raw } = readMdxFile(file);
    const { newRaw, fixed } = unwrapLongBold(raw);
    if (fixed === 0) continue;
    const rel = file.replace(BASE + '/', '');
    if (DRY_RUN) {
      console.log(`[dry-run] ${rel}: would unwrap ${fixed} long bold`);
    } else {
      transformMdxFile(file, () => newRaw);
      console.log(`[fixed] ${rel}: unwrapped ${fixed} long bold`);
    }
    totalFixed += fixed;
    filesChanged++;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Threshold: >${THRESHOLD} chars`);
  console.log(`Files scanned: ${files.length}`);
  console.log(`Files ${DRY_RUN ? 'would-change' : 'changed'}: ${filesChanged}`);
  console.log(`Long bolds ${DRY_RUN ? 'would-unwrap' : 'unwrapped'}: ${totalFixed}`);
  if (DRY_RUN) console.log('\n(--dry-run mode, no files modified)');
}

main();
