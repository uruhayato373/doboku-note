#!/usr/bin/env node
// .claude/scripts/remove-civil-exampoints.mjs
//
// civil-construction-1 配下 MDX から <ExamPoint /> ブロックを一括削除。
//
// 背景:
//   - migrate-civil-answer-style.mjs バグで 1,440+ 個の壊れた ExamPoint が生成された
//   - items は機械分割断片（lint 9-11 検出済の 26 件は修正、残り 1,400+ は接続助詞分割）
//   - summary は <details> 内の解答理由と内容重複 → 削除しても情報損失ゼロ
//   - AdSense 観点でも「価値の低いコンテンツ」判定リスク減少
//
// AdSense 不合格対策の追加施策 (2026-05-16)
//
// Usage:
//   node .claude/scripts/remove-civil-exampoints.mjs --dry-run
//   node .claude/scripts/remove-civil-exampoints.mjs

import { transformMdxFile, readMdxFile } from './lib/mdx-io.mjs';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const BASE = resolve('content/site/civil-construction-1');
const DRY_RUN = process.argv.includes('--dry-run');

function collectMdx(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      // primary-* のみ対象（secondary は civil-secondary-exam-writer で
      // 高品質な ExamPoint を新規追加済のため保持）
      if (!entry.startsWith('primary-')) continue;
      collectMdx(p, out);
    } else if (entry === 'article.mdx') {
      out.push(p);
    }
  }
  return out;
}

function removeExamPoints(raw) {
  // <ExamPoint ... /> ブロック（複数行）を削除
  // - 自己閉じタグ `/>` または `</ExamPoint>` の両方に対応
  // - 前後の空行をたたんで自然に
  const selfClosingRe = /[ \t]*<ExamPoint\b[\s\S]*?\/>\s*\n/g;
  const explicitCloseRe = /[ \t]*<ExamPoint\b[\s\S]*?<\/ExamPoint>\s*\n/g;

  let count = 0;
  let result = raw;
  result = result.replace(selfClosingRe, () => { count++; return ''; });
  result = result.replace(explicitCloseRe, () => { count++; return ''; });

  // 削除後に連続する空行（3行以上）を 1 行に整理
  result = result.replace(/\n{3,}/g, '\n\n');

  return { newRaw: result, removed: count };
}

function main() {
  const files = collectMdx(BASE);
  let totalRemoved = 0;
  let filesChanged = 0;

  for (const file of files) {
    const { raw } = readMdxFile(file);
    const { newRaw, removed } = removeExamPoints(raw);
    if (removed === 0) continue;

    const rel = file.replace(BASE + '/', '');
    if (DRY_RUN) {
      console.log(`[dry-run] ${rel}: would remove ${removed} <ExamPoint>`);
    } else {
      transformMdxFile(file, () => newRaw);
      console.log(`[removed] ${rel}: removed ${removed} <ExamPoint>`);
    }
    totalRemoved += removed;
    filesChanged++;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Files scanned: ${files.length}`);
  console.log(`Files ${DRY_RUN ? 'would-change' : 'changed'}: ${filesChanged}`);
  console.log(`<ExamPoint> ${DRY_RUN ? 'would-remove' : 'removed'}: ${totalRemoved}`);
  if (DRY_RUN) console.log('\n(--dry-run mode, no files modified)');
}

main();
