/**
 * PageSpeed Insights API 取得スクリプト
 *
 * Core Web Vitals（LCP, INP, CLS）と Lighthouse スコアを取得し
 * .claude/state/metrics/psi/ に時系列で保存する。
 *
 * 認証方針:
 *   PSI API v5 は公開エンドポイント。低量の呼び出しは API キー不要。
 *   より高い quota (25,000/日) が必要な場合は GCP Console で API キーを作成し
 *   .env.local に PSI_API_KEY=<key> を追加する。
 *   --top を使う場合のみ GSC サービスアカウント認証が必要。
 *
 * 参照: .claude/skills/management/nsm-experiment/references/definition.md
 *       scripts/fetch-gsc-data.mjs / scripts/fetch-ga4-data.mjs (パターンの参考)
 *
 * Usage:
 *   npm run fetch-psi-data -- --url https://doboku-note.com/
 *   npm run fetch-psi-data -- --url https://doboku-note.com/ --strategy mobile
 *   npm run fetch-psi-data -- --url https://doboku-note.com/ --strategy desktop
 *   npm run fetch-psi-data -- --file urls.txt                         # 複数 URL をファイルから
 *   npm run fetch-psi-data -- --top 10                                # GSC 上位ページ自動選択（要 GSC 認証）
 *   npm run fetch-psi-data -- --url <url> --json                      # JSON のみ出力
 *
 * 必要な環境変数 (.env.local):
 *   PSI_API_KEY                          (任意、quota を上げたい場合)
 *   GOOGLE_SERVICE_ACCOUNT_KEY_PATH      (--top 使用時のみ)
 */

import { google } from "googleapis";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";
import { runPool } from "../../scripts/lib/worker-pool.mjs";

dotenv.config({ path: ".env.local" });

// ── Config ──

const OUTPUT_DIR = ".claude/state/metrics/psi";
const DEFAULT_STRATEGY = "mobile";
const DEFAULT_CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];

// ── CLI args ──

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    url: null,
    file: null,
    top: null,
    strategy: DEFAULT_STRATEGY,
    categories: DEFAULT_CATEGORIES,
    json: false,
    // 同時計測数。支配項は Lighthouse 実行（1 件 20〜30 秒）なので 4 で 44 件 ≈ 6〜8 分。
    // 8 以上は `500 Lighthouse returned error` を誘発しやすい（2026-08-18 に全件で観測）ため控えめに。
    concurrency: Number(process.env.PSI_CONCURRENCY) || 4,
  };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--url":
        opts.url = args[++i];
        break;
      case "--concurrency":
        opts.concurrency = Math.max(1, parseInt(args[++i], 10) || 1);
        break;
      case "--file":
        opts.file = args[++i];
        break;
      case "--top":
        opts.top = parseInt(args[++i], 10);
        break;
      case "--strategy":
        opts.strategy = args[++i];
        break;
      case "--categories":
        opts.categories = args[++i].split(",").map((c) => c.trim());
        break;
      case "--json":
        opts.json = true;
        break;
    }
  }
  return opts;
}

// ── Auth ──
// PSI は認証不要。--top 使用時のみ GSC のサービスアカウントを使う

function getGscAuth() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  if (!keyPath || !existsSync(keyPath)) {
    console.error(
      "Error: --top には GSC サービスアカウント鍵が必要。GOOGLE_SERVICE_ACCOUNT_KEY_PATH を確認。",
    );
    process.exit(1);
  }
  const credentials = JSON.parse(readFileSync(keyPath, "utf-8"));
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
}

// ── URL list 取得 ──

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
    siteUrl: "sc-domain:doboku-note.com",
    requestBody: {
      startDate: fmt(start),
      endDate: fmt(end),
      dimensions: ["page"],
      rowLimit: top,
    },
  });
  return (res.data.rows || []).map((r) => r.keys[0]);
}

// ── Fetch ──

/**
 * 5xx だけリトライする。Lighthouse は一時的に `500 Something went wrong` を返すことがあり、
 * これをそのまま欠測にすると **「違反が消えた」と「測れていない」が区別できなくなる**
 * （直近14バッチ 308 計測中 21 失敗＝欠測率 6.8%・429 は 0 件だったのでクォータ問題ではない）。
 *
 * **4xx はリトライしない**。400/403 は設定ミス、429 はクォータで、いずれも再送すると
 * 原因を隠したまま時間だけ延びる。リトライで隠していいのは相手側の一過性の失敗だけ。
 */
