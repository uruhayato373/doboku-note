/**
 * GSC URL Inspection + Search Analytics データを集計し診断レポートを生成
 *
 * Usage:
 *   node .claude/scripts/analyze-gsc-coverage.mjs \
 *     --inspection-glob ".claude/state/metrics/url-inspection/inspection-batch-2026-04-27*.json" \
 *     --page-data .claude/state/metrics/gsc/gsc-page-2026-04-27T11-15-23.json \
 *     --query-data .claude/state/metrics/gsc/gsc-query-2026-04-27T11-15-31.json \
 *     --brand-query-data .claude/state/metrics/gsc/gsc-query-2026-04-27T11-15-32.json \
 *     --url-dir .tmp/gsc-urls/
 *
 * 出力:
 *   .claude/state/metrics/gsc/coverage-diagnosis-{ts}.json
 *   .claude/state/metrics/gsc/coverage-diagnosis-{ts}.md
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join, basename } from "path";
import { glob } from "glob";

const OUTPUT_DIR = ".claude/state/metrics/gsc";

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    inspectionGlob: null,
    pageData: null,
    queryData: null,
    brandQueryData: null,
    urlDir: ".tmp/gsc-urls/",
  };
  for (let i = 0; i < args.length; i++) {
    const k = args[i];
    if (k === "--inspection-glob") opts.inspectionGlob = args[++i];
    else if (k === "--page-data") opts.pageData = args[++i];
    else if (k === "--query-data") opts.queryData = args[++i];
    else if (k === "--brand-query-data") opts.brandQueryData = args[++i];
    else if (k === "--url-dir") opts.urlDir = args[++i];
  }
  return opts;
}

async function loadInspections(globPattern) {
  const files = await glob(globPattern);
  const all = [];
  for (const f of files) {
    const data = JSON.parse(readFileSync(f, "utf-8"));
    for (const r of data.results || []) all.push(r);
  }
  return all;
}

function loadCategoryMap(urlDir) {
  const map = {}; // url → category
  for (const cat of ["ex0", "ex1", "ex2", "ex3", "ex4"]) {
    const p = join(urlDir, `${cat}.txt`);
    if (!existsSync(p)) continue;
    const urls = readFileSync(p, "utf-8")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    for (const u of urls) map[u] = cat;
  }
  return map;
}

function classifyUrlPattern(url) {
  if (url.includes("/civil-construction-1-primary-")) return "civil-primary";
  if (url.includes("/civil-construction-1-secondary-")) return "civil-secondary";
  if (url.includes("/civil-construction-1-textbook-")) return "civil-textbook";
  if (url.includes("/civil-construction-1-guide-")) return "civil-guide";
  if (
    url.includes("/pe-comprehensive-management-h") ||
    url.includes("/pe-comprehensive-management-r0") ||
    url.includes("/pe-comprehensive-management-r1")
  ) {
    if (url.match(/\-(h|r)\d{2}-(primary|secondary)/)) return "pe-past-exam";
  }
  if (url.includes("/pe-comprehensive-management-")) return "pe-keyword";
  return "other";
}

function bucketCrawlAge(lastCrawl) {
  if (!lastCrawl) return "never";
  const now = Date.now();
  const t = new Date(lastCrawl).getTime();
  const days = (now - t) / (1000 * 60 * 60 * 24);
  if (days < 7) return "lt7d";
  if (days < 30) return "7-30d";
  return "ge30d";
}

function bucketReferringCount(n) {
  if (n === 0) return "0";
  if (n <= 2) return "1-2";
  if (n <= 5) return "3-5";
  return "6+";
}

function aggregate(inspections, categoryMap, pageData, queryData, brandData) {
  const result = {
    meta: {
      generated_at: new Date().toISOString(),
      total_inspected: inspections.length,
      categories: { ex0: 0, ex1: 0, ex2: 0, ex3: 0, ex4: 0, unknown: 0 },
    },
    A_last_crawl: { ex0: { never: 0, ge30d: 0, "7-30d": 0, lt7d: 0 } },
    B_page_fetch_state: {},
    C_referring_urls: {
      all: { "0": 0, "1-2": 0, "3-5": 0, "6+": 0 },
      ex0: { "0": 0, "1-2": 0, "3-5": 0, "6+": 0 },
    },
    D_canonical: { mismatch_total: 0, mismatch_to_other_url: 0, samples: [] },
    E_phantom_pages: null, // computed later
    F_brand_query: { total_clicks: 0, total_impressions: 0, queries: [] },
    G_pattern_x_category: {},
    H_verdict: {},
    I_high_referring_ex0: [], // referring 6+ なのに ex0 のサンプル
    errors: [],
  };

  // カテゴリ別件数
  for (const r of inspections) {
    const cat = categoryMap[r.url] || "unknown";
    result.meta.categories[cat] = (result.meta.categories[cat] || 0) + 1;

    if (r.error) {
      result.errors.push({ url: r.url, error: r.error });
      continue;
    }

    const idx = r.index || {};
    const lastCrawl = idx.last_crawl_time;
    const fetchState = idx.page_fetch_state;
    const verdict = idx.verdict;
    const referringCount = (idx.referring_urls || []).length;
    const userCanonical = idx.user_canonical;
    const googleCanonical = idx.google_canonical;
    const pattern = classifyUrlPattern(r.url);

    // A: last_crawl bucketing for ex0
    if (cat === "ex0") {
      const bucket = bucketCrawlAge(lastCrawl);
      result.A_last_crawl.ex0[bucket]++;
    }

    // B: page_fetch_state distribution
    const fs = fetchState || "NULL";
    result.B_page_fetch_state[fs] = (result.B_page_fetch_state[fs] || 0) + 1;

    // C: referring_urls bucketing
    const rb = bucketReferringCount(referringCount);
    result.C_referring_urls.all[rb]++;
    if (cat === "ex0") result.C_referring_urls.ex0[rb]++;

    // I: high referring (6+) but in ex0
    if (cat === "ex0" && referringCount >= 6) {
      result.I_high_referring_ex0.push({
        url: r.url,
        referring: referringCount,
        last_crawl: lastCrawl,
        verdict,
      });
    }

    // D: canonical mismatch
    if (userCanonical && googleCanonical && userCanonical !== googleCanonical) {
      result.D_canonical.mismatch_total++;
      // user canonical が自分自身なのに google が別 URL を選んだ → 重複判定
      const isOtherUrl = googleCanonical && googleCanonical !== r.url;
      if (isOtherUrl) result.D_canonical.mismatch_to_other_url++;
      if (result.D_canonical.samples.length < 10) {
        result.D_canonical.samples.push({
          url: r.url,
          user: userCanonical,
          google: googleCanonical,
        });
      }
    }

    // G: URL pattern × category cross-tab
    if (!result.G_pattern_x_category[pattern]) {
      result.G_pattern_x_category[pattern] = {};
    }
    result.G_pattern_x_category[pattern][cat] =
      (result.G_pattern_x_category[pattern][cat] || 0) + 1;

    // H: verdict distribution
    const v = verdict || "NULL";
    result.H_verdict[v] = (result.H_verdict[v] || 0) + 1;
  }

  // E: phantom pages (indexed pages with impressions=0 over 90 days)
  // pageData は 90 日で impressions が記録されたページのみ
  // インデックス済 (verdict === "PASS") のページ数 vs その内 impressions>0 を比較
  const pageRowsWithImpressions = (pageData?.rows || []).map((r) => r.keys[0]);
  const pageImprMap = new Map(); // url → impressions
  for (const r of pageData?.rows || []) {
    pageImprMap.set(r.keys[0], r.impressions || 0);
  }
  const indexedUrls = inspections
    .filter((i) => (i.index?.verdict || "") === "PASS")
    .map((i) => i.url);
  const indexedWithImpressions = indexedUrls.filter((u) => (pageImprMap.get(u) || 0) > 0).length;
  const indexedZeroImpressions = indexedUrls.length - indexedWithImpressions;
  result.E_phantom_pages = {
    indexed_total: indexedUrls.length,
    with_impressions_gt0: indexedWithImpressions,
    zero_impressions: indexedZeroImpressions,
    phantom_rate:
      indexedUrls.length > 0
        ? Math.round((indexedZeroImpressions / indexedUrls.length) * 100)
        : null,
    note: "対象は今回検査した URL のうち PASS のもののみ。サイト全体の幽霊率はサイトマップ全件で再計算が必要。",
  };

  // F: ブランドクエリ
  if (brandData?.rows) {
    for (const r of brandData.rows) {
      result.F_brand_query.total_clicks += r.clicks || 0;
      result.F_brand_query.total_impressions += r.impressions || 0;
      result.F_brand_query.queries.push({
        query: r.keys[0],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
      });
    }
  }

  return result;
}

function judgeDiagnosis(agg) {
  const findings = [];
  const ex0Count = agg.meta.categories.ex0 || 0;

  // A: クロールバジェット問題
  if (ex0Count > 0) {
    const neverPct = (agg.A_last_crawl.ex0.never / ex0Count) * 100;
    if (neverPct >= 50) {
      findings.push({
        code: "A",
        severity: "high",
        title: "クロールバジェット不足が確定",
        evidence: `ex0 ${ex0Count} 件中 ${agg.A_last_crawl.ex0.never} 件 (${neverPct.toFixed(1)}%) が一度もクロールされていない`,
        action: "sitemap 分割・lastmod 更新頻度の見直し・Indexing API 導入検討",
      });
    }
  }

  // B: SSR 問題
  const totalInspected = agg.meta.total_inspected;
  const successCount = agg.B_page_fetch_state.SUCCESSFUL || 0;
  const successPct = (successCount / totalInspected) * 100;
  if (successPct < 80 && totalInspected > 0) {
    findings.push({
      code: "B",
      severity: "high",
      title: "SSR / レンダリング問題の可能性",
      evidence: `${totalInspected} 件中 SUCCESSFUL は ${successCount} 件 (${successPct.toFixed(1)}%)`,
      action: "page_fetch_state ≠ SUCCESSFUL の URL を curl で確認、構造修正",
    });
  }

  // C: 内部リンク不全
  if (ex0Count > 0) {
    const zeroLinkPct = (agg.C_referring_urls.ex0["0"] / ex0Count) * 100;
    if (zeroLinkPct >= 50) {
      findings.push({
        code: "C",
        severity: "high",
        title: "内部リンク到達不全（Issue #29 続行で正解）",
        evidence: `ex0 ${ex0Count} 件中 ${agg.C_referring_urls.ex0["0"]} 件 (${zeroLinkPct.toFixed(1)}%) が referring_urls=0`,
        action: "Issue #29 (内部リンク拡充) の Phase 4 計測待機を継続",
      });
    }

    // 内部リンク効果限界（権威性問題）
    const highRefStuck = agg.C_referring_urls.ex0["6+"] || 0;
    if (highRefStuck >= 100) {
      findings.push({
        code: "C2",
        severity: "high",
        title: "内部リンク効果限界 = ドメイン権威性問題",
        evidence: `referring_urls 6+ なのに ex0 滞留している URL が ${highRefStuck} 件`,
        action: "内部施策打ち切り、外部被リンク獲得・コンテンツ独自性向上へピボット",
      });
    }
  }

  // D: 重複判定
  const dupePct = (agg.D_canonical.mismatch_to_other_url / totalInspected) * 100;
  if (dupePct >= 30) {
    findings.push({
      code: "D",
      severity: "high",
      title: "重複判定問題",
      evidence: `${totalInspected} 件中 ${agg.D_canonical.mismatch_to_other_url} 件 (${dupePct.toFixed(1)}%) で Google が別 URL を canonical として選択`,
      action: "過去問・キーワードの差別化、または統合・noindex",
    });
  }

  // E: 戦略資産集中
  if (agg.E_phantom_pages.phantom_rate !== null && agg.E_phantom_pages.phantom_rate >= 80) {
    findings.push({
      code: "E",
      severity: "medium",
      title: "戦略資産集中の根拠確定",
      evidence: `インデックス済 ${agg.E_phantom_pages.indexed_total} 件中 ${agg.E_phantom_pages.zero_impressions} 件 (${agg.E_phantom_pages.phantom_rate}%) が 90 日 impressions=0`,
      action: "low-value ページ noindex 化を検討（200-400 ページ目安）",
    });
  }

  // F: ブランド認知
  // 90 日で impressions < 300 (= 月間 < 100) ならブランド認知不足
  const brandImprPerMonth = agg.F_brand_query.total_impressions / 3;
  if (brandImprPerMonth < 100) {
    findings.push({
      code: "F",
      severity: "high",
      title: "ブランド認知不足（ドメイン権威性問題）",
      evidence: `ブランドクエリ "doboku" の月間 impressions ≒ ${brandImprPerMonth.toFixed(1)}（90日で${agg.F_brand_query.total_impressions}件）`,
      action: "外部被リンク獲得、SNS / X 戦略強化、note 連携、合格体験記による独自データ構築",
    });
  }

  return findings;
}

function generateMarkdown(agg, findings) {
  const ts = agg.meta.generated_at.slice(0, 16).replace("T", " ");
  const lines = [];
  lines.push(`## GSC 未登録 URL 実データ診断（${ts} UTC）`);
  lines.push(``);
  lines.push(`URL Inspection API + Search Analytics API による全 ${agg.meta.total_inspected} URL 一括検査の結果です。`);
  lines.push(``);
  lines.push(`### 0. 検査サマリ`);
  lines.push(``);
  lines.push(`| カテゴリ | 件数 |`);
  lines.push(`|---|---:|`);
  for (const cat of ["ex0", "ex1", "ex2", "ex3", "ex4", "unknown"]) {
    const n = agg.meta.categories[cat] || 0;
    if (n > 0) lines.push(`| ${cat} | ${n} |`);
  }
  lines.push(`| **合計** | **${agg.meta.total_inspected}** |`);
  if (agg.errors.length > 0) {
    lines.push(``);
    lines.push(`> エラー: ${agg.errors.length} 件（API/ネットワーク等）`);
  }
  lines.push(``);

  // A
  lines.push(`### A. ex0 の最終クロール日分布`);
  lines.push(``);
  const ex0n = agg.meta.categories.ex0 || 0;
  if (ex0n > 0) {
    lines.push(`| 分類 | 件数 | 割合 |`);
    lines.push(`|---|---:|---:|`);
    for (const k of ["never", "ge30d", "7-30d", "lt7d"]) {
      const n = agg.A_last_crawl.ex0[k] || 0;
      const label = { never: "一度もクロールなし", ge30d: "30日以前", "7-30d": "7-30日", lt7d: "7日以内" }[k];
      lines.push(`| ${label} | ${n} | ${((n / ex0n) * 100).toFixed(1)}% |`);
    }
  }
  lines.push(``);

  // B
  lines.push(`### B. page_fetch_state 別件数`);
  lines.push(``);
  lines.push(`| 状態 | 件数 |`);
  lines.push(`|---|---:|`);
  const sorted = Object.entries(agg.B_page_fetch_state).sort((a, b) => b[1] - a[1]);
  for (const [k, v] of sorted) lines.push(`| ${k} | ${v} |`);
  lines.push(``);

  // C
  lines.push(`### C. referring_urls 数 × カテゴリ`);
  lines.push(``);
  lines.push(`| referring 数 | 全体 | うち ex0 |`);
  lines.push(`|---|---:|---:|`);
  for (const k of ["0", "1-2", "3-5", "6+"]) {
    lines.push(`| ${k} | ${agg.C_referring_urls.all[k]} | ${agg.C_referring_urls.ex0[k]} |`);
  }
  lines.push(``);
  if (agg.I_high_referring_ex0.length > 0) {
    lines.push(`**referring 6+ なのに ex0 滞留サンプル**（${agg.I_high_referring_ex0.length} 件中先頭 5 件）:`);
    lines.push(``);
    for (const s of agg.I_high_referring_ex0.slice(0, 5)) {
      lines.push(`- ${s.url} — refs=${s.referring}, last_crawl=${s.last_crawl || "never"}, verdict=${s.verdict}`);
    }
    lines.push(``);
  }

  // D
  lines.push(`### D. canonical 不一致`);
  lines.push(``);
  lines.push(`- ユーザー指定と異なる canonical を Google が選択: ${agg.D_canonical.mismatch_total} 件`);
  lines.push(`- うち別 URL に正規化された（重複判定）: ${agg.D_canonical.mismatch_to_other_url} 件`);
  if (agg.D_canonical.samples.length > 0) {
    lines.push(``);
    lines.push(`**サンプル**（先頭 5 件）:`);
    lines.push(``);
    for (const s of agg.D_canonical.samples.slice(0, 5)) {
      lines.push(`- ${s.url}`);
      lines.push(`  - user: ${s.user}`);
      lines.push(`  - google: ${s.google}`);
    }
  }
  lines.push(``);

  // E
  lines.push(`### E. 幽霊ページ（インデックス済 + 90 日 impressions=0）`);
  lines.push(``);
  const e = agg.E_phantom_pages;
  lines.push(`- 検査した URL のうちインデックス済 (verdict=PASS): ${e.indexed_total} 件`);
  lines.push(`- うち 90 日 impressions=0 の幽霊ページ: ${e.zero_impressions} 件 (${e.phantom_rate}%)`);
  lines.push(``);
  lines.push(`> ${e.note}`);
  lines.push(``);

  // F
  lines.push(`### F. ブランドクエリ実数`);
  lines.push(``);
  lines.push(`- ブランドクエリ "doboku" 系の 90 日 clicks: ${agg.F_brand_query.total_clicks}`);
  lines.push(`- ブランドクエリ "doboku" 系の 90 日 impressions: ${agg.F_brand_query.total_impressions}`);
  lines.push(`- 月間換算 impressions: ${(agg.F_brand_query.total_impressions / 3).toFixed(1)}`);
  if (agg.F_brand_query.queries.length > 0) {
    lines.push(``);
    lines.push(`| クエリ | clicks | impressions | CTR | position |`);
    lines.push(`|---|---:|---:|---:|---:|`);
    for (const q of agg.F_brand_query.queries.slice(0, 10)) {
      lines.push(
        `| ${q.query} | ${q.clicks} | ${q.impressions} | ${(q.ctr * 100).toFixed(1)}% | ${q.position?.toFixed(1) || "-"} |`,
      );
    }
  }
  lines.push(``);

  // G
  lines.push(`### G. URL パターン × カテゴリ クロス集計`);
  lines.push(``);
  lines.push(`| パターン | ex0 | ex1 | ex2 | ex3 | ex4 | unknown | 合計 |`);
  lines.push(`|---|---:|---:|---:|---:|---:|---:|---:|`);
  const patterns = Object.keys(agg.G_pattern_x_category).sort();
  for (const p of patterns) {
    const c = agg.G_pattern_x_category[p];
    const total = Object.values(c).reduce((a, b) => a + b, 0);
    lines.push(
      `| ${p} | ${c.ex0 || 0} | ${c.ex1 || 0} | ${c.ex2 || 0} | ${c.ex3 || 0} | ${c.ex4 || 0} | ${c.unknown || 0} | ${total} |`,
    );
  }
  lines.push(``);

  // H verdict
  lines.push(`### H. verdict 分布`);
  lines.push(``);
  lines.push(`| verdict | 件数 |`);
  lines.push(`|---|---:|`);
  for (const [k, v] of Object.entries(agg.H_verdict).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${k} | ${v} |`);
  }
  lines.push(``);

  // 判定
  lines.push(`### 判定マトリクス`);
  lines.push(``);
  if (findings.length === 0) {
    lines.push(`どの判定基準にもマッチしませんでした。データを再確認してください。`);
  } else {
    lines.push(`| コード | 重要度 | 判定 | 推奨アクション |`);
    lines.push(`|---|---|---|---|`);
    for (const f of findings) {
      lines.push(`| ${f.code} | ${f.severity} | ${f.title} | ${f.action} |`);
    }
    lines.push(``);
    lines.push(`**詳細根拠**:`);
    lines.push(``);
    for (const f of findings) {
      lines.push(`- **${f.code}** ${f.title}: ${f.evidence}`);
    }
  }
  lines.push(``);

  // 結論
  lines.push(`### 結論と次の一手`);
  lines.push(``);
  if (findings.some((f) => f.code === "C2" || f.code === "F")) {
    lines.push(`**ドメイン権威性問題が主因**であることが確定または強く示唆されています。`);
    lines.push(``);
    lines.push(`- Issue #29（内部リンク拡充）は実装完了しているが、効果には限界があります`);
    lines.push(`- 次の打ち手は **外部被リンク獲得 + 独自データ構築**:`);
    lines.push(`  - 運営者本人の総監合格体験データ（Issue #160）の早期完成と公開`);
    lines.push(`  - note 記事内に doboku-note 被リンク掲載`);
    lines.push(`  - X / SNS でのブランド露出（Issue #161 SNS 自動投稿基盤）`);
    lines.push(`  - 技術士コミュニティ・受験者ブログでの言及獲得`);
  } else if (findings.some((f) => f.code === "C")) {
    lines.push(`内部リンク不全が主因。Issue #29 の効果が完全に出るには 2-4 週待つ必要があります。`);
  } else if (findings.some((f) => f.code === "D")) {
    lines.push(`重複判定問題が主因。過去問ページの canonical 戦略を再設計する必要があります。`);
  } else if (findings.some((f) => f.code === "A")) {
    lines.push(`クロールバジェット不足が主因。サイトマップ・lastmod・Indexing API を検証します。`);
  }
  lines.push(``);

  // raw data refs
  lines.push(`### 生データ`);
  lines.push(``);
  lines.push(`- URL Inspection 結果: \`.claude/state/metrics/url-inspection/inspection-batch-2026-04-27*.json\``);
  lines.push(`- Search Analytics page: \`.claude/state/metrics/gsc/gsc-page-2026-04-27*.json\``);
  lines.push(`- Search Analytics query: \`.claude/state/metrics/gsc/gsc-query-2026-04-27*.json\``);
  lines.push(`- 集計 JSON: \`.claude/state/metrics/gsc/coverage-diagnosis-{ts}.json\``);
  lines.push(``);

  return lines.join("\n");
}

async function main() {
  const opts = parseArgs();

  const inspections = await loadInspections(opts.inspectionGlob);
  if (inspections.length === 0) {
    console.error(`No inspections found: ${opts.inspectionGlob}`);
    process.exit(1);
  }
  console.log(`Loaded ${inspections.length} inspections`);

  const categoryMap = loadCategoryMap(opts.urlDir);
  console.log(`Loaded ${Object.keys(categoryMap).length} URL→category mappings`);

  const pageData = opts.pageData ? JSON.parse(readFileSync(opts.pageData, "utf-8")) : null;
  const queryData = opts.queryData ? JSON.parse(readFileSync(opts.queryData, "utf-8")) : null;
  const brandData = opts.brandQueryData
    ? JSON.parse(readFileSync(opts.brandQueryData, "utf-8"))
    : null;

  const agg = aggregate(inspections, categoryMap, pageData, queryData, brandData);
  const findings = judgeDiagnosis(agg);
  agg.diagnosis = findings;

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const jsonPath = join(OUTPUT_DIR, `coverage-diagnosis-${ts}.json`);
  const mdPath = join(OUTPUT_DIR, `coverage-diagnosis-${ts}.md`);
  writeFileSync(jsonPath, JSON.stringify(agg, null, 2), "utf-8");
  const md = generateMarkdown(agg, findings);
  writeFileSync(mdPath, md, "utf-8");

  console.log(`\nJSON: ${jsonPath}`);
  console.log(`MD:   ${mdPath}`);
  console.log(`Findings: ${findings.length}`);
  for (const f of findings) {
    console.log(`  [${f.code}] ${f.severity}: ${f.title}`);
  }
}

main().catch((e) => {
  console.error("Error:", e.stack || e.message);
  process.exit(1);
});
