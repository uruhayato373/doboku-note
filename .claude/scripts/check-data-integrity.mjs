#!/usr/bin/env node
/**
 * Data Integrity Gate (Issue #130-A)
 *
 * GA4 date dimension の欠損日数を検証し、閾値超過で stderr に警告出力。
 * CI から呼ばれた場合、閾値超過で exit 1 を返して後続のアラート（CI 失敗）ステップを発火。
 *
 * 閾値:
 * - 直近 7 日 で 2 日以上欠損
 * - 直近 14 日 で 3 日以上欠損
 *
 * 2026-W16 事件（BAILOUT_TO_CLIENT_SIDE_RENDERING → 6 日間 GA4 データ欠損）の
 * ような「数字が取れない」状態を自動検出する。
 *
 * Usage:
 *   node .claude/scripts/check-data-integrity.mjs            # ローカル確認
 *   node .claude/scripts/check-data-integrity.mjs --json     # JSON 出力
 *   node .claude/scripts/check-data-integrity.mjs --report <path>  # 報告 MD を書き出す
 */

import { readFileSync, readdirSync, writeFileSync, writeSync } from 'node:fs';
import { join } from "node:path";

const METRICS_DIR = ".claude/state/metrics/ga4";
const THRESHOLDS = {
  shortWindow: { days: 7, maxMissing: 2 },
  longWindow: { days: 14, maxMissing: 3 },
};

// ── CLI ──

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { json: false, reportPath: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--json") opts.json = true;
    else if (args[i] === "--report") opts.reportPath = args[++i];
  }
  return opts;
}

// ── Helpers ──

function findLatestDateFile() {
  let files;
  try {
    files = readdirSync(METRICS_DIR);
  } catch (e) {
    return null;
  }
  const dateFiles = files
    .filter((f) => f.startsWith("ga4-date-") && f.endsWith(".json"))
    .sort()
    .reverse();
  return dateFiles[0] ? join(METRICS_DIR, dateFiles[0]) : null;
}

function parseYmd(ymd) {
  // "20260321" → Date
  return new Date(
    parseInt(ymd.slice(0, 4)),
    parseInt(ymd.slice(4, 6)) - 1,
    parseInt(ymd.slice(6, 8)),
  );
}

function formatYmd(d) {
  return (
    d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0")
  );
}

function formatIso(d) {
  return d.toISOString().split("T")[0];
}

function diffDays(a, b) {
  return Math.round((b - a) / 86400000);
}

// ── Check ──

function checkIntegrity(filePath) {
  const data = JSON.parse(readFileSync(filePath, "utf-8"));
  const start = new Date(data.meta.startDate);
  const end = new Date(data.meta.endDate);
  const present = new Set(data.rows.map((r) => r.date));

  // 全期間の欠損日を列挙
  const missingAll = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const ymd = formatYmd(d);
    if (!present.has(ymd)) missingAll.push(formatIso(d));
  }

  // 直近 N 日ウィンドウで missing をカウント
  function countMissingInWindow(days) {
    const windowStart = new Date(end);
    windowStart.setDate(windowStart.getDate() - days + 1);
    return missingAll.filter((iso) => new Date(iso) >= windowStart).length;
  }

  const shortMissing = countMissingInWindow(THRESHOLDS.shortWindow.days);
  const longMissing = countMissingInWindow(THRESHOLDS.longWindow.days);

  const violations = [];
  if (shortMissing >= THRESHOLDS.shortWindow.maxMissing) {
    violations.push(
      `直近 ${THRESHOLDS.shortWindow.days} 日で ${shortMissing} 日欠損（閾値 ${THRESHOLDS.shortWindow.maxMissing}）`,
    );
  }
  if (longMissing >= THRESHOLDS.longWindow.maxMissing) {
    violations.push(
      `直近 ${THRESHOLDS.longWindow.days} 日で ${longMissing} 日欠損（閾値 ${THRESHOLDS.longWindow.maxMissing}）`,
    );
  }

  // 連続欠損の最長ラン
  let currentRun = 0;
  let maxRun = 0;
  let maxRunStart = null;
  let maxRunEnd = null;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const ymd = formatYmd(d);
    if (!present.has(ymd)) {
      if (currentRun === 0) var runStart = new Date(d);
      currentRun++;
      if (currentRun > maxRun) {
        maxRun = currentRun;
        maxRunStart = formatIso(runStart);
        maxRunEnd = formatIso(d);
      }
    } else {
      currentRun = 0;
    }
  }

  return {
    file: filePath,
    period: { start: data.meta.startDate, end: data.meta.endDate },
    totalDays: diffDays(start, end) + 1,
    presentDays: present.size,
    missingDays: missingAll.length,
    missingDates: missingAll,
    windows: {
      short: { days: THRESHOLDS.shortWindow.days, missing: shortMissing, threshold: THRESHOLDS.shortWindow.maxMissing },
      long: { days: THRESHOLDS.longWindow.days, missing: longMissing, threshold: THRESHOLDS.longWindow.maxMissing },
    },
    longestGap: { days: maxRun, start: maxRunStart, end: maxRunEnd },
    violations,
    healthy: violations.length === 0,
  };
}