const PSI_RETRY = { attempts: 3, baseDelayMs: 2000 };
/** 1 リクエストの上限。Lighthouse は長くても 60 秒台で返るので、2 分応答が無ければハング扱い。 */
const PSI_FETCH_TIMEOUT_MS = 120_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** リトライすべきか。5xx とネットワーク断だけ true。 */
export function shouldRetryPsi(status) {
  return status === null || (status >= 500 && status <= 599);
}

async function fetchPsi(url, opts) {
  // PSI 公開エンドポイントを直接叩く。API キーがあれば quota 拡張、無くても動く
  const params = new URLSearchParams();
  params.append("url", url);
  params.append("strategy", opts.strategy);
  for (const cat of opts.categories) params.append("category", cat);
  if (process.env.PSI_API_KEY) params.append("key", process.env.PSI_API_KEY);

  const endpoint = `https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`;

  let lastError = null;
  for (let attempt = 1; attempt <= PSI_RETRY.attempts; attempt += 1) {
    let res = null;
    try {
      // 応答が返らない hung は 5xx と同じ「相手側の一過性」として同じリトライ経路へ乗せる。
      // これが無いと 1 件のハングだけで job の timeout-minutes を食い潰す（2026-09-01 cancelled）。
      res = await fetch(endpoint, { signal: AbortSignal.timeout(PSI_FETCH_TIMEOUT_MS) });
    } catch (e) {
      lastError = new Error(`PSI network error: ${String(e.message ?? e).slice(0, 200)}`);
      if (attempt < PSI_RETRY.attempts) {
        console.error(`  [psi-retry] ${opts.strategy} ${url} ネットワーク断 → ${attempt}/${PSI_RETRY.attempts - 1} 回目の再送`);
        await sleep(PSI_RETRY.baseDelayMs * attempt);
        continue;
      }
      throw lastError;
    }

    if (res.ok) return res.json();

    const body = await res.text();
    if (res.status === 429) explain429();
    lastError = new Error(`PSI API ${res.status}: ${body.slice(0, 300)}`);

    if (!shouldRetryPsi(res.status) || attempt === PSI_RETRY.attempts) throw lastError;
    console.error(`  [psi-retry] ${opts.strategy} ${url} が ${res.status} → ${attempt}/${PSI_RETRY.attempts - 1} 回目の再送`);
    await sleep(PSI_RETRY.baseDelayMs * attempt);
  }
  throw lastError;
}

// 429 の説明は 1 回だけ（22 URL 分繰り返さない）
let explained429 = false;

/**
 * 429 の原因をその場で明示する。キー無しの 429 は「PSI の障害」でも「クォータ枯渇」でもなく
 * ローカル環境の状態（匿名共有枠）であり、そう書かないと誤って障害報告される
 * （2026-07-27 に実際に誤報告した。真実源: measurement-incidents.md）。
 * 呼び出し側は e.message を 200 字で切るため、Error に載せず直接出力する。
 */
function explain429() {
  if (explained429) return;
  explained429 = true;

  if (!process.env.PSI_API_KEY) {
    console.error(
      [
        "",
        "  ── 429 の原因 ─────────────────────────────────",
        "  PSI_API_KEY が未設定です。キー無しリクエストは Google の匿名共有枠に載るため、",
        "  他者の利用も含めて日常的に枯れています。",
        "  これは「PSI の障害」でも「このプロジェクトのクォータ枯渇」でもありません。",
        "",
        "  計測は CI/CD 供給が正（キーは GitHub Secrets にあり、日次ジョブは正常に動いています）。",
        "  → 既存データ: .claude/state/metrics/psi/psi-batch-*.json",
        "  → 真実源: .claude/knowledge/reference/measurement-incidents.md",
        "  ───────────────────────────────────────────────",
      ].join("\n"),
    );
    return;
  }

  console.error(
    [
      "",
      "  ── 429 の原因 ─────────────────────────────────",
      "  PSI_API_KEY は設定済みのため、本当に日次クォータを使い切っています。",
      "  Google Cloud Console の PageSpeed Insights API のクォータを確認してください。",
      "  ───────────────────────────────────────────────",
    ].join("\n"),
  );
}

// ── 結果整形 ──

