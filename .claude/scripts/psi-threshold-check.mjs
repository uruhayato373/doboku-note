/**
 * PSI しきい値チェックスクリプト
 *
 * .claude/state/metrics/psi/ の最新 2 ファイル（mobile + desktop 同日実行分）を読み、
 * .claude/config/psi-config.json のしきい値と比較して violations を標準出力に書き出す。
 *
 * Usage:
 *   node .claude/scripts/psi-threshold-check.mjs                     # 人間向けサマリー
 *   node .claude/scripts/psi-threshold-check.mjs --json              # JSON のみ
 *   node .claude/scripts/psi-threshold-check.mjs --output report.md  # Markdown レポート出力
 *
 * Exit code:
 *   0 = しきい値違反なし
 *   1 = しきい値違反あり（CI で通知トリガーに使う）
 *   2 = 入力不備（データなし等）
 */

import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";

const CONFIG_PATH = ".claude/config/psi-config.json";
const DEFAULT_STATE_DIR = ".claude/state/metrics/psi";

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { json: false, output: null, stateDir: DEFAULT_STATE_DIR };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--json") opts.json = true;
    else if (args[i] === "--output") opts.output = args[++i];
    else if (args[i] === "--state-dir") opts.stateDir = args[++i];
  }
  return opts;
}

function loadConfig() {
  return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
}

function loadLatestResults(stateDir) {
  const files = readdirSync(stateDir)
    .filter((f) => f.startsWith("psi-batch-") && f.endsWith(".json"))
    .sort()
    .reverse();
  if (files.length === 0) {
    throw new Error(`No psi-batch-*.json files found in ${stateDir}`);
  }
  // 直近 2 ファイル（mobile + desktop 想定）を読み込み、strategy 重複を除去
  const byStrategy = new Map();
  for (const f of files) {
    const data = JSON.parse(readFileSync(join(stateDir, f), "utf-8"));
    const results = data.results || [];
    for (const r of results) {
      const key = `${r.url}|${r.strategy}`;
      if (!byStrategy.has(key)) {
        byStrategy.set(key, { ...r, source_file: f, generated_at: data.generated_at });
      }
    }
    // 2 strategy 揃ったら終了（必要最小限）
    const strategies = new Set([...byStrategy.values()].map((r) => r.strategy));
    if (strategies.size >= 2 && byStrategy.size > 0) break;
  }
  return [...byStrategy.values()];
}

function checkViolations(results, thresholds) {
  const violations = [];
  for (const r of results) {
    if (r.error) {
      violations.push({
        url: r.url,
        strategy: r.strategy,
        type: "error",
        detail: r.error,
      });
      continue;
    }
    const s = r.scores || {};
    const lab = r.lab_data || {};

    const checks = [
      { key: "performance", val: s.performance, min: thresholds.performance_score_min, label: "Performance" },
      { key: "accessibility", val: s.accessibility, min: thresholds.accessibility_score_min, label: "Accessibility" },
      { key: "best_practices", val: s.best_practices, min: thresholds.best_practices_score_min, label: "Best Practices" },
      { key: "seo", val: s.seo, min: thresholds.seo_score_min, label: "SEO" },
    ];
    for (const c of checks) {
      if (c.val != null && c.min != null && c.val < c.min) {
        violations.push({
          url: r.url,
          strategy: r.strategy,
          type: "score",
          metric: c.label,
          actual: c.val,
          threshold: c.min,
        });
      }
    }

    const labChecks = [
      { key: "LCP_ms", val: lab.LCP_ms, max: thresholds.LCP_ms_max, label: "LCP", unit: "ms" },
      { key: "CLS", val: lab.CLS, max: thresholds.CLS_max, label: "CLS", unit: "" },
      { key: "FCP_ms", val: lab.FCP_ms, max: thresholds.FCP_ms_max, label: "FCP", unit: "ms" },
      { key: "TBT_ms", val: lab.TBT_ms, max: thresholds.TBT_ms_max, label: "TBT", unit: "ms" },
    ];
    for (const c of labChecks) {
      if (c.val != null && c.max != null && c.val > c.max) {
        violations.push({
          url: r.url,
          strategy: r.strategy,
          type: "lab",
          metric: c.label,
          actual: c.unit === "ms" ? Math.round(c.val) : Number(c.val.toFixed(3)),
          threshold: c.max,
          unit: c.unit,
        });
      }
    }

    const field = r.field_data || {};
    const fieldChecks = [
      { key: "INP", val: field.INP?.percentile, max: thresholds.INP_ms_max, label: "INP (field)", unit: "ms" },
      { key: "TTFB", val: field.TTFB?.percentile, max: thresholds.TTFB_ms_max, label: "TTFB (field)", unit: "ms" },
    ];
    for (const c of fieldChecks) {
      if (c.val != null && c.max != null && c.val > c.max) {
        violations.push({
          url: r.url,
          strategy: r.strategy,
          type: "field",
          metric: c.label,
          actual: Math.round(c.val),
          threshold: c.max,
          unit: c.unit,
        });
      }
    }
  }
  return violations;
}

