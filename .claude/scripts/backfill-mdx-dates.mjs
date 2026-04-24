#!/usr/bin/env node
/**
 * Backfill created / dateModified frontmatter (Issue #75)
 *
 * .local/r2/posts/ 配下の全 MDX に対し、git log から初回 commit 日を `created`、
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

import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readMdxFile, writeMdxFile } from "./lib/mdx-io.mjs";

const POSTS_DIR = ".local/r2/posts";

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

function gitDate(cmd) {
  try {
    const out = execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] });
    const line = out.split("\n").filter(Boolean)[0];
    // git log %ai フォーマット: "2026-04-24 15:22:19 +0900"
    return line?.split(" ")[0] || null;
  } catch {
    return null;
  }
}

function gitFirstCommitDate(file) {
  // git log --reverse: 古い順。--follow: rename を追跡
  // POSIX shell でファイルパスをそのまま渡すのでパス内特殊文字には注意
  return gitDate(`git log --follow --format=%ai --reverse -- "${file}"`);
}

function gitLastCommitDate(file) {
  return gitDate(`git log -1 --format=%ai -- "${file}"`);
}

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

let updated = 0;
let skipped = 0;
let noGit = 0;
let noFrontmatter = 0;

for (const file of files) {
  const created = gitFirstCommitDate(file);
  const dateModified = gitLastCommitDate(file);

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
