#!/usr/bin/env node
// .claude/scripts/fix-exampoint-items-split.mjs
//
// lint 9-11 HIGH 修正 (体言止め化):
//   <ExamPoint items> 内で「。」を含む item を「。」で分割して複数 item に。
//   「、」が 2 個以上ある item も処理対象（最初の 1 個を超える「、」を「。」相当に変換し分割）。
//
//   例:
//     "2008年制定。生物多様性に特化した日本初の基本法"
//     ↓
//     "2008年制定", "生物多様性に特化した日本初の基本法"
//
// PE 過去問の長文 item を 体言止め独立ポイントに整理。
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
    if (statSync(p).isDirectory()) collectMdx(p, out);
    else if (entry === 'article.mdx') out.push(p);
  }
  return out;
}

// 1 行の文字列リテラル `"..."` を items として処理し、句点分割した文字列の配列を返す
function splitItem(s) {
  const trimmed = s.replace(/[、。．，]$/, '');
  const periodCount = (trimmed.match(/[。．]/g) || []).length;
  const commaCount = (trimmed.match(/[、，]/g) || []).length;

  // 句点ありなら句点で分割
  if (periodCount > 0) {
    return trimmed
      .split(/[。．]/)
      .map((p) => p.trim())
      .filter((p) => p.length >= 6);
  }

  // 「、」が 3 個以上なら 全ての「、」で分割（リスト羅列パターン）
  if (commaCount >= 3) {
    return trimmed
      .split(/[、，]/)
      .map((p) => p.trim())
      .filter((p) => p.length >= 4); // リスト断片は短くて OK
  }

  // 「、」が 2 個ちょうどなら 最初の「、」で 2 分割
  if (commaCount === 2) {
    const idx = trimmed.search(/[、，]/);
    const a = trimmed.slice(0, idx).trim();
    const b = trimmed.slice(idx + 1).trim();
    if (a.length >= 6 && b.length >= 6) return [a, b];
  }

  return [trimmed];
}

function processBlock(block) {
  const itemsMatch = block.match(/(items=\{\[)([\s\S]*?)(\]\})/);
  if (!itemsMatch) return { newBlock: block, changed: false };

  const [full, openTag, itemsBody, closeTag] = itemsMatch;

  // 各 item 文字列（"...", "...", ...）を抽出
  const itemStrings = [...itemsBody.matchAll(/"((?:[^"\\]|\\.)*)"/g)];
  if (itemStrings.length === 0) return { newBlock: block, changed: false };

  let didChange = false;
  const newItems = [];
  for (const m of itemStrings) {
    const s = m[1];
    const parts = splitItem(s);
    if (parts.length === 1 && parts[0] === s.replace(/[、。．，]$/, '')) {
      // 元の文字列が句読点で終わってないなら元のまま
      newItems.push(s);
    } else if (parts.length === 1) {
      // 末尾句読点剥がしただけ
      newItems.push(parts[0]);
      didChange = true;
    } else {
      // 分割した
      for (const p of parts) newItems.push(p);
      didChange = true;
    }
  }

  if (!didChange) return { newBlock: block, changed: false };

  // インデント保持: 元の itemsBody の最初の non-empty 行のインデントを使う
  const indentMatch = itemsBody.match(/\n(\s*)"/);
  const indent = indentMatch ? indentMatch[1] : '    ';
  const newBody = '\n' + newItems.map((s) => `${indent}"${s}",`).join('\n') + '\n  ';

  const newBlock = block.replace(full, `${openTag}${newBody}${closeTag}`);
  return { newBlock, changed: true };
}

function fixExamPoints(raw) {
  let count = 0;
  // 各 <ExamPoint ... /> ブロックを置換
  const blockRe = /<ExamPoint[\s\S]*?\/>/g;
  const result = raw.replace(blockRe, (block) => {
    const { newBlock, changed } = processBlock(block);
    if (changed) count++;
    return newBlock;
  });
  return { newRaw: result, fixed: count };
}

function main() {
  const files = collectMdx(BASE);
  let totalFixed = 0;
  let filesChanged = 0;

  for (const file of files) {
    const { raw } = readMdxFile(file);
    const { newRaw, fixed } = fixExamPoints(raw);
    if (fixed === 0) continue;
    const rel = file.replace(BASE + '/', '');
    if (DRY_RUN) {
      console.log(`[dry-run] ${rel}: would split ${fixed} ExamPoint blocks`);
    } else {
      transformMdxFile(file, () => newRaw);
      console.log(`[fixed] ${rel}: split ${fixed} ExamPoint blocks`);
    }
    totalFixed += fixed;
    filesChanged++;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Files scanned: ${files.length}`);
  console.log(`Files ${DRY_RUN ? 'would-change' : 'changed'}: ${filesChanged}`);
  console.log(`ExamPoint blocks ${DRY_RUN ? 'would-split' : 'split'}: ${totalFixed}`);
  if (DRY_RUN) console.log('\n(--dry-run mode, no files modified)');
}

main();