function extractSummary(data, url, strategy) {
  const lighthouse = data.lighthouseResult || {};
  const categories = lighthouse.categories || {};
  const audits = lighthouse.audits || {};
  const loadingExperience = data.loadingExperience || {};
  const metrics = loadingExperience.metrics || {};

  const pick = (key) => (categories[key]?.score != null ? Math.round(categories[key].score * 100) : null);
  const lab = (key) => audits[key]?.numericValue ?? null;
  const field = (key) => {
    const m = metrics[key];
    if (!m) return null;
    return {
      percentile: m.percentile,
      distributions: m.distributions,
      category: m.category, // FAST / AVERAGE / SLOW
    };
  };

  return {
    url,
    strategy,
    fetched_at: new Date().toISOString(),
    scores: {
      performance: pick("performance"),
      accessibility: pick("accessibility"),
      best_practices: pick("best-practices"),
      seo: pick("seo"),
    },
    lab_data: {
      LCP_ms: lab("largest-contentful-paint"),
      TBT_ms: lab("total-blocking-time"),
      CLS: lab("cumulative-layout-shift"),
      FCP_ms: lab("first-contentful-paint"),
      TTI_ms: lab("interactive"),
      SI_ms: lab("speed-index"),
    },
    field_data: {
      LCP: field("LARGEST_CONTENTFUL_PAINT_MS"),
      INP: field("INTERACTION_TO_NEXT_PAINT"),
      CLS: field("CUMULATIVE_LAYOUT_SHIFT_SCORE"),
      FCP: field("FIRST_CONTENTFUL_PAINT_MS"),
      TTFB: field("EXPERIMENTAL_TIME_TO_FIRST_BYTE"),
    },
    // DN-0158 診断 (1): field が null のとき「URL レベルに無いだけ（origin にはある）」か
    // 「origin にも無い（CrUX 全体の供給問題）」かを、生応答を保存せずに判定できるよう
    // 両キーの有無をフラグで残す。psi-threshold-check がレポートに内訳を出す。
    field_availability: extractFieldAvailability(data),
    // LCP 要素（どの DOM 要素が LCP なのか）。PSI が返す監査をそのまま保持する。
    // これが無いと「LCP が遅い」までしか分からず、原因特定に別途ブラウザ計測が要る
    // （EXP-005 で実際に Playwright での再計測が必要になった。2026-07-27）
    lcp_element: extractLcpElement(audits),
    analysis_utc: lighthouse.fetchTime || null,
    final_url: lighthouse.finalUrl || url,
  };
}

/**
 * loadingExperience（URL レベル CrUX）と originLoadingExperience（origin レベル CrUX）の有無。
 * PSI は URL レベルのデータが無いとき loadingExperience に origin_fallback:true を立てて
 * origin の値を入れて返すことがあるので、url_level はそれを除いて数える。
 */
export function extractFieldAvailability(data) {
  const le = data?.loadingExperience;
  const ole = data?.originLoadingExperience;
  const hasMetrics = (x) => Boolean(x && x.metrics && Object.keys(x.metrics).length > 0);
  return {
    url_level: hasMetrics(le) && !le.origin_fallback,
    origin_level: hasMetrics(ole),
    origin_fallback: Boolean(le?.origin_fallback),
    url_overall_category: le?.overall_category ?? null,
    origin_overall_category: ole?.overall_category ?? null,
  };
}

/**
 * audits['largest-contentful-paint-element'] から LCP 要素の情報を取り出す。
 * 監査は details.items[].items[] に node（snippet/selector）を持つ構造。
 */
function extractLcpElement(audits) {
  const node = audits["largest-contentful-paint-element"]?.details?.items?.[0]?.items?.[0]?.node;
  if (!node) return null;
  return {
    selector: node.selector ?? null,
    snippet: node.snippet ? node.snippet.slice(0, 300) : null,
    node_label: node.nodeLabel ?? null,
  };
}

// ── 出力 ──

function printSummary(summary) {
  console.log(`\n=== ${summary.url} (${summary.strategy}) ===`);
  console.log("Scores (0-100):");
  for (const [k, v] of Object.entries(summary.scores)) {
    console.log(`  ${k.padEnd(16)}: ${v ?? "N/A"}`);
  }
  console.log("Lab data:");
  const lab = summary.lab_data;
  if (lab.LCP_ms != null) console.log(`  LCP: ${Math.round(lab.LCP_ms)} ms`);
  if (lab.TBT_ms != null) console.log(`  TBT: ${Math.round(lab.TBT_ms)} ms`);
  if (lab.CLS != null) console.log(`  CLS: ${lab.CLS.toFixed(3)}`);
  if (lab.FCP_ms != null) console.log(`  FCP: ${Math.round(lab.FCP_ms)} ms`);
  if (lab.TTI_ms != null) console.log(`  TTI: ${Math.round(lab.TTI_ms)} ms`);

  console.log("Field data (実ユーザー計測, 過去 28 日):");
  const f = summary.field_data;
  const fmtField = (m) => (m ? `${m.percentile} (${m.category})` : "N/A");
  console.log(`  LCP:  ${fmtField(f.LCP)}`);
  console.log(`  INP:  ${fmtField(f.INP)}`);
  console.log(`  CLS:  ${fmtField(f.CLS)}`);
  console.log(`  FCP:  ${fmtField(f.FCP)}`);
  console.log(`  TTFB: ${fmtField(f.TTFB)}`);
}

