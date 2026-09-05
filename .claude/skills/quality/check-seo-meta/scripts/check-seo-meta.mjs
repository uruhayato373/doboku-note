#!/usr/bin/env node
/**
 * SEO meta 監査スクリプト（再設計版）
 *
 * 主経路は build 済み out/ の直接検査（dev server 不要）。検査ロジックは
 * build 後 SEO スキャナと同じ scripts/lib/seo-checks.mjs を再利用し、
 * self canonical / self og:url / サイト名二重 / title / description / robots /
 * JSON-LD / SSR を検査する。canonical は「ドメイン接頭辞」ではなく self URL 完全一致で判定。
 *
 * 母集合: doc-meta-index.json（現行 { docs: { slug: meta } } 形式）から
 * published !== false かつ noindex !== true の記事を全収集し、旧 slug は
 * public/_redirects の生成ブロックで正規 URL へ解決する。build 済み sitemap.xml の
 * URL も加え、公的仕様書・トピック・静的ハブを含む全 indexable ページを検査する。
 * 収集 doc URL が published の 90%（かつ最低 1,000）を下回る場合は監査失敗にする
 * （母集合不足を「違反ゼロ＝成功」と誤認しない）。
 *
 * Usage:
 *   npm run check-seo-meta                       # out/ 直接検査（主経路・要 npm run build）
 *   npm run check-seo-meta -- --limit 20         # 先頭 20 URL（dry-run）
 *   npm run check-seo-meta -- --base-url https://doboku-note.com  # HTTP 巡回（本番・Bot 注意）
 *   npm run check-seo-meta -- --json             # 結果 JSON を stdout
 *   npm run check-seo-meta -- --snapshot         # 明示した時だけ timestamp 履歴も残す
 *
 * 依存: Node 20+ / node-html-parser（seo-checks 経由）。
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, resolve } from "path";
import {
  extractSeo,
  runIndexablePageChecks,
} from "#seo/seo-checks.mjs";

const CONFIG_PATH = ".claude/config/seo-meta-config.json";
/** 母集合ガード: 収集 doc URL 数の下限（絶対値・比率）。 */
const MIN_DOC_URLS = 1000;
const MIN_DOC_RATIO = 0.9;

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    console.error(`Config not found: ${CONFIG_PATH}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { limit: null, baseUrl: null, json: false, out: "out", snapshot: false };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--limit": opts.limit = parseInt(args[++i], 10); break;
      case "--base-url": opts.baseUrl = args[++i]; break;
      case "--out": opts.out = args[++i]; break;
      case "--json": opts.json = true; break;
      case "--snapshot": opts.snapshot = true; break;
    }
  }
  return opts;
}

// ── URL 収集（現行 doc-meta-index 形式に対応） ──

function loadCanonicalDocPaths() {
  const map = new Map();
  const path = "public/_redirects";
  if (!existsSync(path)) return map;
  let managed = false;
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const line = raw.trim();
    if (line === "# BEGIN GENERATED PUBLIC ROUTES") { managed = true; continue; }
    if (line === "# END GENERATED PUBLIC ROUTES") break;
    if (!managed || !line || line.startsWith("#")) continue;
    const match = line.match(/^\/docs\/([^/*\s]+)\s+(\/\S+)\s+301$/);
    if (match) map.set(match[1], match[2]);
  }
  return map;
}

function loadSitemapPaths(outDir = "out") {
  const path = join(outDir, "sitemap.xml");
  if (!existsSync(path)) return [];
  const urls = [];
  const re = /<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g;
  let match;
  const xml = readFileSync(path, "utf8");
  while ((match = re.exec(xml))) urls.push(match[1] || "/");
  return urls;
}

function collectUrls(config, outDir) {
  const includeRoutes = config.include_routes || [];
  const idxPath = config.url_source || "src/config/doc-meta-index.json";
  const canonicalDocPaths = loadCanonicalDocPaths();
  const docUrls = [];
  let publishedCount = 0;
  if (existsSync(idxPath)) {
    const idx = JSON.parse(readFileSync(idxPath, "utf-8"));
    const docs = idx && typeof idx.docs === "object" ? idx.docs : {};
    publishedCount = idx?.summary?.published ?? Object.keys(docs).length;
    for (const [slug, meta] of Object.entries(docs)) {
      if (meta?.published === false) continue;
      if (meta?.noindex === true) continue;
      docUrls.push(canonicalDocPaths.get(slug) || `/docs/${slug}`);
    }
  }
  // include_routes は静的ルート。doc URL とは分けて母集合ガードの対象は doc URL 数にする。
  const sitemapRoutes = loadSitemapPaths(outDir);
  const all = Array.from(new Set([...includeRoutes, ...docUrls, ...sitemapRoutes])).sort();
  return { urls: all, docUrlCount: docUrls.length, publishedCount, includeRoutes: new Set(includeRoutes) };
}

// ── 検査（out/ 直接 or HTTP） ──

function urlPathToFile(outDir, urlPath) {
  if (urlPath === "/") return join(outDir, "index.html");
  return join(outDir, `${urlPath.replace(/^\//, "")}.html`);
}

/** seo-checks の findings を旧スナップショット互換の violation 形式へ写像。 */
function toViolations(findings) {
  const sevOf = (level) => (level === "error" ? "HIGH" : level === "warn" ? "MEDIUM" : "LOW");
  return findings.map((f) => ({ type: f.code, severity: sevOf(f.level), message: f.message }));
}

function checkSeoForUrl(url, html, includeRoutes) {
  const seo = extractSeo(html);
  // include_routes（/search 等）は noindex を許容。doc URL は indexable 期待。
  const expectIndexable = !includeRoutes.has(url);
  const findings = runIndexablePageChecks(seo, url, { expectIndexable });
  return {
    url,
    title: seo.title ? { value: seo.title, length: seo.title.length } : null,
    description: seo.description ? { value: seo.description, length: seo.description.length } : null,
    canonical: seo.canonical,
    og_url: seo.ogUrl,
    robots: seo.robots,
    json_ld: { count: seo.jsonLd.length },
    violations: toViolations(findings),
  };
}

async function fetchUrl(baseUrl, path, timeoutMs) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(baseUrl + path, { signal: ctrl.signal });
    if (!res.ok) return { __error: `HTTP ${res.status}` };
    return await res.text();
  } catch (e) {
    return { __error: e.message };
  } finally {
    clearTimeout(tid);
  }
}

