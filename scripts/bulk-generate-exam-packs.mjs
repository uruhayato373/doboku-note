#!/usr/bin/env node
/**
 * bulk-generate-exam-packs.mjs
 *
 * 過去問 4 問パック カルーセル PNG + caption.txt を一括生成。
 *
 * Usage:
 *   node scripts/bulk-generate-exam-packs.mjs --year r07          # R7 全パック
 *   node scripts/bulk-generate-exam-packs.mjs --all                # 全年度
 *   node scripts/bulk-generate-exam-packs.mjs --only r07-pack-01,r07-pack-02
 *   node scripts/bulk-generate-exam-packs.mjs --skip-caption
 *   node scripts/bulk-generate-exam-packs.mjs --year r07 --skip-lint
 *
 * pre-check:
 *   生成前に scripts/lint-exam-pack-structure.mjs を実行し、構造違反
 *   (E1: 列挙散文化 / E2: markdown 表残骸) があれば生成を中止する。
 *   緊急時のみ --skip-lint で迂回可能。
 */

import { execSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
// cem（総監）の年度パック専用。civil-1/civil-2 は年度括りを廃し「論点パック」へ移行済み
// （生成: .claude/scripts/sns/generate-civil-theme-packs.mjs ＋ render-civil-theme-packs.mjs）。
const EXAM_DIRS = {
  cem:      "cem/exam-packs",
};
const examKey = process.argv.find((a) => a.startsWith("--exam="))?.split("=")[1] || "cem";
const BASE = join(ROOT, "content/sns/instagram", EXAM_DIRS[examKey] ?? EXAM_DIRS.cem);
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
const yearArg = args.year;
const allFlag = Boolean(args.all);
const size = args.size || "carousel";
const skipCaption = Boolean(args["skip-caption"]);
const onlyList = args.only ? String(args.only).split(",").map((s) => s.trim()) : null;

if (!yearArg && !allFlag && !onlyList) {
  console.error("Usage: --year <r07|h21|...> or --all or --only <pack-id,...>");
  process.exit(1);
}

if (!existsSync(BASE)) {
  console.error(`Error: ${BASE} not found. Run generate-exam-pack-dirs.mjs first.`);
  process.exit(1);
}

// ─── pre-check: 構造 lint ─────────────────────────────────────
const skipLint = Boolean(args["skip-lint"]);
if (!skipLint) {
  const lintScript = join(__dirname, "lint-exam-pack-structure.mjs");
  if (existsSync(lintScript)) {
    const lintTarget = yearArg || (onlyList && onlyList[0]?.replace(/^(.+?)-pack-(\d+)$/, "$1/pack-$2")) || "";
    try {
      execSync(`node "${lintScript}" ${lintTarget}`, { stdio: "inherit" });
    } catch (e) {
      console.error("");
      console.error("✗ pre-check (lint) で構造違反を検出。生成を中止します。");
      console.error("  修正後に再実行するか、緊急時のみ --skip-lint で迂回してください。");
      process.exit(1);
    }
  }
}

const yearDirs = readdirSync(BASE).filter((d) => /^[hr]\d+$/.test(d));
const targetYears = allFlag ? yearDirs : yearDirs.filter((y) => y === yearArg);

const allPacks = [];
for (const year of targetYears.sort()) {
  const yearPath = join(BASE, year);
  const packs = readdirSync(yearPath).filter((p) => /^pack-\d+$/.test(p)).sort();
  for (const pack of packs) {
    const id = `${year}-${pack}`;
    if (onlyList && !onlyList.includes(id)) continue;
    allPacks.push({ id, year, pack });
  }
}
// onlyList のみ指定された場合（year/all 無し）
if (!yearArg && !allFlag && onlyList) {
  for (const id of onlyList) {
    const match = id.match(/^([hr]\d+)-(pack-\d+)$/);
    if (match) {
      if (!allPacks.find((p) => p.id === id)) {
        allPacks.push({ id, year: match[1], pack: match[2] });
      }
    }
  }
}

console.log(`\n[bulk-generate-exam-packs] target: ${allPacks.length} packs  size: ${size}\n`);

const start = Date.now();
let ok = 0;
let failed = 0;
const failures = [];

for (let i = 0; i < allPacks.length; i++) {
  const { id, year, pack } = allPacks[i];
  const idx = `[${i + 1}/${allPacks.length}]`;
  const slideJson = join(BASE, year, pack, "slide-data.json");
  if (!existsSync(slideJson)) {
    console.warn(`${idx} ${id} — slide-data.json なし、スキップ`);
    continue;
  }
  try {
    process.stdout.write(`${idx} ${id} — generating PNG...`);
    const t0 = Date.now();
    execSync(
      `node "${IG_POST_CREATE}" --exam ${id} --size ${size}`,
      { cwd: ROOT, stdio: "pipe" },
    );
    process.stdout.write(` PNG OK (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    if (!skipCaption) {
      // carousel/caption.txt と reels/caption.txt の両方を生成
      execSync(
        `node "${CAPTION_GEN}" "${slideJson}" --format carousel`,
        { cwd: ROOT, stdio: "pipe" },
      );
      execSync(
        `node "${CAPTION_GEN}" "${slideJson}" --format reels`,
        { cwd: ROOT, stdio: "pipe" },
      );
      process.stdout.write(" + caption OK (carousel+reels)");
    }
    process.stdout.write("\n");
    ok++;
  } catch (err) {
    process.stdout.write(" ❌ FAILED\n");
    console.error(`  ${err.message?.split("\n")[0] ?? err}`);
    failures.push({ id, error: String(err.message ?? err).slice(0, 200) });
    failed++;
  }
}

const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(`\n=== Summary ===`);
console.log(`  OK:      ${ok}/${allPacks.length}`);
console.log(`  Failed:  ${failed}`);
console.log(`  Elapsed: ${elapsed}s`);

if (failures.length > 0) {
  console.log(`\n--- Failures ---`);
  for (const f of failures) {
    console.log(`  ${f.id}: ${f.error}`);
  }
  process.exit(1);
}
