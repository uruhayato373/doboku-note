/**
 * GA4 bot 比率監査スクリプト
 *
 * 同一期間の GA4 source 別データを「全件」「Japan のみ」「日本以外」で取得し、
 * 各 source の海外比率を算出して bot 候補を surface する。
 *
 * 既存の `fetch-ga4-data.mjs` の SPAM_REFERRAL_SOURCES を補強する判断材料。
 * 海外比率 ≥ 80% かつ users ≥ 5 の source は除外候補。
 *
 * Usage:
 *   node .claude/scripts/audit-ga4-bot-ratio.mjs                 # 過去 14 日
 *   node .claude/scripts/audit-ga4-bot-ratio.mjs --days 28       # 期間指定
 *   node .claude/scripts/audit-ga4-bot-ratio.mjs --min-users 10  # 評価対象の最小 users
 *
 * 出力:
 *   .claude/state/metrics/ga4/bot-audit-YYYY-MM-DDTHH-MM-SS.json
 *   STDOUT に上位 30 件と「除外推奨」リスト
 *
 * incident: .claude/knowledge/reference/measurement-incidents.md 2026-04-26
 */

import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const OUTPUT_DIR = ".claude/state/metrics/ga4";
const DEFAULT_DAYS = 14;
const DEFAULT_MIN_USERS = 5;
const DEFAULT_LIMIT = 100;
// 海外比率がこれ以上で「除外推奨」とマーク
const FOREIGN_RATIO_THRESHOLD = 0.8;

// source 単位で除外せず country=Japan フィルタで救済する主要 source（実ユーザーも混在）
// これらは bot 比率が高くても SPAM_REFERRAL_SOURCES 追加候補から除外する
const COUNTRY_FILTER_HANDLED = new Set([
  "(direct)",
  "bing",
  "google",
  "yahoo",
  "duckduckgo",
]);

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { days: DEFAULT_DAYS, minUsers: DEFAULT_MIN_USERS, limit: DEFAULT_LIMIT };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--days": opts.days = parseInt(args[++i], 10); break;
      case "--min-users": opts.minUsers = parseInt(args[++i], 10); break;
      case "--limit": opts.limit = parseInt(args[++i], 10); break;
    }
  }
  return opts;
}

function getClient() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!keyPath || !propertyId) {
    console.error("Error: GOOGLE_SERVICE_ACCOUNT_KEY_PATH / GA4_PROPERTY_ID を .env.local に設定してください");
    process.exit(1);
  }
  if (!existsSync(keyPath)) {
    console.error(`Error: 鍵ファイルが見つかりません: ${keyPath}`);
    process.exit(1);
  }
  const credentials = JSON.parse(readFileSync(keyPath, "utf-8"));
  return {
    client: new BetaAnalyticsDataClient({ credentials }),
    propertyId: `properties/${propertyId}`,
  };
}

function getDateRange(days) {
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  const fmt = (d) => d.toISOString().split("T")[0];
  return { startDate: fmt(start), endDate: fmt(end) };
}

async function fetchSourceUsers(client, propertyId, dateRange, countryFilter, limit) {
  const request = {
    property: propertyId,
    dateRanges: [dateRange],
    dimensions: [{ name: "sessionSource" }],
    metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "engagementRate" }],
    limit,
    orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
  };
  if (countryFilter) {
    request.dimensionFilter = countryFilter;
  }
  const [response] = await client.runReport(request);
  const map = new Map();
  for (const row of response.rows || []) {
    const source = row.dimensionValues?.[0]?.value || "";
    map.set(source, {
      users: parseInt(row.metricValues?.[0]?.value || "0", 10),
      sessions: parseInt(row.metricValues?.[1]?.value || "0", 10),
      engagementRate: parseFloat(row.metricValues?.[2]?.value || "0"),
    });
  }
  return map;
}

function buildReport(allMap, jpMap, foreignMap, minUsers) {
  const sources = new Set([...allMap.keys(), ...jpMap.keys(), ...foreignMap.keys()]);
  const rows = [];
  for (const source of sources) {
    const all = allMap.get(source) || { users: 0, sessions: 0, engagementRate: 0 };
    const jp = jpMap.get(source) || { users: 0 };
    const foreign = foreignMap.get(source) || { users: 0 };
    if (all.users < minUsers) continue;
    const foreignRatio = all.users > 0 ? foreign.users / all.users : 0;
    rows.push({
      source,
      totalUsers: all.users,
      jpUsers: jp.users,
      foreignUsers: foreign.users,
      foreignRatio,
      engagementRate: all.engagementRate,
      flagged: foreignRatio >= FOREIGN_RATIO_THRESHOLD,
    });
  }
  rows.sort((a, b) => b.totalUsers - a.totalUsers);
  return rows;
}

