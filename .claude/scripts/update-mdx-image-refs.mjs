#!/usr/bin/env node
/**
 * Update MDX image refs to point at .webp variants (Issue #79)
 *
 * MDX 内の `<img src="...png">` / `<ArticleImage src="...png">` を `.webp` へ
 * 一括置換する。対応拡張子: .png, .jpg, .jpeg（.svg, .gif は変換対象外）。
 *
 * 前提: generate-webp.mjs で全画像の .webp 版が既に生成されていること。
 *
 * Usage:
 *   node .claude/scripts/update-mdx-image-refs.mjs            # 実行
 *   node .claude/scripts/update-mdx-image-refs.mjs --dry-run  # 差分確認のみ
 *
 * 安全性:
 * - .svg / .gif 参照は触らない
 * - /posts/ 以下の src のみ書き換え（外部 URL は触らない）
 * - mdx-io.mjs 経由で CRLF 保持
 */

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { transformMdxFile } from "./lib/mdx-io.mjs";

const POSTS_DIR = "content/site";
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");

function findMdxFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      findMdxFiles(full, out);
    } else if (entry.name.endsWith(".mdx")) {
      out.push(full);
    }
  }
  return out;
}

// src="..." の中で /posts/... の png / jpg / jpeg を .webp に置換
// - ダブルクォートのみ対象（シングル・バッククォートは稀なので未対応）
// - 末尾 "（閉じ引用符）を残す
const IMG_SRC_PATTERN = /(src=")(\/posts\/[^"]+)(\.(png|jpg|jpeg))(")/g;

function replaceRefs(raw) {
  let count = 0;
  const newRaw = raw.replace(IMG_SRC_PATTERN, (match, pre, path, ext, extInner, post) => {
    count++;
    return `${pre}${path}.webp${post}`;
  });
  return { newRaw, count };
}

// ── main ──

console.log(`=== update-mdx-image-refs ${DRY_RUN ? "(DRY RUN)" : ""} ===`);
const files = findMdxFiles(POSTS_DIR);
console.log(`対象 MDX: ${files.length}`);

let changedFiles = 0;
let totalReplacements = 0;

for (const file of files) {
  let fileReplacements = 0;
  const written = transformMdxFile(file, (raw) => {
    const { newRaw, count } = replaceRefs(raw);
    fileReplacements = count;
    if (count === 0) return null;
    if (DRY_RUN) return null; // dry-run: 変更せず終了
    return newRaw;
  });
  if (fileReplacements > 0) {
    changedFiles++;
    totalReplacements += fileReplacements;
    if (fileReplacements >= 5) {
      console.log(`  ${file}: ${fileReplacements} refs`);
    }
  }
}

console.log("");
console.log("=== サマリ ===");
console.log(`changed files: ${changedFiles}`);
console.log(`total replacements: ${totalReplacements}`);
if (DRY_RUN) {
  console.log("\n[DRY RUN] 実際には書き込みませんでした。");
}
