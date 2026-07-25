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
 *   npm run fetch-ga4-cta-clicks                 # 過去28日（既定・eventName × pagePath）
 *   npm run fetch-ga4-cta-clicks -- --days 7     # 過去7日
 *   npm run fetch-ga4-cta-clicks -- --by-device  # eventName × deviceCategory（モバイル vs PC の CTA クリック）
 *                                                #   → ga4-cta-clicks-by-device-*.json（既定の page 別とは別ファイル・downstream 非破壊）
 *   npm run fetch-ga4-cta-clicks -- --by-label   # eventName × event_label（プログラム/面別＝BuildJob-sidebar 等）
 *                                                #   → ga4-cta-clicks-by-label-*.json。要 GA4 カスタムディメンション
 *                                                #     （イベントスコープ・パラメータ event_label）を先に管理画面で登録。
 *                                                #     未登録なら API がエラー→登録手順を表示して exit 0（CI 非破壊）。
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
const EVENT_NAMES = [
  "note_cta_click",
  "affiliate_cta_click",
  "affiliate_cta_impression",
  "note_article_click",
];

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    days: DEFAULT_DAYS,
    japanOnly: true,
    byDevice: false,
    byLabel: false,
    byPlacement: false,
  };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--days":
        opts.days = parseInt(args[++i], 10);
        break;
      case "--no-japan-only":
        opts.japanOnly = false;
        break;
      case "--by-device":
        // pagePath の代わりに deviceCategory を 2 つ目の dimension にする。
        // モバイル/PC 別の CTA クリックを取り、device 別 sessions（fetch-ga4-data --dimension device）を
        // 分母にしてデバイス別 CTR を出す。downstream（report-monetization-coverage = page 別）は非破壊。
        opts.byDevice = true;
        break;
      case "--by-label":
        // pagePath の代わりに event_label（=data-cta-label＝プログラム/面）を 2 つ目の dimension に。
        // BuildJob-sidebar / KensetsuJobs-sidebar / BuildJob-midtext / ビルドジョブ 等のプログラム×面別
        // クリック内訳を取り、アフィリ EPC 判定（建設JOBs vs BuildJob）の分子にする。別ファイル・非破壊。
        opts.byLabel = true;
        break;
      case "--by-placement":
        // アフィリエイトの可視 impression / click を配置別に取得する。
        // GA4 にイベントスコープの cta_placement カスタムディメンション登録が必要。
        opts.byPlacement = true;
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

  // event_label は GA4 のイベントスコープ カスタムディメンション（パラメータ event_label）として
  // 管理画面で登録済みの場合のみ customEvent:event_label で取得できる（未登録なら API がエラー）。
  const firstDim = opts.byPlacement
    ? "customEvent:cta_placement"
    : opts.byLabel
    ? "customEvent:event_label"
    : opts.byDevice
      ? "deviceCategory"
      : "pagePath";
  const rowKey = opts.byPlacement
    ? "placement"
    : opts.byLabel
      ? "label"
      : opts.byDevice
        ? "device"
        : "page";
  const request = {
    property: propertyId,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: firstDim }, { name: "eventName" }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: { andGroup: { expressions: andFilters } },
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    limit: 1000,
  };

  const [response] = await client.runReport(request);
  const rows = (response.rows || []).map((row) => ({
    [rowKey]: row.dimensionValues?.[0]?.value || "",
    eventName: row.dimensionValues?.[1]?.value || "",
    eventCount: parseInt(row.metricValues?.[0]?.value || "0", 10),
  }));

  return {
    meta: {
      startDate,
      endDate,
      eventNames: EVENT_NAMES,
      japanOnly: opts.japanOnly,
      byDevice: opts.byDevice,
      byLabel: opts.byLabel,
      byPlacement: opts.byPlacement,
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
  const variant = opts.byPlacement
    ? "-by-placement"
    : opts.byLabel
      ? "-by-label"
      : opts.byDevice
        ? "-by-device"
        : "";
  const outPath = join(OUTPUT_DIR, `ga4-cta-clicks${variant}-${stamp}.json`);
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
    const impressions = data.rows
      .filter((r) => r.eventName === "affiliate_cta_impression")
      .reduce((s, r) => s + r.eventCount, 0);
    console.log(`合計イベント: ${total}（note click ${note} / affiliate impression ${impressions}）`);
  }
  console.log(`出力: ${outPath}`);
}

main().catch((e) => {
  // --by-label はカスタムディメンション未登録だと GA4 が「customEvent:event_label」不明で失敗する。
  // その場合は登録手順を示して exit 0（CI の他 step を止めない・continue-on-error 前提だが明示）。
  const msg = String(e?.message || e);
  if (/customEvent:(event_label|cta_placement)|not.*valid.*dimension|did not match/i.test(msg)) {
    const parameter = process.argv.includes("--by-placement") ? "cta_placement" : "event_label";
    console.warn(
      `[fetch-ga4-cta-clicks] ${parameter} は GA4 カスタムディメンション未登録のためスキップ。\n` +
        "  GA4 管理画面 → 管理 → データ表示 → カスタム定義 → カスタムディメンション作成:\n" +
        `    範囲=イベント / イベントパラメータ=${parameter} / 表示名=${parameter}\n` +
        "  登録後 最大 48h で反映し、以降の by-label 取得が有効になる（登録前データは遡及不可）。",
    );
    process.exit(0);
  }
  console.error(e);
  process.exit(1);
});
