#!/usr/bin/env node
/**
 * R2 同期スクリプト（GitHub Actions 用）
 *
 * 既存の CLOUDFLARE_API_TOKEN + wrangler CLI で R2 にアップロードする。
 * ローカル `.local/r2/posts/**\/img/*` を R2 の `posts/...` に同期。
 *
 * Usage:
 *   node .github/scripts/r2-sync.mjs [--mode=all|diff] [--dry-run]
 *
 * Modes:
 *   - all:  `.local/r2/posts/` 配下の全画像を upload（初回・手動）
 *   - diff: git の前 commit との差分を upload（push トリガー用）
 *
 * Env:
 *   CLOUDFLARE_API_TOKEN  wrangler 認証用（R2 Edit 権限が必要）
 *   CLOUDFLARE_ACCOUNT_ID
 *   DRY_RUN               "true" でアップロード skip
 *   BASE_SHA              diff モード時の比較先 SHA（デフォルト: HEAD^）
 *   HEAD_SHA              diff モード時の現在 SHA（デフォルト: HEAD）
 */

import { execSync } from "child_process";
import { globSync } from "glob";
import { statSync } from "fs";
import path from "path";

const BUCKET = "doboku-note";
const CONCURRENCY = 10;

const args = process.argv.slice(2);
const mode = args.find((a) => a.startsWith("--mode="))?.split("=")[1] || "all";
const dryRunArg = args.includes("--dry-run");
const dryRunEnv = process.env.DRY_RUN === "true";
const DRY_RUN = dryRunArg || dryRunEnv;

const IMAGE_EXT = /\.(svg|png|jpe?g|gif|webp)$/i;

function log(msg) {
  console.log(`[r2-sync] ${msg}`);
}

/** 対象ファイル一覧を取得 */
function listFiles() {
  if (mode === "diff") {
    const base = process.env.BASE_SHA || "HEAD^";
    const head = process.env.HEAD_SHA || "HEAD";
    log(`diff mode: ${base}..${head}`);
    try {
      const output = execSync(
        `git diff --name-only --diff-filter=ACMR ${base}..${head} -- '.local/r2/posts/**/img/**'`,
        { encoding: "utf-8" }
      );
      return output
        .trim()
        .split("\n")
        .filter(Boolean)
        .filter((f) => IMAGE_EXT.test(f));
    } catch (e) {
      log(`git diff failed (${e.message}), falling back to all mode`);
    }
  }
  log("all mode: scanning .local/r2/posts/**/img/**");
  return globSync(".local/r2/posts/**/img/**/*", { nodir: true }).filter((f) =>
    IMAGE_EXT.test(f)
  );
}

/** ローカルパスを R2 のキーに変換: .local/r2/posts/.../file → posts/.../file */
function toR2Key(localPath) {
  const normalized = localPath.replace(/\\/g, "/");
  return normalized.replace(/^\.local\/r2\//, "");
}

/** 1 ファイルを wrangler でアップロード */
async function uploadOne(file) {
  const key = toR2Key(file);
  if (DRY_RUN) {
    console.log(`DRY-RUN  ${key}`);
    return { ok: true, key, dryRun: true };
  }
  try {
    // wrangler r2 object put <bucket>/<key> --file=<path> --remote
    const cmd = `wrangler r2 object put "${BUCKET}/${key}" --file="${file}" --remote`;
    execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, key };
  } catch (e) {
    return { ok: false, key, error: e.message };
  }
}

/** 並列アップロード（セマフォ方式） */
async function uploadAll(files) {
  const results = [];
  const queue = [...files];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const file = queue.shift();
      if (!file) break;
      const result = await uploadOne(file);
      results.push(result);
      const pct = ((results.length / files.length) * 100).toFixed(1);
      if (result.ok) {
        console.log(`[${results.length}/${files.length} ${pct}%] ${result.dryRun ? "DRY" : "OK "} ${result.key}`);
      } else {
        console.error(`[${results.length}/${files.length}] FAIL ${result.key}: ${result.error.slice(0, 100)}`);
      }
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  if (!process.env.CLOUDFLARE_API_TOKEN) {
    console.error("Error: CLOUDFLARE_API_TOKEN not set");
    process.exit(1);
  }

  log(`mode=${mode} dry-run=${DRY_RUN} concurrency=${CONCURRENCY}`);

  const files = listFiles();
  log(`found ${files.length} image file(s) to sync`);

  if (files.length === 0) {
    log("nothing to sync, exiting");
    return;
  }

  if (files.length > 0 && files.length <= 20) {
    log("files:");
    files.forEach((f) => console.log(`  ${toR2Key(f)}`));
  }

  const startMs = Date.now();
  const results = await uploadAll(files);
  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);

  const ok = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;

  log(`done: ${ok} ok / ${fail} fail / ${elapsed}s`);

  if (fail > 0) {
    console.error(`\nFailed files:`);
    for (const r of results.filter((r) => !r.ok)) {
      console.error(`  ${r.key}: ${r.error?.slice(0, 200)}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(`Fatal: ${e.message}`);
  process.exit(1);
});
