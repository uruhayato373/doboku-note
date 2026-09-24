import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildKeyEventsByPageRequest,
  parseKeyEventsByPageRows,
  summarizeKeyEvents,
} from "../.claude/scripts/lib/ga4-key-events.mjs";

const row = (page, values) => ({
  dimensionValues: [{ value: page }],
  metricValues: values.map((value) => ({ value: String(value) })),
});

test("request uses pagePath with the three standard metrics and always excludes referral spam", () => {
  const req = buildKeyEventsByPageRequest({
    propertyId: "properties/1",
    startDate: "2026-08-28",
    endDate: "2026-09-24",
    japanOnly: false,
  });
  assert.deepEqual(req.dimensions, [{ name: "pagePath" }]);
  assert.deepEqual(req.metrics.map((m) => m.name), ["sessions", "keyEvents", "sessionKeyEventRate"]);
  // japanOnly=false でもスパム除外（notExpression）は残る
  assert.ok(req.dimensionFilter.notExpression);
  const jp = buildKeyEventsByPageRequest({ propertyId: "p", startDate: "a", endDate: "b", japanOnly: true });
  assert.equal(jp.dimensionFilter.andGroup.expressions.length, 2);
});

test("rows are read by metric header name, not by position", () => {
  const rows = parseKeyEventsByPageRows(
    [row("/links", [0.25, 40, 3])],
    ["sessionKeyEventRate", "sessions", "keyEvents"],
  );
  assert.deepEqual(rows, [{ page: "/links", sessions: 40, keyEvents: 3, sessionKeyEventRate: 0.25 }]);
});

test("a response missing a metric is a failure, not zeros", () => {
  assert.throws(() => parseKeyEventsByPageRows([row("/", [1, 2])], ["sessions", "keyEvents"]), /sessionKeyEventRate/);
});

test("summary counts pages with key events separately from all pages", () => {
  const rows = parseKeyEventsByPageRows([row("/a", [10, 2, 0.2]), row("/b", [5, 0, 0])]);
  assert.deepEqual(summarizeKeyEvents(rows), { pages: 2, pagesWithKeyEvents: 1, sessions: 15, keyEvents: 2 });
});