async function withConcurrency(items, concurrency, worker) {
  const results = [];
  let i = 0;
  async function next() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, next));
  return results;
}

// ── Main ──

async function main() {
  const opts = parseArgs();
  const config = loadConfig();
  const httpMode = Boolean(opts.baseUrl);
  const outDir = resolve(process.cwd(), opts.out);

  const { urls: allUrls, docUrlCount, publishedCount, includeRoutes } = collectUrls(config, opts.out);
  let urls = allUrls;
  if (opts.limit) urls = urls.slice(0, opts.limit);

  // 母集合ガード（--limit 指定時は dry-run とみなしスキップ）
  if (!opts.limit) {
    const minRequired = Math.max(MIN_DOC_URLS, Math.floor(publishedCount * MIN_DOC_RATIO));
    if (docUrlCount < minRequired) {
      console.error(
        `❌ 母集合不足: 収集 doc URL ${docUrlCount} 件 < 必要 ${minRequired} 件` +
          `（published=${publishedCount}）。doc-meta-index.json の形式/生成を確認してください。`,
      );
      process.exit(1);
    }
  }

  if (!httpMode && !existsSync(outDir)) {
    console.error(`❌ out/ が無い: ${outDir}。先に npm run build を実行してください（HTTP 検査は --base-url）。`);
    process.exit(1);
  }

  const baseLabel = httpMode ? opts.baseUrl : `${opts.out}/ (static export)`;
  if (!opts.json) {
    console.log(`SEO meta audit: ${urls.length} URL を ${baseLabel} で検査（doc=${docUrlCount} / published=${publishedCount}）`);
  }

  const start = Date.now();
  let results;
  if (httpMode) {
    results = await withConcurrency(urls, config.concurrency || 8, async (path) => {
      const html = await fetchUrl(opts.baseUrl, path, config.timeout_ms || 10000);
      if (typeof html !== "string") {
        return { url: path, fetch_error: html.__error, violations: [{ type: "fetch_error", severity: "HIGH", message: html.__error }] };
      }
      return checkSeoForUrl(path, html, includeRoutes);
    });
  } else {
    results = urls.map((path) => {
      const file = urlPathToFile(outDir, path);
      if (!existsSync(file)) {
        return { url: path, violations: [{ type: "html_missing", severity: "HIGH", message: `out に HTML が無い: ${file}` }] };
      }
      try {
        return checkSeoForUrl(path, readFileSync(file, "utf-8"), includeRoutes);
      } catch (e) {
        return { url: path, violations: [{ type: "html_parse_error", severity: "HIGH", message: e.message }] };
      }
    });
  }

  const totalViolations = results.flatMap((r) => (r.violations || []).map((v) => ({ ...v, url: r.url })));
  const bySeverity = totalViolations.reduce((acc, v) => { acc[v.severity] = (acc[v.severity] || 0) + 1; return acc; }, {});
  const byType = totalViolations.reduce((acc, v) => { (acc[v.type] ??= []).push(v.url); return acc; }, {});

  const summary = {
    urls_checked: results.length,
    doc_urls_collected: docUrlCount,
    published_total: publishedCount,
    urls_with_violations: results.filter((r) => r.violations && r.violations.length).length,
    by_severity: { HIGH: bySeverity.HIGH || 0, MEDIUM: bySeverity.MEDIUM || 0, LOW: bySeverity.LOW || 0 },
    by_type: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, v.length])),
    duration_ms: Date.now() - start,
  };

  const out = {
    version: 2,
    generated_at: new Date().toISOString(),
    base_url: baseLabel,
    mode: httpMode ? "http" : "out",
    summary,
    results,
    violations_by_type: byType,
  };

  if (opts.json) {
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
    return;
  }

  mkdirSync(config.output_dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-").replace("Z", "");
  const outPath = join(
    config.output_dir,
    opts.snapshot ? `seo-meta-${ts}.json` : (config.latest_filename || 'seo-meta-latest.json'),
  );
  writeFileSync(outPath, JSON.stringify(out, null, 2));

  console.log("");
  console.log(`✓ ${summary.urls_checked} URL 検査完了 (${summary.duration_ms} ms)`);
  console.log(`  doc URL 収集: ${summary.doc_urls_collected} / published ${summary.published_total}`);
  console.log(`  違反あり URL: ${summary.urls_with_violations}/${summary.urls_checked}`);
  console.log(`  Severity: HIGH=${summary.by_severity.HIGH} MEDIUM=${summary.by_severity.MEDIUM} LOW=${summary.by_severity.LOW}`);
  if (Object.keys(byType).length > 0) {
    console.log("\n違反タイプ別件数:");
    for (const [type, u] of Object.entries(byType).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${type.padEnd(28)} ${u.length}`);
    }
  }
  console.log(`\n出力: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
