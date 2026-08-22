/**
 * Google Search Console URL Inspection API スクリプト
 *
 * 単一 URL のインデックス状態・最終クロール日・モバイル適合性を確認。
 * 既存の GSC サービスアカウント鍵を流用（同じ scopes で動作）。
 *
 * 参照: .claude/knowledge/reference/data-storage-decision.md (データ保存方針)
 *       scripts/fetch-gsc-data.mjs (認証パターンの参考)
 *
 * Usage:
 *   npm run inspect-url -- --url https://doboku-note.com/docs/civil-construction-1-guide-strategy
 *   npm run inspect-url -- --url <URL> --json
 *   npm run inspect-url -- --file urls.txt                        # 複数 URL 順次検査
 *   npm run inspect-url -- --top 10                               # GSC 上位 10 ページを検査
 *
 * 必要な環境変数 (.env.local):
 *   GOOGLE_SERVICE_ACCOUNT_KEY_PATH (Step 1 と同じ)
 */

import { google } from "googleapis";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// ── Config ──

const SITE_URL = "sc-domain:doboku-note.com";
const SITE_URL_FOR_INSPECTION = "https://doboku-note.com/"; // URL Inspection は URL プレフィックス形式が必要な場合あり
const OUTPUT_DIR = ".claude/state/metrics/url-inspection";

// ── CLI args ──

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { url: null, file: null, top: null, json: false };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--url":
        opts.url = args[++i];
        break;
      case "--file":
        opts.file = args[++i];
        break;
      case "--top":
        opts.top = parseInt(args[++i], 10);
        break;
      case "--json":
        opts.json = true;
        break;
    }
  }
  return opts;
}

// ── Auth ──

function getAuth() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  if (!keyPath || !existsSync(keyPath)) {
    console.error(`Error: 鍵ファイルが見つかりません: ${keyPath || "(unset)"}`);
    process.exit(1);
  }
  const credentials = JSON.parse(readFileSync(keyPath, "utf-8"));
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
}

// ── URL Inspection API ──

async function inspectUrl(auth, inspectionUrl) {
  const searchconsole = google.searchconsole({ version: "v1", auth });
  const res = await searchconsole.urlInspection.index.inspect({
    requestBody: {
      inspectionUrl,
      siteUrl: SITE_URL,
      languageCode: "ja-JP",
    },
  });
  return res.data?.inspectionResult || {};
}

// ── 結果整形 ──

function extractSummary(result, inspectedUrl) {
  const indexStatus = result.indexStatusResult || {};
  const mobile = result.mobileUsabilityResult || {};
  const amp = result.ampResult || {};
  const richResults = result.richResultsResult || {};

  return {
    url: inspectedUrl,
    inspected_at: new Date().toISOString(),
    index: {
      verdict: indexStatus.verdict || null, // PASS / PARTIAL / FAIL / NEUTRAL
      coverage_state: indexStatus.coverageState || null, // e.g., "Submitted and indexed"
      robots_txt_state: indexStatus.robotsTxtState || null,
      indexing_state: indexStatus.indexingState || null,
      last_crawl_time: indexStatus.lastCrawlTime || null,
      page_fetch_state: indexStatus.pageFetchState || null,
      google_canonical: indexStatus.googleCanonical || null,
      user_canonical: indexStatus.userCanonical || null,
      referring_urls: indexStatus.referringUrls || [],
      sitemap: indexStatus.sitemap || [],
    },
    mobile: {
      verdict: mobile.verdict || null,
      issues: mobile.issues || [],
    },
    amp: {
      verdict: amp.verdict || null,
      indexing_state: amp.indexingState || null,
    },
    rich_results: {
      verdict: richResults.verdict || null,
      detected_items: (richResults.detectedItems || []).map((i) => i.richResultType),
    },
    inspection_result_link: result.inspectionResultLink || null,
  };
}

