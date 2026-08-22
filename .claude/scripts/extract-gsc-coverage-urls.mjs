/**
 * GSC Coverage 分析テキストから ex0/ex1/ex2/ex3/ex4 の URL を抽出する
 *
 * 入力は GSC 非インデックス URL 分析のテキスト（ex0〜ex4 のカテゴリ別 URL を含むもの）。
 * 旧 Issue #28 は .claude/todo/ で追跡（GSC Coverage 改善）。
 *
 * Usage:
 *   node .claude/scripts/extract-gsc-coverage-urls.mjs \
 *     --input <gsc-coverage-analysis.txt> \
 *     --output-dir .tmp/gsc-urls/
 *
 * 出力:
 *   {output-dir}/ex0.txt, ex1.txt, ex2.txt, ex3.txt, ex4.txt, all.txt
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { input: null, outputDir: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--input") opts.input = args[++i];
    else if (args[i] === "--output-dir") opts.outputDir = args[++i];
  }
  if (!opts.input || !opts.outputDir) {
    console.error("Usage: --input <file> --output-dir <dir>");
    process.exit(2);
  }
  return opts;
}

function extractUrlsByCategory(text) {
  // 各カテゴリ section: ## ex{N}: ... → 次の ## ex{N+1}: または末尾
  const categories = { ex0: [], ex1: [], ex2: [], ex3: [], ex4: [] };
  const sectionRegex = /^##\s+(ex\d):/gm;

  // section の開始位置を全て見つける
  const sections = [];
  let match;
  while ((match = sectionRegex.exec(text)) !== null) {
    sections.push({ category: match[1], start: match.index });
  }

  // 各 section の URL を抽出（次の section までの範囲）
  for (let i = 0; i < sections.length; i++) {
    const cat = sections[i].category;
    if (!(cat in categories)) continue;
    const startIdx = sections[i].start;
    const endIdx = i + 1 < sections.length ? sections[i + 1].start : text.length;
    const sectionText = text.slice(startIdx, endIdx);

    // - https://doboku-note.com/... 行を抽出
    const urlRegex = /^\s*-\s+(https:\/\/doboku-note\.com\/\S+)/gm;
    let urlMatch;
    while ((urlMatch = urlRegex.exec(sectionText)) !== null) {
      categories[cat].push(urlMatch[1]);
    }
  }

  // 重複除去（同一 category 内）
  for (const cat of Object.keys(categories)) {
    categories[cat] = [...new Set(categories[cat])];
  }

  return categories;
}

function main() {
  const opts = parseArgs();
  if (!existsSync(opts.input)) {
    console.error(`Input not found: ${opts.input}`);
    process.exit(1);
  }
  if (!existsSync(opts.outputDir)) mkdirSync(opts.outputDir, { recursive: true });

  const text = readFileSync(opts.input, "utf-8");
  const categories = extractUrlsByCategory(text);

  const allUrls = new Set();
  let total = 0;
  for (const [cat, urls] of Object.entries(categories)) {
    const filepath = join(opts.outputDir, `${cat}.txt`);
    writeFileSync(filepath, urls.join("\n") + (urls.length ? "\n" : ""), "utf-8");
    console.log(`${cat}: ${urls.length} URLs → ${filepath}`);
    urls.forEach((u) => allUrls.add(u));
    total += urls.length;
  }

  const allFile = join(opts.outputDir, "all.txt");
  const allArr = [...allUrls];
  writeFileSync(allFile, allArr.join("\n") + "\n", "utf-8");
  console.log(`\nTotal (deduped): ${allArr.length} URLs → ${allFile}`);
  console.log(`Sum of categories (with potential duplicates across categories): ${total}`);
}

main();
