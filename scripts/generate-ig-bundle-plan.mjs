#!/usr/bin/env node
/**
 * generate-ig-bundle-plan.mjs
 *
 * `src/config/pe-keyword-bundles.json` を読み込み、Instagram カルーセル投稿の
 * 集約ルールを適用して投稿単位 (bundle) を計算する。
 *
 * 集約ルール:
 *  1. L2 セクションごとに L3/L4 グループを順に巡り、bundle を組み立てる
 *  2. グループの KW 数 N に応じて：
 *     - N ≤ 20 で現在の bundle に追加してもセクション内 KW 上限 (20) を超えない → 追加
 *     - 追加すると 20 超えるなら新 bundle に着手
 *     - N > 20 のグループは単独 bundle + 必要なら Part 1/2 に分割
 *  3. 同セクション内で複数 bundle になる場合は `<section> Part 1`, `Part 2` の名前付け
 *  4. 各 bundle の min/max KW を 10〜20 に収める（≤10 でも統合難な場合は許容）
 *
 * 出力: `src/config/ig-section-bundles.json`
 *
 * Usage:
 *   node scripts/generate-ig-bundle-plan.mjs
 *   node scripts/generate-ig-bundle-plan.mjs --check  # 統計のみ
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const INPUT_JSON = join(ROOT, "src/config/pe-keyword-bundles.json");
const OUTPUT_JSON = join(ROOT, "src/config/ig-section-bundles.json");

// IG カルーセル 20 枚上限から逆算
// 1 bundle = cover(1) + intro(1) + board×N + summary(1) + cta(1) = N + 4 ≤ 20
// → N ≤ 16
const MAX_KW_PER_BUNDLE = 16;
const SOFT_MAX_KW = 14; // ソフト上限。これを超えたら次 bundle へ
const MIN_KW_PER_BUNDLE = 5; // 最小サイズ目安（これ未満は隣接マージ希望）

function planSection(chapter, section) {
  const groups = section.groups;
  const totalKw = groups.reduce((a, g) => a + g.keywords.length, 0);

  // セクション全体が 20 以下 → 1 bundle にまとめる
  if (totalKw <= MAX_KW_PER_BUNDLE) {
    return [
      {
        bundleId: `${chapter.id}-${section.id}`,
        chapterTitle: chapter.title,
        sectionTitle: section.title,
        bundleTitle: section.title,
        groupNames: groups.map((g) => g.name).filter((n) => n !== "_uncategorized"),
        keywords: groups.flatMap((g) => g.keywords),
        partOf: null,
      },
    ];
  }

  // セクションが 20 超 → グループ単位で分割
  const bundles = [];
  let currentBundle = null;
  let partCounter = 1;

  function flush() {
    if (currentBundle && currentBundle.keywords.length > 0) {
      bundles.push(currentBundle);
      currentBundle = null;
    }
  }

  function startBundle() {
    currentBundle = {
      bundleId: `${chapter.id}-${section.id}-part${partCounter}`,
      chapterTitle: chapter.title,
      sectionTitle: section.title,
      bundleTitle: `${section.title} Part ${partCounter}`,
      groupNames: [],
      keywords: [],
      partOf: section.id,
    };
    partCounter++;
  }

  startBundle();

  for (const g of groups) {
    const n = g.keywords.length;

    // 巨大グループ (>SOFT_MAX_KW) は単独 bundle として分離
    if (n > SOFT_MAX_KW) {
      flush(); // それまでの bundle を確定

      // 巨大グループ自体を Part に分割 (≤20 ずつ)
      const chunkSize = MAX_KW_PER_BUNDLE;
      const chunks = Math.ceil(n / chunkSize);
      for (let i = 0; i < chunks; i++) {
        const slice = g.keywords.slice(i * chunkSize, (i + 1) * chunkSize);
        bundles.push({
          bundleId: `${chapter.id}-${section.id}-part${partCounter}`,
          chapterTitle: chapter.title,
          sectionTitle: section.title,
          bundleTitle: `${section.title}｜${g.name}${chunks > 1 ? ` (${i + 1}/${chunks})` : ""}`,
          groupNames: [g.name],
          keywords: slice,
          partOf: section.id,
        });
        partCounter++;
      }
      startBundle();
      continue;
    }

    // 既存 bundle に追加して上限超えないか
    if (currentBundle.keywords.length + n > SOFT_MAX_KW) {
      flush();
      startBundle();
    }
    if (g.name !== "_uncategorized") currentBundle.groupNames.push(g.name);
    currentBundle.keywords.push(...g.keywords);
  }

  flush();
  return bundles;
}

function summarize(bundles) {
  const sizes = bundles.map((b) => b.keywords.length);
  const dist = { "1-5": 0, "6-10": 0, "11-15": 0, "16-20": 0, "21+": 0 };
  for (const s of sizes) {
    if (s <= 5) dist["1-5"]++;
    else if (s <= 10) dist["6-10"]++;
    else if (s <= 15) dist["11-15"]++;
    else if (s <= 20) dist["16-20"]++;
    else dist["21+"]++;
  }
  return {
    totalBundles: bundles.length,
    totalKeywords: sizes.reduce((a, b) => a + b, 0),
    sizeDistribution: dist,
    minKw: Math.min(...sizes),
    maxKw: Math.max(...sizes),
    avgKw: (sizes.reduce((a, b) => a + b, 0) / bundles.length).toFixed(1),
  };
}

function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");

  const raw = JSON.parse(readFileSync(INPUT_JSON, "utf8"));
  const allBundles = [];
  for (const ch of raw.chapters) {
    for (const sec of ch.sections) {
      const planned = planSection(ch, sec);
      allBundles.push(...planned);
    }
  }

  const stats = summarize(allBundles);

  console.log("=== Bundle plan summary ===");
  console.log(JSON.stringify(stats, null, 2));

  console.log("\n=== Per-chapter bundle list ===");
  let lastChapter = null;
  for (const b of allBundles) {
    if (b.chapterTitle !== lastChapter) {
      console.log(`\n[${b.chapterTitle}]`);
      lastChapter = b.chapterTitle;
    }
    console.log(
      `  ${b.bundleId} — ${b.bundleTitle} (${b.keywords.length} KW)`,
    );
  }

  if (checkOnly) {
    console.log("\n(--check mode: no file written)");
    return;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "src/config/pe-keyword-bundles.json",
    config: {
      maxKwPerBundle: MAX_KW_PER_BUNDLE,
      softMaxKw: SOFT_MAX_KW,
      minKwPerBundle: MIN_KW_PER_BUNDLE,
    },
    stats,
    bundles: allBundles,
  };
  writeFileSync(OUTPUT_JSON, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`\n✅ Wrote ${OUTPUT_JSON}`);
}

main();
