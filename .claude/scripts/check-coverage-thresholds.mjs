#!/usr/bin/env node
/**
 * check-coverage-thresholds.mjs
 * ---------------------------------------------------------------------------
 * index-coverage.yml が history へ追記した**直後**に走る機械ゲート。
 * `.claude/state/metrics/gsc/index-coverage-history.json` の最新エントリ（と前回）を読み、
 * 「機械が無条件に異常と断定できるもの」だけを exit 1 にする。
 *
 * 赤にするもの（無条件の異常）:
 *   - inspected == 0            … 検査ゼロを PASS と呼ばない（CLAUDE.md §9）
 *   - sitemap_urls > 1900       … URL Inspection の 1,900 件上限に到達＝**サイレントな切り詰め**。
 *                                 indexed_ratio の分母だけが増えて比率が偽って下がる
 *   - indexed_ratio < 0.60      … gsc-management.md の警戒しきい値
 *
 * warning に留めるもの（判断が要る信号）:
 *   - indexed_ratio が前回比 −5pt 超    … 単月では受験期の需要変動と交絡する
 *   - discovered_not_indexed > 20%     … 原因バケットの切り分けが要る
 *   - hygiene（not_found + redirect）> 0
 *   これらはクラウドルーティン（GSC auto review）が観測ログに記録し【要確認】通知する担当。
 *   CI を赤くするのは無条件異常だけに絞る＝月次 red の狼少年化を防ぐ。
 *
 * 使い方: node .claude/scripts/check-coverage-thresholds.mjs [--history <path>]
 * exit 0 = 合格 / exit 1 = 無条件異常（GitHub Actions が Issue を起票する）
 * ---------------------------------------------------------------------------
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, isAbsolute, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

const args = process.argv.slice(2);
const hi = args.indexOf("--history");
const HISTORY = hi >= 0 && args[hi + 1] ? args[hi + 1] : ".claude/state/metrics/gsc/index-coverage-history.json";

/** URL Inspection の 1 日上限 2,000 に対する安全マージン（index-coverage.yml の head -n と一致させる）。 */
const INSPECT_CAP = 1900;
const RATIO_FAIL = 0.6;
const RATIO_DROP_WARN = 0.05;
const DISCOVERED_WARN = 0.2;

const errors = [];
const warnings = [];

// --history は絶対パス（テスト用）も repo 相対も受ける。
const HISTORY_PATH = isAbsolute(HISTORY) ? HISTORY : join(ROOT, HISTORY);

let history;
try {
  const raw = JSON.parse(readFileSync(HISTORY_PATH, "utf-8"));
  history = Array.isArray(raw) ? raw : (raw.history ?? raw.entries ?? Object.values(raw).find(Array.isArray));
} catch (e) {
  console.error(`::error::coverage history を読めない: ${HISTORY}（${e.message}）`);
  process.exit(1);
}

if (!Array.isArray(history) || history.length === 0) {
  console.error("::error::coverage history が空＝検査ゼロ。append-coverage-history.mjs の失敗を疑う");
  process.exit(1);
}

const latest = history[history.length - 1];
const prev = history.length >= 2 ? history[history.length - 2] : null;

const n = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const inspected = n(latest.inspected);
const sitemapUrls = n(latest.sitemap_urls);
const indexed = n(latest.indexed);
const ratio = typeof latest.indexed_ratio === "number" ? latest.indexed_ratio : sitemapUrls ? indexed / sitemapUrls : 0;
const discovered = n(latest.discovered_not_indexed);
const hygiene = n(latest.not_found) + n(latest.redirect);

// §9: 何を検査したのかを必ず出す（緑でも赤でも）。
console.log(
  `[coverage-thresholds] 対象 ${latest.date}: inspected ${inspected} / sitemap ${sitemapUrls} / indexed ${indexed}（ratio ${(ratio * 100).toFixed(1)}%）`,
);
console.log(
  `  discovered-not-indexed ${discovered} / crawled-not-indexed ${n(latest.crawled_not_indexed)} / hygiene ${hygiene}（history ${history.length} エントリ）`,
);

// ── 無条件異常（赤）─────────────────────────────────────────────
if (inspected === 0) {
  errors.push("inspected が 0 件＝1 件も検査できていない（URL Inspection の失敗を疑う）");
}
if (sitemapUrls > INSPECT_CAP) {
  errors.push(
    `sitemap_urls ${sitemapUrls} が上限 ${INSPECT_CAP} を超過＝検査対象がサイレントに切り詰められ、indexed_ratio が偽って低く出る。index-coverage.yml の分割取得が必要`,
  );
}
if (ratio < RATIO_FAIL) {
  errors.push(`indexed_ratio ${(ratio * 100).toFixed(1)}% が警戒しきい値 ${RATIO_FAIL * 100}% を下回った`);
}

// ── 判断が要る信号（warning・ルーティンが観測ログへ記録する）───────
if (inspected < sitemapUrls) {
  warnings.push(`inspected ${inspected} < sitemap ${sitemapUrls}＝${sitemapUrls - inspected} 件が未検査`);
}
if (prev && typeof prev.indexed_ratio === "number") {
  const drop = prev.indexed_ratio - ratio;
  if (drop > RATIO_DROP_WARN) {
    warnings.push(
      `indexed_ratio が前回（${prev.date} ${(prev.indexed_ratio * 100).toFixed(1)}%）比 −${(drop * 100).toFixed(1)}pt`,
    );
  }
}
if (sitemapUrls > 0 && discovered / sitemapUrls > DISCOVERED_WARN) {
  warnings.push(`discovered_not_indexed が ${((discovered / sitemapUrls) * 100).toFixed(1)}%（許容 ${DISCOVERED_WARN * 100}%）`);
}
if (hygiene > 0) {
  warnings.push(`hygiene（404 ${n(latest.not_found)} / redirect ${n(latest.redirect)}）が 0 でない`);
}

for (const w of warnings) console.log(`::warning::[coverage] ${w}`);
for (const e of errors) console.error(`::error::[coverage] ${e}`);

if (errors.length > 0) {
  console.error(`\n[coverage-thresholds] FAIL: 無条件異常 ${errors.length} 件（warning ${warnings.length} 件）`);
  process.exit(1);
}
console.log(`\n[coverage-thresholds] PASS: 無条件異常なし（warning ${warnings.length} 件）`);
process.exit(0);
