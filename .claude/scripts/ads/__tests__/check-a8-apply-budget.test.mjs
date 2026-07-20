import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const budget = require("../check-a8-apply-budget.cjs");

const curated = { weeklyApplyMax: 3 };

/** applied 遷移を history に持つ catalog を組む。 */
function catalogWithApplies(dates) {
  const entries = {};
  dates.forEach((at, i) => {
    entries[`p${i}`] = {
      status: "applied",
      history: [
        { from: "candidate", to: "candidate", at: "2026-07-01T00:00:00Z" },
        { from: "candidate", to: "applied", at },
      ],
    };
  });
  return { entries };
}

test("appliedDates: applied 遷移の JST 日付のみ", () => {
  const cat = catalogWithApplies(["2026-07-13T23:00:00Z", "2026-07-14T00:00:00Z"]);
  const dates = budget.appliedDates(cat);
  // 2026-07-13T23:00Z = JST 07-14 08:00, 2026-07-14T00:00Z = JST 07-14 09:00
  assert.deepEqual(dates.sort(), ["2026-07-14", "2026-07-14"]);
});

test("isoWeekStart: 週の月曜 (JST)", () => {
  // 2026-07-19 は日曜 → その週の月曜は 2026-07-13
  assert.equal(budget.isoWeekStart("2026-07-19"), "2026-07-13");
  assert.equal(budget.isoWeekStart("2026-07-13"), "2026-07-13");
});

test("weekAppliedCount: 同一週の申請を数える", () => {
  const cat = catalogWithApplies([
    "2026-07-13T01:00:00Z", // JST 07-13 10:00 (同週)
    "2026-07-15T01:00:00Z", // JST 07-15 (同週)
    "2026-07-21T01:00:00Z", // JST 07-21 (翌週)
  ]);
  assert.equal(budget.weekAppliedCount(cat, "2026-07-16"), 2);
  assert.equal(budget.weekAppliedCount(cat, "2026-07-22"), 1);
});

test("applyBudget: 上限未満 ok / 到達で ok:false", () => {
  const cat = catalogWithApplies([
    "2026-07-13T01:00:00Z",
    "2026-07-14T01:00:00Z",
  ]);
  const b1 = budget.applyBudget(cat, "2026-07-16", curated);
  assert.equal(b1.ok, true);
  assert.equal(b1.weekCount, 2);
  assert.equal(b1.remaining, 1);

  const cat3 = catalogWithApplies([
    "2026-07-13T01:00:00Z",
    "2026-07-14T01:00:00Z",
    "2026-07-15T01:00:00Z",
  ]);
  const b2 = budget.applyBudget(cat3, "2026-07-16", curated);
  assert.equal(b2.ok, false);
  assert.equal(b2.remaining, 0);
});

test("loadCatalog: 無ければ空 entries", () => {
  // 実ファイルは存在しないかもしれない → 壊れず {entries:{}} を返すこと
  const cat = budget.loadCatalog();
  assert.ok(cat && typeof cat.entries === "object");
});
