/**
 * GA4 から収益 CTA クリック（note 有料マガジン / アフィリエイト）をページ別に取得する。
 *
 * AnalyticsProvider のデリゲートリスナーが発火する 2 イベントを集計する:
 *   - note_cta_click       (event_category: note-magazine)
 *   - affiliate_cta_click  (event_category: affiliate)
 *
 * GA4 はイベントに pagePath を自動付与するため、カスタムディメンション登録なしで
 * 「eventName × pagePath」の 2 ディメンションレポートが取れる。これが
 * report-monetization-coverage.mts の CTR 分子になる。
 *
 * 使い方:
 *   npm run fetch-ga4-cta-clicks                 # 過去28日（既定）
 *   npm run fetch-ga4-cta-clicks -- --days 7     # 過去7日
 *
 * 認証は fetch-ga4-data.mjs と同じサービスアカウント鍵（.env.local）。
 * 計測は本番（NODE_ENV=production）でのみ発火するため、デプロイ後に
 * ユーザークリックが蓄積してから値が入る（導入直後は 0 件が正常）。
 */
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const OUTPUT_DIR = ".claude/state/metrics/ga4";
const DEFAULT_DAYS = 28;
const EVENT_NAMES = ["note_cta_click", "affiliate_cta_click"];

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { days: DEFAULT_DAYS, japanOnly: true };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--days":
        opts.days = parseInt(args[++i], 10);
        break;
      case "--no-japan-only":
        opts.japanOnly = false;
        break;
    }
  }
  return opts;
}

function getClient() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!keyPath || !propertyId) {
    console.error(
      "Error: GOOGLE_SERVICE_ACCOUNT_KEY_PATH / GA4_PROPERTY_ID が .env.local に未設定です。",
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

function formatDate(d) {
  return d.toISOString().split("T")[0];
}

function getDateRange(days) {
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  return { startDate: formatDate(start), endDate: formatDate(end) };
}

async function fetchCtaClicks(client, propertyId, opts) {
  const { startDate, endDate } = getDateRange(opts.days);

  const andFilters = [
    {
      filter: {
        fieldName: "eventName",
        inListFilter: { values: EVENT_NAMES },
      },
    },
  ];
  if (opts.japanOnly) {
    andFilters.push({
      filter: {
        fieldName: "country",
        stringFilter: { matchType: "EXACT", value: "Japan" },
      },
    });
  }

  const request = {
    property: propertyId,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "pagePath" }, { name: "eventName" }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: { andGroup: { expressions: andFilters } },
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    limit: 1000,
  };

  const [response] = await client.runReport(request);
  const rows = (response.rows || []).map((row) => ({
    page: row.dimensionValues?.[0]?.value || "",
    eventName: row.dimensionValues?.[1]?.value || "",
    eventCount: parseInt(row.metricValues?.[0]?.value || "0", 10),
  }));

  return {
    meta: {
      startDate,
      endDate,
      eventNames: EVENT_NAMES,
      japanOnly: opts.japanOnly,
      propertyId,
    },
    rows,
  };
}

async function main() {
  const opts = parseArgs();
  const { client, propertyId } = getClient();
  const data = await fetchCtaClicks(client, propertyId, opts);

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outPath = join(OUTPUT_DIR, `ga4-cta-clicks-${stamp}.json`);
  writeFileSync(outPath, JSON.stringify(data, null, 2));

  console.log(`\n期間: ${data.meta.startDate} 〜 ${data.meta.endDate}`);
  console.log(`イベント: ${EVENT_NAMES.join(", ")}`);
  console.log(`件数: ${data.rows.length}`);
  if (data.rows.length === 0) {
    console.log(
      "（0 件。導入直後・未デプロイ・本番クリック未蓄積のいずれかなら正常）",
    );
  } else {
    const total = data.rows.reduce((s, r) => s + r.eventCount, 0);
    const note = data.rows
      .filter((r) => r.eventName === "note_cta_click")
      .reduce((s, r) => s + r.eventCount, 0);
    console.log(`合計クリック: ${total}（note ${note} / affiliate ${total - note}）`);
  }
  console.log(`出力: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
