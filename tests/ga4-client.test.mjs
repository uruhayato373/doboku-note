import { test } from "node:test";
import assert from "node:assert/strict";
import { runReportAll, andFilter, japanFilter } from "../.claude/scripts/lib/ga4-client.mjs";
import { pickGscPage } from "../.claude/scripts/lib/ga4-snapshot.mjs";

function fakeClient(total) {
  const calls = [];
  return {
    calls,
    async runReport(req) {
      calls.push({ limit: req.limit, offset: req.offset });
      const rows = [];
      for (let i = req.offset; i < Math.min(total, req.offset + req.limit); i++) rows.push({ i });
      return [{ rows, rowCount: total, metadata: { subjectToThresholding: false } }];
    },
  };
}

test("runReportAll pages until rowCount instead of stopping at the first page", async () => {
  const c = fakeClient(2500);
  const r = await runReportAll(c, { property: "properties/1" }, { pageSize: 1000 });
  assert.equal(r.rows.length, 2500);
  assert.equal(r.rowCount, 2500);
  assert.equal(r.truncated, false);
  assert.deepEqual(c.calls.map((x) => x.offset), [0, 1000, 2000]);
});

test("runReportAll reports truncation when maxRows is reached", async () => {
  const r = await runReportAll(fakeClient(5000), {}, { pageSize: 1000, maxRows: 2000 });
  assert.equal(r.rows.length, 2000);
  assert.equal(r.truncated, true);
});

test("runReportAll handles an empty report", async () => {
  const r = await runReportAll(fakeClient(0), {});
  assert.deepEqual([r.rows.length, r.rowCount, r.truncated], [0, 0, false]);
});

test("andFilter collapses 0/1/n expressions", () => {
  assert.equal(andFilter([]), undefined);
  assert.deepEqual(andFilter([japanFilter()]), japanFilter());
  assert.equal(andFilter([japanFilter(), japanFilter()]).andGroup.expressions.length, 2);
});

test("pickGscPage skips page×query and truncated page snapshots", () => {
  const metas = {
    "gsc-page-2026-09-17T23-16-36.json": { truncated: false },
    "gsc-page-2026-09-23T06-54-58.json": { truncated: true },
    "gsc-page-query-2026-09-17T23-16-37.json": { truncated: false },
    "gsc-query-2026-09-17T23-16-35.json": { truncated: false },
  };
  assert.equal(pickGscPage(Object.keys(metas), (n) => metas[n]), "gsc-page-2026-09-17T23-16-36.json");
  assert.equal(pickGscPage(["gsc-page-query-2026-09-17T23-16-37.json"], () => ({})), null);
  // 読めないファイルは飛ばして古い方へ
  assert.equal(
    pickGscPage(["gsc-page-2026-09-10T00-00-00.json", "gsc-page-2026-09-17T00-00-00.json"], (n) => (n.includes("09-17") ? null : {})),
    "gsc-page-2026-09-10T00-00-00.json",
  );
});
