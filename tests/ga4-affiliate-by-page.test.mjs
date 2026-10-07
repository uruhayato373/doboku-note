/**
 * アフィリエイトのページ別（fetch-ga4-cta-clicks --by-page）の要求・行・型を固定する。
 *
 * 守りたい事故:
 *   - クリックに日付が付かず、A8 の発生日と突き合わせられない
 *   - 表示に日付を付けて行が数万になる（data/ga4/reports が太る）
 *   - クリックと表示の取り違え・窓の外の日付が型を通る
 */
import { strict as assert } from "node:assert";
import test from "node:test";
import {
  buildAffiliateByPageRequests,
  parseAffiliateByPageRows,
  summarizeAffiliateByPage,
} from "../.claude/scripts/lib/ga4-affiliate-by-page.mjs";
import { Ga4Reports } from "../scripts/lib/dataset-schemas-search.mjs";

const dims = (req) => req.dimensions.map((d) => d.name);

test("クリックは日付まで、表示は窓の合計で取り、どちらもアフィリエイトのイベントだけに絞る", () => {
  const { clicks, impressions } = buildAffiliateByPageRequests({ propertyId: "properties/1", startDate: "2026-09-01", endDate: "2026-10-07", japanOnly: true });
  assert.deepEqual(dims(clicks), ["pagePath", "customEvent:event_label", "customEvent:cta_placement", "date"]);
  assert.deepEqual(dims(impressions), ["pagePath", "customEvent:event_label", "customEvent:cta_placement"]);
  const eventOf = (req) => req.dimensionFilter.andGroup.expressions[0].filter.stringFilter.value;
  assert.equal(eventOf(clicks), "affiliate_cta_click");
  assert.equal(eventOf(impressions), "affiliate_cta_impression");
  const all = buildAffiliateByPageRequests({ propertyId: "p", startDate: "a", endDate: "b", japanOnly: false });
  assert.equal(all.clicks.dimensionFilter.filter.stringFilter.value, "affiliate_cta_click", "国で絞らなければイベントの条件 1 つだけ");
});

test("行は日付を YYYY-MM-DD にし、表示の date は null", () => {
  const r = (vals, n) => ({ dimensionValues: vals.map((value) => ({ value })), metricValues: [{ value: String(n) }] });
  const rows = parseAffiliateByPageRows(
    [r(["/exam/civil-construction-1/secondary/r07", "ビルドジョブ", "article-inline", "20260928"], 2)],
    [r(["/exam/civil-construction-1/secondary/r07", "ビルドジョブ", "article-inline"], 300)],
  );
  assert.deepEqual(rows[0], { page: "/exam/civil-construction-1/secondary/r07", label: "ビルドジョブ", placement: "article-inline", date: "2026-09-28", eventName: "affiliate_cta_click", eventCount: 2 });
  assert.equal(rows[1].date, null);
  assert.deepEqual(summarizeAffiliateByPage(rows), { clicks: 2, impressions: 300, clickPages: 1 });
});

test("型: クリックの日付は必須で窓の中、表示は日付なし、同じ行は 1 つ", () => {
  const day = (rows) => ({
    schemaVersion: 1,
    source: "ga4",
    date: "2026-10-08",
    reports: {
      "affiliate-by-page": {
        stamp: "2026-10-08T00-00-00",
        meta: { startDate: "2026-09-10", endDate: "2026-10-07", windowKind: "days", mode: "affiliate-by-page", japanOnly: true, propertyId: "properties/123", rowCount: rows.length, truncated: false },
        rows,
      },
    },
  });
  const click = { page: "/a", label: "ビルドジョブ", placement: "article-inline", date: "2026-09-28", eventName: "affiliate_cta_click", eventCount: 1 };
  const imp = { ...click, date: null, eventName: "affiliate_cta_impression", eventCount: 10 };
  assert.ok(Ga4Reports.safeParse(day([click, imp])).success, "正しい形は通る");
  assert.ok(!Ga4Reports.safeParse(day([{ ...click, date: null }])).success, "日付の無いクリックは通さない");
  assert.ok(!Ga4Reports.safeParse(day([{ ...imp, date: "2026-09-28" }])).success, "日付のある表示は通さない");
  assert.ok(!Ga4Reports.safeParse(day([{ ...click, date: "2026-10-20" }])).success, "窓の外の日付は通さない");
  assert.ok(!Ga4Reports.safeParse(day([click, click])).success, "同じ行の重複は通さない");
});
