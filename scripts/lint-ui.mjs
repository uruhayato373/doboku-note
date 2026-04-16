/**
 * UI lint — ダークモードボーダー + デザイントークン検証
 *
 * ステージされた .tsx ファイル（または --all で全ファイル）を走査し、
 * UI 品質ルール違反を検出する。
 *
 * 検出対象:
 *   1. border-gray-{100,200,300} があるのに dark:border が無い
 *   2. インラインの borderColor 指定（dark クラスを上書きするため禁止）
 *   3. カード要素で生の rounded-{xl,2xl,3xl} + shadow を使用（デザイントークンを使うべき）
 *
 * Usage:
 *   node scripts/lint-ui.mjs          # ステージされた .tsx のみ
 *   node scripts/lint-ui.mjs --all    # src/ 配下の全 .tsx
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// --- Check 1: Dark mode border ---
const BORDER_PATTERN = /border-gray-[123]00/;
const DARK_BORDER_PATTERN = /dark:(hover:)?border/;

// --- Check 2: Inline borderColor ---
const INLINE_BORDER_COLOR = /borderColor\s*[:=]/;
const TAILWIND_CLASS_VALUE = /borderColor\s*:\s*["'`]border-/;

// --- Check 3: Raw card radius (should use design tokens) ---
// rounded-{xl,2xl,3xl} と shadow が同じ行にある = カード要素 → トークンを使うべき
// shadow サイズクラス (shadow-sm, shadow-md, shadow-lg, shadow-xl, shadow-2xl) のみマッチ。
// shadow-gray-* (色) や素の shadow は対象外（ChatBubble 等の独自 UI）
const SHADOW_SIZE = /(?:^|[\s"'])shadow-(sm|md|lg|xl|2xl)\b/;
const RAW_CARD_PATTERNS = [
  { radius: /rounded-2xl/, token: "rounded-card-section shadow-card-section" },
  { radius: /rounded-xl/, token: "rounded-card-content shadow-card-content" },
  { radius: /rounded-3xl/, token: "rounded-card-hero" },
];
// デザイントークンを既に使っている行は除外
const CARD_TOKEN_PATTERN = /rounded-card-/;

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
    if (BORDER_PATTERN.test(line) && !DARK_BORDER_PATTERN.test(line)) {
      if (!hasDarkBorderNearby(lines, i)) {
        violations.push({
          line: i + 1,
          rule: "dark-border-missing",
          message: `border-gray-* without dark:border-* variant`,
        });
      }
    }

    // Check 2: inline borderColor (overrides dark mode classes)
    if (INLINE_BORDER_COLOR.test(line) && !TAILWIND_CLASS_VALUE.test(line)) {
      violations.push({
        line: i + 1,
        rule: "inline-border-color",
        message: `inline borderColor overrides dark mode classes — use Tailwind classes instead`,
      });
    }

    // Check 3: raw card radius + shadow size (should use design tokens)
    if (!CARD_TOKEN_PATTERN.test(line) && SHADOW_SIZE.test(line)) {
      for (const { radius, token } of RAW_CARD_PATTERNS) {
        if (radius.test(line)) {
          violations.push({
            line: i + 1,
            rule: "raw-card-radius",
            message: `use design token: ${token}`,
          });
          break;
        }
      }
    }
  }

  return violations;
}

function main() {
  const files = getTargetFiles();

  if (files.length === 0) {
    if (process.argv.includes("--all")) {
      console.log("lint-ui: No .tsx files found.");
    }
    process.exit(0);
  }

  const allMode = process.argv.includes("--all");
  console.log(
    `lint-ui: Checking ${files.length} .tsx file(s)${allMode ? " (--all)" : ""}...`
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
    console.log(`lint-ui: ✓ All ${files.length} file(s) OK.`);
    process.exit(0);
  } else {
    console.error(`\nlint-ui: ✗ ${totalViolations} violation(s) found.\n`);
    console.error("See CLAUDE.md 'UI コンポーネントの必須ルール' for token reference.\n");
    process.exit(1);
  }
}

main();
