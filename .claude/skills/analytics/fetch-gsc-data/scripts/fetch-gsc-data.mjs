/**
 * Google Search Console データ取得スクリプト
 *
 * Usage:
 *   npm run fetch-gsc-data                            # 過去28日、クエリ別
 *   npm run fetch-gsc-data -- --days 7                # 過去7日
 *   npm run fetch-gsc-data -- --dimension page        # ページ別
 *   npm run fetch-gsc-data -- --dimension date        # 日付別
 *   npm run fetch-gsc-data -- --limit 50              # 上位50件
 *   npm run fetch-gsc-data -- --query "技術士"        # クエリフィルタ
 *   npm run fetch-gsc-data -- --page "/docs/"         # URLフィルタ（部分一致）
 */

import { google } from "googleapis";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// ── Config ──

const SITE_URL = "sc-domain:doboku-note.com";
const OUTPUT_DIR = ".local/metrics/gsc";
const DEFAULT_DAYS = 28;
const DEFAULT_LIMIT = 100;
const DEFAULT_DIMENSION = "query";

// ── CLI args ──

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    days: DEFAULT_DAYS,
    dimension: DEFAULT_DIMENSION,
    limit: DEFAULT_LIMIT,
    query: null,
    page: null,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--days":
        opts.days = parseInt(args[++i], 10);
        break;
      case "--dimension":
        opts.dimension = args[++i];
        break;
      case "--limit":
        opts.limit = parseInt(args[++i], 10);
        break;
      case "--query":
        opts.query = args[++i];
        break;
      case "--page":
        opts.page = args[++i];
        break;
    }
  }

  return opts;
}

// ── Auth ──

function getAuth() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;

  if (!keyPath) {
    console.error(
      "Error: GOOGLE_SERVICE_ACCOUNT_KEY_PATH が .env.local に設定されていません。\n\n" +
        "セットアップ手順:\n" +
        "1. GCPコンソール → サービスアカウント作成\n" +
        "2. Search Console API を有効化\n" +
        "3. JSON鍵ファイルをダウンロード → credentials/ に配置\n" +
        "4. GSCプロパティにサービスアカウントのメールアドレスをユーザー追加\n" +
        "5. .env.local に以下を追加:\n" +
        "   GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./credentials/gsc-service-account.json"
    );
    process.exit(1);
  }

  if (!existsSync(keyPath)) {
    console.error(`Error: 鍵ファイルが見つかりません: ${keyPath}`);
    process.exit(1);
  }

  const key = JSON.parse(readFileSync(keyPath, "utf-8"));

  return new google.auth.GoogleAuth({
    credentials: key,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
}

// ── Date helpers ──

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function getDateRange(days) {
  const end = new Date();
  end.setDate(end.getDate() - 3); // GSC data has ~3 day delay
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  return { startDate: formatDate(start), endDate: formatDate(end) };
}

// ── Fetch ──

async function fetchSearchAnalytics(auth, opts) {
  const searchconsole = google.searchconsole({ version: "v1", auth });
  const { startDate, endDate } = getDateRange(opts.days);

  const requestBody = {
    startDate,
    endDate,
    dimensions: [opts.dimension],
    rowLimit: opts.limit,
    startRow: 0,
  };

  // Add filters
  const dimensionFilters = [];
  if (opts.query) {
    dimensionFilters.push({
      dimension: "query",
      operator: "contains",
      expression: opts.query,
    });
  }
  if (opts.page) {
    dimensionFilters.push({
      dimension: "page",
      operator: "contains",
      expression: opts.page,
    });
  }
  if (dimensionFilters.length > 0) {
    requestBody.dimensionFilterGroups = [{ filters: dimensionFilters }];
  }

  const res = await searchconsole.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody,
  });

  return {
    meta: { startDate, endDate, dimension: opts.dimension, limit: opts.limit },
    rows: res.data.rows || [],
  };
}

// ── Output ──

function printSummary(data) {
  const { meta, rows } = data;
  console.log(`\n期間: ${meta.startDate} 〜 ${meta.endDate}`);
  console.log(`ディメンション: ${meta.dimension}`);
  console.log(`件数: ${rows.length}\n`);

  if (rows.length === 0) {
    console.log("データがありません。");
    return;
  }

  // Total
  const totals = rows.reduce(
    (acc, r) => ({
      clicks: acc.clicks + r.clicks,
      impressions: acc.impressions + r.impressions,
    }),
    { clicks: 0, impressions: 0 }
  );
  console.log(
    `合計: ${totals.clicks.toLocaleString()} clicks / ${totals.impressions.toLocaleString()} impressions\n`
  );

  // Top rows
  const header = `${"#".padStart(3)} | ${meta.dimension.padEnd(50)} | ${"clicks".padStart(7)} | ${"impr".padStart(7)} | ${"CTR".padStart(6)} | ${"pos".padStart(5)}`;
  console.log(header);
  console.log("-".repeat(header.length));

  rows.slice(0, 30).forEach((row, i) => {
    const key = (row.keys?.[0] || "").substring(0, 50).padEnd(50);
    const clicks = row.clicks.toString().padStart(7);
    const impressions = row.impressions.toString().padStart(7);
    const ctr = (row.ctr * 100).toFixed(1).padStart(5) + "%";
    const position = row.position.toFixed(1).padStart(5);
    console.log(
      `${(i + 1).toString().padStart(3)} | ${key} | ${clicks} | ${impressions} | ${ctr} | ${position}`
    );
  });

  if (rows.length > 30) {
    console.log(`\n... 他 ${rows.length - 30} 件（JSONファイルに全件出力）`);
  }
}

function saveJson(data, opts) {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `gsc-${opts.dimension}-${timestamp}.json`;
  const filepath = join(OUTPUT_DIR, filename);

  writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`\n出力: ${filepath}`);
}

// ── Main ──

async function main() {
  const opts = parseArgs();

  console.log("Google Search Console データ取得中...");

  const auth = getAuth();
  const data = await fetchSearchAnalytics(auth, opts);

  printSummary(data);
  saveJson(data, opts);
}

main().catch((e) => {
  if (e.code === 403) {
    console.error(
      "Error: アクセス権がありません。\n" +
        "GSCプロパティにサービスアカウントのメールアドレスを追加してください。"
    );
  } else if (e.code === 401) {
    console.error("Error: 認証に失敗しました。鍵ファイルを確認してください。");
  } else {
    console.error("Error:", e.message);
  }
  process.exit(1);
});
