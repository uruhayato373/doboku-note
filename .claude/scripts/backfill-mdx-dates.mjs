#!/usr/bin/env node
/**
 * Backfill created / dateModified frontmatter (Issue #75)
 *
 * content/site/ 配下の全 MDX に対し、git log から初回 commit 日を `created`、
 * 直近 commit 日を `dateModified` として frontmatter に追加する。
 * 既定は「無いものを足すだけ」で既存値は尊重する。`--refresh` を付けると既存値も
 * git 由来の値へ**更新する**。
 *
 * なぜ refresh が要るか（2026-08-22）: 一度きりの backfill のあと誰も frontmatter を
 * 更新しないため、実測で 1,117 記事中 1,040 件が古びていた（中央値 49 日ズレ）。
 * ビルドは git から引き直して正しい値を出していたが、そのせいで **公開 SEO 信号が
 * リポジトリ基盤に依存**し、リネームや履歴書換えのたびに 1,117 ページの lastmod が
 * 黙って動いていた。frontmatter を正にするため、まず現在の git 値へ揃える。
 *
 * 真実源: git log --follow で rename を追跡。CRLF 保持は mdx-io.mjs 経由。
 *
 * Usage:
 *   node .claude/scripts/backfill-mdx-dates.mjs              # 本実行
 *   node .claude/scripts/backfill-mdx-dates.mjs --dry-run    # 変更せず対象確認
 *   node .claude/scripts/backfill-mdx-dates.mjs --limit 10   # 最初の N 件だけ処理
 *   node .claude/scripts/backfill-mdx-dates.mjs --refresh    # 既存値も git 由来へ更新
 *   node .claude/scripts/backfill-mdx-dates.mjs --staged     # staged の記事だけ dateModified を今日へ（pre-commit 用）
 */

import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { readMdxFile, writeMdxFile } from "./lib/mdx-io.mjs";
import { loadGitDates, lookupGitDates } from "./lib/git-dates.mjs";

const POSTS_DIR = "content/site";

// ── CLI ──

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const REFRESH = args.includes("--refresh");
const STAGED = args.includes("--staged");
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

function addFrontmatterFields(raw, created, dateModified, refresh = false) {
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return null; // frontmatter 無し、スキップ

  let fmBody = fmMatch[1];
  const hasCreated = /^created:\s/m.test(fmBody);
  const hasDateModified = /^dateModified:\s/m.test(fmBody);

  let changed = false;
  if (refresh) {
    // 既存行を git 由来の値へ差し替える。値が同じなら触らない（無駄な diff を作らない）。
    if (hasCreated && created) {
      const next = fmBody.replace(/^created:.*$/m, `created: ${created}`);
      if (next !== fmBody) { fmBody = next; changed = true; }
    }
    if (hasDateModified && dateModified) {
      const next = fmBody.replace(/^dateModified:.*$/m, `dateModified: ${dateModified}`);
      if (next !== fmBody) { fmBody = next; changed = true; }
    }
  }

  const additions = [];
  if (!hasCreated && created) additions.push(`created: ${created}`);
  if (!hasDateModified && dateModified) additions.push(`dateModified: ${dateModified}`);

  if (additions.length === 0 && !changed) return null; // 変更なし

  // frontmatter body の末尾に追記（閉じ `---` の直前に挿入）
  const newFmBody = additions.length ? fmBody + "\n" + additions.join("\n") : fmBody;

  // slice ベースで安全に置換（regex 特殊文字対応）
  const startIdx = fmMatch.index;
  const endIdx = startIdx + fmMatch[0].length;
  const before = raw.slice(0, startIdx);
  const after = raw.slice(endIdx);
  return `${before}---\n${newFmBody}\n---${after}`;
}

// ── --staged（pre-commit 用） ──
//
// 日付の真実源は frontmatter なので、**commit の瞬間に書く**のがこの仕組みの中核。
// ここが無いと frontmatter は再び古びる（2026-08-22 の実測では 1,117 件中 1,040 件が
// 中央値 49 日ズレていた）。
//
// 部分 staging（git add -p）されたファイルは触らない。作業ツリーを書き換えて add し直すと
// **staged していない変更まで巻き込む**ため、警告だけ出して人に判断を委ねる。
function runStaged() {
  const git = (a) => execFileSync("git", ["-c", "core.quotepath=false", ...a], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const staged = git(["diff", "--cached", "--name-only", "--diff-filter=AM"])
    .split("\n").filter((p) => p.startsWith("content/site/") && p.endsWith(".mdx"));
  if (staged.length === 0) {
    console.log("[mdx-dates --staged] 対象 0 件（content/site の MDX を触っていない）");
    return 0;
  }
  // 部分 staging の検出: 作業ツリーと index が食い違うファイル
  const dirty = new Set(git(["diff", "--name-only"]).split("\n").filter(Boolean));
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10); // JST

  let bumped = 0, partial = 0, unchanged = 0;
  for (const file of staged) {
    if (dirty.has(file)) {
      partial++;
      console.warn(`[mdx-dates --staged] 部分 staging のため触らない: ${file}`);
      continue;
    }
    const { raw, eol } = readMdxFile(file);
    const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) continue;
    let fmBody = fmMatch[1];
    const before = fmBody;
    if (/^dateModified:\s/m.test(fmBody)) fmBody = fmBody.replace(/^dateModified:.*$/m, `dateModified: ${today}`);
    else fmBody = fmBody + "\n" + `dateModified: ${today}`;
    if (!/^created:\s/m.test(fmBody)) fmBody = fmBody + "\n" + `created: ${today}`;
    if (fmBody === before) { unchanged++; continue; }
    const out = raw.slice(0, fmMatch.index) + "---\n" + fmBody + "\n---" + raw.slice(fmMatch.index + fmMatch[0].length);
    writeMdxFile(file, out, eol);
    git(["add", "--", file]);
    bumped++;
  }
  console.log(`[mdx-dates --staged] staged ${staged.length} 件 / dateModified を ${today} へ更新 ${bumped} 件 / 据え置き ${unchanged} 件 / 部分 staging ${partial} 件`);
  if (partial > 0) {
    console.error("  部分 staging のファイルは dateModified が更新されていない。");
    console.error("  全体を staged にしてから commit し直すか、frontmatter を手で直すこと。");
  }
  return 0;
}

if (STAGED) {
  process.exit(runStaged());
}

// ── Main ──

console.log(`=== backfill-mdx-dates ${REFRESH ? "--refresh " : ""}${DRY_RUN ? "(DRY RUN)" : ""} ===`);
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
  const newRaw = addFrontmatterFields(raw, created, dateModified, REFRESH);

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
