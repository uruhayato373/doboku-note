#!/usr/bin/env node
/**
 * Daily Anomaly Detection (Issue #130-B)
 *
 * 最新の ga4-date-*.json を読み、日次 anomaly を検出する。
 * data-integrity-gate（A）が「データが取れていない」を見るのに対し、
 * 本スクリプトは「データは取れているが急激に変動した」を見る。
 *
 * 検出パターン:
 * - Daily-Traffic-Zero: 前日 activeUsers > 5 で、当日 0 or 欠損
 * - Daily-Traffic-Drop: 当日 activeUsers < 7日移動平均の 15% AND 平均 ≥ 10
 *   （週末 dip が 20-30% 台に落ちる運用実績から、閾値を 15% に絞り false positive を抑制）
 *
 * Usage:
 *   node .claude/scripts/check-daily-anomaly.mjs
 *   node .claude/scripts/check-daily-anomaly.mjs --report <path>
 *   node .claude/scripts/check-daily-anomaly.mjs --json
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const METRICS_DIR = ".claude/state/metrics/ga4";

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { json: false, reportPath: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--json") opts.json = true;
    else if (args[i] === "--report") opts.reportPath = args[++i];
  }
  return opts;
}

function findLatestDateFile() {
  let files;
  try {
    files = readdirSync(METRICS_DIR);
  } catch {
    return null;
  }
  const dateFiles = files
    .filter((f) => f.startsWith("ga4-date-") && f.endsWith(".json"))
    .sort()
    .reverse();
  return dateFiles[0] ? join(METRICS_DIR, dateFiles[0]) : null;
}

function formatIso(ymd) {
  // "20260321" → "2026-03-21"
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

function buildDailySeries(rows, startDate, endDate) {
  // 欠損日を 0 で埋めたタイムラインを返す
  const map = new Map(rows.map((r) => [r.date, r.activeUsers ?? 0]));
  const series = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const ymd =
      d.getFullYear() +
      String(d.getMonth() + 1).padStart(2, "0") +
      String(d.getDate()).padStart(2, "0");
    series.push({
      date: formatIso(ymd),
      users: map.has(ymd) ? map.get(ymd) : 0,
      present: map.has(ymd),
    });
  }
  return series;
}

function detectAnomalies(series) {
  const anomalies = [];

  for (let i = 1; i < series.length; i++) {
    const today = series[i];
    const yesterday = series[i - 1];

    // Daily-Traffic-Zero: 前日 > 5 で今日 0 / 欠損
    if (yesterday.users > 5 && today.users === 0) {
      anomalies.push({
        pattern: "Daily-Traffic-Zero",
        date: today.date,
        users: today.users,
        prevUsers: yesterday.users,
        note: today.present ? "API 応答に含まれるが 0 users" : "API 応答に不在（欠損）",
      });
    }

    // Daily-Traffic-Drop: 7日移動平均（当日除く直前 7 日）の 30% 未満 かつ 平均 ≥ 10
    const windowStart = Math.max(0, i - 7);
    const window = series.slice(windowStart, i); // 当日は含めない
    if (window.length >= 4) {
      const avg = window.reduce((s, d) => s + d.users, 0) / window.length;
      if (avg >= 10 && today.users < avg * 0.15) {
        // Zero パターンと重複しないように（Zero なら Drop は surface しない）
        const isZeroCase = yesterday.users > 5 && today.users === 0;
        if (!isZeroCase) {
          anomalies.push({
            pattern: "Daily-Traffic-Drop",
            date: today.date,
            users: today.users,
            movingAvg7: Math.round(avg * 10) / 10,
            dropRatio: Math.round((today.users / avg) * 100) / 100,
          });
        }
      }
    }
  }

  return anomalies;
}

function renderReport(filePath, series, anomalies) {
  const lines = [];
  lines.push("## GA4 日次 anomaly 検出");
  lines.push("");
  lines.push(`**検証時刻**: ${new Date().toISOString()}`);
  lines.push(`**対象ファイル**: \`${filePath}\``);
  lines.push(`**集計期間**: ${series[0].date} 〜 ${series[series.length - 1].date}`);
  lines.push(`**判定**: ${anomalies.length === 0 ? "✅ OK" : `❌ ${anomalies.length} 件の anomaly 検出`}`);
  lines.push("");

  if (anomalies.length > 0) {
    lines.push("### 検出 anomaly");
    for (const a of anomalies) {
      if (a.pattern === "Daily-Traffic-Zero") {
        lines.push(
          `- **[${a.pattern}]** ${a.date}: 当日 ${a.users} users / 前日 ${a.prevUsers} users（${a.note}）`,
        );
      } else {
        lines.push(
          `- **[${a.pattern}]** ${a.date}: 当日 ${a.users} users / 直前 7 日平均 ${a.movingAvg7}（${Math.round(a.dropRatio * 100)}% 水準）`,
        );
      }
    }
    lines.push("");
  }

  lines.push("### 検出ロジック");
  lines.push("- **Daily-Traffic-Zero**: 前日 users > 5 で当日 0 or 欠損。サイト停止 / de-indexing の兆候");
  lines.push("- **Daily-Traffic-Drop**: 当日 users < 直前 7 日平均 × 15% かつ 平均 ≥ 10。週末 dip (通常 20-30%) を false positive にしない閾値");
  lines.push("");
  lines.push("### 関連");
  lines.push("- Issue #130 計測基盤のデータ品質ガード導入");
  lines.push("- `.claude/scripts/check-data-integrity.mjs`（補完的。欠損期間の検出に特化）");
  lines.push("- `.claude/knowledge/reference/measurement-incidents.md`（2026-W16 事件の教訓）");
  return lines.join("\n");
}

// ── Main ──

const opts = parseArgs();
const filePath = findLatestDateFile();

if (!filePath) {
  console.error(`No ga4-date-*.json found in ${METRICS_DIR}`);
  process.exit(2);
}

const data = JSON.parse(readFileSync(filePath, "utf-8"));
const series = buildDailySeries(data.rows, data.meta.startDate, data.meta.endDate);
const anomalies = detectAnomalies(series);

const result = {
  file: filePath,
  period: { start: data.meta.startDate, end: data.meta.endDate },
  totalDays: series.length,
  anomalies,
  healthy: anomalies.length === 0,
};

if (opts.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const report = renderReport(filePath, series, anomalies);
  console.log(report);
}

if (opts.reportPath) {
  writeFileSync(opts.reportPath, renderReport(filePath, series, anomalies), "utf-8");
}

if (!result.healthy) {
  process.exit(1);
}
