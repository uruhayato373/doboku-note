/**
 * UI lint — ダークモードボーダー + デザイントークン検証
 *
 * ステージされた UI ファイル（または --all で全ファイル）を走査し、
 * UI 品質ルール違反を検出する。
 *
 * 検出対象:
 *   1. border-gray-{100,200,300} があるのに dark:border が無い
 *   2. インラインの borderColor 指定（dark クラスを上書きするため禁止）
 *   3. カード要素で生の rounded-{xl,2xl,3xl} + shadow を使用（デザイントークンを使うべき）
 *   4. focus:outline-none があるのに focus-ring / ring / outline の代替が無い
 *   5. SpecSheetList が旧図版トークン・生 radius・未導入フォントへ戻っていない
 *   6. transition-all を使用している
 *
 * Usage:
 *   node scripts/lint-ui.mjs          # ステージされた UI ファイルのみ
 *   node scripts/lint-ui.mjs --all    # src/ 配下の全 UI ファイル
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

// --- Check 4: focus outline removed without visible replacement ---
const FOCUS_OUTLINE_NONE = /focus(?:-visible)?:outline-none/;
const FOCUS_REPLACEMENT = /focus-ring|focus(?:-visible)?:ring-|focus(?:-visible)?:outline-(?!none)|focus(?:-visible)?:shadow|focus-visible:/;

// --- Check 5: SpecSheetList should use Editorial tokens, not legacy figure tokens ---
const LEGACY_SPEC_SHEET_PATTERN = /--color-(ink|border|brand)|JetBrains Mono|border-radius:\s*2px/;

// --- Check 6: transition-all should be narrowed to the properties that actually move ---
const TRANSITION_ALL_PATTERN = /\btransition-all\b/;

// Storybook ファイルは除外
const EXCLUDE_PATTERN = /\.stories\.tsx$/;
const UI_FILE_PATTERN = /\.(tsx|css)$/;

// 誤検出を避けるための除外パターン（コメント行、import 文）
const SKIP_LINE_PATTERN = /^\s*(\/\/|\/\*|\*|import )/;

// cn() 等の複数行クラス指定で、近隣行に dark:border があれば OK とする探索範囲
const NEARBY_WINDOW = 5;

function getTargetFiles() {
  const allMode = process.argv.includes("--all");

  if (allMode) {
    try {
      const output = execSync('find src \\( -name "*.tsx" -o -name "*.css" \\) -not -name "*.stories.tsx"', {
        encoding: "utf-8",
      });
      return output.trim().split("\n").filter(Boolean);
    } catch {
      return [];
    }
  }

  // ステージされた UI ファイル
  try {
    const output = execSync(
      'git diff --cached --name-only --diff-filter=ACM -- "*.tsx" "*.css"',
      { encoding: "utf-8" }
    );
    return output
      .trim()
      .split("\n")
      .filter((f) => f && existsSync(f) && UI_FILE_PATTERN.test(f) && !EXCLUDE_PATTERN.test(f));
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

    // Check 4: focus:outline-none must have a visible replacement nearby
    if (FOCUS_OUTLINE_NONE.test(line) && !FOCUS_REPLACEMENT.test(line)) {
      const start = Math.max(0, i - NEARBY_WINDOW);
      const end = Math.min(lines.length - 1, i + NEARBY_WINDOW);
      let hasReplacementNearby = false;
      for (let j = start; j <= end; j++) {
        if (j !== i && FOCUS_REPLACEMENT.test(lines[j])) {
          hasReplacementNearby = true;
          break;
        }
      }
      if (!hasReplacementNearby) {
        violations.push({
          line: i + 1,
          rule: "focus-outline-missing",
          message: `focus:outline-none without a visible focus replacement — use focus-ring or focus-visible:ring-*`,
        });
      }
    }

    // Check 5: SpecSheetList CSS should stay on Editorial tokens
    if (filePath.includes("SpecSheetList") && LEGACY_SPEC_SHEET_PATTERN.test(line)) {
      violations.push({
        line: i + 1,
        rule: "legacy-spec-sheet-token",
        message: `SpecSheetList must use Editorial tokens (--ink / --rule-soft / --accent / --radius-card-content)`,
      });
    }

    // Check 6: transition-all should be explicit
    if (TRANSITION_ALL_PATTERN.test(line)) {
      violations.push({
        line: i + 1,
        rule: "transition-all",
        message: `avoid transition-all — use transition-colors, transition-shadow, or transition-[property]`,
      });
    }
  }

  return violations;
}

function main() {
  const files = getTargetFiles();

  if (files.length === 0) {
    // 検査ゼロを無言の PASS にしない（CLAUDE.md §9）。既定モードは staged 限定なので、
    // 何も staged していないと以前は 1 行も出さずに exit 0 し、「緑＝検査済み」と読めてしまった。
    console.log(
      process.argv.includes("--all")
        ? "lint-ui: No UI files found."
        : "lint-ui: staged な UI ファイルが 0 件のため検査していません（全量は --all）。"
    );
    process.exit(0);
  }

  const allMode = process.argv.includes("--all");
  console.log(
    `lint-ui: Checking ${files.length} UI file(s)${allMode ? " (--all)" : ""}...`
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
