#!/usr/bin/env node
/**
 * civil-relations.json を消費して civil-construction-1 textbook/guide MDX に <RelatedKeywords> をバッチ挿入
 *
 * Usage:
 *   node insert-civil-relations.mjs --slugs=textbook-quality-overview --dry-run
 *   node insert-civil-relations.mjs --all --apply
 *
 * 挿入位置（優先順）:
 *   1. ## よくある質問 / ## FAQ の直前（FAQ 採用済み記事）
 *   2. ## 過去問 / ## 過去問での出題 の直前
 *   3. ## 参考資料 / ## 参考文献 の直前
 *   4. どちらもなければファイル末尾
 *
 * MDX I/O は #lib/mdx-io（CRLF 保持）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { readMdxFile, writeMdxFile } from '#lib/mdx-io.mjs';

const ROOT = process.cwd();
const CATEGORY_DIR = path.join(ROOT, 'content/site/civil-construction-1');
const IN_RELATIONS = path.join(ROOT, 'src/config/civil-relations.json');

const INSERT_BEFORE_HEADING_PATTERNS = [
  /^## よくある質問.*$/m,
  /^## FAQ.*$/m,
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
    }
  }
  return args;
}

function formatRelatedKeywordsBlock(relations) {
  const lines = relations.map((r) => `  { label: "${r.label}", slug: "civil-construction-1-${r.slug}" },`);
  return `<RelatedKeywords items={[\n${lines.join('\n')}\n]} />`;
}

function findInsertPosition(raw) {
  for (const re of INSERT_BEFORE_HEADING_PATTERNS) {
    const m = raw.match(re);
    if (m && typeof m.index === 'number') {
      return { index: m.index, matchedHeading: m[0] };
    }
  }
  return null;
}

function insertRelatedKeywords(raw, block) {
  const pos = findInsertPosition(raw);
  if (pos) {
    const before = raw.slice(0, pos.index).replace(/\s*$/, '');
    const after = raw.slice(pos.index);
    return `${before}\n\n${block}\n\n${after}`;
  }
  return `${raw.replace(/\s*$/, '')}\n\n${block}\n`;
}

function hasExistingRelatedKeywords(raw) {
  return /<RelatedKeywords\s/.test(raw);
}

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
  const ctxBefore = beforeLines.slice(Math.max(0, head - 2), head);
  const ctxAfter = beforeLines.slice(beforeLines.length - tail, Math.min(beforeLines.length, beforeLines.length - tail + 3));

  console.log(`--- ${slug}/article.mdx`);
  for (const l of ctxBefore) console.log(`  ${l}`);
  for (const l of addedLines) console.log(`+ ${l}`);
  for (const l of ctxAfter) console.log(`  ${l}`);
  console.log('');
}

function main() {
  const args = parseArgs(process.argv);

  if (!args.dryRun && !args.apply) {
    console.error('Usage: insert-civil-relations --slugs=<csv> (--dry-run | --apply) [--no-skip-existing]');
    console.error('       insert-civil-relations --all --apply');
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
    skippedEmpty: 0,
    missingMdx: 0,
  };

  for (const slug of targetSlugs) {
    stats.attempted++;
    const rels = relationsData.relations[slug];
    if (!rels || rels.length === 0) {
      console.log(`[SKIP-EMPTY] ${slug}: 関連 0 件`);
      stats.skippedEmpty++;
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
      console.log(`[NO-CHANGE] ${slug}`);
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
  console.log(`  skipped (empty): ${stats.skippedEmpty}`);
  console.log(`  missing (no MDX): ${stats.missingMdx}`);
  if (args.dryRun) console.log('  (DRY-RUN: no files written)');
}

main();
