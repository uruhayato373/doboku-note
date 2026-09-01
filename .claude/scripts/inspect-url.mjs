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
import { runPool } from "../../scripts/lib/worker-pool.mjs";

dotenv.config({ path: ".env.local" });

// ── Config ──

const SITE_URL = "sc-domain:doboku-note.com";
const SITE_URL_FOR_INSPECTION = "https://doboku-note.com/"; // URL Inspection は URL プレフィックス形式が必要な場合あり
const OUTPUT_DIR = ".claude/state/metrics/url-inspection";

/**
 * 並列度の既定。URL Inspection は 2,000/日・600/分 が上限で、1 件 2〜5 秒なので 5 並列でも
 * 60〜150/分＝分あたり上限の 1/4 以下。1,468 URL を直列で回すと 120 分の job timeout に当たって
 * cancelled になった（2026-09-01）。5 並列なら見込み 15〜25 分。
 */
const DEFAULT_CONCURRENCY = 5;
/** 何件ごとに部分結果を書くか（途中で落ちても直近 N 件未満しか失わない）。 */
const DEFAULT_CHECKPOINT_EVERY = 100;
/** 429/5xx の再試行回数と待ち（2s × attempt）。4xx（403/400）は設定ミスなので再試行しない。 */
const RETRY_ATTEMPTS = 3;
const RETRY_BASE_MS = 2_000;
/** SIGINT/SIGTERM で部分結果を flush して終了したときの exit code（CI が partial と判別する）。 */
const EXIT_INTERRUPTED = 3;

// ── CLI args ──

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    url: null,
    file: null,
    top: null,
    json: false,
    concurrency: Number(process.env.INSPECT_CONCURRENCY) || DEFAULT_CONCURRENCY,
    checkpointEvery: DEFAULT_CHECKPOINT_EVERY,
  };
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
      case "--concurrency":
        opts.concurrency = Math.max(1, parseInt(args[++i], 10) || 1);
        break;
      case "--checkpoint-every":
        opts.checkpointEvery = Math.max(1, parseInt(args[++i], 10) || 1);
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

/**
 * googleapis の例外から HTTP ステータスを取り出す。GaxiosError は e.code（数値または文字列）と
 * e.response.status の両方に入ることがあり、どちらか片方しか無い版もある。
 */
export function httpStatusOf(e) {
  const fromResponse = Number(e?.response?.status);
  if (Number.isFinite(fromResponse) && fromResponse > 0) return fromResponse;
  const fromCode = Number(e?.code);
  if (Number.isFinite(fromCode) && fromCode >= 100 && fromCode < 600) return fromCode;
  return null;
}

/** 再試行するのは 429（分あたり上限）と 5xx だけ。403/400 は権限・設定ミスなので即失敗させる。 */
export function shouldRetryInspect(e) {
  const status = httpStatusOf(e);
  if (status === 429) return true;
  if (status != null && status >= 500 && status < 600) return true;
  return false;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function inspectUrl(auth, inspectionUrl, { attempts = RETRY_ATTEMPTS, baseMs = RETRY_BASE_MS } = {}) {
  const searchconsole = google.searchconsole({ version: "v1", auth });
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await searchconsole.urlInspection.index.inspect({
        requestBody: {
          inspectionUrl,
          siteUrl: SITE_URL,
          languageCode: "ja-JP",
        },
      });
      return res.data?.inspectionResult || {};
    } catch (e) {
      lastError = e;
      if (attempt < attempts && shouldRetryInspect(e)) {
        console.error(`  retry ${attempt}/${attempts - 1} (${httpStatusOf(e)}) ${inspectionUrl}`);
        await sleep(baseMs * attempt);
        continue;
      }
      throw e;
    }
  }
  throw lastError;
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

/**
 * 出力ファイル名は開始時に確定する（checkpoint と最終保存が同じファイルを上書きする）。
 * 途中で落ちても「最後の checkpoint までの部分結果」が同名で残り、CI がそれを拾える。
 */
