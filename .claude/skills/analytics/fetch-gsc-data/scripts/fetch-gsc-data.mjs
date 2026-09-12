/**
 * Google Search Console データ取得スクリプト
 *
 * Usage:
 *   npm run fetch-gsc-data                              # 過去28日、クエリ別（上位100）
 *   npm run fetch-gsc-data -- --days 7                  # 過去7日
 *   npm run fetch-gsc-data -- --dimension page          # ページ別（単一ディメンション・後方互換）
 *   npm run fetch-gsc-data -- --dimensions page,query   # ページ×クエリ（複数ディメンション）
 *   npm run fetch-gsc-data -- --dimensions page,query --all  # 全行（25,000 件単位でページング）
 *   npm run fetch-gsc-data -- --limit 5000             # 総行数上限 5,000（25,000 超で自動ページング）
 *   npm run fetch-gsc-data -- --query "技術士"          # クエリフィルタ
 *   npm run fetch-gsc-data -- --page "/docs/"           # URLフィルタ（部分一致）
 *
 * 注意: Search Analytics API は全行の返却を保証しない（sampling / privacy filtering で欠落し得る）。
 *       cannibalization / content-decay 分析には page×query を週次で取得する（fetch-metrics.yml）。
 */

import { google } from "googleapis";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, resolve } from "path";
import { pathToFileURL } from "node:url";
import { getDateRange, validateRange } from "../../../../../scripts/lib/gsc-date-range.mjs";
import dotenv from "dotenv";
import { fetchGscPages } from "../../../../../scripts/lib/gsc-pagination.mjs";



// ── Config ──

const SITE_URL = "sc-domain:doboku-note.com";
const OUTPUT_DIR = ".claude/state/metrics/gsc";
const DEFAULT_DAYS = 28;
const DEFAULT_LIMIT = 100;
const DEFAULT_DIMENSION = "query";
/** Search Analytics API の 1 リクエストあたり最大行数。 */
const API_PAGE_SIZE = 25000;

// ── CLI args ──

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    days: DEFAULT_DAYS,
    dimensions: null, // 複数ディメンション（--dimensions 指定時）
    dimension: DEFAULT_DIMENSION, // 後方互換の単一ディメンション
    limit: DEFAULT_LIMIT,
    all: false,
    query: null,
    page: null,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--start-date":
        opts.startDate = args[++i]; break;
      case "--end-date":
        opts.endDate = args[++i]; break;
      case "--exact":
        opts.exact = true; break;
      case "--country":
        opts.country = args[++i]; break;
      case "--device":
        opts.device = args[++i]; break;
      case "--days":
        opts.days = parseInt(args[++i], 10);
        break;
      case "--dimension":
        opts.dimension = args[++i];
        break;
      case "--dimensions":
        // カンマ区切り（例: page,query）。前後空白を除去。
        opts.dimensions = args[++i]
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        break;
      case "--limit":
        opts.limit = parseInt(args[++i], 10);
        break;
      case "--all":
        opts.all = true;
        break;
      case "--query":
        opts.query = args[++i];
        break;
      case "--page":
        opts.page = args[++i];
        break;
      default:
        throw new Error(`Unknown argument: ${args[i]}`);
    }
  }

  // 実効ディメンション配列を確定（--dimensions 優先・無ければ単一 --dimension）。
  opts.effectiveDimensions =
    opts.dimensions && opts.dimensions.length > 0
      ? opts.dimensions
      : [opts.dimension];

  if (!Number.isInteger(opts.limit) || opts.limit < 1) throw new Error("Invalid limit");
  getDateRange(opts.days);
  return opts;
}

// ── Auth ──

