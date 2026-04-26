#!/usr/bin/env node
/**
 * SEO meta 監査スクリプト
 *
 * ローカル `npm run dev` 起動中の Next.js（既定 http://localhost:3020）に対して
 * 全 /docs/* + 静的ルート（/about, /category/*, etc）を巡回し、
 * <title>, <meta name="description">, og:*, twitter:*, canonical, JSON-LD を抽出して
 * `.claude/config/seo-meta-config.json` の閾値で検証、結果を JSON で時系列保存する。
 *
 * Issue #125 の implementation。
 *
 * Usage:
 *   npm run check-seo-meta                  # 全 URL（数百ページ）
 *   npm run check-seo-meta -- --limit 10    # 先頭 10 URL のみ（dry-run）
 *   npm run check-seo-meta -- --base-url https://doboku-note.com  # 本番（Cloudflare Bot 注意）
 *   npm run check-seo-meta -- --json        # 結果 JSON を stdout に出力
 *
 * 依存: Node 20+ の native fetch のみ（cheerio 不要）。
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

// ── Config ──

const CONFIG_PATH = ".claude/config/seo-meta-config.json";

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    console.error(`Config not found: ${CONFIG_PATH}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
}

// ── CLI args ──

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { limit: null, baseUrl: null, json: false };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--limit": opts.limit = parseInt(args[++i], 10); break;
      case "--base-url": opts.baseUrl = args[++i]; break;
      case "--json": opts.json = true; break;
    }
  }
  return opts;
}

// ── URL collection ──

function collectUrls(config) {
  const urls = new Set(config.include_routes || []);
  const idxPath = config.url_source || "src/config/doc-meta-index.json";
  if (existsSync(idxPath)) {
    const idx = JSON.parse(readFileSync(idxPath, "utf-8"));
    const docs = Array.isArray(idx) ? idx : Object.values(idx).flat();
    for (const doc of docs) {
      if (doc?.slug && (doc.published === undefined || doc.published === true)) {
        urls.add(`/docs/${doc.slug}`);
      }
    }
  }
  return Array.from(urls).sort();
}

// ── HTML parsing (regex-based, no cheerio) ──

function extractText(html, regex) {
  const m = html.match(regex);
  return m ? m[1].trim() : null;
}

function extractAllMeta(html) {
  const result = {};
  // <meta name="..." content="..."> and <meta property="..." content="...">
  const re = /<meta\s+(?:name|property)\s*=\s*["']([^"']+)["']\s+content\s*=\s*["']([^"']*)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    result[m[1]] = m[2];
  }
  return result;
}

function extractCanonical(html) {
  return extractText(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
}

function extractTitle(html) {
  return extractText(html, /<title[^>]*>([^<]*)<\/title>/i);
}

function extractJsonLd(html) {
  const out = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    try {
      const parsed = JSON.parse(raw);
      out.push(parsed);
    } catch (_) {
      out.push({ __parse_error: true, raw: raw.slice(0, 200) });
    }
  }
  return out;
}

function decodeHtml(s) {
  if (!s) return s;
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

// ── Validation ──

function countOccurrences(s, sub) {
  if (!s || !sub) return 0;
  return s.split(sub).length - 1;
}

function validateUrl(url, html, config) {
  const t = config.thresholds;
  const sev = config.severity;

  const title = decodeHtml(extractTitle(html));
  const meta = extractAllMeta(html);
  const description = decodeHtml(meta["description"]);
  const canonical = extractCanonical(html);
  const ogKeys = Object.keys(meta).filter((k) => k.startsWith("og:"));
  const og = {};
  for (const k of ogKeys) og[k.slice(3)] = decodeHtml(meta[k]);
  const twKeys = Object.keys(meta).filter((k) => k.startsWith("twitter:"));
  const twitter = {};
  for (const k of twKeys) twitter[k.slice(8)] = decodeHtml(meta[k]);
  const jsonLd = extractJsonLd(html);

  const violations = [];
  const push = (type, message, severity, extra = {}) => violations.push({ type, severity, message, ...extra });

  // Title
  if (!title) {
    push("title_missing", "title 未設定", sev.title_missing || "HIGH");
  } else {
    if (title.length > t.title.max_length) {
      push("title_too_long", `title が ${title.length} 文字（上限 ${t.title.max_length}）`, sev.title_too_long || "MEDIUM", { length: title.length });
    }
    const cnt = countOccurrences(title, t.title.site_name);
    if (cnt > t.title.site_name_max_count) {
      push("title_site_name_duplicate", `title に "${t.title.site_name}" が ${cnt} 回出現（上限 ${t.title.site_name_max_count}）`, sev.title_site_name_duplicate || "HIGH", { count: cnt });
    }
  }

  // Description
  if (!description) {
    push("description_missing", "description 未設定", sev.description_missing || "HIGH");
  } else {
    if (description.length < t.description.min_length) {
      push("description_too_short", `description が ${description.length} 文字（下限 ${t.description.min_length}）`, sev.description_too_short || "LOW", { length: description.length });
    } else if (description.length > t.description.max_length) {
      push("description_too_long", `description が ${description.length} 文字（上限 ${t.description.max_length}）`, sev.description_too_long || "MEDIUM", { length: description.length });
    }
  }

  // Canonical
  if (t.canonical.required && !canonical) {
    push("canonical_missing", "canonical 未設定", sev.canonical_missing || "MEDIUM");
  } else if (canonical && t.canonical.must_start_with && !canonical.startsWith(t.canonical.must_start_with)) {
    push("canonical_invalid", `canonical が "${t.canonical.must_start_with}" で始まらない: ${canonical}`, sev.canonical_invalid || "MEDIUM");
  }

  // OG
  for (const key of t.og.required_keys || []) {
    if (!og[key]) push("og_key_missing", `og:${key} 未設定`, sev.og_key_missing || "MEDIUM", { key });
  }

  // Twitter
  for (const key of t.twitter.required_keys || []) {
    if (!twitter[key]) push("twitter_card_missing", `twitter:${key} 未設定`, sev.twitter_card_missing || "LOW", { key });
  }

  // JSON-LD
  const jsonLdTypes = jsonLd.flatMap((j) => collectTypes(j));
  if (jsonLd.length < (t.json_ld.min_count || 1)) {
    push("json_ld_missing", "JSON-LD が出力されていない", sev.json_ld_missing || "MEDIUM");
  }
  for (const anyOf of t.json_ld.required_types_any_of || []) {
    if (!anyOf.some((typ) => jsonLdTypes.includes(typ))) {
      push("json_ld_required_type_missing", `JSON-LD に必須 type のいずれかが無い: [${anyOf.join(" | ")}]`, sev.json_ld_required_type_missing || "LOW");
    }
  }

  // FAQ validation
  const faqV = t.json_ld.faq_validation || {};
  const faqs = jsonLd.filter((j) => j && (j["@type"] === "FAQPage"));
  for (const faq of faqs) {
    const items = Array.isArray(faq.mainEntity) ? faq.mainEntity : [];
    if (items.length < (faqV.min_main_entity || 1)) {
      push("faq_main_entity_empty", `FAQPage の mainEntity が ${items.length} 件（下限 ${faqV.min_main_entity}）`, sev.faq_main_entity_empty || "LOW");
    }
    for (const it of items) {
      const q = (it?.name || "").toString();
      const a = (it?.acceptedAnswer?.text || "").toString();
      if (q.length < (faqV.min_question_chars || 5) || a.length < (faqV.min_answer_chars || 10)) {
        push("faq_qa_too_short", `FAQ の Q/A が短い (Q: ${q.length} 文字, A: ${a.length} 文字)`, sev.faq_qa_too_short || "LOW", { q: q.slice(0, 30), a_len: a.length });
      }
    }
  }

  return {
    url,
    title: title ? { value: title, length: title.length, doboku_note_count: countOccurrences(title, t.title.site_name) } : null,
    description: description ? { value: description, length: description.length } : null,
    canonical,
    og,
    twitter,
    json_ld: { count: jsonLd.length, types: jsonLdTypes, faq_count: faqs.length },
    violations,
  };
}

function collectTypes(node, acc = []) {
  if (!node || typeof node !== "object") return acc;
  if (Array.isArray(node)) {
    for (const n of node) collectTypes(n, acc);
    return acc;
  }
  if (node["@type"]) acc.push(node["@type"]);
  if (node["@graph"] && Array.isArray(node["@graph"])) {
    for (const n of node["@graph"]) collectTypes(n, acc);
  }
  return acc;
}

// ── Concurrent fetch ──

async function fetchUrl(baseUrl, path, timeoutMs) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(baseUrl + path, { signal: ctrl.signal });
    if (!res.ok) {
      return { __error: `HTTP ${res.status}` };
    }
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
  const baseUrl = opts.baseUrl || config.base_url;

  let urls = collectUrls(config);
  if (opts.limit) urls = urls.slice(0, opts.limit);

  if (!opts.json) {
    console.log(`SEO meta audit: ${urls.length} URL を ${baseUrl} に対して巡回`);
  }

  const start = Date.now();
  const results = await withConcurrency(urls, config.concurrency || 8, async (path) => {
    const html = await fetchUrl(baseUrl, path, config.timeout_ms || 10000);
    if (typeof html !== "string") {
      return { url: path, fetch_error: html.__error, violations: [{ type: "fetch_error", severity: "HIGH", message: html.__error }] };
    }
    return validateUrl(path, html, config);
  });

  // Aggregate
  const totalViolations = results.flatMap((r) => (r.violations || []).map((v) => ({ ...v, url: r.url })));
  const bySeverity = totalViolations.reduce((acc, v) => {
    acc[v.severity] = (acc[v.severity] || 0) + 1;
    return acc;
  }, {});
  const byType = totalViolations.reduce((acc, v) => {
    if (!acc[v.type]) acc[v.type] = [];
    acc[v.type].push(v.url);
    return acc;
  }, {});

  const summary = {
    urls_checked: results.length,
    urls_with_violations: results.filter((r) => r.violations && r.violations.length).length,
    by_severity: { HIGH: bySeverity.HIGH || 0, MEDIUM: bySeverity.MEDIUM || 0, LOW: bySeverity.LOW || 0 },
    by_type: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, v.length])),
    duration_ms: Date.now() - start,
  };

  const out = {
    version: 1,
    generated_at: new Date().toISOString(),
    base_url: baseUrl,
    summary,
    results,
    violations_by_type: byType,
  };

  if (opts.json) {
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
    return;
  }

  // Save
  mkdirSync(config.output_dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-").replace("Z", "");
  const outPath = join(config.output_dir, `seo-meta-${ts}.json`);
  writeFileSync(outPath, JSON.stringify(out, null, 2));

  // Console summary
  console.log("");
  console.log(`✓ ${summary.urls_checked} URL 巡回完了 (${summary.duration_ms} ms)`);
  console.log(`  違反あり URL: ${summary.urls_with_violations}/${summary.urls_checked}`);
  console.log(`  Severity: HIGH=${summary.by_severity.HIGH} MEDIUM=${summary.by_severity.MEDIUM} LOW=${summary.by_severity.LOW}`);
  if (Object.keys(byType).length > 0) {
    console.log("");
    console.log("違反タイプ別件数:");
    for (const [type, urls] of Object.entries(byType).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${type.padEnd(35)} ${urls.length}`);
    }
  }
  console.log("");
  console.log(`出力: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
