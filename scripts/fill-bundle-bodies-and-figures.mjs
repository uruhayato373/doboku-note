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

/** 汎用 SEO テンプレートかを判定（IG では使い物にならない自動生成風文） */
const GENERIC_TEMPLATE_RES = [
  /の定義[、，].*?を.*?技術士総合技術監理.*?視点で整理/,
  /の定義[、，]種類[、，]実務上の要点[、，]関連用語/,
  /キーワード集.*?の.*?項目/,
];

function isGenericTemplate(text) {
  return GENERIC_TEMPLATE_RES.some((re) => re.test(text));
}

/** markdown 記号を除去して plain text に */
function stripMarkdown(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();
}

/** 本文から定義段落を抽出（## 定義 セクション直後の最初の段落） */
function extractDefinitionParagraph(content) {
  // ## 定義 or ### 定義 や、## 〜とは
  const sectionMatch = content.match(
    /^##+\s*(?:定義|.+?とは)\s*\n+([\s\S]+?)(?=\n##|\n#\s|$)/m,
  );
  if (sectionMatch) {
    const section = sectionMatch[1].trim();
    // 最初の段落（空行までor end）
    const para = section.split(/\n\s*\n/)[0].trim();
    const clean = stripMarkdown(para).replace(/\s+/g, "");
    if (clean.length < 20) return null;
    return clean.length > 140 ? clean.slice(0, 140) + "…" : clean;
  }
  return null;
}

/** frontmatter description を抽出（汎用テンプレなら null） */
function extractDescriptionFromMdx(mdxPath) {
  if (!existsSync(mdxPath)) return null;
  const content = readFileSync(mdxPath, "utf8");
  // frontmatter 抽出
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!fmMatch) return null;
  const fm = fmMatch[1];
  const descMatch = fm.match(/^description:\s*['"]?([\s\S]*?)['"]?\s*$/m);
  let desc = null;
  if (descMatch) {
    desc = descMatch[1].trim();
    desc = desc.replace(/^['"]/, "").replace(/['"]$/, "");
    desc = desc.replace(/\s*\n\s*/g, "");

    // 汎用テンプレなら本文抽出にフォールバック
    if (isGenericTemplate(desc)) {
      desc = null;
    } else {
      const sentences = desc.split(/。/).filter(Boolean);
      const filtered = sentences.filter(
        (s) =>
          !s.startsWith("技術士") &&
          !s.startsWith("総合技術監理") &&
          !s.includes("キーワード集") &&
          !s.includes("解説。"),
      );
      desc = filtered[0] ? filtered[0] + "。" : null;
    }
  }

  // 本文から定義段落抽出（description が使えない場合のフォールバック）
  if (!desc) {
    const bodyMatch = content.match(/^---\s*\n[\s\S]*?\n---\s*\n([\s\S]*)$/);
    if (bodyMatch) {
      desc = extractDefinitionParagraph(bodyMatch[1]);
    }
  }
  return desc;
}

/**
 * KW slug の SVG figure を検出。
 * article.mdx で本文中に参照されている SVG のみ採用（無関係な残骸 SVG を除外）。
 */
function findFigureSvg(slug) {
  const mdxPath = join(POSTS_DIR, slug, "article.mdx");
  if (!existsSync(mdxPath)) return null;
  const content = readFileSync(mdxPath, "utf8");
  // src 属性 + 該当 slug の img ディレクトリパスで一致
  const re = /src=["']([^"']*\.svg)["']/g;
  const matches = [...content.matchAll(re)];
  const relevant = matches.find((m) => m[1].includes(`/${slug}/img/`));
  if (!relevant) return null;
  let svgPath = relevant[1];
  // /posts/... を .local/r2/posts/... に正規化
  if (svgPath.startsWith("/posts/")) {
    svgPath = ".local/r2" + svgPath;
  } else if (svgPath.startsWith("posts/")) {
    svgPath = ".local/r2/" + svgPath;
  }
  return svgPath;
}

function processBundle(bundleDir, legacyMap) {
  const jsonPath = join(bundleDir, "slide-data.json");
  if (!existsSync(jsonPath)) return null;
  const data = JSON.parse(readFileSync(jsonPath, "utf8"));

  let bodyFromLegacy = 0;
  let bodyFromMdx = 0;
  let bodyStillEmpty = 0;
  let figureAdded = 0;
  let summaryFilled = 0;

  for (const slide of data.slides || []) {
    if (slide.type === "summary") {
      // summary の body 自動生成（空のときだけ）
      if (!slide.body || slide.body === "") {
        const sectionTitle = data._meta?.sectionTitle || data.cover?.subtitle || "";
        const kwCount = data._meta?.keywordCount || (data.slides || []).filter((s) => s.type === "board" || s.type === "figure").length;
        const chapterTitle = data._meta?.chapterTitle || "";
        slide.body = `${sectionTitle}の主要 ${kwCount} キーワードを${chapterTitle}視点で整理。\n試験前のチェックリストとして保存推奨。`;
        slide.noteText = "保存して試験前日に見返してください";
        summaryFilled++;
      }
      continue;
    }
    if (slide.type !== "board") continue;
    if (!slide.slug) continue;

    // 既存 body が汎用テンプレならクリア
    if (slide.body && isGenericTemplate(slide.body)) {
      slide.body = "";
    }

    // 1. body 充実
    if (!slide.body || slide.body === "") {
      const legacy = legacyMap.get(slide.slug);
      if (legacy?.body && !isGenericTemplate(legacy.body)) {
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

    // 2. SVG figure 統合（body 充実後・figure-*.svg のみ）
    const svgPath = findFigureSvg(slide.slug);
    if (svgPath) {
      const originalBody = slide.body || "";
      const noteSentences = originalBody.split(/[。\n]/).filter(Boolean);
      slide.type = "figure";
      slide.imagePath = svgPath;
      slide.note = noteSentences[0]
        ? noteSentences[0].slice(0, 90) + "。"
        : slide.heading;
      figureAdded++;
    }
  }

  return { bodyFromLegacy, bodyFromMdx, bodyStillEmpty, figureAdded, summaryFilled, data };
}

function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");

  console.log("Building legacy body map from _backlog/ ...");
  const legacyMap = buildLegacyBodyMap();
  console.log(`  Legacy body slugs: ${legacyMap.size}`);

  console.log("\nProcessing bundles ...");
  const bundleDirs = readdirSync(BUNDLES_DIR).filter((d) => !d.startsWith("."));

  let totLegacy = 0, totMdx = 0, totEmpty = 0, totFigure = 0, totSummary = 0;
  const reports = [];

  for (const bundleId of bundleDirs) {
    const bundleDir = join(BUNDLES_DIR, bundleId);
    const result = processBundle(bundleDir, legacyMap);
    if (!result) continue;
    totLegacy += result.bodyFromLegacy;
    totMdx += result.bodyFromMdx;
    totEmpty += result.bodyStillEmpty;
    totFigure += result.figureAdded;
    totSummary += result.summaryFilled;
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
  console.log(`  Figures (SVG figure-*):   ${totFigure}`);
  console.log(`  Summary auto-generated:   ${totSummary}`);

  if (checkOnly) {
    console.log("\n(--check mode: no files written)");
  } else {
    console.log(`\n✅ Updated ${bundleDirs.length} bundles' slide-data.json`);
  }
}

main();
