#!/usr/bin/env node
/**
 * /audit-svg CLI
 *
 * content/site/**\/img/*.svg を走査し、文字クリップ・必須属性欠落・
 * viewBox 超過・font-size 過小・テキスト重なりを検出。
 *
 * Usage:
 *   node .claude/skills/quality/check-mdx/scripts/rules/svg/audit.mjs
 *   node .claude/skills/quality/check-mdx/scripts/rules/svg/audit.mjs --path=<glob>
 *   node .claude/skills/quality/check-mdx/scripts/rules/svg/audit.mjs --file=<single.svg>
 *   node .claude/skills/quality/check-mdx/scripts/rules/svg/audit.mjs --fail-on=HIGH   # exit 1 if any HIGH finding
 *
 * exit 1 の条件（--fail-on とは独立に常時適用。CLAUDE.md §9「検査ゼロを PASS と呼ばない」）:
 *   - --path / --file のマッチが 0 件（走査不成立。所見なしではない）
 *   - 読めない/壊れた SVG が 1 件以上（未検査。所見 0 と混同しない）
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { globSync } from "glob";
import { auditSvgFile } from "./detect.mjs";

function parseArgs(argv) {
  const args = {
    path: "content/site/**/img/*.svg",
    file: null,
    severity: "ALL",
    failOn: null,
  };
  for (const a of argv.slice(2)) {
    const [k, v] = a.split("=");
    if (k === "--path") args.path = v;
    else if (k === "--file") args.file = v;
    else if (k === "--severity") args.severity = v.toUpperCase();
    else if (k === "--fail-on") args.failOn = v.toUpperCase();
  }
  return args;
}

// 過去問クロップ専用ディレクトリ — 意匠系（キャンバス幅・フォント・色）の対象外。
// PDF 忠実度は civil-exam-figure-auditor / pe-exam-figure-auditor が担当する。
// ただし **HIGH だけは除外しない**: 文字がビューボックス外へはみ出す（P1-text-clip）のは
// 「試験原図はサイズ自由」で許される話ではなく、pre-commit-mdx.mjs は staged の
// 過去問 SVG も HIGH でブロックする。ここで全部 skip すると CI と pre-commit の判定が
// 食い違い、**CI だけが永久に緑**になる（2026-08-20 に HIGH 2 件がこの穴に落ちていた）。
const EXAM_DIR_RE = /\/(h\d+-primary|primary-h\d+[^/]*)\//;

function main() {
  const args = parseArgs(process.argv);

  const allFiles = args.file ? [args.file] : globSync(args.path);
  // 検査ゼロを PASS と呼ばない（CLAUDE.md §9）: マッチ 0 件は「異常なし」ではなく走査不成立。
  // 判定は allFiles（除外前）で行う — 全件が exam crop の場合は意図的な除外なので緑のままでよい。
  if (allFiles.length === 0) {
    const what = args.file ? `--file=${args.file}` : `--path=${args.path}`;
    console.error(`audit-svg: FAIL — SVG を 1 枚も検査していない（${what} にマッチ 0 件。cwd=${process.cwd()}）`);
    process.exit(1);
  }
  const examCrops = allFiles.filter((f) => EXAM_DIR_RE.test(f.replace(/\\/g, "/")));
  const files = allFiles.filter((f) => !EXAM_DIR_RE.test(f.replace(/\\/g, "/")));
  const bySeverity = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  const byPattern = {};
  const allFindings = [];

  const parseErrors = [];
  // exam crop は HIGH のみ、それ以外は全 severity を見る
  const targets = [
    ...files.map((f) => ({ file: f, highOnly: false })),
    ...examCrops.map((f) => ({ file: f, highOnly: true })),
  ];
  for (const { file, highOnly } of targets) {
    let findings;
    try {
      findings = auditSvgFile(file);
      if (highOnly) findings = findings.filter((f) => f.severity === "HIGH");
    } catch (e) {
      // 読めない/壊れた SVG は「所見なし」ではなく未検査。緑で流さず最後に exit 1 する。
      console.error(`parse error: ${file}: ${e.message}`);
      parseErrors.push({ file, message: e.message });
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
    scanned_files: targets.length - parseErrors.length,
    matched_files: allFiles.length,
    parse_errors: parseErrors.length,
    exam_crops_high_only: examCrops.length,
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
      note: "exam crop dirs (h*-primary, primary-h*) are audited for HIGH only — design/canvas patterns are left to civil-exam-figure-auditor",
    },
    summary,
    findings: allFindings,
    parse_errors: parseErrors,
    exam_crops: examCrops,
  };

  if (!existsSync(".claude/state")) mkdirSync(".claude/state", { recursive: true });
  const outPath = ".claude/state/svg-audit.json";
  writeFileSync(outPath, JSON.stringify(out, null, 2));

  console.log(`audit-svg:`);
  console.log(`  scanned: ${summary.scanned_files} file(s)（うち過去問クロップ ${summary.exam_crops_high_only} 件は HIGH のみ）`);
  console.log(`  files with issues: ${summary.files_with_issues}`);
  console.log(`  total findings: ${summary.total_findings}`);
  console.log(`  by severity: HIGH=${bySeverity.HIGH || 0}, MEDIUM=${bySeverity.MEDIUM || 0}, LOW=${bySeverity.LOW || 0}`);
  for (const [p, n] of Object.entries(byPattern)) {
    console.log(`    ${p}: ${n}`);
  }
  console.log(`  report: ${outPath}`);

  // 未検査（読めなかった SVG）が 1 件でもあれば緑にしない — 所見 0 と検査不成立は別物。
  if (parseErrors.length > 0) {
    console.error(`audit-svg: FAIL — ${parseErrors.length} file(s) を検査できなかった（未検査を所見 0 と混同しない）`);
    for (const e of parseErrors) console.error(`  UNSCANNED ${e.file}: ${e.message}`);
    process.exit(1);
  }

  if (args.failOn) {
    const order = { LOW: 0, MEDIUM: 1, HIGH: 2 };
    const threshold = order[args.failOn];
    if (threshold === undefined) {
      console.error(`invalid --fail-on value: ${args.failOn} (expected HIGH|MEDIUM|LOW)`);
      process.exit(2);
    }
    const triggering = allFindings.filter((f) => order[f.severity] >= threshold);
    if (triggering.length > 0) {
      console.error(`audit-svg: FAIL — ${triggering.length} finding(s) at severity >= ${args.failOn}`);
      for (const f of triggering) {
        console.error(`  ${f.severity} ${f.pattern} ${f.file}${f.line ? `:${f.line}` : ""}`);
      }
      process.exit(1);
    }
  }
}

main();
