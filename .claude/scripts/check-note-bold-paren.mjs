#!/usr/bin/env node
/**
 * 真の Pattern A 違反検出（stateful parsing）
 *
 * 単純 grep `\*\*[^*]*[（）][^*]*\*\*` は複数の `**...**` の "間" にある全角括弧を
 * 誤検出する（例: `**作成日**: 2026-04-17（v1）/ **SSOT**` が誤マッチ）。
 *
 * 本スクリプトは `**` 区切りで bold 状態 ON/OFF を追跡し、真に bold 内に全角括弧
 * を含む箇所のみを違反として報告する。
 *
 * 使用箇所:
 *   - `/note-prepublish-review` Phase 1 § 4b の Pattern A 検出
 *   - 既存 note 記事の一括検証
 *
 * 関連:
 *   - 修正ツール: `.tmp/fix-note-bold-paren.mjs`（同 stateful 論理で transform）
 *   - SSoT: `.claude/knowledge/reference/content-principles.md` §14-b
 *
 * 終了コード: 0 = 違反なし / 1 = 違反あり / 2 = 引数エラー
 */

import { readFileSync } from "node:fs";
import { argv } from "node:process";

const files = argv.slice(2);
if (files.length === 0) {
  console.error("usage: check-note-bold-paren.mjs <file1> [file2 ...]");
  process.exit(2);
}

function checkLine(line) {
  const parts = line.split(/(\*\*)/);
  let inBold = false;
  let violations = [];
  for (const part of parts) {
    if (part === "**") {
      inBold = !inBold;
    } else if (inBold && /[（）]/.test(part)) {
      violations.push(part);
    }
  }
  return violations;
}

let totalViolations = 0;
const fileReports = [];
for (const file of files) {
  let content;
  try {
    content = readFileSync(file, "utf-8");
  } catch (e) {
    console.error(`SKIP: ${file} — ${e.message}`);
    continue;
  }
  const fmMatch = content.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)([\s\S]*)$/);
  const body = fmMatch ? fmMatch[2] : content;
  const lines = body.split("\n");
  const fileViolations = [];
  lines.forEach((line, idx) => {
    const v = checkLine(line);
    if (v.length > 0) {
      fileViolations.push({
        line: idx + 1 + (fmMatch ? fmMatch[1].split("\n").length - 1 : 0),
        snippets: v,
      });
    }
  });
  if (fileViolations.length > 0) {
    fileReports.push({ file, violations: fileViolations });
    totalViolations += fileViolations.reduce((a, b) => a + b.snippets.length, 0);
  }
}

if (fileReports.length === 0) {
  console.log("✅ Pattern A : OK (stateful parse, 0 true violations)");
  process.exit(0);
} else {
  console.log("Pattern A : NG (stateful parse)");
  fileReports.forEach(({ file, violations }) => {
    console.log(`  ${file}:`);
    violations.forEach(({ line, snippets }) => {
      snippets.forEach((s) => {
        const preview = s.length > 60 ? s.slice(0, 60) + "..." : s;
        console.log(`    L${line}: **${preview}**`);
      });
    });
  });
  console.log(`\nTotal: ${totalViolations} true violations across ${fileReports.length} files`);
  process.exit(1);
}