function saveJson(summaries) {
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `psi-${summaries.length > 1 ? "batch" : "single"}-${timestamp}.json`;
  const filepath = join(OUTPUT_DIR, filename);
  writeFileSync(filepath, JSON.stringify({ version: 1, generated_at: new Date().toISOString(), results: summaries }, null, 2), "utf-8");
  return filepath;
}

// ── メイン ──

async function main() {
  const opts = parseArgs();

  if (!opts.url && !opts.file && !opts.top) {
    console.error("Usage: --url <URL> | --file <list.txt> | --top <N>");
    process.exit(2);
  }

  // URL リスト構築
  let urls = [];
  if (opts.url) urls.push(opts.url);
  if (opts.file) urls.push(...readUrlsFromFile(opts.file));
  if (opts.top) {
    console.log(`GSC 上位 ${opts.top} ページを取得中...`);
    const gscAuth = getGscAuth();
    urls.push(...(await getTopUrlsFromGsc(gscAuth, opts.top)));
  }
  urls = [...new Set(urls)];

  console.log(`PSI 計測対象: ${urls.length} URL (strategy: ${opts.strategy})`);

  // キー無しでも PSI は動くが匿名共有枠のため 429 になりやすい。先に断っておかないと
  // 429 を「PSI の障害」と誤読させる（2026-07-27 に実際に誤報告した）。CI は Secrets 供給なので黙る。
  if (!process.env.PSI_API_KEY && !process.env.CI) {
    console.warn(
      "[fetch-psi-data] WARN PSI_API_KEY 未設定。キー無しは匿名共有枠に載るため 429 になりやすい\n" +
        "  計測は CI/CD 供給が正。既存データ: .claude/state/metrics/psi/psi-batch-*.json",
    );
  }

  // 固定並列で計測する（既定 4）。直列だと 44 件で 15〜21 分かかり、job の timeout-minutes 20 に
  // 当たって cancelled になった（2026-09-01）。結果は runPool が入力順で返すので順序は保たれる。
  console.log(`同時計測数: ${opts.concurrency}`);
  let loggedTopLevelKeys = false;
  const pooled = await runPool(urls, opts.concurrency, async (url, i) => {
    console.log(`\n[${i + 1}/${urls.length}] ${url}`);
    const data = await fetchPsi(url, opts);
    if (!loggedTopLevelKeys) {
      // DN-0158 診断 (1): 生応答の保存の代わりにトップレベルキーを 1 回だけログに残す
      loggedTopLevelKeys = true;
      console.log(`  [psi] 応答トップレベルキー: ${Object.keys(data).join(",")}`);
    }
    const summary = extractSummary(data, url, opts.strategy);
    if (!opts.json) printSummary(summary);
    return summary;
  });
  const summaries = pooled.map((r, i) => {
    if (r.ok) return r.value;
    const e = r.error;
    console.error(`  Error (${urls[i]}): ${e.message?.slice(0, 200)}`);
    return { url: urls[i], strategy: opts.strategy, error: e.message?.slice(0, 200) };
  });

  const filepath = saveJson(summaries);
  console.log(`\n出力: ${filepath}`);

  if (opts.json) {
    console.log(JSON.stringify(summaries, null, 2));
  }
}

// import 時は実行しない（テストが shouldRetryPsi を読めるようにする）。
// 他の検査スクリプトと同じ isMain ガード。
const isMain = process.argv[1]
  && process.argv[1].split(/[\\/]/).pop() === 'fetch-psi-data.mjs';

if (isMain) main().catch((e) => {
  const code = e.code || e.details?.code;
  if (code === 7 || e.message?.includes("PERMISSION_DENIED")) {
    console.error(
      "Error: アクセス権がありません。\n" +
        "PageSpeed Insights API がプロジェクトで有効化されているか確認してください。",
    );
  } else if (code === 16 || e.message?.includes("UNAUTHENTICATED")) {
    console.error("Error: 認証に失敗しました。鍵ファイルを確認してください。");
  } else {
    console.error("Error:", e.message);
    if (e.details) console.error("Details:", e.details);
  }
  process.exit(1);
});
