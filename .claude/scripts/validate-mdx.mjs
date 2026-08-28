/**
 * MDX一括コンパイル検証スクリプト
 *
 * 全MDXファイルを @mdx-js/mdx でコンパイルし、エラーを検出する。
 * npm run build（2-5分）より高速（30秒程度）。
 *
 * Usage:
 *   npm run validate-mdx              # 全ファイル検証
 *   node .claude/scripts/validate-mdx.mjs path/to/file.mdx  # 単一ファイル
 */

import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import { join } from "path";
import matter from "gray-matter";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import { checkLineEndings as detectLineEndingIssue } from "../../scripts/lib/line-endings.mjs";

const CONTENT_DIR = "content/site";

// ── File scanner (from generate-search-index.mjs) ──

function scanMdxFiles(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      scanMdxFiles(fullPath, files);
    } else if (entry.endsWith(".mdx")) {
      files.push(fullPath);
    }
  }
  return files;
}

// ── Line ending check ──

// 検査ロジックは scripts/lib/line-endings.mjs（単一 SSOT・tests/line-endings.test.mjs で固定）
function checkLineEndings(content, filePath) {
  const issue = detectLineEndingIssue(content);
  return issue ? issue.message : null;
}

// ── MDX compile check (uses next-mdx-remote for parity with actual rendering) ──

async function compileMdx(content) {
  await compileMDX({
    source: content,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkMath, remarkGfm],
        rehypePlugins: [rehypeKatex],
      },
    },
  });
}

// ── Main ──

async function main() {
  const args = process.argv.slice(2);
  let files;

  if (args.length > 0) {
    // Validate specific files
    files = args.filter((f) => existsSync(f));
    if (files.length === 0) {
      console.error("No valid files provided.");
      process.exit(1);
    }
  } else {
    // Validate all MDX files
    files = scanMdxFiles(CONTENT_DIR);
  }

  console.log(`Validating ${files.length} MDX files...\n`);

  const errors = [];
  let checked = 0;

  for (const file of files) {
    checked++;
    const raw = readFileSync(file, "utf-8");

    // 1. Line ending check
    const lineEndingError = checkLineEndings(raw, file);
    if (lineEndingError) {
      errors.push({ file, error: lineEndingError });
      continue; // Skip compile if line endings are broken
    }

    // 2. MDX compile check
    try {
      const { content } = matter(raw);
      await compileMdx(content);
    } catch (e) {
      const msg = e.message || "Unknown error";
      // Extract the meaningful part of the error (skip the [next-mdx-remote] prefix)
      const meaningful = msg.replace(/^\[next-mdx-remote\] error compiling MDX:\s*/i, "").split("\n")[0];
      errors.push({ file, error: meaningful || msg.split("\n").slice(0, 3).join(" ") });
    }

    // Progress indicator (every 100 files)
    if (checked % 100 === 0) {
      process.stdout.write(`  ${checked}/${files.length} checked...\r`);
    }
  }

  // ── Results ──

  console.log(`\n${"=".repeat(60)}`);

  if (errors.length === 0) {
    console.log(`✓ All ${files.length} MDX files validated successfully.`);
    process.exit(0);
  } else {
    console.error(`✗ ${errors.length} error(s) found:\n`);
    for (const { file, error } of errors) {
      console.error(`  ${file}`);
      console.error(`    → ${error}\n`);
    }
    process.exit(1);
  }
}

main();
