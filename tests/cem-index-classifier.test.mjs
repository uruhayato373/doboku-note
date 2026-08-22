import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyCemIndexCandidate } from "../scripts/lib/cem-index-classifier.mjs";

const base = {
  clicksMax90d: 0,
  impressionsMax90d: 0,
  activeUsersMax90d: 0,
  sessionsMax90d: 0,
  notIndexedInLastTwoInspections: true,
  daysSinceModified: 120,
  examOccurrences: 0,
  internalInbound: 0,
  contentChars: 1500,
  proposedTarget: null,
  proposedTargetScore: 0,
};

test("需要があればKEEP", () => {
  assert.equal(classifyCemIndexCandidate({ ...base, impressionsMax90d: 5 }).action, "KEEP");
});

test("直近2回の未登録を確認できなければMONITOR", () => {
  assert.equal(classifyCemIndexCandidate({ ...base, notIndexedInLastTwoInspections: false }).action, "MONITOR");
});

test("更新60日未満ならMONITOR", () => {
  assert.equal(classifyCemIndexCandidate({ ...base, daysSinceModified: 20 }).action, "MONITOR");
});

test("過去問価値または十分な本文量があればIMPROVE", () => {
  assert.equal(classifyCemIndexCandidate({ ...base, examOccurrences: 1 }).action, "IMPROVE");
  assert.equal(classifyCemIndexCandidate({ ...base, contentChars: 3200 }).action, "IMPROVE");
});

test("明確な登録済み統合先がある薄いページはCONSOLIDATE候補", () => {
  const result = classifyCemIndexCandidate({
    ...base,
    contentChars: 1000,
    proposedTarget: "pe-comprehensive-management-parent",
    proposedTargetScore: 20,
  });
  assert.equal(result.action, "CONSOLIDATE");
  assert.equal(result.requiresApproval, true);
});

test("統合先も価値シグナルもない薄いページはNOINDEX_REVIEW", () => {
  const result = classifyCemIndexCandidate({ ...base, contentChars: 800 });
  assert.equal(result.action, "NOINDEX_REVIEW");
  assert.equal(result.requiresApproval, true);
});
