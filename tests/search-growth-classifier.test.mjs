import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyUrl, THRESHOLDS, isSearchResultPath, isNonHtmlPath, isFragmentPath } from "../scripts/lib/search-growth-classifier.mjs";

// signal のベース。テストごとに必要フィールドだけ上書きする。
function sig(overrides = {}) {
  return {
    comparisonKey: "/docs/x",
    inLiveSitemap: false,
    inLocalSitemap: false,
    localSitemapAvailable: false,
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

test("URL移行前の live 旧URL / local 新URL は desired state を優先して EXPECTED_EXCLUSION", () => {
  const r = classifyUrl(
    sig({
      inLiveSitemap: true,
      inLocalSitemap: false,
      localSitemapAvailable: true,
      httpStatus: 301,
      isIntentionalRedirect: true,
      redirectTarget: "/exam/x/keywords/y",
    }),
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
      longTermZero: true,
      impressions: 0,
      activeUsers: 0,
      hasSuccessor: false,
      hasParent: false,
    }),
  );
  assert.equal(r.action, "NOINDEX_CANDIDATE");
  assert.equal(r.requiresApproval, true);
});

test("最新期間ゼロだけではNOINDEX_CANDIDATEにしない", () => {
  const r = classifyUrl(
    sig({
      httpStatus: 200,
      lowValue: true,
      longTermZero: false,
      impressions: 0,
      activeUsers: 0,
      hasSuccessor: false,
      hasParent: false,
    }),
  );
  assert.equal(r.action, "UNKNOWN_REVIEW");
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

// ── DN-0674: 誤分類の 4 規則 ──

test("登録済み・需要なし（200・self canonical）→ KEEP_MONITOR（UNKNOWN にしない）", () => {
  const r = classifyUrl(sig({ inLiveSitemap: true, isIndexed: true }));
  assert.equal(r.action, "KEEP_MONITOR");
  // 未登録なら KEEP にしない
  const u = classifyUrl(sig({ inLiveSitemap: true, isIndexed: false }));
  assert.equal(u.action, "UNKNOWN_REVIEW");
  // noindex は登録済みでも KEEP にしない
  assert.notEqual(classifyUrl(sig({ isIndexed: true, robots: "noindex" })).action, "KEEP_MONITOR");
});

test("sitemap 掲載・200・検出済み未登録 → KEEP_MONITOR。sitemap 外なら KEEP にしない", () => {
  assert.equal(
    classifyUrl(sig({ inLiveSitemap: true, gscUiIssue: "discoveredNotIndexed" })).action,
    "KEEP_MONITOR",
  );
  assert.equal(classifyUrl(sig({ gscUiIssue: "discoveredNotIndexed" })).action, "UNKNOWN_REVIEW");
});

test("/search?q= は EXPECTED_EXCLUSION。sitemap 掲載なら対象外", () => {
  assert.equal(classifyUrl(sig({ comparisonKey: "/search?q=%E5%9C%9F%E5%AF%86", httpStatus: null })).action, "EXPECTED_EXCLUSION");
  assert.equal(classifyUrl(sig({ comparisonKey: "/search", httpStatus: null })).action, "EXPECTED_EXCLUSION");
  assert.notEqual(
    classifyUrl(sig({ comparisonKey: "/search?q=x", inLiveSitemap: true, httpStatus: 200 })).action,
    "EXPECTED_EXCLUSION",
  );
  assert.equal(isSearchResultPath("/searching-guide"), false);
});

test("非 HTML（アセット・データ・フィード）は EXPECTED_EXCLUSION", () => {
  for (const key of ["/atom.xml", "/_next/static/media/a.woff2", "/standards-data/kinki/common/chapters/1-1.jsonld", "/downloads/x.txt", "/img/favicon.ico"]) {
    assert.equal(isNonHtmlPath(key), true, key);
    assert.equal(classifyUrl(sig({ comparisonKey: key, httpStatus: null, gscUiIssue: "crawledNotIndexed" })).action, "EXPECTED_EXCLUSION", key);
  }
  assert.equal(isNonHtmlPath("/exam/rccm/guide/overview"), false);
  assert.equal(isNonHtmlPath("/exam/rccm/guide/overview.html"), false);
});

test("本文の断片の 404 は EXPECTED_EXCLUSION。slug の形の 1 階層は断片にしない", () => {
  for (const key of ["/8", "/h）", "/2.50", "/m", "/℃）とほぼ等しく、これが鉄筋コンクリート構造物の温度安定性の物理的根拠となる。"]) {
    assert.equal(isFragmentPath(key), true, key);
    assert.equal(classifyUrl(sig({ comparisonKey: key, httpStatus: null, gscUiIssue: "notFound" })).action, "EXPECTED_EXCLUSION", key);
  }
  for (const key of ["/contact", "/privacy", "/exam/x/guide/y"]) assert.equal(isFragmentPath(key), false, key);
});

test("需要・利用・後継・内部リンクの無い 404 は EXPECTED。需要か内部リンクがあれば EXPECTED にしない", () => {
  const base = { comparisonKey: "/standards/guides/floodgate", httpStatus: null, gscUiIssue: "notFound" };
  assert.equal(classifyUrl(sig({ ...base, internalInbound: 0 })).action, "EXPECTED_EXCLUSION");
  assert.equal(classifyUrl(sig({ ...base, internalInbound: null })).action, "EXPECTED_EXCLUSION");
  assert.equal(classifyUrl(sig({ ...base, impressions: 41 })).action, "UNKNOWN_REVIEW");
  assert.equal(classifyUrl(sig({ ...base, activeUsers: 3 })).action, "UNKNOWN_REVIEW");
  assert.equal(classifyUrl(sig({ ...base, internalInbound: 2 })).action, "UNKNOWN_REVIEW");
});

test("Google が別の canonical を選んだ URL は専用ラベル CANONICAL_ELSEWHERE（KEEP/UNKNOWN と混ぜない）", () => {
  const r = classifyUrl(
    sig({
      inLiveSitemap: true,
      isIndexed: true,
      selfCanonical: true,
      canonicalOk: true,
      googleChoseOtherCanonical: true,
      googleCanonical: "https://doboku-note.com/docs/x",
    }),
  );
  assert.equal(r.action, "CANONICAL_ELSEWHERE");
  assert.equal(r.requiresApproval, true);
  // sitemap 外・代替 canonical の issue・需要あり
  assert.equal(
    classifyUrl(sig({ gscUiIssue: "alternateCanonical", impressions: 20, httpStatus: null })).action,
    "CANONICAL_ELSEWHERE",
  );
  // 需要なしの alternateCanonical は従来どおり EXPECTED
  assert.equal(classifyUrl(sig({ gscUiIssue: "alternateCanonical" })).action, "EXPECTED_EXCLUSION");
});
