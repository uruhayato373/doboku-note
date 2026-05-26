#!/usr/bin/env node
/**
 * generate-ig-bundle-dirs.mjs
 *
 * `src/config/ig-section-bundles.json` の 51 bundle を読み込み、各 bundle に対して
 * `docs/sns/instagram/section-bundles/<bundle-dir>/slide-data.json` を生成する。
 *
 * 命名規約: bundle.bundleId の `.` を `-` に置換 (例: `2-2.1-part1` → `2-2-1-part1`)
 * → Windows / git で扱いやすく
 *
 * slide-data.json テンプレート構成:
 *   cover    : bundle のセクション情報 (chapter / section / part / management 色)
 *   intro    : この投稿で学ぶ KW 一覧 (1 slide)
 *   keywords : 各 KW について 1 slide のテンプレート (heading=KW.title, body="")
 *   summary  : まとめ + CTA (1 slide)
 *   cta      : 関連リンク (bundle 内 KW の上位 4)
 *
 * Usage:
 *   node scripts/generate-ig-bundle-dirs.mjs
 *   node scripts/generate-ig-bundle-dirs.mjs --check  # 出力せず統計のみ
 *   node scripts/generate-ig-bundle-dirs.mjs --force  # 既存ファイル上書き
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const INPUT_JSON = join(ROOT, "src/config/ig-section-bundles.json");
const OUTPUT_DIR = join(ROOT, "docs/sns/instagram/_section-bundles");

const CHAPTER_TO_MANAGEMENT = {
  経済性管理: "economy",
  人的資源管理: "hr",
  情報管理: "info",
  安全管理: "safety",
  社会環境管理: "environment",
};

function bundleIdToDir(bundleId) {
  // `2-2.1-part1` → `2-2-1-part1`
  return bundleId.replace(/\./g, "-");
}

function makeSlideData(bundle) {
  const management = CHAPTER_TO_MANAGEMENT[bundle.chapterTitle] || "unknown";
  const groupSummary = (bundle.groupNames || []).filter((g) => g && g !== "_uncategorized").join("・");

  const slides = [
    {
      type: "intro",
      heading: "この投稿で学ぶこと",
      body: bundle.keywords.map((k) => k.title).join("、"),
      noteText: `${bundle.chapterTitle} ${bundle.sectionTitle}${groupSummary ? `（${groupSummary}）` : ""}`,
    },
    ...bundle.keywords.map((kw) => ({
      type: "board",
      heading: kw.title,
      body: "",
      noteText: "",
      slug: kw.slug,
    })),
    {
      type: "summary",
      heading: "まとめ｜試験のポイント",
      body: "",
      noteText: "保存して試験前日に見返してください",
    },
  ];

  return {
    cover: {
      keyword: bundle.bundleTitle,
      subtitle: bundle.sectionTitle,
      stickyText: `${bundle.chapterTitle}\n${bundle.keywords.length}KW`,
      management,
    },
    slides,
    cta: {
      related: bundle.keywords.slice(0, 4).map((k) => k.title),
    },
    _meta: {
      bundleId: bundle.bundleId,
      chapterTitle: bundle.chapterTitle,
      sectionTitle: bundle.sectionTitle,
      groupNames: bundle.groupNames || [],
      keywordCount: bundle.keywords.length,
      partOf: bundle.partOf || null,
    },
  };
}

function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");
  const force = args.includes("--force");

  const raw = JSON.parse(readFileSync(INPUT_JSON, "utf8"));
  const bundles = raw.bundles;

  let created = 0;
  let skipped = 0;

  for (const b of bundles) {
    const dirName = bundleIdToDir(b.bundleId);
    const bundleDir = join(OUTPUT_DIR, dirName);
    const targetFile = join(bundleDir, "slide-data.json");

    if (existsSync(targetFile) && !force) {
      skipped++;
      continue;
    }

    if (!checkOnly) {
      mkdirSync(bundleDir, { recursive: true });
      mkdirSync(join(bundleDir, "carousel", "img"), { recursive: true });
      mkdirSync(join(bundleDir, "reels"), { recursive: true });

      const slideData = makeSlideData(b);
      writeFileSync(targetFile, JSON.stringify(slideData, null, 2) + "\n", "utf8");
    }
    created++;
  }

  console.log(`Bundles: ${bundles.length}`);
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped} (existing, use --force to overwrite)`);

  if (checkOnly) {
    console.log("(--check mode: no files written)");
    return;
  }

  console.log(`\n✅ Generated under ${OUTPUT_DIR}`);
}

main();
