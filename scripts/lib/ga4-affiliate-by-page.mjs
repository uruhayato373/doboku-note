/**
 * アフィリエイトの表示・クリックをページ × ラベル × 面で取る（fetch-ga4-cta-clicks --by-page）の要求組み立てと行の正規化。
 *
 * 既存の by-label・by-placement は「1 次元 × eventName」なので、どのページのどの広告が押されたかが分からなかった
 * （2026-10 の A8 発生 1 件の出どころを辿れなかった）。event_label（2026-07-07 登録）と cta_placement（2026-07-25 登録）は
 * 登録済みのカスタムディメンションなので、登録日以降ならさかのぼって取れる。
 * - クリック: pagePath × event_label × cta_placement × date（日付まで。成果の発生日と突き合わせる）
 * - 表示: pagePath × event_label × cta_placement（窓の合計。日付を付けると行が数万になる）
 */
import { japanFilter, andFilter } from "./ga4-client.mjs";

export const CLICK_EVENT = "affiliate_cta_click";
export const IMPRESSION_EVENT = "affiliate_cta_impression";

const eventIs = (name) => ({ filter: { fieldName: "eventName", stringFilter: { value: name } } });

/**
 * @param {{ propertyId: string, startDate: string, endDate: string, japanOnly: boolean }} p
 * @returns {{ clicks: object, impressions: object }} runReportAll に渡す 2 つの要求
 */
export function buildAffiliateByPageRequests({ propertyId, startDate, endDate, japanOnly }) {
  const base = (event, withDate) => ({
    property: propertyId,
    dateRanges: [{ startDate, endDate }],
    dimensions: [
      { name: "pagePath" },
      { name: "customEvent:event_label" },
      { name: "customEvent:cta_placement" },
      ...(withDate ? [{ name: "date" }] : []),
    ],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: andFilter([eventIs(event), japanOnly ? japanFilter() : null]),
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
  });
  return { clicks: base(CLICK_EVENT, true), impressions: base(IMPRESSION_EVENT, false) };
}

/** GA4 の date（YYYYMMDD）→ YYYY-MM-DD */
const isoDate = (v) => (/^\d{8}$/.test(v) ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : v);

/**
 * 2 つの応答の行を 1 つの並びにする。クリックは date を持ち、表示は date が null。
 * @returns {{page: string, label: string, placement: string, date: string|null, eventName: string, eventCount: number}[]}
 */
export function parseAffiliateByPageRows(clickRows, impressionRows) {
  const dim = (row, i) => row.dimensionValues?.[i]?.value ?? "";
  const n = (row) => parseInt(row.metricValues?.[0]?.value ?? "0", 10) || 0;
  return [
    ...clickRows.map((row) => ({
      page: dim(row, 0),
      label: dim(row, 1),
      placement: dim(row, 2),
      date: isoDate(dim(row, 3)),
      eventName: CLICK_EVENT,
      eventCount: n(row),
    })),
    ...impressionRows.map((row) => ({
      page: dim(row, 0),
      label: dim(row, 1),
      placement: dim(row, 2),
      date: null,
      eventName: IMPRESSION_EVENT,
      eventCount: n(row),
    })),
  ];
}

/** 合計（出力の確認用） */
export function summarizeAffiliateByPage(rows) {
  const sum = (ev) => rows.filter((r) => r.eventName === ev).reduce((s, r) => s + r.eventCount, 0);
  return {
    clicks: sum(CLICK_EVENT),
    impressions: sum(IMPRESSION_EVENT),
    clickPages: new Set(rows.filter((r) => r.eventName === CLICK_EVENT).map((r) => r.page)).size,
  };
}
