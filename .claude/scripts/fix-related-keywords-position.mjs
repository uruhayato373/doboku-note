#!/usr/bin/env node
// .claude/scripts/fix-related-keywords-position.mjs
//
// lint 9-10 HIGH 修正:
//   `## 参考資料` セクションの後ろに置かれた `<RelatedKeywords>` ブロックを
//   `## 参考資料` の **前** に移動する。
//
// 背景: Markdown リスト直後の JSX は MDX で描画されないことがある (§18)
//
// AdSense 不合格対策の追加施策 (2026-05-16)

import { transformMdxFile, readMdxFile } from './lib/mdx-io.mjs';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const baseArg = process.argv.find((a) => a.startsWith('--base='));
const BASE = resolve(baseArg ? baseArg.slice('--base='.length) : 'content/site');
const DRY_RUN = process.argv.includes('--dry-run');

function collectMdx(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      collectMdx(p, out);
    } else if (entry === 'article.mdx') {
      out.push(p);
    }
  }
  return out;
}

function moveRelatedKeywordsBeforeReferences(raw) {
  // `## 参考資料` のオフセットを探す
  const refIdx = raw.search(/^## 参考資料\s*$/m);
  if (refIdx === -1) return { newRaw: raw, moved: 0 };

  // 参考資料 以降から `<RelatedKeywords ...>...</RelatedKeywords>` または
  // `<RelatedKeywords ... />` ブロックを探す
  const afterRef = raw.slice(refIdx);
  const blockRe = /\n+<RelatedKeywords[\s\S]*?(?:\/>|<\/RelatedKeywords>)\n?/;
  const blockMatch = afterRef.match(blockRe);
  if (!blockMatch) return { newRaw: raw, moved: 0 };

  const block = blockMatch[0];
  const blockTrimmed = block.replace(/^\n+/, '').replace(/\n+$/, '');

  // afterRef から block を除去
  const afterRefCleaned = afterRef.replace(block, '\n');

  // refIdx の前に block を挿入（前後に空行）
  const beforeRef = raw.slice(0, refIdx).replace(/\n+$/, '');
  const newRaw = `${beforeRef}\n\n${blockTrimmed}\n\n${afterRefCleaned}`;

  return { newRaw, moved: 1 };
}

function main() {
  const files = collectMdx(BASE);
  let totalMoved = 0;
  let filesChanged = 0;

  for (const file of files) {
    const { raw } = readMdxFile(file);
    const { newRaw, moved } = moveRelatedKeywordsBeforeReferences(raw);
    if (moved === 0) continue;
    const rel = file.replace(BASE + '/', '');
    if (DRY_RUN) {
      console.log(`[dry-run] ${rel}: would move <RelatedKeywords> before 参考資料`);
    } else {
      transformMdxFile(file, () => newRaw);
      console.log(`[moved] ${rel}: moved <RelatedKeywords> before 参考資料`);
    }
    totalMoved += moved;
    filesChanged++;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Files scanned: ${files.length}`);
  console.log(`Files ${DRY_RUN ? 'would-change' : 'changed'}: ${filesChanged}`);
  console.log(`Blocks ${DRY_RUN ? 'would-move' : 'moved'}: ${totalMoved}`);
  if (DRY_RUN) console.log('\n(--dry-run mode, no files modified)');
}

main();
