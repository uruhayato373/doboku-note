#!/usr/bin/env node
/**
 * keyword-relations.json を消費して各キーワード MDX に <RelatedKeywords> をバッチ挿入
 *
 * Usage:
 *   node insert-keyword-relations.mjs --slugs=a,b,c --dry-run
 *   node insert-keyword-relations.mjs --slugs=a,b,c --apply
 *   node insert-keyword-relations.mjs --all --apply
 *   npm run insert-keyword-relations -- --slugs=followership --dry-run
 *
 * Flags:
 *   --slugs=<csv>         カンマ区切りの対象 slug（短い形）
 *   --all                 keyword-relations.json の全 slug を対象
 *   --dry-run             差分プレビューのみ、書き込みしない
 *   --apply               ファイル書き込みを実行
 *   --no-skip-existing    既に <RelatedKeywords> がある MDX も対象に含める（デフォルト: スキップ）
 *
 * 挿入位置ルール（優先順）:
 *   1. ## 過去問での出題 / ## 過去問 の直前
 *   2. ## 参考資料 / ## 参考文献 の直前
 *   3. どちらもなければファイル末尾
 *
 * MDX I/O は #lib/mdx-io を使用し CRLF を保持（pre-commit フック対応）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { readMdxFile, writeMdxFile } from '#lib/mdx-io.mjs';

const ROOT = process.cwd();
const CATEGORY_DIR = path.join(ROOT, 'content/site/pe-comprehensive-management');
const IN_RELATIONS = path.join(ROOT, 'src/config/keyword-relations.json');

/** 挿入位置判定: この見出しの直前に入れる。リスト順に探索し最初にマッチした位置を採用 */
const INSERT_BEFORE_HEADING_PATTERNS = [
  /^## 過去問での出題.*$/m,
  /^## 過去問.*$/m,
  /^## 参考資料.*$/m,
  /^## 参考文献.*$/m,
];

function parseArgs(argv) {
  const args = { slugs: [], dryRun: false, apply: false, skipExisting: true, all: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--apply') args.apply = true;
    else if (a === '--no-skip-existing') args.skipExisting = false;
    else if (a === '--all') args.all = true;
    else if (a.startsWith('--slugs=')) {
      args.slugs = a.slice('--slugs='.length).split(',').filter(Boolean);
    } else if (a === '--slugs' && argv[i + 1]) {
      args.slugs = argv[++i].split(',').filter(Boolean);
    }
  }
  return args;
}

/** <RelatedKeywords items={[...]} /> ブロックを組み立てる */
function formatRelatedKeywordsBlock(relations) {
  const lines = relations.map(r => `  { label: "${r.label}", slug: "${r.slug}" },`);
  return `<RelatedKeywords items={[\n${lines.join('\n')}\n]} />`;
}

/** 挿入位置を検索 */
function findInsertPosition(raw) {
  for (const re of INSERT_BEFORE_HEADING_PATTERNS) {
    const m = raw.match(re);
    if (m && typeof m.index === 'number') {
      return { index: m.index, matchedHeading: m[0] };
    }
  }
  return null;
}

/** raw に block を挿入した新しい raw を返す */
function insertRelatedKeywords(raw, block) {
  const pos = findInsertPosition(raw);
  if (pos) {
    const before = raw.slice(0, pos.index).replace(/\s*$/, '');
    const after = raw.slice(pos.index);
    return `${before}\n\n${block}\n\n${after}`;
  }
  // ファイル末尾に追記
  return `${raw.replace(/\s*$/, '')}\n\n${block}\n`;
}

function hasExistingRelatedKeywords(raw) {
  return /<RelatedKeywords\s/.test(raw);
}

/** シンプルな差分プレビュー（挿入行のみ + 前後 3 行のコンテキスト） */
function diffPreview(before, after, slug) {
  const beforeLines = before.split(/\r?\n/);
  const afterLines = after.split(/\r?\n/);
  let head = 0;
  while (head < beforeLines.length && head < afterLines.length && beforeLines[head] === afterLines[head]) head++;
  let tail = 0;
  while (
    tail < beforeLines.length - head &&
    tail < afterLines.length - head &&
    beforeLines[beforeLines.length - 1 - tail] === afterLines[afterLines.length - 1 - tail]
  ) tail++;
  const addedLines = afterLines.slice(head, afterLines.length - tail);
  const removedLines = beforeLines.slice(head, beforeLines.length - tail);
  const ctxBefore = beforeLines.slice(Math.max(0, head - 2), head);
  const ctxAfter = beforeLines.slice(beforeLines.length - tail, Math.min(beforeLines.length, beforeLines.length - tail + 3));

  console.log(`--- ${slug}/article.mdx`);
  for (const l of ctxBefore) console.log(`  ${l}`);
  for (const l of removedLines) console.log(`- ${l}`);
  for (const l of addedLines) console.log(`+ ${l}`);
  for (const l of ctxAfter) console.log(`  ${l}`);
  console.log('');
}

function main() {
  const args = parseArgs(process.argv);

  if (!args.dryRun && !args.apply) {
    console.error('Usage: insert-keyword-relations --slugs=<a,b,c> (--dry-run | --apply) [--no-skip-existing]');
    console.error('       insert-keyword-relations --all --apply');
    process.exit(1);
  }
  if (args.slugs.length === 0 && !args.all) {
    console.error('Error: --slugs=<csv> または --all が必要');
    process.exit(1);
  }

  const relationsData = JSON.parse(fs.readFileSync(IN_RELATIONS, 'utf8'));
  const targetSlugs = args.all ? Object.keys(relationsData.relations) : args.slugs;

  const stats = {
    attempted: 0,
    inserted: 0,
    skippedExisting: 0,
    missingJson: 0,
    missingMdx: 0,
  };

  for (const slug of targetSlugs) {
    stats.attempted++;
    const rels = relationsData.relations[slug];
    if (!rels || rels.length === 0) {
      console.log(`[MISSING-JSON] ${slug}: relations 空`);
      stats.missingJson++;
      continue;
    }

    const filePath = path.join(CATEGORY_DIR, slug, 'article.mdx');
    if (!fs.existsSync(filePath)) {
      console.log(`[MISSING-MDX] ${slug}: ${filePath}`);
      stats.missingMdx++;
      continue;
    }

    const { raw, eol } = readMdxFile(filePath);

    if (args.skipExisting && hasExistingRelatedKeywords(raw)) {
      console.log(`[SKIP-EXISTING] ${slug}: 既に <RelatedKeywords> あり`);
      stats.skippedExisting++;
      continue;
    }

    const block = formatRelatedKeywordsBlock(rels);
    const newRaw = insertRelatedKeywords(raw, block);

    if (newRaw === raw) {
      console.log(`[NO-CHANGE] ${slug}: 挿入不要（同内容）`);
      continue;
    }

    if (args.dryRun) {
      diffPreview(raw, newRaw, slug);
      stats.inserted++;
      continue;
    }

    writeMdxFile(filePath, newRaw, eol);
    console.log(`[APPLIED] ${slug}`);
    stats.inserted++;
  }

  console.log('');
  console.log('=== Summary ===');
  console.log(`  attempted: ${stats.attempted}`);
  console.log(`  ${args.dryRun ? 'would insert' : 'inserted'}: ${stats.inserted}`);
  console.log(`  skipped (existing): ${stats.skippedExisting}`);
  console.log(`  missing (no JSON): ${stats.missingJson}`);
  console.log(`  missing (no MDX): ${stats.missingMdx}`);
  if (args.dryRun) console.log('  (DRY-RUN: no files written)');
}

main();
