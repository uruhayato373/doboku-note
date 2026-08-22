#!/usr/bin/env node
/**
 * Backfill created / dateModified frontmatter (Issue #75)
 *
 * content/site/ 配下の全 MDX に対し、git log から初回 commit 日を `created`、
 * 直近 commit 日を `dateModified` として frontmatter に追加する。
 * 既存の created / dateModified は尊重する（上書きしない）。
 *
 * 真実源: git log --follow で rename を追跡。CRLF 保持は mdx-io.mjs 経由。
 *
 * Usage:
 *   node .claude/scripts/backfill-mdx-dates.mjs              # 本実行
 *   node .claude/scripts/backfill-mdx-dates.mjs --dry-run    # 変更せず対象確認
 *   node .claude/scripts/backfill-mdx-dates.mjs --limit 10   # 最初の N 件だけ処理
 */

import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { readMdxFile, writeMdxFile } from "./lib/mdx-io.mjs";
import { loadGitDates, lookupGitDates } from "./lib/git-dates.mjs";

const POSTS_DIR = "content/site";

// ── CLI ──

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity;

// ── Helpers ──

function findMdxFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findMdxFiles(full));
    } else if (entry.name.endsWith(".mdx")) {
      results.push(full);
    }
  }
  return results;
}

// git log の呼出は共通 lib `./lib/git-dates.mjs` に委譲（全ファイル一括解析）

function addFrontmatterFields(raw, created, dateModified) {
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return null; // frontmatter 無し、スキップ

  const fmBody = fmMatch[1];
  const hasCreated = /^created:\s/m.test(fmBody);
  const hasDateModified = /^dateModified:\s/m.test(fmBody);

  const additions = [];
  if (!hasCreated && created) additions.push(`created: ${created}`);
  if (!hasDateModified && dateModified) additions.push(`dateModified: ${dateModified}`);

  if (additions.length === 0) return null; // 追加項目無し

  // frontmatter body の末尾に追記（閉じ `---` の直前に挿入）
  const newFmBody = fmBody + "\n" + additions.join("\n");

  // slice ベースで安全に置換（regex 特殊文字対応）
  const startIdx = fmMatch.index;
  const endIdx = startIdx + fmMatch[0].length;
  const before = raw.slice(0, startIdx);
  const after = raw.slice(endIdx);
  return `${before}---\n${newFmBody}\n---${after}`;
}

// ── Main ──

console.log(`=== backfill-mdx-dates ${DRY_RUN ? "(DRY RUN)" : ""} ===`);
const files = findMdxFiles(POSTS_DIR).slice(0, LIMIT);
console.log(`対象ファイル: ${files.length}`);

const gitDates = loadGitDates();
console.log(`git-dates: ${gitDates.size} ファイルを解析`);

let updated = 0;
let skipped = 0;
let noGit = 0;
let noFrontmatter = 0;

for (const file of files) {
  const gd = lookupGitDates(gitDates, relative(process.cwd(), file));
  const created = gd?.created || null;
  const dateModified = gd?.dateModified || null;

  if (!created || !dateModified) {
    noGit++;
    console.warn(`[no git history] ${file}`);
    continue;
  }

  const { raw, eol } = readMdxFile(file);
  const newRaw = addFrontmatterFields(raw, created, dateModified);

  if (newRaw === null) {
    // 既に両方存在するか、frontmatter 無し
    const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) {
      noFrontmatter++;
      console.warn(`[no frontmatter] ${file}`);
    } else {
      skipped++;
    }
    continue;
  }

  if (!DRY_RUN) {
    writeMdxFile(file, newRaw, eol);
  }
  updated++;

  if (updated % 50 === 0) {
    console.log(`  ${updated} files processed...`);
  }
}

console.log("");
console.log("=== サマリ ===");
console.log(`updated:        ${updated}`);
console.log(`already-present: ${skipped}`);
console.log(`no-frontmatter: ${noFrontmatter}`);
console.log(`no-git-history: ${noGit}`);
console.log(`total:          ${files.length}`);

if (DRY_RUN) {
  console.log("\n[DRY RUN] 実際には変更されていません。--dry-run を外して再実行してください。");
}