function formatMarkdown(results, violations, thresholds) {
  const date = new Date().toISOString().slice(0, 10);
  const lines = [];
  lines.push(`# PSI 計測レポート — ${date}`);
  lines.push("");
  lines.push(`- 計測対象: ${new Set(results.map((r) => r.url)).size} URL × ${new Set(results.map((r) => r.strategy)).size} strategy`);
  lines.push(`- しきい値違反: **${violations.length}件**`);
  lines.push("");

  lines.push("## スコアサマリー");
  lines.push("");
  lines.push("| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |");
  lines.push("|---|---|---|---|---|---|---|---|");
  for (const r of results) {
    if (r.error) {
      lines.push(`| ${r.url} | ${r.strategy} | ERROR | | | | | |`);
      continue;
    }
    const s = r.scores || {};
    const lab = r.lab_data || {};
    const flag = (val, min) => (val != null && min != null && val < min ? `${val}⚠` : val ?? "-");
    const flagMax = (val, max, round) => {
      if (val == null || max == null) return val ?? "-";
      const v = round ? Math.round(val) : Number(val.toFixed(3));
      return val > max ? `${v}⚠` : v;
    };
    lines.push(
      `| ${r.url.replace("https://doboku-note.com", "")} | ${r.strategy} | ${flag(s.performance, thresholds.performance_score_min)} | ${flag(s.accessibility, thresholds.accessibility_score_min)} | ${flag(s.best_practices, thresholds.best_practices_score_min)} | ${flag(s.seo, thresholds.seo_score_min)} | ${flagMax(lab.LCP_ms, thresholds.LCP_ms_max, true)} | ${flagMax(lab.CLS, thresholds.CLS_max, false)} |`,
    );
  }
  lines.push("");

  if (violations.length > 0) {
    lines.push("## しきい値違反");
    lines.push("");
    for (const v of violations) {
      if (v.type === "error") {
        lines.push(`- ❌ \`${v.url}\` (${v.strategy}): ${v.detail}`);
      } else {
        const unit = v.unit || "";
        lines.push(
          `- \`${v.url}\` (${v.strategy}): **${v.metric}** = ${v.actual}${unit} (閾値: ${v.type === "score" ? `≥${v.threshold}` : `≤${v.threshold}${unit}`})`,
        );
      }
    }
  } else {
    lines.push("## しきい値違反");
    lines.push("");
    lines.push("なし — 全 URL がしきい値を満たしています。");
  }

  return lines.join("\n");
}

function main() {
  const opts = parseArgs();
  let config, results;
  try {
    config = loadConfig();
    results = loadLatestResults(opts.stateDir);
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(2);
  }

  const violations = checkViolations(results, config.thresholds);

  if (opts.json) {
    console.log(JSON.stringify({ date: new Date().toISOString(), results, violations }, null, 2));
  } else {
    const md = formatMarkdown(results, violations, config.thresholds);
    if (opts.output) {
      writeFileSync(opts.output, md, "utf-8");
      console.log(`Report written to ${opts.output}`);
    } else {
      console.log(md);
    }
  }

  console.error(`\nViolations: ${violations.length}`);
  process.exit(violations.length > 0 ? 1 : 0);
}

main();
