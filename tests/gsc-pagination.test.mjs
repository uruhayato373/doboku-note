import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchGscPages } from "../scripts/lib/gsc-pagination.mjs";
import { assessGscPerformanceSnapshot } from "../scripts/lib/gsc-data-integrity.mjs";

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
