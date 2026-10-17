import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchGscPages } from "../scripts/lib/gsc-pagination.mjs";
import { assessGscPerformanceSnapshot } from "../scripts/lib/gsc-data-integrity.mjs";
import { fetchSearchAnalytics } from "../.claude/skills/analytics/fetch-gsc-data/scripts/fetch-gsc-data.mjs";

test('GSC の全体と明細は同じ国・期間で取得し、要求と応答の集計方式を保存する', async () => {
  const requests = [];
  const api = { searchanalytics: { query: async (req) => {
    requests.push(req);
    return { data: { responseAggregationType: req.requestBody.aggregationType === 'byProperty' ? 'byProperty' : 'byPage', rows: [{ keys: [], clicks: req.requestBody.dimensions.length ? 23 : 303, impressions: 1000, ctr: 0.303, position: 10 }] } };
  } } };
  for (const [dimensions, aggregationType] of [[[], 'byProperty'], [[], 'byPage'], [['page'], 'auto']]) {
    const out = await fetchSearchAnalytics(null, { startDate: '2026-10-05', endDate: '2026-10-11', effectiveDimensions: dimensions, country: 'jpn', aggregationType, all: true }, api);
    assert.equal(out.meta.aggregationType, aggregationType);
    assert.deepEqual(out.meta.dimensions, dimensions);
    assert.deepEqual(out.meta.responseAggregationTypes, [aggregationType === 'byProperty' ? 'byProperty' : 'byPage']);
    assert.equal(out.meta.requests[0].returnedRows, 1);
    assert.equal(out.meta.requests[0].rowLimit, 25000);
    assert.equal(out.meta.row_count, 1);
  }
  assert.equal(requests.length, 3);
  for (const req of requests) {
    assert.equal(req.requestBody.type, 'web');
    assert.equal(req.requestBody.dataState, 'final');
    assert.deepEqual(req.requestBody.dimensionFilterGroups, [{ filters: [{ dimension: 'country', operator: 'equals', expression: 'jpn' }] }]);
  }
});

test("--all相当は最終ページまでstartRowを進め、truncated=false", async () => {
  const calls = [];
  const pages = [[1, 2], [3, 4], [5]];
  const result = await fetchGscPages({
    pageSize: 2,
    fetchPage: async (request) => {
      calls.push(request);
      return pages.shift();
    },
  });
  assert.deepEqual(result.rows, [1, 2, 3, 4, 5]);
  assert.deepEqual(calls.map((call) => call.startRow), [0, 2, 4]);
  assert.equal(result.pagesFetched, 3);
  assert.equal(result.truncated, false);
});

test("有限rowCapを満たす満杯ページはtruncated=true", async () => {
  const result = await fetchGscPages({ rowCap: 2, pageSize: 2, fetchPage: async () => [1, 2] });
  assert.equal(result.truncated, true);
});

test("GSC 0行とtruncatedを偽PASSにしない", () => {
  assert.equal(assessGscPerformanceSnapshot({ meta: { row_count: 0, truncated: false }, rows: [] }, "query").healthy, false);
  assert.equal(assessGscPerformanceSnapshot({ meta: { row_count: 100, truncated: true }, rows: [{}] }, "page").healthy, false);
  assert.equal(assessGscPerformanceSnapshot({ meta: { row_count: 10, truncated: false }, rows: [{}] }, "page").healthy, true);
});
