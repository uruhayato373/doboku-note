/**
 * GA4 Data API の共通部品（認証・既定フィルタ・全件ページング）。
 *
 * 既定フィルタ（country=Japan・参照スパム除外）の真実源。スパム参照元が追加で判明したら
 * SPAM_REFERRAL_SOURCES に追記する（GA4 プロパティ側の参照除外と二重防御）。
 * 出典: measurement-incidents.md 2026-04-26 GA4 direct US bot、2026-05-17 source 監査。
 */
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { readFileSync, existsSync } from "fs";

export const SPAM_REFERRAL_SOURCES = [
  "(not set)",
  "ntp.msn.com",
  "statics.teams.cdn.office.net",
  "hustler.zenhp.co.jp",
  "mobilesecurity.trendmicro.com",
];

export const japanFilter = () => ({
  filter: { fieldName: "country", stringFilter: { matchType: "EXACT", value: "Japan" } },
});

export const spamExclusion = () => ({
  notExpression: {
    filter: { fieldName: "sessionSource", inListFilter: { values: SPAM_REFERRAL_SOURCES } },
  },
});

/** 式が 0 件なら undefined、1 件ならそのまま、2 件以上なら andGroup にする。 */
export function andFilter(expressions) {
  const list = expressions.filter(Boolean);
  if (list.length === 0) return undefined;
  if (list.length === 1) return list[0];
  return { andGroup: { expressions: list } };
}

/** 環境変数のサービスアカウント鍵から Data API クライアントを作る。未設定は credentials-unavailable で throw。 */
export function ga4FromEnv(env = process.env) {
  const keyPath = env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  const propertyId = env.GA4_PROPERTY_ID;
  if (!keyPath || !propertyId) {
    throw new Error("credentials-unavailable: GOOGLE_SERVICE_ACCOUNT_KEY_PATH / GA4_PROPERTY_ID が未設定です");
  }
  if (!existsSync(keyPath)) throw new Error(`credentials-unavailable: 鍵ファイルが見つかりません: ${keyPath}`);
  const credentials = JSON.parse(readFileSync(keyPath, "utf-8"));
  return { client: new BetaAnalyticsDataClient({ credentials }), property: `properties/${propertyId}`, credentials };
}

/**
 * runReport を rowCount まで offset でページングする。
 * `limit: 1000` 固定で CTA クリックが無言で打ち切られていた欠陥（2026-09 発覚）の是正。
 * maxRows に達したら打ち切り、`truncated: true` を返して呼び出し側が meta に残す。
 *
 * dimensionHeaders は複数 dateRanges のとき API が末尾に足す `dateRange` 列の位置を名前で引くために返す。
 *
 * @returns {Promise<{rows: object[], rowCount: number, truncated: boolean, metadata: object|null, dimensionHeaders: string[], metricHeaders: string[]}>}
 */
export async function runReportAll(client, request, { pageSize = 10000, maxRows = 100000 } = {}) {
  const rows = [];
  let rowCount = null;
  let metadata = null;
  let dimensionHeaders = [];
  let metricHeaders = [];
  for (let offset = 0; ; ) {
    const [res] = await client.runReport({ ...request, limit: pageSize, offset });
    const page = res.rows || [];
    if (rowCount === null) {
      rowCount = Number(res.rowCount ?? page.length);
      metadata = res.metadata ?? null;
      dimensionHeaders = (res.dimensionHeaders ?? []).map((h) => h.name);
      metricHeaders = (res.metricHeaders ?? []).map((h) => h.name);
    }
    rows.push(...page);
    offset += page.length;
    if (page.length === 0 || offset >= rowCount || rows.length >= maxRows) break;
  }
  return { rows, rowCount, truncated: rows.length < rowCount, metadata, dimensionHeaders, metricHeaders };
}

/** thresholding / sampling が掛かった集計か（掛かっていれば coverage は partial として扱う）。 */
export const isLimited = (metadata) =>
  Boolean(metadata?.subjectToThresholding || metadata?.samplingMetadatas?.length || metadata?.dataLossFromOtherRow);
