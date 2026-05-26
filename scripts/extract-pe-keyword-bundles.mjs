#!/usr/bin/env node
/**
 * extract-pe-keyword-bundles.mjs
 *
 * `.local/r2/posts/pe-comprehensive-management/keyword-2026/article.mdx` から
 * L1 章・L2 セクション・L3/L4 太字グループ・キーワードの階層を抽出し、
 * `src/config/pe-keyword-bundles.json` に出力する。
 *
 * 抽出ルール:
 * - L1 章: `^## \d+\. <name>` (例: `## 2. 経済性管理`)
 * - L2 セクション: `^### \d+\.\d+ <name>` (例: `### 3.2 労働関係法と労務管理`)
 * - L3/L4 太字グループ: `^\*\*([^*]+)\*\*\s*$` (例: `**労働関係法**`)
 * - キーワード: `^\s*- \[<title>\](/docs/<full-slug>)` または `^\s*\[<title>\](/docs/<full-slug>)`
 * - 2 段目のネストリスト (例: `  - 法定労働時間`) は KW のサブ項目として無視
 *
 * Usage:
 *   node scripts/extract-pe-keyword-bundles.mjs
 *   node scripts/extract-pe-keyword-bundles.mjs --check  # 出力せず統計のみ
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCE_MDX = join(
  ROOT,
  ".local/r2/posts/pe-comprehensive-management/keyword-2026/article.mdx",
);
const OUTPUT_JSON = join(ROOT, "src/config/pe-keyword-bundles.json");
const SLUG_PREFIX = "pe-comprehensive-management-";

const CHAPTER_RE = /^## (\d+)\.\s+(.+?)\s*$/;
const SECTION_RE = /^### (\d+)\.(\d+)\s+(.+?)\s*$/;
const GROUP_RE = /^\*\*([^*]+)\*\*\s*$/;
const KW_RE = /^\s*[-]?\s*\[([^\]]+)\]\(\/docs\/([^)]+)\)/;

function parse(mdx) {
  const lines = mdx.split(/\r?\n/);
  const chapters = [];
  let currentChapter = null;
  let currentSection = null;
  let currentGroup = null;
  let inListNestLevel = 0; // 2 段目ネストを無視するための深度トラッキング

  for (const line of lines) {
    // L1 chapter
    let m = line.match(CHAPTER_RE);
    if (m) {
      // 「総合技術監理」は L1 だが KW を持たないので除外（先頭 1. のみ）
      if (m[1] === "1") {
        currentChapter = null;
      } else {
        currentChapter = {
          id: m[1],
          title: m[2],
          sections: [],
        };
        chapters.push(currentChapter);
      }
      currentSection = null;
      currentGroup = null;
      inListNestLevel = 0;
      continue;
    }

    // L2 section
    m = line.match(SECTION_RE);
    if (m) {
      if (!currentChapter) continue;
      currentSection = {
        id: `${m[1]}.${m[2]}`,
        title: m[3],
        groups: [],
      };
      currentChapter.sections.push(currentSection);
      currentGroup = null;
      inListNestLevel = 0;
      continue;
    }

    // L3/L4 group (太字行)
    m = line.match(GROUP_RE);
    if (m && currentSection) {
      currentGroup = {
        name: m[1],
        keywords: [],
      };
      currentSection.groups.push(currentGroup);
      inListNestLevel = 0;
      continue;
    }

    // Keyword (リスト先頭 or 裸リンク)
    // 2 段目ネスト (先頭スペース 2 以上の `- xxx`) は KW のサブ項目として無視する判定が必要
    const indentMatch = line.match(/^(\s*)-\s+/);
    if (indentMatch) {
      const indent = indentMatch[1].length;
      // 先頭 0 スペースの `- [title](url)` は KW
      // 先頭 2 スペース以上の `- xxx` は KW のサブ項目
      if (indent >= 2) {
        // ネスト項目は無視
        continue;
      }
    }

    // KW 抽出 (リスト or 裸リンク)
    m = line.match(KW_RE);
    if (m && currentSection) {
      const title = m[1].trim();
      const fullSlug = m[2].trim();
      // SLUG_PREFIX を取り除いて短縮 slug にする
      const slug = fullSlug.startsWith(SLUG_PREFIX)
        ? fullSlug.slice(SLUG_PREFIX.length)
        : fullSlug;

      // currentGroup が無い場合は「未分類」グループに格納
      let targetGroup = currentGroup;
      if (!targetGroup) {
        // 未分類グループは末尾に追加（同じセクション内で複数の裸リンクをまとめる）
        const last = currentSection.groups[currentSection.groups.length - 1];
        if (last && last.name === "_uncategorized") {
          targetGroup = last;
        } else {
          targetGroup = { name: "_uncategorized", keywords: [] };
          currentSection.groups.push(targetGroup);
        }
      }
      targetGroup.keywords.push({ slug, title });
    }
  }

  return chapters;
}

function summarize(chapters) {
  let totalSections = 0;
  let totalGroups = 0;
  let totalKws = 0;
  const groupSizeDistribution = { "1": 0, "2-5": 0, "6-10": 0, "11-20": 0, "21+": 0 };
  for (const ch of chapters) {
    for (const sec of ch.sections) {
      totalSections++;
      for (const g of sec.groups) {
        totalGroups++;
        totalKws += g.keywords.length;
        const n = g.keywords.length;
        if (n === 1) groupSizeDistribution["1"]++;
        else if (n <= 5) groupSizeDistribution["2-5"]++;
        else if (n <= 10) groupSizeDistribution["6-10"]++;
        else if (n <= 20) groupSizeDistribution["11-20"]++;
        else groupSizeDistribution["21+"]++;
      }
    }
  }
  return {
    chapters: chapters.length,
    sections: totalSections,
    groups: totalGroups,
    keywords: totalKws,
    groupSizeDistribution,
  };
}

function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");

  const mdx = readFileSync(SOURCE_MDX, "utf8");
  const chapters = parse(mdx);
  const stats = summarize(chapters);

  console.log("=== Extraction summary ===");
  console.log(JSON.stringify(stats, null, 2));

  console.log("\n=== Per-section breakdown ===");
  for (const ch of chapters) {
    console.log(`\n[${ch.id}] ${ch.title}`);
    for (const sec of ch.sections) {
      const totalKw = sec.groups.reduce((a, g) => a + g.keywords.length, 0);
      console.log(`  [${sec.id}] ${sec.title} — groups:${sec.groups.length}, kw:${totalKw}`);
      for (const g of sec.groups) {
        console.log(`    - ${g.name}: ${g.keywords.length} KW`);
      }
    }
  }

  if (checkOnly) {
    console.log("\n(--check mode: no file written)");
    return;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source:
      ".local/r2/posts/pe-comprehensive-management/keyword-2026/article.mdx",
    stats,
    chapters,
  };
  writeFileSync(OUTPUT_JSON, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`\n✅ Wrote ${OUTPUT_JSON}`);
}

main();