export function getAuth() {
  dotenv.config({ path: ".env.local", quiet: true });
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;

  if (!keyPath || !existsSync(keyPath)) throw new Error("GSC credential file unavailable; check GOOGLE_SERVICE_ACCOUNT_KEY_PATH");

  const key = JSON.parse(readFileSync(keyPath, "utf-8"));

  return new google.auth.GoogleAuth({
    credentials: key,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
}

// ── Fetch ──

export async function fetchSearchAnalytics(auth, opts, searchconsole = google.searchconsole({ version: "v1", auth })) {
  const { startDate, endDate } = opts.startDate || opts.endDate
    ? validateRange(opts.startDate, opts.endDate) : getDateRange(opts.days);
  const dimensions = opts.effectiveDimensions;

  // 総行数上限: --all なら無制限、そうでなければ --limit。
  const rowCap = opts.all ? Infinity : opts.limit;

  const dimensionFilters = [];
  if (opts.query) {
    dimensionFilters.push({ dimension: "query", operator: opts.exact ? "equals" : "contains", expression: opts.query });
  }
  if (opts.page) {
    dimensionFilters.push({ dimension: "page", operator: opts.exact ? "equals" : "contains", expression: opts.page });
  }
  for (const dimension of ["country", "device"]) {
    if (opts[dimension]) dimensionFilters.push({ dimension, operator: "equals", expression: opts[dimension] });
  }
  const filterGroups =
    dimensionFilters.length > 0 ? [{ filters: dimensionFilters }] : undefined;

  const paged = await fetchGscPages({
    rowCap,
    pageSize: API_PAGE_SIZE,
    fetchPage: async ({ startRow, rowLimit }) => {
      const requestBody = { startDate, endDate, dimensions, rowLimit, startRow, dataState: "final", type: "web" };
      if (filterGroups) requestBody.dimensionFilterGroups = filterGroups;
      const res = await searchconsole.searchanalytics.query({ siteUrl: SITE_URL, requestBody });
      return res.data.rows || [];
    },
  });

  return {
    meta: {
      siteUrl: SITE_URL,
      dataState: "final",
      type: "web",
      timeZone: "America/Los_Angeles",
      filters: dimensionFilters,
      startDate,
      endDate,
      dimensions,
      // 後方互換: 単一ディメンション時は従来どおり dimension も残す。
      ...(dimensions.length === 1 ? { dimension: dimensions[0] } : {}),
      limit: opts.all ? null : opts.limit,
      pages_fetched: paged.pagesFetched,
      row_count: paged.rows.length,
      truncated: paged.truncated,
      api_note:
        "Search Analytics API は全行の返却を保証しない（sampling / privacy filtering で低ボリューム行が欠落し得る）。" +
        "row_count は startRow ページングの合算実測値であり、母集合全体とは限らない。",
    },
    rows: paged.rows,
  };
}

// ── Output ──

function printSummary(data) {
  const { meta, rows } = data;
  const dimLabel = (meta.dimensions || [meta.dimension]).join(" × ");
  console.log(`\n期間: ${meta.startDate} 〜 ${meta.endDate}`);
  console.log(`ディメンション: ${dimLabel}`);
  console.log(`件数: ${rows.length}（pages=${meta.pages_fetched}${meta.truncated ? " / truncated" : ""}）\n`);

  if (rows.length === 0) {
    console.log("データがありません。");
    return;
  }

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

  const header = `${"#".padStart(3)} | ${dimLabel.substring(0, 50).padEnd(50)} | ${"clicks".padStart(7)} | ${"impr".padStart(7)} | ${"CTR".padStart(6)} | ${"pos".padStart(5)}`;
  console.log(header);
  console.log("-".repeat(header.length));

  rows.slice(0, 30).forEach((row, i) => {
    const key = (row.keys || []).join(" | ").substring(0, 50).padEnd(50);
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

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  // 複数ディメンションは page,query → gsc-page-query-{ts}.json（metrics-analyzer が参照）。
  const dimSlug = opts.effectiveDimensions.join("-");
  const filename = `gsc-${dimSlug}-${timestamp}.json`;
  const filepath = join(OUTPUT_DIR, filename);

  writeFileSync(filepath, JSON.stringify(data, null, 2) + "\n", { encoding: "utf-8", flag: "wx" });
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

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((e) => {
  if (e.code === 403) {
    console.error(
      "Error: アクセス権がありません。\n" +
        "GSCプロパティにサービスアカウントのメールアドレスを追加してください。"
    );
  } else if (e.code === 401) {
    console.error("Error: 認証に失敗しました。鍵ファイルを確認してください。");
  } else {
    console.error("GSC fetch failed. Check arguments, credentials and connectivity (response details withheld).");
  }
  process.exit(1);
});
