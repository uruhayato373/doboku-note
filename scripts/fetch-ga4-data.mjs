/**
 * Google Analytics 4 Data API 取得スクリプト
 *
 * NSM = 月間オーガニック検索流入ユーザー数 を測定するためのメトリクス取得。
 *
 * Usage:
 *   npm run fetch-ga4-data                                 # 過去28日、チャネル別
 *   npm run fetch-ga4-data -- --days 7                     # 過去7日
 *   npm run fetch-ga4-data -- --dimension date             # 日付別
 *   npm run fetch-ga4-data -- --dimension channel          # チャネル別（default）
 *   npm run fetch-ga4-data -- --dimension page             # ページ別
 *   npm run fetch-ga4-data -- --metric activeUsers,sessions  # メトリクス絞り込み
 *   npm run fetch-ga4-data -- --organic-only               # organic search のみ
 *   npm run fetch-ga4-data -- --limit 50                   # 上位50件
 *
 * 必要な環境変数 (.env.local):
 *   GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./credentials/gsc-service-account.json
 *   GA4_PROPERTY_ID=<9桁程度のプロパティID>
 */

import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// ── Config ──

const OUTPUT_DIR = ".local/ga4";
const DEFAULT_DAYS = 28;
const DEFAULT_LIMIT = 100;
const DEFAULT_DIMENSION = "channel";

// ディメンション別名 → GA4 API 実名
const DIMENSION_MAP = {
  date: "date",
  channel: "sessionDefaultChannelGroup",
  page: "pagePath",
  source: "sessionSource",
  medium: "sessionMedium",
  country: "country",
  device: "deviceCategory",
};

// デフォルトメトリクスセット（NSM 関連）
const DEFAULT_METRICS = [
  "activeUsers",        // ユニークユーザー (NSM)
  "sessions",
  "screenPageViewsPerSession",
  "averageSessionDuration",
  "engagementRate",
  "bounceRate",
];

// ── CLI args ──

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    days: DEFAULT_DAYS,
    dimension: DEFAULT_DIMENSION,
    limit: DEFAULT_LIMIT,
    metrics: DEFAULT_METRICS,
    organicOnly: false,
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
      case "--metric":
      case "--metrics":
        opts.metrics = args[++i].split(",").map((m) => m.trim());
        break;
      case "--organic-only":
        opts.organicOnly = true;
        break;
    }
  }

  return opts;
}

// ── Auth ──

function getClient() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  const propertyId = process.env.GA4_PROPERTY_ID;

  if (!keyPath) {
    console.error(
      "Error: GOOGLE_SERVICE_ACCOUNT_KEY_PATH が .env.local に設定されていません。\n" +
        "Step 1 (GSC) と同じサービスアカウント鍵を使用します。"
    );
    process.exit(1);
  }

  if (!propertyId) {
    console.error(
      "Error: GA4_PROPERTY_ID が .env.local に設定されていません。\n\n" +
        "取得手順:\n" +
        "1. https://analytics.google.com にアクセス\n" +
        "2. 管理（歯車）→ プロパティ設定 → プロパティ ID（9桁程度の数字）\n" +
        "3. .env.local に追加:\n" +
        "   GA4_PROPERTY_ID=123456789"
    );
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

// ── Date helpers ──

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function getDateRange(days) {
  const end = new Date();
  end.setDate(end.getDate() - 1); // GA4 データは前日まで比較的信頼できる
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  return { startDate: formatDate(start), endDate: formatDate(end) };
}

// ── Fetch ──

async function fetchGa4(client, propertyId, opts) {
  const dimensionName = DIMENSION_MAP[opts.dimension] || opts.dimension;
  const { startDate, endDate } = getDateRange(opts.days);

  const request = {
    property: propertyId,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: dimensionName }],
    metrics: opts.metrics.map((m) => ({ name: m })),
    limit: opts.limit,
    orderBys: [
      { metric: { metricName: opts.metrics[0] }, desc: true },
    ],
  };

  if (opts.organicOnly) {
    request.dimensionFilter = {
      filter: {
        fieldName: "sessionDefaultChannelGroup",
        stringFilter: { matchType: "EXACT", value: "Organic Search" },
      },
    };
  }

  const [response] = await client.runReport(request);

  const rows = (response.rows || []).map((row) => {
    const out = {
      [opts.dimension]: row.dimensionValues?.[0]?.value || "",
    };
    opts.metrics.forEach((m, i) => {
      const raw = row.metricValues?.[i]?.value;
      out[m] = raw !== undefined ? parseFloat(raw) : null;
    });
    return out;
  });

  return {
    meta: {
      startDate,
      endDate,
      dimension: opts.dimension,
      dimensionApiName: dimensionName,
      metrics: opts.metrics,
      limit: opts.limit,
      organicOnly: opts.organicOnly,
      propertyId,
    },
    rows,
  };
}

