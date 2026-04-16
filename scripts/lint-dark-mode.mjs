/**
 * Dark mode border lint
 *
 * ステージされた .tsx ファイル（または --all で全ファイル）を走査し、
 * ダークモード対応が欠けているボーダー指定を検出する。
 *
 * 検出対象:
 *   1. border-gray-{100,200,300} があるのに同じ行に dark:border が無い
 *   2. インラインの borderColor 指定（dark クラスを上書きするため禁止）
 *
 * Usage:
 *   node scripts/lint-dark-mode.mjs          # ステージされた .tsx のみ
 *   node scripts/lint-dark-mode.mjs --all    # src/ 配下の全 .tsx
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const BORDER_PATTERN = /border-gray-[123]00/;
const DARK_BORDER_PATTERN = /dark:(hover:)?border/;

// インライン borderColor だが、Tailwind クラス文字列を値として持つもの（例: borderColor: "border-primary-500"）は除外
const INLINE_BORDER_COLOR = /borderColor\s*[:=]/;
const TAILWIND_CLASS_VALUE = /borderColor\s*:\s*["'`]border-/;

// Storybook ファイルは除外
const EXCLUDE_PATTERN = /\.stories\.tsx$/;

// 誤検出を避けるための除外パターン（コメント行、import 文）
const SKIP_LINE_PATTERN = /^\s*(\/\/|\/\*|\*|import )/;

// cn() 等の複数行クラス指定で、近隣行に dark:border があれば OK とする探索範囲
const NEARBY_WINDOW = 5;

function getTargetFiles() {
  const allMode = process.argv.includes("--all");

  if (allMode) {
    try {
      const output = execSync('find src -name "*.tsx" -not -name "*.stories.tsx"', {
        encoding: "utf-8",
      });
      return output.trim().split("\n").filter(Boolean);
    } catch {
      return [];
    }
  }

  // ステージされた .tsx ファイル
  try {
    const output = execSync(
      'git diff --cached --name-only --diff-filter=ACM -- "*.tsx"',
      { encoding: "utf-8" }
    );
    return output
      .trim()
      .split("\n")
      .filter((f) => f && existsSync(f) && !EXCLUDE_PATTERN.test(f));
  } catch {
    return [];
  }
}

function hasDarkBorderNearby(lines, index) {
  const start = Math.max(0, index - NEARBY_WINDOW);
  const end = Math.min(lines.length - 1, index + NEARBY_WINDOW);
  for (let j = start; j <= end; j++) {
    if (j !== index && DARK_BORDER_PATTERN.test(lines[j])) return true;
  }
  return false;
}

function lintFile(filePath) {
  const content = readFileSync(resolve(filePath), "utf-8");
  const lines = content.split("\n");
  const violations = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // コメント・import はスキップ
    if (SKIP_LINE_PATTERN.test(line)) continue;

    // Check 1: border-gray-{100,200,300} without dark:border
    // 同じ行になくても、cn() 等で近隣行（±5行）に dark:border があれば OK
    if (BORDER_PATTERN.test(line) && !DARK_BORDER_PATTERN.test(line)) {
      if (!hasDarkBorderNearby(lines, i)) {
        violations.push({
          line: i + 1,
          rule: "dark-border-missing",
          message: `border-gray-* without dark:border-* variant`,
          content: line.trim(),
        });
      }
    }

    // Check 2: inline borderColor (overrides dark mode classes)
    // ただし borderColor: "border-xxx" のような Tailwind クラス文字列の格納は除外
    if (INLINE_BORDER_COLOR.test(line) && !TAILWIND_CLASS_VALUE.test(line)) {
      violations.push({
        line: i + 1,
        rule: "inline-border-color",
        message: `inline borderColor overrides dark mode classes — use Tailwind border-[color] + dark:border-[color] instead`,
        content: line.trim(),
      });
    }
  }

  return violations;
}

function main() {
  const files = getTargetFiles();

  if (files.length === 0) {
    if (process.argv.includes("--all")) {
      console.log("lint-dark-mode: No .tsx files found.");
    }
    // ステージモードでファイルなしは正常終了
    process.exit(0);
  }

  const allMode = process.argv.includes("--all");
  console.log(
    `lint-dark-mode: Checking ${files.length} .tsx file(s)${allMode ? " (--all)" : ""}...`
  );

  let totalViolations = 0;

  for (const file of files) {
    const violations = lintFile(file);
    if (violations.length > 0) {
      totalViolations += violations.length;
      for (const v of violations) {
        console.error(`  ${file}:${v.line} [${v.rule}] ${v.message}`);
      }
    }
  }

  if (totalViolations === 0) {
    console.log(`lint-dark-mode: ✓ All ${files.length} file(s) OK.`);
    process.exit(0);
  } else {
    console.error(
      `\nlint-dark-mode: ✗ ${totalViolations} violation(s) found.\n`
    );
    console.error("Fix: Add dark:border-* variant to each border-gray-* class.");
    console.error("Fix: Replace inline borderColor with Tailwind classes.\n");
    process.exit(1);
  }
}

main();
