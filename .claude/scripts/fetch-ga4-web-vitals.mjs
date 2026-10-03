#!/usr/bin/env node
/**
 * fetch-ga4-web-vitals.mjs — 実ユーザー計測（RUM）の Core Web Vitals を GA4 から取得する。
 *
 * サイトの src/components/WebVitals.tsx が送る `web_vitals` イベントを
 * pagePath × deviceCategory × metric_name × metric_rating の件数で取り、
 * scripts/lib/web-vitals-rum.mjs でページの型ごとに判定して保存する。
 *
 * 出力: data/rum/web-vitals/YYYY-MM-DD.json（状態 status と集計 summary を持つ）
 *   status: ok | no-events（計装はあるが送信 0 件＝deploy 前など）| dimensions-missing（GA4 にカスタムディメンション未登録）
 * 読み手: npm run report-web-vitals（週次レビュー）。
 *
 * 使い方:
 *   npm run fetch-ga4-web-vitals                # 直近 28 日（既定）
 *   npm run fetch-ga4-web-vitals -- --days 7
 *   npm run fetch-ga4-web-vitals -- --check     # API を呼ばず fixture で集計と書き出し形式だけ確かめる（CI）
 * 環境変数: GOOGLE_SERVICE_ACCOUNT_KEY_PATH / GA4_PROPERTY_ID
 */
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname } from "path";
import dotenv from "dotenv";
import { getDaysRange } from "./lib/ga4-snapshot.mjs";
import { ga4FromEnv, japanFilter, runReportAll, isLimited } from "./lib/ga4-client.mjs";
import { summarize } from "../../scripts/lib/web-vitals-rum.mjs";
import { datasetPath } from "../../scripts/lib/datasets.mjs";
import { todayJst } from "../../scripts/lib/jst-date.mjs";

dotenv.config({ path: ".env.local", quiet: true });

const TAG = "[fetch-ga4-web-vitals]";

function parseArgs(argv) {
  const opts = { days: 28, check: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--days") opts.days = Number(argv[++i]);
    else if (argv[i] === "--check") opts.check = true;
  }
  return opts;
}

const FIXTURE = [
  { path: "/exam/civil-construction-1/guide/strategy", device: "mobile", metric: "LCP", rating: "poor", count: 20 },
  { path: "/exam/civil-construction-1/guide/four-management", device: "mobile", metric: "LCP", rating: "good", count: 15 },
  { path: "/", device: "desktop", metric: "CLS", rating: "good", count: 40 },
];

async function fetchRows(opts) {
  const { client, property } = ga4FromEnv();
  const { startDate, endDate } = getDaysRange(opts.days);
  const request = {
    property,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "pagePath" }, { name: "deviceCategory" }, { name: "customEvent:metric_name" }, { name: "customEvent:metric_rating" }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: {
      andGroup: { expressions: [{ filter: { fieldName: "eventName", stringFilter: { value: "web_vitals" } } }, japanFilter()] },
    },
  };
  const report = await runReportAll(client, request);
  const rows = report.rows.map((r) => ({
    path: r.dimensionValues[0].value,
    device: r.dimensionValues[1].value,
    metric: r.dimensionValues[2].value,
    rating: r.dimensionValues[3].value,
    count: Number(r.metricValues[0].value),
  }));
  return { rows, startDate, endDate, limited: isLimited(report.metadata), truncated: report.truncated };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  let result;
  if (opts.check) {
    result = { rows: FIXTURE, startDate: "fixture", endDate: "fixture", limited: false, truncated: false };
  } else {
    try {
      result = await fetchRows(opts);
    } catch (e) {
      const msg = String(e?.message ?? e);
      if (/credentials-unavailable/.test(msg)) {
        console.error(`${TAG} 検査不成立: ${msg}`);
        return 2;
      }
      if (/metric_name|metric_rating|not a valid dimension|Field customEvent/i.test(msg)) {
        result = { status: "dimensions-missing", error: msg.slice(0, 300), rows: [] };
      } else {
        console.error(`${TAG} 取得失敗: ${msg}`);
        return 1;
      }
    }
  }
  const summary = summarize(result.rows ?? []);
  const status = result.status ?? (summary.events === 0 ? "no-events" : "ok");
  const data = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status,
    window: result.startDate ? { startDate: result.startDate, endDate: result.endDate, days: opts.days } : null,
    limited: result.limited ?? false,
    truncated: result.truncated ?? false,
    error: result.error,
    summary,
  };
  const n = summary.rows.length;
  console.error(`${TAG} 状態 ${status} / イベント ${summary.events} 件（対象外 ${summary.dropped}）/ 組 ${n}（判定できた ${summary.rows.filter((r) => r.status !== "insufficient").length}）`);
  if (opts.check) {
    if (n === 0) {
      console.error(`${TAG} --check: fixture を集計できなかった`);
      return 1;
    }
    console.error(`${TAG} --check: fixture ${FIXTURE.length} 行を集計できた（書き出しなし）`);
    return 0;
  }
  const outPath = datasetPath("rum.web-vitals", { date: todayJst() });
  if (!existsSync(dirname(outPath))) mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(data, null, 2) + "\n");
  console.error(`${TAG} 保存: ${outPath}`);
  return 0;
}

process.exitCode = await main();
