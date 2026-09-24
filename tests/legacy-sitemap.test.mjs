import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildLegacySitemapUrls,
  legacySitemapActive,
  renderLegacySitemap,
  LEGACY_SITEMAP_UNTIL,
} from "../scripts/lib/legacy-sitemap.mjs";

const SITE = "https://doboku-note.com";
const docRoutes = new Map([
  ["pe-comprehensive-management-cost-benefit-analysis", "/exam/pe-comprehensive-management/keywords/cost-benefit-analysis"],
  ["civil-construction-1-guide-surveying", "/exam/civil-construction-1/guide/surveying"],
  ["unpublished-draft", "/exam/civil-construction-1/guide/draft"],
]);
const sitemapLocs = new Set([
  `${SITE}/exam/pe-comprehensive-management/keywords/cost-benefit-analysis`,
  `${SITE}/exam/civil-construction-1/guide/surveying`,
]);

test("転送先が sitemap に載っている旧 /docs URL だけを、ソートして返す", () => {
  const r = buildLegacySitemapUrls({ docRoutes, sitemapLocs, siteUrl: SITE, now: new Date("2026-09-24T00:00:00Z") });
  assert.equal(r.active, true);
  assert.deepEqual(r.urls, [
    `${SITE}/docs/civil-construction-1-guide-surveying`,
    `${SITE}/docs/pe-comprehensive-management-cost-benefit-analysis`,
  ]);
});

test("期限（JST の日付）を過ぎたビルドでは出さない", () => {
  // 期限日の 23:59 JST（14:59Z）はまだ出す。翌日 00:00 JST（15:00Z）からは出さない。
  assert.equal(legacySitemapActive(new Date(`${LEGACY_SITEMAP_UNTIL}T14:59:00Z`)), true);
  assert.equal(legacySitemapActive(new Date(`${LEGACY_SITEMAP_UNTIL}T15:00:00Z`)), false);
  const r = buildLegacySitemapUrls({ docRoutes, sitemapLocs, siteUrl: SITE, now: new Date("2026-12-01T03:00:00Z") });
  assert.deepEqual(r, { active: false, urls: [] });
});

test("sitemap.xml と同じ 1 行 1 エントリで、lastmod は 301 になった日", () => {
  const xml = renderLegacySitemap([`${SITE}/docs/a`]);
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">\n/);
  assert.match(xml, /<url><loc>https:\/\/doboku-note\.com\/docs\/a<\/loc><lastmod>2026-08-22<\/lastmod><\/url>/);
});
