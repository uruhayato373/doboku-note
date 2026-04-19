#!/usr/bin/env node
/**
 * /audit-svg CLI
 *
 * .local/r2/posts/**\/img/*.svg を走査し、文字クリップ・必須属性欠落・
 * viewBox 超過・font-size 過小・テキスト重なりを検出。
 *
 * Usage:
 *   node .claude/skills/content/audit-svg/scripts/audit.mjs
 *   node .claude/skills/content/audit-svg/scripts/audit.mjs --path=<glob>
 *   node .claude/skills/content/audit-svg/scripts/audit.mjs --file=<single.svg>
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { globSync } from "glob";
import { auditSvgFile } from "./detect.mjs";

function parseArgs(argv) {
  const args = {
    path: ".local/r2/posts/**/img/*.svg",
    file: null,
    severity: "ALL",
  };
  for (const a of argv.slice(2)) {
    const [k, v] = a.split("=");
    if (k === "--path") args.path = v;
    else if (k === "--file") args.file = v;
    else if (k === "--severity") args.severity = v.toUpperCase();
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);

  const files = args.file ? [args.file] : globSync(args.path);
  const bySeverity = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  const byPattern = {};
  const allFindings = [];

  for (const file of files) {
    let findings;
    try {
      findings = auditSvgFile(file);
    } catch (e) {
      console.error(`parse error: ${file}: ${e.message}`);
      continue;
    }
    if (args.severity !== "ALL") {
      findings = findings.filter((f) => f.severity === args.severity);
    }
    for (const f of findings) {
      bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
      byPattern[f.pattern] = (byPattern[f.pattern] || 0) + 1;
      allFindings.push({ file, ...f });
    }
  }

  const summary = {
    scanned_files: files.length,
    files_with_issues: new Set(allFindings.map((f) => f.file)).size,
    total_findings: allFindings.length,
    by_severity: bySeverity,
    by_pattern: byPattern,
  };

  const out = {
    meta: {
      generated_at: new Date().toISOString(),
      path: args.path,
      file: args.file,
    },
    summary,
    findings: allFindings,
  };

  if (!existsSync(".claude/state")) mkdirSync(".claude/state", { recursive: true });
  const outPath = ".claude/state/svg-audit.json";
  writeFileSync(outPath, JSON.stringify(out, null, 2));

  console.log(`audit-svg:`);
  console.log(`  scanned: ${summary.scanned_files} file(s)`);
  console.log(`  files with issues: ${summary.files_with_issues}`);
  console.log(`  total findings: ${summary.total_findings}`);
  console.log(`  by severity: HIGH=${bySeverity.HIGH || 0}, MEDIUM=${bySeverity.MEDIUM || 0}, LOW=${bySeverity.LOW || 0}`);
  for (const [p, n] of Object.entries(byPattern)) {
    console.log(`    ${p}: ${n}`);
  }
  console.log(`  report: ${outPath}`);
}

main();
