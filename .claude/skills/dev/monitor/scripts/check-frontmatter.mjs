/**
 * frontmatter 必須フィールド漏れ検出スクリプト
 * Monitor tool用: stdoutの各行がイベント通知になる
 *
 * Usage:
 *   node scripts/monitors/check-frontmatter.mjs [interval_sec]
 */

import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import { join } from "path";
import matter from "gray-matter";

const CONTENT_DIR = "content/site";
const REQUIRED_FIELDS = ["title", "description", "category", "tags", "published"];
const INTERVAL = (parseInt(process.argv[2]) || 60) * 1000;

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

function checkFrontmatter() {
  const files = scanMdxFiles(CONTENT_DIR);
  const issues = [];

  for (const file of files) {
    try {
      const raw = readFileSync(file, "utf-8");
      const { data } = matter(raw);
      const missing = REQUIRED_FIELDS.filter((k) => data[k] === undefined);
      if (missing.length > 0) {
        issues.push({ file, missing });
      }
    } catch {
      issues.push({ file, missing: ["PARSE_ERROR"] });
    }
  }

  if (issues.length > 0) {
    console.log(`FRONTMATTER ISSUES: ${issues.length} file(s)`);
    for (const { file, missing } of issues.slice(0, 15)) {
      console.log(`  ${file}: missing ${missing.join(", ")}`);
    }
    if (issues.length > 15) {
      console.log(`  ... and ${issues.length - 15} more`);
    }
  }
}

console.log(
  `Monitoring frontmatter (${REQUIRED_FIELDS.join(", ")}) every ${INTERVAL / 1000}s...`
);

// 初回即実行
checkFrontmatter();

setInterval(checkFrontmatter, INTERVAL);
