import { test } from "node:test";
import assert from "node:assert/strict";
import { runReportAll, andFilter, japanFilter } from "../.claude/scripts/lib/ga4-client.mjs";
import { pickGscPage } from "../.claude/scripts/lib/ga4-snapshot.mjs";
import { writeReport } from "../scripts/lib/metric-reports.mjs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

test("pickGscPage skips truncated page reports and picks the latest full one", () => {
  const root = mkdtempSync(join(tmpdir(), "gsc-page-"));
  writeReport(root, "gsc.page", { meta: { truncated: false }, rows: [] }, { stamp: "2026-09-17T23-16-36" });
  writeReport(root, "gsc.page", { meta: { truncated: true }, rows: [] }, { stamp: "2026-09-23T06-54-58" });
  writeReport(root, "gsc.page-query", { meta: { truncated: false }, rows: [] }, { stamp: "2026-09-24T23-16-37" });
  assert.equal(pickGscPage(root), "data/gsc/reports/2026-09-18.json#page");
  assert.equal(pickGscPage(mkdtempSync(join(tmpdir(), "gsc-page-"))), null);
});
