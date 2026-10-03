#!/usr/bin/env node
/**
 * Generate WebP variants for PNG / JPG images (Issue #79)
 *
 * `content/site/**​/img/` 配下の画像を走査し、.webp を生成する。
 * 元の .png / .jpg は残す（<picture> fallback で使う）。
 *
 * Usage:
 *   node .claude/scripts/generate-webp.mjs              # 全画像を webp 化
 *   node .claude/scripts/generate-webp.mjs --dry-run    # 対象のみ表示
 *   node .claude/scripts/generate-webp.mjs --limit 10   # 最初の N 件
 *   node .claude/scripts/generate-webp.mjs --force      # 既存 webp も再生成
 *
 * 品質: webp quality=80（サイズ/見栄えのバランス点）
 */

import { statSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { extname, dirname, relative, sep } from "node:path";
import sharp from "sharp";
import { listFiles } from "../../scripts/lib/fs-walk.mjs";
import { REPO_ROOT, SITE_CONTENT_ROOT } from "../../scripts/lib/repository-paths.mjs";

const POSTS_DIR = SITE_CONTENT_ROOT;
const QUALITY = 80;
const SUPPORTED = new Set([".png", ".jpg", ".jpeg"]);

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity;

// img/ 配下のみ対象（ogp.png 等の記事直下ファイルは対象外。
// 走査自体は content/site を再帰するが、収集時に "img" セグメントを含むパスだけ採用する）
function isUnderImgDir(full) {
  return full.split(sep).includes("img");
}

function webpPath(src) {
  const ext = extname(src);
  return src.slice(0, -ext.length) + ".webp";
}

async function convertOne(src) {
  const dst = webpPath(src);
  if (!FORCE && existsSync(dst)) return { status: "skip-exists", src, dst };

  try {
    const srcBuf = readFileSync(src);
    const srcSize = srcBuf.length;
    const webpBuf = await sharp(srcBuf).webp({ quality: QUALITY }).toBuffer();

    if (!DRY_RUN) {
      writeFileSync(dst, webpBuf);
    }
    return {
      status: "converted",
      src,
      dst,
      srcSize,
      webpSize: webpBuf.length,
      ratio: webpBuf.length / srcSize,
    };
  } catch (err) {
    return { status: "error", src, error: err.message };
  }
}

// ── main ──

console.log(`=== generate-webp ${DRY_RUN ? "(DRY RUN)" : ""} ${FORCE ? "[FORCE]" : ""} ===`);
const files = listFiles(POSTS_DIR, {
  allowMissing: true,
  match: (full, name) => SUPPORTED.has(extname(name).toLowerCase()) && isUnderImgDir(relative(POSTS_DIR, full)),
}).slice(0, LIMIT);
console.log(`対象: ${files.length} ファイル (png/jpg/jpeg)`);

let converted = 0;
let skipped = 0;
let errors = 0;
let totalSrc = 0;
let totalWebp = 0;

// 逐次処理（CPU バウンド + メモリ節約）
for (let i = 0; i < files.length; i++) {
  const r = await convertOne(files[i]);
  if (r.status === "converted") {
    converted++;
    totalSrc += r.srcSize;
    totalWebp += r.webpSize;
  } else if (r.status === "skip-exists") {
    skipped++;
  } else {
    errors++;
    console.error(`[error] ${relative(REPO_ROOT, r.src).split("\\").join("/")}: ${r.error}`);
  }
  if ((i + 1) % 50 === 0) {
    console.log(`  ${i + 1} / ${files.length} processed (converted=${converted}, skipped=${skipped})`);
  }
}

console.log("");
console.log("=== サマリ ===");
console.log(`converted: ${converted}`);
console.log(`skipped (already exists): ${skipped}`);
console.log(`errors: ${errors}`);
if (converted > 0) {
  const srcMB = totalSrc / (1024 * 1024);
  const webpMB = totalWebp / (1024 * 1024);
  const reduction = ((1 - totalWebp / totalSrc) * 100).toFixed(1);
  console.log(
    `size: ${srcMB.toFixed(1)} MB → ${webpMB.toFixed(1)} MB (-${reduction}%)`,
  );
}
if (DRY_RUN) {
  console.log("\n[DRY RUN] 実際には書き込みませんでした。");
}
