#!/usr/bin/env node
/**
 * URL Inspection の batch ファイルを集計し、index-coverage-history.json に1エントリ追記する。
 *
 * GSC 管理 SSOT の機械履歴部分（時系列の indexed_ratio）を維持する。
 * creds 不要（既存 JSON を読んで集計するだけ）＝ローカルでもテスト可能。
 * index-coverage.yml（CI・月次）が URL Inspection 後に呼ぶ。設計の真実源は .claude/knowledge/reference/gsc-management.md。
 *
 * Usage:
 *   node .claude/scripts/append-coverage-history.mjs \
 *     --batch .claude/state/metrics/url-inspection/inspection-batch-<ts>.json \
 *     --date 2026-06-19 [--sitemap-count 1030] [--notes "..."] \
 *     [--history .claude/state/metrics/gsc/index-coverage-history.json]
 *
 * 冪等: 同じ --date のエントリが既にあれば追記せず exit 0。
 *       batch の results が空なら追記しない（部分失敗ガード）。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

function parseArgs() {
  const a = process.argv.slice(2);
  const o = {
    batch: null,
    date: null,
    sitemapCount: null,
    notes: "",
    history: ".claude/state/metrics/gsc/index-coverage-history.json",
  };
  for (let i = 0; i < a.length; i++) {
    switch (a[i]) {
      case "--batch": o.batch = a[++i]; break;
      case "--date": o.date = a[++i]; break;
      case "--sitemap-count": o.sitemapCount = parseInt(a[++i], 10); break;
      case "--notes": o.notes = a[++i]; break;
      case "--history": o.history = a[++i]; break;
    }
  }
  return o;
}

// coverage_state（日本語/英語ロケール両対応）を SSOT バケットへ写像
function bucketOf(result) {
  const idx = result.index || {};
  if (idx.verdict === "PASS") return "indexed";
  const cs = (idx.coverage_state || "").toString();
  if (/検出|Discovered/i.test(cs)) return "discovered_not_indexed";
  if (/クロール済み|Crawled/i.test(cs)) return "crawled_not_indexed";
  if (/リダイレクト|redirect/i.test(cs)) return "redirect";
  if (/見つかりません|404|not found/i.test(cs)) return "not_found";
  if (/noindex|除外/i.test(cs)) return "excluded_noindex";
  return "other"; // 代替ページ(canonical) / URL未認識 / null / error
}

const o = parseArgs();
if (!o.batch || !o.date) {
  console.error("Usage: --batch <path[,path2,...]> --date <YYYY-MM-DD> [--sitemap-count N] [--notes ...] [--history path]");
  process.exit(2);
}

// --batch はカンマ区切りで複数指定可（CI は1ファイル、過去分の seed は分割バッチ集計用）
const batchPaths = o.batch.split(",").map((s) => s.trim()).filter(Boolean);
const results = [];
for (const bp of batchPaths) {
  if (!existsSync(bp)) {
    console.error(`ERROR: batch not found: ${bp}`);
    process.exit(1);
  }
  const b = JSON.parse(readFileSync(bp, "utf-8"));
  if (Array.isArray(b.results)) results.push(...b.results);
}
if (results.length === 0) {
  console.error("ABORT: batch.results が空。部分失敗の可能性があるため追記しない。");
  process.exit(0);
}

const counts = {
  indexed: 0, discovered_not_indexed: 0, crawled_not_indexed: 0,
  redirect: 0, not_found: 0, excluded_noindex: 0, other: 0,
};
for (const r of results) counts[bucketOf(r)]++;

const inspected = results.length;
const sitemapUrls = Number.isInteger(o.sitemapCount) ? o.sitemapCount : inspected;
const indexedRatio = sitemapUrls > 0 ? Math.round((counts.indexed / sitemapUrls) * 1000) / 1000 : 0;

// 履歴ロード（無ければ初期化）
let history = { schema_version: "1.0", updated_at: null, entries: [] };
if (existsSync(o.history)) {
  history = JSON.parse(readFileSync(o.history, "utf-8"));
  if (!Array.isArray(history.entries)) history.entries = [];
}

// 冪等チェック
if (history.entries.some((e) => e.date === o.date)) {
  console.log(`[skip] entry for ${o.date} already exists. no append.`);
  process.exit(0);
}

const nowIso = new Date().toISOString();
const entry = {
  date: o.date,
  run_at: nowIso,
  sitemap_urls: sitemapUrls,
  inspected,
  ...counts,
  indexed_ratio: indexedRatio,
  batch_file: batchPaths.map((p) => p.split("/").pop()).join(","),
  notes: o.notes || "",
};

history.entries.push(entry);
history.entries.sort((x, y) => x.date.localeCompare(y.date));
history.updated_at = nowIso;

mkdirSync(dirname(o.history), { recursive: true });
writeFileSync(o.history, JSON.stringify(history, null, 2) + "\n", "utf-8");

console.log(`[appended] ${o.date}: indexed=${counts.indexed}/${sitemapUrls} (ratio=${indexedRatio}) inspected=${inspected}`);
console.log(`  discovered_not_indexed=${counts.discovered_not_indexed} crawled=${counts.crawled_not_indexed} redirect=${counts.redirect} 404=${counts.not_found} other=${counts.other}`);
