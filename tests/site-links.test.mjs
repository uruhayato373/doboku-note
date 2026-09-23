import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  classifySitePath,
  loadSiteRoutes,
  rewriteLegacySiteLinks,
  siteLinkRegex,
  siteUrlForSlug,
} from "../scripts/lib/site-links.mjs";

function routesFrom(text) {
  const dir = mkdtempSync(join(tmpdir(), "site-links-"));
  const p = join(dir, "_redirects");
  writeFileSync(p, text);
  return loadSiteRoutes(p);
}

const REDIRECTS = [
  "/docs/pe-comprehensive-management-cost-benefit-analysis /exam/pe-comprehensive-management/keywords/cost-benefit-analysis 301",
  "/docs/concrete-chief-engineer-textbook-mix-design /exam/concrete-chief-engineer/textbook/mix-design 301",
  "/docs /exam 301",
].join("\n");

test("旧 /docs を新 URL へ張り替え、UTM のクエリを保持する", () => {
  const routes = routesFrom(REDIRECTS);
  const src =
    "[費用便益](https://doboku-note.com/docs/pe-comprehensive-management-cost-benefit-analysis?utm_source=note&utm_medium=referral)を読む。";
  const { text, replaced, unmapped } = rewriteLegacySiteLinks(src, routes);
  assert.equal(replaced, 1);
  assert.deepEqual(unmapped, []);
  assert.equal(
    text,
    "[費用便益](https://doboku-note.com/exam/pe-comprehensive-management/keywords/cost-benefit-analysis?utm_source=note&utm_medium=referral)を読む。",
  );
});

test("日本語の句読点や閉じ括弧をパスに巻き込まない", () => {
  const routes = routesFrom(REDIRECTS);
  const src = "詳しくは https://doboku-note.com/docs/pe-comprehensive-management-cost-benefit-analysis。";
  const { text } = rewriteLegacySiteLinks(src, routes);
  assert.equal(text, "詳しくは https://doboku-note.com/exam/pe-comprehensive-management/keywords/cost-benefit-analysis。");
});

test("転送先が無い旧 URL（テンプレート等）は触らずに unmapped へ返す", () => {
  const routes = routesFrom(REDIRECTS);
  const src = "https://doboku-note.com/docs/pe-comprehensive-management/<year>";
  const { text, replaced, unmapped } = rewriteLegacySiteLinks(src, routes);
  assert.equal(text, src);
  assert.equal(replaced, 0);
  assert.deepEqual(unmapped, ["/docs/pe-comprehensive-management"]);
});

test("新 URL・資格ハブ・独自ページ・不明を分類する", () => {
  const routes = routesFrom(REDIRECTS);
  assert.equal(classifySitePath("/exam/pe-comprehensive-management/keywords/cost-benefit-analysis", routes).kind, "ok");
  assert.equal(classifySitePath("/exam/pe-comprehensive-management", routes).kind, "ok");
  assert.equal(classifySitePath("/exam/pe-comprehensive-management/keywords/", routes).kind, "ok");
  assert.equal(classifySitePath("/standards/kinki/common/chapters/1", routes).kind, "unverified");
  assert.equal(classifySitePath("/docs/unknown-slug", routes).to, null);
});

test("資格以降をハイフンでつないだ打ち間違いに正しい新 URL を提案する", () => {
  const routes = routesFrom(REDIRECTS);
  const c = classifySitePath("/exam/concrete-chief-engineer/textbook-mix-design", routes);
  assert.equal(c.kind, "unknown");
  assert.equal(c.suggestion, "/exam/concrete-chief-engineer/textbook/mix-design");
});

test("サイト外・記事系以外の URL にはマッチしない", () => {
  const hits = [..."https://note.com/docs/x https://doboku-note.com/tools/y https://doboku-note.com/".matchAll(siteLinkRegex())];
  assert.equal(hits.length, 0);
});

test("siteUrlForSlug は表にあれば新 URL、無ければ旧 URL を返す", () => {
  const routes = routesFrom(REDIRECTS);
  assert.equal(
    siteUrlForSlug("pe-comprehensive-management-cost-benefit-analysis", routes),
    "https://doboku-note.com/exam/pe-comprehensive-management/keywords/cost-benefit-analysis",
  );
  assert.equal(siteUrlForSlug("no-such", routes), "https://doboku-note.com/docs/no-such");
});

test("末尾スラッシュの除去は線形時間で、ルートの / は残す", () => {
  const routes = routesFrom(REDIRECTS);
  assert.equal(classifySitePath("/exam/pe-comprehensive-management/keywords/cost-benefit-analysis///", routes).kind, "ok");
  const long = `/exam/${"/".repeat(50000)}x`;
  const t0 = Date.now();
  classifySitePath(long, routes);
  assert.ok(Date.now() - t0 < 500, "スラッシュが大量に続く入力で遅くならない");
  assert.equal(classifySitePath("/docs/", routes).path, "/docs");
});
