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
 *   0 = field 実害なし・取得失敗率 20% 以下（lab の改善余地だけなら 0）
 *   1 = field 実害または取得失敗率 20% 超（CI で通知トリガーに使う）
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

function checkViolations(results, thresholds, fieldThresholds) {
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

    // 実害のゲートは CrUX field category。lab は日次変動が大きいため改善余地として
    // レポートには残すが、単発値だけで Action を失敗させない。
    const categoryChecks = [
      { metric: "LCP (field)", actual: field.LCP?.category, expected: fieldThresholds.LCP_category_min },
      { metric: "INP (field)", actual: field.INP?.category, expected: fieldThresholds.INP_category_min },
      { metric: "CLS (field)", actual: field.CLS?.category, expected: fieldThresholds.CLS_category_min },
    ];
    for (const c of categoryChecks) {
      if (c.actual && c.expected && c.actual !== c.expected) {
        violations.push({
          url: r.url,
          strategy: r.strategy,
          type: "field-category",
          metric: c.metric,
          actual: c.actual,
          threshold: c.expected,
        });
      }
    }
  }
  return violations;
}

function isGateViolation(v) {
  return (
    v.type === "field" ||
    v.type === "field-category" ||
    v.type === "coverage" ||
    v.type === "field-coverage"
  );
}

/**
 * field(CrUX) を 1 つでも持つ result の数を数える。
 *
 * なぜ要るか（2026-08-25・DN-0127）: このゲートは field / field-category / coverage の 3 型しか
 * 赤にしない。その **field が全 null になると違反が 1 件も立たず緑になる**。「実害が無い」と
 * 「判定材料が無い」が同じ緑に見える状態で、CLAUDE.md §9「検査ゼロを PASS と呼ばない」の入力欠落版。
 * 実際 2026-08-18 以降、22 URL 全件が field null のまま 12 バッチ連続で緑を出し続けていた
 * （8/17 までは 22/22 取得できていて翌日から一斉にゼロ。final_url もスキーマも変わっていない
 *  ＝取得・パースは動いており、CrUX 側の供給が止まったと読むのが整合的）。
 */
function countFieldCoverage(results) {
  const usable = results.filter((r) => {
    const f = r.field_data;
    return f && Object.values(f).some((v) => v != null);
  });
  return { withField: usable.length, total: results.length };
}

/**
 * DN-0158 診断 (1) の内訳。fetch-psi-data が result に残した field_availability を数える。
 *   urlLevel    … URL レベルの CrUX がある
 *   originLevel … URL には無いが origin（サイト全体）レベルにはある → CrUX の最小トラフィック閾値割れ（DN-0158 (2)）
 *   neither     … どちらも無い → CrUX 全体の供給問題（DN-0158 (3)）
 *   unrecorded  … フラグ未記録（本機能より前のバッチ）
 */
export function countFieldAvailability(results) {
  const c = { urlLevel: 0, originLevel: 0, neither: 0, unrecorded: 0, total: results.length };
  for (const r of results) {
    const a = r.field_availability;
    if (!a) { c.unrecorded += 1; continue; }
    if (a.url_level) c.urlLevel += 1;
    else if (a.origin_level) c.originLevel += 1;
    else c.neither += 1;
  }
  return c;
}

function fieldAvailabilityLine(results) {
  const a = countFieldAvailability(results);
  return `field 判定不能の内訳: URL レベル ${a.urlLevel} / origin レベル ${a.originLevel} / どちらも無し ${a.neither}（フラグ未記録 ${a.unrecorded}）`;
}

function fieldAvailabilityHint(results) {
  const a = countFieldAvailability(results);
  if (a.unrecorded === a.total) return "内訳フラグ未記録のバッチ（fetch-psi-data の field_availability 導入前）。次回の計測で判別できる。";
  if (a.urlLevel === 0 && a.originLevel > 0) {
    return "URL レベルの CrUX 閾値割れ（origin レベルにはデータあり）。DN-0158 (2)＝judgment.primary_source を lab 中央値ベースへ切り替える候補（ユーザー判断）。";
  }
  if (a.urlLevel === 0 && a.originLevel === 0) {
    return "origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。";
  }
  return "";
}

