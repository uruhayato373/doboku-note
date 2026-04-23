#!/usr/bin/env node
/**
 * /audit-exam-explanations CLI
 *
 * 過去問 MDX の破損解説を全件スキャンし、.claude/state/broken-explanations.json を出力。
 *
 * Usage:
 *   node .claude/skills/quality/check-mdx/scripts/rules/explanations/audit.mjs
 *   node .claude/skills/quality/check-mdx/scripts/rules/explanations/audit.mjs --category=civil-construction-1
 *   node .claude/skills/quality/check-mdx/scripts/rules/explanations/audit.mjs --topic=港則法
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { globSync } from "glob";
import matter from "gray-matter";
import { detectBrokenExplanations, PATTERNS } from "./detect.mjs";

const CATEGORY_GLOBS = {
  "civil-construction-1":
    ".local/r2/posts/civil-construction-1/{primary,secondary}-*/article.mdx",
  "pe-comprehensive-management":
    ".local/r2/posts/pe-comprehensive-management/r*-primary/article.mdx",
};

function parseArgs(argv) {
  const args = { category: "civil-construction-1", topic: null };
  for (const a of argv.slice(2)) {
    const [k, v] = a.split("=");
    if (k === "--category") args.category = v;
    else if (k === "--topic") args.topic = v;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  const pattern = CATEGORY_GLOBS[args.category];
  if (!pattern) {
    console.error(`Unknown category: ${args.category}`);
    process.exit(1);
  }

  const files = globSync(pattern);
  const findings = [];
  const patternCounts = Object.fromEntries(PATTERNS.map((p) => [p.id, 0]));

  for (const file of files) {
    const raw = readFileSync(file, "utf-8");
    const { content } = matter(raw);
    const localFindings = detectBrokenExplanations(content);
    if (args.topic) {
      // 対象トピック名が近傍行に含まれるもののみ残す（前後 30 行）
      const lines = content.split(/\r?\n/);
      const filtered = localFindings.filter((f) => {
        const from = Math.max(0, f.line - 30);
        const to = Math.min(lines.length, f.line + 30);
        return lines.slice(from, to).some((l) => l.includes(args.topic));
      });
      if (filtered.length === 0) continue;
      for (const f of filtered) {
        findings.push({ file, ...f });
        patternCounts[f.pattern]++;
      }
    } else {
      for (const f of localFindings) {
        findings.push({ file, ...f });
        patternCounts[f.pattern]++;
      }
    }
  }

  const summary = {
    scanned_files: files.length,
    files_with_issues: new Set(findings.map((f) => f.file)).size,
    total_findings: findings.length,
    by_pattern: patternCounts,
    patterns: PATTERNS.map((p) => ({ id: p.id, description: p.description })),
  };

  const out = {
    meta: {
      generated_at: new Date().toISOString(),
      category: args.category,
      topic: args.topic,
    },
    summary,
    findings,
  };

  if (!existsSync(".claude/state")) mkdirSync(".claude/state", { recursive: true });
  const outPath = ".claude/state/broken-explanations.json";
  writeFileSync(outPath, JSON.stringify(out, null, 2));

  // コンソールサマリ
  console.log(`audit-exam-explanations:`);
  console.log(`  scanned: ${summary.scanned_files} files`);
  console.log(`  files with issues: ${summary.files_with_issues}`);
  console.log(`  total findings: ${summary.total_findings}`);
  for (const p of PATTERNS) {
    console.log(`    ${p.id}: ${patternCounts[p.id]} (${p.description})`);
  }
  console.log(`  report: ${outPath}`);
}

main();