function printSummary(summary) {
  const verdictEmoji = (v) =>
    ({ PASS: "✓", PARTIAL: "⚠", FAIL: "✗", NEUTRAL: "—" }[v] || "?");

  console.log(`\n=== ${summary.url} ===`);
  console.log(`インデックス: ${verdictEmoji(summary.index.verdict)} ${summary.index.verdict}`);
  console.log(`  カバレッジ:       ${summary.index.coverage_state}`);
  console.log(`  インデックス状態: ${summary.index.indexing_state}`);
  console.log(`  最終クロール:     ${summary.index.last_crawl_time || "(未取得)"}`);
  console.log(`  ページ取得状態:   ${summary.index.page_fetch_state}`);
  console.log(`  robots.txt:       ${summary.index.robots_txt_state}`);
  if (summary.index.google_canonical !== summary.index.user_canonical) {
    console.log(`  ⚠ canonical 相違:`);
    console.log(`    user:   ${summary.index.user_canonical}`);
    console.log(`    Google: ${summary.index.google_canonical}`);
  }
  console.log(`モバイル:     ${verdictEmoji(summary.mobile.verdict)} ${summary.mobile.verdict}`);
  if (summary.mobile.issues.length > 0) {
    for (const issue of summary.mobile.issues) {
      console.log(`  ⚠ ${issue.issueType}: ${issue.message}`);
    }
  }
  if (summary.rich_results.verdict) {
    console.log(`リッチリザルト: ${verdictEmoji(summary.rich_results.verdict)} ${summary.rich_results.verdict}`);
    if (summary.rich_results.detected_items.length) {
      console.log(`  検出: ${summary.rich_results.detected_items.join(", ")}`);
    }
  }
  if (summary.inspection_result_link) {
    console.log(`詳細: ${summary.inspection_result_link}`);
  }
}

function readUrlsFromFile(path) {
  return readFileSync(path, "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

async function getTopUrlsFromGsc(auth, top) {
  const searchconsole = google.searchconsole({ version: "v1", auth });
  const end = new Date();
  end.setDate(end.getDate() - 3);
  const start = new Date(end);
  start.setDate(start.getDate() - 28);
  const fmt = (d) => d.toISOString().split("T")[0];

  const res = await searchconsole.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate: fmt(start),
      endDate: fmt(end),
      dimensions: ["page"],
      rowLimit: top,
    },
  });
  return (res.data.rows || []).map((r) => r.keys[0]);
}

function saveJson(summaries) {
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `inspection-${summaries.length > 1 ? "batch" : "single"}-${timestamp}.json`;
  const filepath = join(OUTPUT_DIR, filename);
  writeFileSync(
    filepath,
    JSON.stringify({ version: 1, generated_at: new Date().toISOString(), results: summaries }, null, 2),
    "utf-8",
  );
  return filepath;
}

// ── メイン ──

async function main() {
  const opts = parseArgs();
  if (!opts.url && !opts.file && !opts.top) {
    console.error("Usage: --url <URL> | --file <list.txt> | --top <N>");
    process.exit(2);
  }

  const auth = getAuth();

  let urls = [];
  if (opts.url) urls.push(opts.url);
  if (opts.file) urls.push(...readUrlsFromFile(opts.file));
  if (opts.top) {
    console.log(`GSC 上位 ${opts.top} ページを取得中...`);
    urls.push(...(await getTopUrlsFromGsc(auth, opts.top)));
  }
  urls = [...new Set(urls)];

  console.log(`URL Inspection: ${urls.length} URL`);

  const summaries = [];
  for (const url of urls) {
    try {
      console.log(`\n[${summaries.length + 1}/${urls.length}] ${url}`);
      const result = await inspectUrl(auth, url);
      const summary = extractSummary(result, url);
      summaries.push(summary);
      if (!opts.json) printSummary(summary);
    } catch (e) {
      console.error(`  Error: ${e.message?.slice(0, 200)}`);
      summaries.push({ url, error: e.message?.slice(0, 200) });
    }
  }

  const filepath = saveJson(summaries);
  console.log(`\n出力: ${filepath}`);

  if (opts.json) {
    console.log(JSON.stringify(summaries, null, 2));
  }
}

main().catch((e) => {
  const code = e.code || e.details?.code;
  if (code === 7 || e.message?.includes("PERMISSION_DENIED")) {
    console.error("Error: アクセス権がありません。GSC サービスアカウントの権限を確認してください。");
  } else if (code === 429 || e.message?.includes("quota")) {
    console.error("Error: クォータ超過。URL Inspection API は 1 日 2,000 URL まで。");
  } else {
    console.error("Error:", e.message);
  }
  process.exit(1);
});