// ── Output ──

function printSummary(data) {
  const { meta, rows } = data;
  console.log(`\n期間: ${meta.startDate} 〜 ${meta.endDate}`);
  console.log(`ディメンション: ${meta.dimension} (${meta.dimensionApiName})`);
  if (meta.organicOnly) console.log("フィルタ: Organic Search のみ");
  console.log(`件数: ${rows.length}\n`);

  if (rows.length === 0) {
    console.log("データがありません。");
    return;
  }

  // 合計（累計可能なメトリクスのみ）
  const cumulativeMetrics = ["activeUsers", "sessions", "screenPageViews"];
  const totals = {};
  for (const m of meta.metrics) {
    if (cumulativeMetrics.includes(m)) {
      totals[m] = rows.reduce((acc, r) => acc + (r[m] || 0), 0);
    }
  }
  const totalStr = Object.entries(totals)
    .map(([k, v]) => `${k}: ${v.toLocaleString()}`)
    .join(" / ");
  if (totalStr) console.log(`合計: ${totalStr}\n`);

  // テーブル出力
  const keyWidth = 30;
  const header = [
    "#".padStart(3),
    meta.dimension.padEnd(keyWidth),
    ...meta.metrics.map((m) => m.slice(0, 12).padStart(12)),
  ].join(" | ");
  console.log(header);
  console.log("-".repeat(header.length));

  rows.slice(0, 30).forEach((row, i) => {
    const parts = [
      (i + 1).toString().padStart(3),
      (row[meta.dimension] || "").toString().substring(0, keyWidth).padEnd(keyWidth),
      ...meta.metrics.map((m) => {
        const v = row[m];
        if (v === null || v === undefined) return "-".padStart(12);
        // 割合系は % 表示
        if (m.endsWith("Rate")) return (v * 100).toFixed(1).padStart(11) + "%";
        // 秒数は小数点 1 桁
        if (m.includes("Duration")) return v.toFixed(1).padStart(12);
        return Math.round(v).toLocaleString().padStart(12);
      }),
    ].join(" | ");
    console.log(parts);
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
  const filename = `ga4-${opts.dimension}${opts.organicOnly ? "-organic" : ""}-${timestamp}.json`;
  const filepath = join(OUTPUT_DIR, filename);

  writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`\n出力: ${filepath}`);
}

// ── Main ──

async function main() {
  const opts = parseArgs();

  console.log("Google Analytics 4 データ取得中...");

  const { client, propertyId } = getClient();
  const data = await fetchGa4(client, propertyId, opts);

  printSummary(data);
  saveJson(data, opts);
}

main().catch((e) => {
  const code = e.code || e.details?.code;
  if (code === 7 || e.message?.includes("PERMISSION_DENIED")) {
    console.error(
      "Error: アクセス権がありません。\n" +
        "GA4 プロパティでサービスアカウントに閲覧者権限を付与してください。\n" +
        "また Google Analytics Data API がプロジェクトで有効化されているか確認してください。"
    );
  } else if (code === 16 || e.message?.includes("UNAUTHENTICATED")) {
    console.error("Error: 認証に失敗しました。鍵ファイルを確認してください。");
  } else {
    console.error("Error:", e.message);
    if (e.details) console.error("Details:", e.details);
  }
  process.exit(1);
});
