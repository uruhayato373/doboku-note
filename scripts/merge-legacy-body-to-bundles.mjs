#!/usr/bin/env node
/**
 * merge-legacy-body-to-bundles.mjs
 *
 * `docs/sns/instagram/_backlog/**\/slide-data.json` から各 KW slug に対応する
 * 「定義」board slide (cover に対応する本体) を抽出し、新 bundle の slide-data.json の
 * 該当 KW slide の `body` / `noteText` に埋め込む。
 *
 * 抽出ロジック:
 *  - ディレクトリ名 `YYYY-MM-DD-<slug>/` から KW slug を抽出
 *  - slides 配列の最初の type=board (なければ最初の slide) を「定義」とする
 *  - cover.keyword をタイトル参考にする
 *
 * Usage:
 *   node scripts/merge-legacy-body-to-bundles.mjs
 *   node scripts/merge-legacy-body-to-bundles.mjs --check  # 統計のみ
 *   node scripts/merge-legacy-body-to-bundles.mjs --dry-run  # 書き込まずシミュレート
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BACKLOG_DIR = join(ROOT, "docs/sns/instagram/_backlog");
const BUNDLES_DIR = join(ROOT, "docs/sns/instagram/_section-bundles");

/**
 * _backlog 配下を走査して slug → { body, noteText, source } のマップを構築
 */
function buildSlugBodyMap() {
  const map = new Map();
  const years = readdirSync(BACKLOG_DIR).filter((d) => /^\d{4}$/.test(d));

  for (const year of years) {
    const yearDir = join(BACKLOG_DIR, year);
    const drafts = readdirSync(yearDir).filter((d) => /^\d{4}-\d{2}-\d{2}-/.test(d));

    for (const draftName of drafts) {
      const slug = draftName.replace(/^\d{4}-\d{2}-\d{2}-/, "");
      const jsonPath = join(yearDir, draftName, "slide-data.json");
      if (!existsSync(jsonPath)) continue;

      try {
        const data = JSON.parse(readFileSync(jsonPath, "utf8"));
        const slides = data.slides || [];
        // 最初の board slide を「定義」slide として採用
        const definition = slides.find((s) => s.type === "board") || slides[0];
        if (!definition || !definition.body) continue;

        // 同じ slug の旧投稿が複数ある場合は最新（日付順）で上書き
        const existing = map.get(slug);
        if (!existing || draftName > existing.draftName) {
          map.set(slug, {
            body: definition.body,
            noteText: definition.noteText || definition.note || "",
            source: `_backlog/${year}/${draftName}`,
            draftName,
            originalHeading: definition.heading,
          });
        }
      } catch (err) {
        console.warn(`[warn] failed to parse ${jsonPath}: ${err.message}`);
      }
    }
  }
  return map;
}

/**
 * 各 bundle の slide-data.json を読み、KW slide の body を埋める
 */
function mergeIntoBundle(bundleDir, slugMap, dryRun) {
  const jsonPath = join(bundleDir, "slide-data.json");
  if (!existsSync(jsonPath)) return null;

  const data = JSON.parse(readFileSync(jsonPath, "utf8"));
  let filled = 0;
  let missing = 0;
  const missingSlugs = [];

  for (const slide of data.slides || []) {
    if (slide.type !== "board" || !slide.slug) continue;
    const legacy = slugMap.get(slide.slug);
    if (legacy) {
      slide.body = legacy.body;
      slide.noteText = legacy.noteText;
      slide._legacySource = legacy.source;
      filled++;
    } else {
      missing++;
      missingSlugs.push(slide.slug);
    }
  }

  if (!dryRun && filled > 0) {
    writeFileSync(jsonPath, JSON.stringify(data, null, 2) + "\n", "utf8");
  }

  return { filled, missing, missingSlugs };
}

function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");
  const dryRun = args.includes("--dry-run") || checkOnly;

  console.log("Phase 1: Building slug → body map from _backlog/ ...");
  const slugMap = buildSlugBodyMap();
  console.log(`  Found ${slugMap.size} unique KW slugs with body content`);

  console.log("\nPhase 2: Merging into _section-bundles/ ...");
  const bundleDirs = readdirSync(BUNDLES_DIR).filter((d) => !d.startsWith("."));
  let totalFilled = 0;
  let totalMissing = 0;
  const allMissing = new Set();
  const perBundle = [];

  for (const bundleId of bundleDirs) {
    const result = mergeIntoBundle(join(BUNDLES_DIR, bundleId), slugMap, dryRun);
    if (!result) continue;
    totalFilled += result.filled;
    totalMissing += result.missing;
    result.missingSlugs.forEach((s) => allMissing.add(s));
    perBundle.push({ bundleId, ...result });
  }

  console.log(`\nSummary:`);
  console.log(`  Bundles processed: ${bundleDirs.length}`);
  console.log(`  KW slides filled:  ${totalFilled}`);
  console.log(`  KW slides missing: ${totalMissing}`);
  console.log(`  Unique missing slugs: ${allMissing.size}`);

  if (totalMissing > 0) {
    console.log(`\nMissing slugs (sample 20):`);
    [...allMissing].slice(0, 20).forEach((s) => console.log(`  - ${s}`));
  }

  if (dryRun) {
    console.log("\n(dry-run mode: no files written)");
  } else {
    console.log(`\n✅ Wrote merged data to ${bundleDirs.length} bundles`);
  }
}

main();