// ── Report ──

function renderReport(result) {
  const lines = [];
  lines.push("## GA4 データ整合性チェック結果");
  lines.push("");
  lines.push(`**検証時刻**: ${new Date().toISOString()}`);
  lines.push(`**対象ファイル**: \`${result.file}\``);
  lines.push(`**集計期間**: ${result.period.start} 〜 ${result.period.end}`);
  lines.push(`**判定**: ${result.healthy ? "✅ OK" : "❌ 閾値超過"}`);
  lines.push("");
  lines.push("### サマリ");
  lines.push(`- 期間内日数: ${result.totalDays}`);
  lines.push(`- データ存在日: ${result.presentDays}`);
  lines.push(`- 欠損日: ${result.missingDays}`);
  lines.push("");
  lines.push("### ウィンドウ別判定");
  lines.push(
    `- 直近 ${result.windows.short.days} 日: ${result.windows.short.missing} 日欠損（閾値 ${result.windows.short.threshold}）`,
  );
  lines.push(
    `- 直近 ${result.windows.long.days} 日: ${result.windows.long.missing} 日欠損（閾値 ${result.windows.long.threshold}）`,
  );
  lines.push("");
  if (result.longestGap.days > 0) {
    lines.push("### 最長連続欠損");
    lines.push(
      `- ${result.longestGap.days} 日（${result.longestGap.start} 〜 ${result.longestGap.end}）`,
    );
    lines.push("");
  }
  if (result.violations.length > 0) {
    lines.push("### 違反項目");
    for (const v of result.violations) lines.push(`- ${v}`);
    lines.push("");
  }
  if (result.missingDates.length > 0) {
    lines.push("### 欠損日一覧");
    lines.push(result.missingDates.map((d) => `- ${d}`).join("\n"));
    lines.push("");
  }
  lines.push("### 判定ロジック");
  lines.push("GA4 Data API で dimension=date を取得すると、該当日のデータが存在しない場合は行自体が返されない。");
  lines.push("このため、取得後の行集合と期間から「欠損日数」を計算し、以下の閾値で warn / fail する。");
  lines.push("");
  lines.push("- 直近 7 日で 2 日以上欠損 = 警告");
  lines.push("- 直近 14 日で 3 日以上欠損 = 警告");
  lines.push("");
  lines.push("### 参考");
  lines.push(
    "2026-W16 事件（BAILOUT_TO_CLIENT_SIDE_RENDERING による Apr 5-10 の 6 日間 GA4 データ完全欠損）の再発防止。詳細: #83 #130。",
  );
  return lines.join("\n");
}

// ── Main ──

const opts = parseArgs();
const filePath = findLatestDateFile();

if (!filePath) {
  console.error(`No ga4-date-*.json found in ${METRICS_DIR}`);
  console.error("Run `npm run fetch-ga4-data -- --dimension date` first.");
  process.exit(2);
}

const result = checkIntegrity(filePath);

if (opts.json) {
  writeSync(1, JSON.stringify(result, null, 2) + '\n');
} else {
  const report = renderReport(result);
  console.log(report);
}

if (opts.reportPath) {
  writeFileSync(opts.reportPath, renderReport(result), "utf-8");
}

if (!result.healthy) {
  process.exit(1);
}
