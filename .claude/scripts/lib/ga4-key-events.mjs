/**
 * ページ別のキーイベント率（fetch-ga4-cta-clicks --key-events）の要求組み立てと行の正規化。
 *
 * GA4 Data API の標準指標 sessions / keyEvents / sessionKeyEventRate を pagePath 別に取る。
 * キーイベントの定義（どのイベントを数えるか）は GA4 プロパティ側が真実源
 * （`.claude/config/ga4-admin-desired-state.json`）。ここではイベント名で絞らない。
 * sessionKeyEventRate は API が 0〜1 の小数で返す（％ではない）。
 */
import { japanFilter, spamExclusion, andFilter } from "./ga4-client.mjs";

export const KEY_EVENT_METRICS = ["sessions", "keyEvents", "sessionKeyEventRate"];

/**
 * @param {{ propertyId: string, startDate: string, endDate: string, japanOnly: boolean }} p
 */
export function buildKeyEventsByPageRequest({ propertyId, startDate, endDate, japanOnly }) {
  // 分母が sessions なので、fetch-ga4-data の既定と同じく参照スパムを常に除く（country は --no-japan-only で外せる）。
  const dimensionFilter = andFilter([japanOnly ? japanFilter() : null, spamExclusion()]);
  return {
    property: propertyId,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "pagePath" }],
    metrics: KEY_EVENT_METRICS.map((name) => ({ name })),
    ...(dimensionFilter ? { dimensionFilter } : {}),
    orderBys: [{ metric: { metricName: "keyEvents" }, desc: true }],
  };
}

/**
 * runReportAll の行を {page, sessions, keyEvents, sessionKeyEventRate} にする。
 * 列は metricHeaders の名前で引く（API が順序を保証していても、位置決め打ちで取り違えない）。
 */
export function parseKeyEventsByPageRows(rows, metricHeaders = KEY_EVENT_METRICS) {
  const idx = Object.fromEntries(KEY_EVENT_METRICS.map((m) => [m, metricHeaders.indexOf(m)]));
  const missing = KEY_EVENT_METRICS.filter((m) => idx[m] < 0);
  if (missing.length) throw new Error(`key-events: 応答に指標がありません: ${missing.join(", ")}`);
  const num = (row, m) => Number(row.metricValues?.[idx[m]]?.value ?? 0) || 0;
  return rows.map((row) => ({
    page: row.dimensionValues?.[0]?.value || "",
    sessions: num(row, "sessions"),
    keyEvents: num(row, "keyEvents"),
    sessionKeyEventRate: num(row, "sessionKeyEventRate"),
  }));
}

/** 全ページ合計（ページ間でセッションが重複するため sessions 合計はサイトのセッション数ではない）。 */
export function summarizeKeyEvents(rows) {
  const sessions = rows.reduce((s, r) => s + r.sessions, 0);
  const keyEvents = rows.reduce((s, r) => s + r.keyEvents, 0);
  const pagesWithKeyEvents = rows.filter((r) => r.keyEvents > 0).length;
  return { pages: rows.length, pagesWithKeyEvents, sessions, keyEvents };
}