function resolveOutputPath(total) {
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `inspection-${total > 1 ? "batch" : "single"}-${timestamp}.json`;
  return join(OUTPUT_DIR, filename);
}

/**
 * batch ファイルの中身。results は「settled した順ではなく入力順」で、未着手の穴は落とす。
 *   partial   … total 件すべてが settled していない（途中 checkpoint / 中断 flush）
 *   completed … settled 件数（error エントリも数える＝「検査を試みた」件数）
 *   total     … 検査対象の件数
 * append-coverage-history / check-coverage-thresholds は partial:true の batch を history に
 * 積んではいけない（分母が偽って小さくなる）ので、CI はこのフラグを見て publish を分岐する。
 */
export function buildBatchDocument(settled, total) {
  const results = settled.filter((s) => s != null);
  return {
    version: 1,
    generated_at: new Date().toISOString(),
    partial: results.length < total,
    completed: results.length,
    total,
    results,
  };
}

function writeBatch(filepath, settled, total) {
  writeFileSync(filepath, JSON.stringify(buildBatchDocument(settled, total), null, 2), "utf-8");
}

// ── メイン ──

async function main() {
  const opts = parseArgs();
  if (!opts.url && !opts.file && !opts.top) {
    console.error("Usage: --url <URL> | --file <list.txt> | --top <N> [--concurrency N] [--checkpoint-every N]");
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

  console.log(`URL Inspection: ${urls.length} URL（同時 ${opts.concurrency} / checkpoint ${opts.checkpointEvery} 件ごと）`);

  const filepath = resolveOutputPath(urls.length);
  const settled = new Array(urls.length);

  // SIGINT/SIGTERM（CI の `timeout -s INT` を含む）: 新規取得をやめ、進行中の数件が返ったら
  // 部分結果を flush して exit 3。何も書かずに死ぬと「最後の checkpoint 以降」が全部消える。
  let stopping = false;
  const onSignal = (sig) => {
    if (stopping) return;
    stopping = true;
    console.error(`\n[inspect-url] ${sig} を受信。新規取得を止めて部分結果を書き出す…`);
  };
  process.on("SIGINT", () => onSignal("SIGINT"));
  process.on("SIGTERM", () => onSignal("SIGTERM"));

  let lastCheckpoint = 0;
  await runPool(
    urls,
    opts.concurrency,
    async (url, i) => {
      console.log(`\n[${i + 1}/${urls.length}] ${url}`);
      const result = await inspectUrl(auth, url);
      const summary = extractSummary(result, url);
      if (!opts.json) printSummary(summary);
      return summary;
    },
    {
      shouldStop: () => stopping,
      onSettled: (i, r, done) => {
        if (r.ok) {
          settled[i] = r.value;
        } else {
          console.error(`  Error: ${r.error?.message?.slice(0, 200)}`);
          settled[i] = { url: urls[i], error: r.error?.message?.slice(0, 200) };
        }
        if (done - lastCheckpoint >= opts.checkpointEvery) {
          lastCheckpoint = done;
          writeBatch(filepath, settled, urls.length);
          console.log(`[checkpoint] ${done}/${urls.length} → ${filepath}`);
        }
      },
    },
  );

  writeBatch(filepath, settled, urls.length);
  const doc = buildBatchDocument(settled, urls.length);
  console.log(`\n出力: ${filepath}（${doc.completed}/${doc.total}${doc.partial ? " PARTIAL" : ""}）`);

  if (opts.json) {
    console.log(JSON.stringify(doc.results, null, 2));
  }
  if (doc.partial) process.exit(EXIT_INTERRUPTED);
}

// import 時は実行しない（テストが buildBatchDocument / shouldRetryInspect を読めるようにする）。
const isMain = process.argv[1] && process.argv[1].split(/[\\/]/).pop() === "inspect-url.mjs";

if (isMain) main().catch((e) => {
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
