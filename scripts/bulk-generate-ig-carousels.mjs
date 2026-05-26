#!/usr/bin/env node
/**
 * bulk-generate-ig-carousels.mjs
 *
 * 全 65 bundle のカルーセル PNG + caption.txt を一括生成する。
 *
 *   1. docs/sns/instagram/_section-bundles/<bundleId>/carousel/img/*.png
 *   2. docs/sns/instagram/_section-bundles/<bundleId>/caption.txt
 *
 * Usage:
 *   node scripts/bulk-generate-ig-carousels.mjs
 *   node scripts/bulk-generate-ig-carousels.mjs --size both  # reels も同時生成
 *   node scripts/bulk-generate-ig-carousels.mjs --only 2-2-5,2-2-7  # 特定 bundle のみ
 *   node scripts/bulk-generate-ig-carousels.mjs --skip-caption  # caption.txt をスキップ
 */

import { execSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BUNDLES_DIR = join(ROOT, "docs/sns/instagram/_section-bundles");
const IG_POST_CREATE = join(
  ROOT,
  ".claude/skills/social/ig-post-create/scripts/ig-post-create.mjs",
);
const CAPTION_GEN = join(ROOT, ".claude/scripts/instagram/generate-caption.cjs");

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const size = args.size || "carousel";
const skipCaption = Boolean(args["skip-caption"]);
const onlyList = args.only ? String(args.only).split(",").map((s) => s.trim()) : null;

const allBundles = readdirSync(BUNDLES_DIR).filter((d) => !d.startsWith("."));
const bundles = onlyList ? allBundles.filter((b) => onlyList.includes(b)) : allBundles;

console.log(`\n[bulk-generate] target: ${bundles.length} bundles  size: ${size}\n`);

const start = Date.now();
let okCount = 0;
let failCount = 0;
const failures = [];

for (let i = 0; i < bundles.length; i++) {
  const id = bundles[i];
  const idx = `[${i + 1}/${bundles.length}]`;
  const slideJson = join(BUNDLES_DIR, id, "slide-data.json");
  if (!existsSync(slideJson)) {
    console.warn(`${idx} ${id} — slide-data.json なし、スキップ`);
    continue;
  }
  try {
    process.stdout.write(`${idx} ${id} — generating PNG...`);
    const t0 = Date.now();
    execSync(
      `node "${IG_POST_CREATE}" --bundle ${id} --size ${size}`,
      { cwd: ROOT, stdio: "pipe" },
    );
    process.stdout.write(` PNG OK (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

    if (!skipCaption) {
      execSync(
        `node "${CAPTION_GEN}" "${slideJson}"`,
        { cwd: ROOT, stdio: "pipe" },
      );
      process.stdout.write(" + caption OK");
    }
    process.stdout.write("\n");
    okCount++;
  } catch (err) {
    process.stdout.write(" ❌ FAILED\n");
    console.error(`  ${err.message?.split("\n")[0] ?? err}`);
    failures.push({ id, error: String(err.message ?? err).slice(0, 200) });
    failCount++;
  }
}

const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(`\n=== Summary ===`);
console.log(`  OK:      ${okCount}/${bundles.length}`);
console.log(`  Failed:  ${failCount}`);
console.log(`  Elapsed: ${elapsed}s`);

if (failures.length > 0) {
  console.log(`\n--- Failures ---`);
  for (const f of failures) {
    console.log(`  ${f.id}: ${f.error}`);
  }
  process.exit(1);
}