function loadExistingSpamList() {
  const fetchPath = ".claude/scripts/fetch-ga4-data.mjs";
  if (!existsSync(fetchPath)) return [];
  const src = readFileSync(fetchPath, "utf-8");
  const match = src.match(/SPAM_REFERRAL_SOURCES\s*=\s*\[([\s\S]*?)\]/);
  if (!match) return [];
  return [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

function printReport(rows, dateRange, minUsers, existingSpam) {
  console.log(`\n期間: ${dateRange.startDate} 〜 ${dateRange.endDate}`);
  console.log(`評価対象: total users ≥ ${minUsers}`);
  console.log(`flagged 基準: 海外比率 ≥ ${(FOREIGN_RATIO_THRESHOLD * 100).toFixed(0)}%\n`);

  console.log(
    "source".padEnd(36) +
      "total".padStart(8) +
      "jp".padStart(8) +
      "foreign".padStart(8) +
      "  fgn%".padStart(8) +
      "  eng%".padStart(8) +
      "  flag"
  );
  console.log("-".repeat(86));
  for (const r of rows.slice(0, 30)) {
    const inList = existingSpam.includes(r.source);
    const countryHandled = COUNTRY_FILTER_HANDLED.has(r.source);
    let badge = "";
    if (r.flagged) {
      if (inList) badge = "  ✓既登録";
      else if (countryHandled) badge = "  ◎Japanフィルタで対応済";
      else badge = "  ⚠新規候補";
    }
    console.log(
      r.source.slice(0, 35).padEnd(36) +
        r.totalUsers.toString().padStart(8) +
        r.jpUsers.toString().padStart(8) +
        r.foreignUsers.toString().padStart(8) +
        `${(r.foreignRatio * 100).toFixed(1)}%`.padStart(8) +
        `${(r.engagementRate * 100).toFixed(1)}%`.padStart(8) +
        badge
    );
  }

  const newCandidates = rows.filter(
    (r) => r.flagged && !existingSpam.includes(r.source) && !COUNTRY_FILTER_HANDLED.has(r.source)
  );
  console.log("\n=== SPAM_REFERRAL_SOURCES 追加候補 ===");
  if (newCandidates.length === 0) {
    console.log("（新規追加候補なし）");
  } else {
    for (const c of newCandidates) {
      console.log(`  "${c.source}",  // foreign ${(c.foreignRatio * 100).toFixed(0)}% / users ${c.totalUsers}`);
    }
    console.log("\n→ fetch-ga4-data.mjs の SPAM_REFERRAL_SOURCES に追記を検討");
  }
}

async function main() {
  const opts = parseArgs();
  const { client, propertyId } = getClient();
  const dateRange = getDateRange(opts.days);

  console.log("GA4 bot 比率監査中... (3 API calls)");

  const jpFilter = {
    filter: { fieldName: "country", stringFilter: { matchType: "EXACT", value: "Japan" } },
  };
  const foreignFilter = {
    notExpression: jpFilter,
  };

  const [allMap, jpMap, foreignMap] = await Promise.all([
    fetchSourceUsers(client, propertyId, dateRange, null, opts.limit),
    fetchSourceUsers(client, propertyId, dateRange, jpFilter, opts.limit),
    fetchSourceUsers(client, propertyId, dateRange, foreignFilter, opts.limit),
  ]);

  const existingSpam = loadExistingSpamList();
  const rows = buildReport(allMap, jpMap, foreignMap, opts.minUsers);

  printReport(rows, dateRange, opts.minUsers, existingSpam);

  const totals = {
    allUsers: [...allMap.values()].reduce((a, b) => a + b.users, 0),
    jpUsers: [...jpMap.values()].reduce((a, b) => a + b.users, 0),
    foreignUsers: [...foreignMap.values()].reduce((a, b) => a + b.users, 0),
  };
  const foreignRatio = totals.allUsers > 0 ? totals.foreignUsers / totals.allUsers : 0;
  console.log(
    `\n全体: total=${totals.allUsers} / jp=${totals.jpUsers} / foreign=${totals.foreignUsers} (海外 ${(foreignRatio * 100).toFixed(1)}%)`
  );

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outPath = join(OUTPUT_DIR, `bot-audit-${ts}.json`);
  writeFileSync(
    outPath,
    JSON.stringify({ meta: { ...dateRange, minUsers: opts.minUsers, threshold: FOREIGN_RATIO_THRESHOLD }, totals, rows }, null, 2),
    "utf-8"
  );
  console.log(`\n出力: ${outPath}`);
}

main().catch((e) => {
  console.error("Error:", e.message);
  if (e.details) console.error("Details:", e.details);
  process.exit(1);
});
