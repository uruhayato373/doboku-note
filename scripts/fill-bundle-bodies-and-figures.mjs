#!/usr/bin/env node
/**
 * fill-bundle-bodies-and-figures.mjs
 *
 * 全 65 bundle の slide-data.json を以下のハイブリッド方式で充実させる:
 *
 *  1. body 充実（優先順位）:
 *     a) 旧 _backlog の slug→body マップ（運営者既執筆・最高品質）
 *     b) サイト記事 article.mdx の frontmatter description（自動要約）
 *     c) サイト記事の最初の定義段落（フォールバック）
 *
 *  2. SVG figure 統合:
 *     KW slug に `.local/r2/posts/pe-comprehensive-management/<slug>/img/*.svg` が
 *     存在する場合、該当 board slide を figure type に切替え、imagePath を設定。
 *     これで PNG カルーセルに視覚化されたスライドが含まれる。
 *
 * Usage:
 *   node scripts/fill-bundle-bodies-and-figures.mjs
 *   node scripts/fill-bundle-bodies-and-figures.mjs --check  # 統計のみ
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const POSTS_DIR = join(ROOT, ".local/r2/posts/pe-comprehensive-management");
const BACKLOG_DIR = join(ROOT, "docs/sns/instagram/_backlog");
const BUNDLES_DIR = join(ROOT, "docs/sns/instagram/_section-bundles");

/** 旧 _backlog から slug → { body, noteText } マップ生成 */
function buildLegacyBodyMap() {
  const map = new Map();
  if (!existsSync(BACKLOG_DIR)) return map;
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
        const definition = slides.find((s) => s.type === "board") || slides[0];
        if (!definition || !definition.body) continue;
        const existing = map.get(slug);
        if (!existing || draftName > existing.draftName) {
          map.set(slug, {
            body: definition.body,
            noteText: definition.noteText || definition.note || "",
            draftName,
          });
        }
      } catch {}
    }
  }
  return map;
}

/** frontmatter description を抽出（短く整形） */
function extractDescriptionFromMdx(mdxPath) {
  if (!existsSync(mdxPath)) return null;
  const content = readFileSync(mdxPath, "utf8");
  // frontmatter 抽出
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!fmMatch) return null;
  const fm = fmMatch[1];
  // description: "..." or description: '...' or description: >- ... のいずれか
  const descMatch = fm.match(/^description:\s*['"]?([\s\S]*?)['"]?\s*$/m);
  if (!descMatch) return null;
  let desc = descMatch[1].trim();
  // 引用符を除去
  desc = desc.replace(/^['"]/, "").replace(/['"]$/, "");
  // 改行を吸収
  desc = desc.replace(/\s*\n\s*/g, "");
  // 末尾の付加情報（「。技術士〜キーワード集2026（〜）」等）を削除し最初の主要文だけ採用
  // 例: "ハインリッヒの法則の定義・1:29:300の比率・安全管理への応用を解説。技術士総合技術監理キーワード集2026（安全管理）。"
  //   → "ハインリッヒの法則の定義・1:29:300の比率・安全管理への応用を解説。"
  const sentences = desc.split(/。/).filter(Boolean);
  if (sentences.length === 0) return null;
  // 最初の文だけ採用（「技術士〜」「総合技術監理〜」で始まる文は除外）
  const filtered = sentences.filter(
    (s) => !s.startsWith("技術士") && !s.startsWith("総合技術監理"),
  );
  return (filtered[0] || sentences[0]) + "。";
}

/** KW slug の SVG figure を 1 つ検出（複数あれば最初の 1 つ） */
function findFigureSvg(slug) {
  const imgDir = join(POSTS_DIR, slug, "img");
  if (!existsSync(imgDir)) return null;
  const files = readdirSync(imgDir).filter((f) => /\.svg$/i.test(f));
  if (files.length === 0) return null;
  // 関連性が高そうな figure-*.svg を優先、なければ最初の SVG
  const priority = files.find((f) => f.startsWith("figure-")) || files[0];
  return `.local/r2/posts/pe-comprehensive-management/${slug}/img/${priority}`;
}

function processBundle(bundleDir, legacyMap) {
  const jsonPath = join(bundleDir, "slide-data.json");
  if (!existsSync(jsonPath)) return null;
  const data = JSON.parse(readFileSync(jsonPath, "utf8"));

  let bodyFromLegacy = 0;
  let bodyFromMdx = 0;
  let bodyStillEmpty = 0;
  let figureAdded = 0;

  for (const slide of data.slides || []) {
    if (slide.type !== "board") continue;
    if (!slide.slug) continue;

    // 1. body 充実
    if (!slide.body || slide.body === "") {
      const legacy = legacyMap.get(slide.slug);
      if (legacy?.body) {
        slide.body = legacy.body;
        if (legacy.noteText) slide.noteText = legacy.noteText;
        bodyFromLegacy++;
      } else {
        const mdxPath = join(POSTS_DIR, slide.slug, "article.mdx");
        const summary = extractDescriptionFromMdx(mdxPath);
        if (summary) {
          slide.body = summary;
          bodyFromMdx++;
        } else {
          bodyStillEmpty++;
        }
      }
    }

    // 2. SVG figure 統合（body 充実後）
    const svgPath = findFigureSvg(slide.slug);
    if (svgPath) {
      // board → figure に切替
      const originalBody = slide.body || "";
      // 100 字程度の note に圧縮（最初の 1 文または 100 字）
      const noteSentences = originalBody.split(/[。\n]/).filter(Boolean);
      slide.type = "figure";
      slide.imagePath = svgPath;
      slide.note = noteSentences[0]
        ? noteSentences[0].slice(0, 90) + "。"
        : slide.heading;
      figureAdded++;
    }
  }

  return { bodyFromLegacy, bodyFromMdx, bodyStillEmpty, figureAdded, data };
}

function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");

  console.log("Building legacy body map from _backlog/ ...");
  const legacyMap = buildLegacyBodyMap();
  console.log(`  Legacy body slugs: ${legacyMap.size}`);

  console.log("\nProcessing bundles ...");
  const bundleDirs = readdirSync(BUNDLES_DIR).filter((d) => !d.startsWith("."));

  let totLegacy = 0, totMdx = 0, totEmpty = 0, totFigure = 0;
  const reports = [];

  for (const bundleId of bundleDirs) {
    const bundleDir = join(BUNDLES_DIR, bundleId);
    const result = processBundle(bundleDir, legacyMap);
    if (!result) continue;
    totLegacy += result.bodyFromLegacy;
    totMdx += result.bodyFromMdx;
    totEmpty += result.bodyStillEmpty;
    totFigure += result.figureAdded;
    reports.push({ bundleId, ...result });

    if (!checkOnly) {
      writeFileSync(
        join(bundleDir, "slide-data.json"),
        JSON.stringify(result.data, null, 2) + "\n",
        "utf8",
      );
    }
  }

  console.log(`\nSummary:`);
  console.log(`  Bundles processed: ${bundleDirs.length}`);
  console.log(`  Body filled from legacy:  ${totLegacy}`);
  console.log(`  Body filled from MDX:     ${totMdx}`);
  console.log(`  Body still empty:         ${totEmpty}`);
  console.log(`  Figures (SVG) added:      ${totFigure}`);

  if (checkOnly) {
    console.log("\n(--check mode: no files written)");
  } else {
    console.log(`\n✅ Updated ${bundleDirs.length} bundles' slide-data.json`);
  }
}

main();
