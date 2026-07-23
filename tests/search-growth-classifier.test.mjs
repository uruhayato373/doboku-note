import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyUrl, THRESHOLDS } from "../scripts/lib/search-growth-classifier.mjs";

// signal のベース。テストごとに必要フィールドだけ上書きする。
function sig(overrides = {}) {
  return {
    comparisonKey: "/docs/x",
    inLiveSitemap: false,
    inLocalSitemap: false,
    httpStatus: 200,
    redirectTarget: null,
    redirectHops: 0,
    selfCanonical: true,
    googleCanonical: null,
    userCanonical: null,
    robots: null,
    gscUiIssue: null,
    clicks: 0,
    impressions: 0,
    activeUsers: 0,
    sessions: 0,
    hasSuccessor: false,
    isIntentionalRedirect: false,
    similarCluster: false,
    hasParent: false,
    ...overrides,
  };
}

test("sitemap 内 404 → FIX_TECHNICAL", () => {
  const r = classifyUrl(sig({ inLiveSitemap: true, httpStatus: 404 }));
  assert.equal(r.action, "FIX_TECHNICAL");
  assert.equal(r.requiresApproval, true);
});

test("sitemap 内 redirect → FIX_TECHNICAL", () => {
  const r = classifyUrl(
    sig({ inLiveSitemap: true, httpStatus: 301, redirectTarget: "/docs/y" }),
  );
  assert.equal(r.action, "FIX_TECHNICAL");
});

test("sitemap 内 canonical 不一致 → FIX_TECHNICAL", () => {
  const r = classifyUrl(
    sig({
      inLiveSitemap: true,
      httpStatus: 200,
      userCanonical: "https://doboku-note.com/docs/x",
      googleCanonical: "https://doboku-note.com/docs/z",
    }),
  );
  assert.equal(r.action, "FIX_TECHNICAL");
});

test("sitemap 内 403 → FIX_TECHNICAL", () => {
  const r = classifyUrl(sig({ inLiveSitemap: true, httpStatus: 403 }));
  assert.equal(r.action, "FIX_TECHNICAL");
});

test("多段 redirect（2 hop 以上）→ FIX_TECHNICAL", () => {
  const r = classifyUrl(sig({ httpStatus: 301, redirectHops: 2 }));
  assert.equal(r.action, "FIX_TECHNICAL");
});

test("published:false の下書き（isDraft）→ EXPECTED_EXCLUSION（redirect しない）", () => {
  // source 在・未公開の下書きは 404 が設計通り。後継があっても redirect 候補にしない。
  const r = classifyUrl(
    sig({ inLiveSitemap: false, httpStatus: 404, isDraft: true, hasSuccessor: true, impressions: 0 }),
  );
  assert.equal(r.action, "EXPECTED_EXCLUSION");
});

test("sitemap 外の意図した旧 301 → EXPECTED_EXCLUSION", () => {
  const r = classifyUrl(
    sig({ inLiveSitemap: false, httpStatus: 301, isIntentionalRedirect: true, redirectTarget: "/docs/y" }),
  );
  assert.equal(r.action, "EXPECTED_EXCLUSION");
});

test("sitemap 外 404 で後継あり・需要あり → REDIRECT_LEGACY", () => {
  const r = classifyUrl(
    sig({ inLiveSitemap: false, httpStatus: 404, hasSuccessor: true, impressions: 40 }),
  );
  assert.equal(r.action, "REDIRECT_LEGACY");
});

test("200 / self canonical / 需要あり → KEEP_MONITOR", () => {
  const r = classifyUrl(
    sig({ httpStatus: 200, selfCanonical: true, impressions: 120, clicks: 4 }),
  );
  assert.equal(r.action, "KEEP_MONITOR");
});

test("類似・低需要・親ページあり → CONSOLIDATE_CANDIDATE", () => {
  const r = classifyUrl(
    sig({
      httpStatus: 200,
      similarCluster: true,
      hasParent: true,
      impressions: 0,
      activeUsers: 0,
    }),
  );
  assert.equal(r.action, "CONSOLIDATE_CANDIDATE");
});

test("NOINDEX_CANDIDATE は自動適用されない（requiresApproval=true）", () => {
  const r = classifyUrl(
    sig({
      httpStatus: 200,
      lowValue: true,
      impressions: 0,
      activeUsers: 0,
      hasSuccessor: false,
      hasParent: false,
    }),
  );
  assert.equal(r.action, "NOINDEX_CANDIDATE");
  assert.equal(r.requiresApproval, true);
});

test("canonicalOk=true なら canonical 差があっても FIX_TECHNICAL にしない（陳腐 user_canonical 誤検知抑止）", () => {
  // Google が自己 canonical 採用・正常インデックスなら、古い user_canonical が homepage でも問題なし
  const r = classifyUrl(
    sig({
      inLiveSitemap: true,
      httpStatus: 200,
      userCanonical: "https://doboku-note.com/",
      googleCanonical: "https://doboku-note.com/about",
      canonicalOk: true,
      impressions: 10,
    }),
  );
  assert.notEqual(r.action, "FIX_TECHNICAL");
});

test("情報不足 → UNKNOWN_REVIEW", () => {
  const r = classifyUrl(sig({ httpStatus: null, gscUiIssue: "crawledNotIndexed" }));
  assert.equal(r.action, "UNKNOWN_REVIEW");
});

test("内部リンクの旧 URL 修正のみ自動可（autoFixableInternalLink）", () => {
  const r = classifyUrl(
    sig({ inLiveSitemap: true, httpStatus: 301, redirectTarget: "/docs/y", autoFixableInternalLink: true }),
  );
  assert.equal(r.action, "FIX_TECHNICAL");
  assert.equal(r.requiresApproval, false);
});

test("全アクションに reasons と confidence が付く", () => {
  const r = classifyUrl(sig({ inLiveSitemap: true, httpStatus: 404 }));
  assert.ok(Array.isArray(r.reasons) && r.reasons.length > 0);
  assert.equal(typeof r.confidence, "number");
});

test("しきい値定数が公開されている", () => {
  assert.ok(THRESHOLDS.lowImpressions >= 1);
  assert.ok(THRESHOLDS.redirectChainWarn >= 2);
});