function formatMarkdown(results, violations, gateViolations, thresholds) {
  const date = new Date().toISOString().slice(0, 10);
  const lines = [];
  lines.push(`# PSI 計測レポート — ${date}`);
  lines.push("");
  lines.push(`- 計測対象: ${new Set(results.map((r) => r.url)).size} URL × ${new Set(results.map((r) => r.strategy)).size} strategy`);
  const cov = countFieldCoverage(results);
  lines.push(
    `- field(CrUX) 取得: **${cov.withField}/${cov.total}件**` +
      (cov.withField === 0 ? "　← **判定不能**（実害の有無を判定する材料が無い）" : ""),
  );
  if (cov.withField < cov.total) {
    lines.push(`- ${fieldAvailabilityLine(results)}`);
    const hint = fieldAvailabilityHint(results);
    if (hint) lines.push(`  - ${hint}`);
  }
  lines.push(`- 診断上のしきい値超過: **${violations.length}件**`);
  lines.push(`- CI ゲート違反（field 実害・取得失敗率20%超）: **${gateViolations.length}件**`);
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
      } else if (v.type === "coverage") {
        lines.push(`- **PSI 取得失敗率** = ${v.actual}% (上限: ${v.threshold}%)`);
      } else if (v.type === "field-coverage") {
        lines.push(`- **field(CrUX) 判定不能** — ${v.detail}`);
      } else if (v.type === "field-category") {
        lines.push(
          `- \`${v.url}\` (${v.strategy}): **${v.metric}** = ${v.actual} (期待: ${v.threshold})`,
        );
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

  const violations = checkViolations(results, config.thresholds, config.field_thresholds || {});
  const fetchErrors = violations.filter((v) => v.type === "error").length;
  const fetchErrorRate = results.length ? fetchErrors / results.length : 1;
  if (fetchErrorRate > 0.2) {
    violations.push({
      type: "coverage",
      actual: Number((fetchErrorRate * 100).toFixed(1)),
      threshold: 20,
      detail: `${fetchErrors}/${results.length} results failed`,
    });
  }
  // field 取得件数（判定材料の有無）。実害の有無より先に「測れているか」を見る。
  const fieldCov = countFieldCoverage(results);
  const minCov = config.judgment?.min_field_coverage ?? 1;
  if (config.judgment?.primary_source === "field" && fieldCov.withField < minCov) {
    violations.push({
      type: "field-coverage",
      actual: fieldCov.withField,
      threshold: minCov,
      detail:
        `field(CrUX) を持つ result が ${fieldCov.withField}/${fieldCov.total} 件。` +
        "primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。" +
        "CrUX の供給が戻るのを待つか、judgment.primary_source を lab 中央値ベースへ変更して原則を書き換える。" +
        ` ${fieldAvailabilityLine(results)}` +
        (fieldAvailabilityHint(results) ? ` ${fieldAvailabilityHint(results)}` : ""),
      field_availability: countFieldAvailability(results),
    });
  }

  const gateViolations = violations.filter(isGateViolation);

  if (opts.json) {
    console.log(JSON.stringify({ date: new Date().toISOString(), results, violations, gate_violations: gateViolations }, null, 2));
  } else {
    const md = formatMarkdown(results, violations, gateViolations, config.thresholds);
    if (opts.output) {
      writeFileSync(opts.output, md, "utf-8");
      console.log(`Report written to ${opts.output}`);
    } else {
      console.log(md);
    }
  }

  console.error(`\nDiagnostic violations: ${violations.length} / Gate violations: ${gateViolations.length}`);
  console.error(
    `field(CrUX) coverage: ${fieldCov.withField}/${fieldCov.total}` +
      (fieldCov.withField === 0 ? '  <- 判定不能（緑でも安全の意味ではない）' : ''),
  );
  if (fieldCov.withField < fieldCov.total) console.error(fieldAvailabilityLine(results));
  process.exit(gateViolations.length > 0 ? 1 : 0);
}

// import 時は実行しない（テストが countFieldAvailability を読めるようにする）。
const isMain = process.argv[1] && process.argv[1].split(/[\\/]/).pop() === "psi-threshold-check.mjs";
if (isMain) main();
