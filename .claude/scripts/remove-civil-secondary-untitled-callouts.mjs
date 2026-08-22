#!/usr/bin/env node
// .claude/scripts/remove-civil-secondary-untitled-callouts.mjs
//
// civil-construction-1/secondary-* から **タイトル無しの** <Callout type="note">...</Callout>
// だけを削除。タイトル付きは学習コンテンツ（改善前の記述／施工計画と施工管理の視点の違い／
// 記述上の目のつけどころ／計算例1,2 等）なので保持。
//
// 背景:
//   - untitled <Callout type="note"> は本番試験の選択指示・必須問題ラベルで学習価値ゼロ
//   - 「問題4〜問題7までの選択問題のうちから2問題を選択し解答してください」
//   - 「必須問題」「選択問題（1）」（単独）
//   - primary 側の Callout 削除に続く secondary 版
//
// AdSense 不合格対策の追加施策 (2026-05-16)

import { transformMdxFile, readMdxFile } from './lib/mdx-io.mjs';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const BASE = resolve('content/site/civil-construction-1');
const DRY_RUN = process.argv.includes('--dry-run');

function collectMdx(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (!entry.startsWith('secondary-')) continue;
      collectMdx(p, out);
    } else if (entry === 'article.mdx') {
      out.push(p);
    }
  }
  return out;
}

function removeUntitledNoteCallouts(raw) {
  // <Callout type="note">...</Callout> （title 属性 **なし**）にマッチ
  // - 開きタグは `<Callout type="note">` のみ（` title=` を含まない）
  // - 複数行対応
  const re = /[ \t]*<Callout type="note">([\s\S]*?)<\/Callout>\s*\n?/g;

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
    const { newRaw, removed } = removeUntitledNoteCallouts(raw);
    if (removed === 0) continue;
    const rel = file.replace(BASE + '/', '');
    if (DRY_RUN) {
      console.log(`[dry-run] ${rel}: would remove ${removed} untitled <Callout type="note">`);
    } else {
      transformMdxFile(file, () => newRaw);
      console.log(`[removed] ${rel}: removed ${removed} untitled <Callout type="note">`);
    }
    totalRemoved += removed;
    filesChanged++;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Files scanned: ${files.length}`);
  console.log(`Files ${DRY_RUN ? 'would-change' : 'changed'}: ${filesChanged}`);
  console.log(`Untitled <Callout type="note"> ${DRY_RUN ? 'would-remove' : 'removed'}: ${totalRemoved}`);
  if (DRY_RUN) console.log('\n(--dry-run mode, no files modified)');
}

main();
