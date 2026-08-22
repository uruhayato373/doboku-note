/**
 * 本番 HTML から内部リンクの実出力を検証する
 *
 * Issue #28 診断で「ex0 の 99% が referring_urls=0」と判明したが、
 * Issue #29 で内部リンク 96% カバレッジ + ピラー被リンク 668 件を実装済。
 * Google の認識と実装の乖離 → HTML 出力に内部リンクが本当に出ているか検証。
 *
 * Usage:
 *   node .claude/scripts/verify-html-links.mjs --urls .tmp/gsc-urls/ex0.txt --sample 30
 *
 * 出力:
 *   .tmp/html-link-verification-{ts}.json (集計データ)
 *   .tmp/html-link-verification-{ts}.md (Issue 投稿用)
 */

import { writeSync } from 'node:fs';
import { readFileSync, writeFileSync, existsSync } from "fs";

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { urls: null, sample: 30, concurrency: 5 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--urls") opts.urls = args[++i];
    else if (args[i] === "--sample") opts.sample = parseInt(args[++i], 10);
    else if (args[i] === "--concurrency") opts.concurrency = parseInt(args[++i], 10);
  }
  if (!opts.urls) {
    console.error("Usage: --urls <file> [--sample N] [--concurrency N]");
    process.exit(2);
  }
  return opts;
}

function classifyPattern(url) {
  if (url.includes("/civil-construction-1-primary-")) return "civil-primary";
  if (url.includes("/civil-construction-1-secondary-")) return "civil-secondary";
  if (url.includes("/civil-construction-1-textbook-")) return "civil-textbook";
  if (url.includes("/civil-construction-1-guide-")) return "civil-guide";
  if (url.match(/\/pe-comprehensive-management-(h|r)\d{2}-(primary|secondary)/)) return "pe-past-exam";
  if (url.includes("/pe-comprehensive-management-")) return "pe-keyword";
  return "other";
}

function stratifiedSample(urls, totalSample) {
  // パターン別に均等サンプリング
  const groups = {};
  for (const url of urls) {
    const p = classifyPattern(url);
    (groups[p] ||= []).push(url);
  }
  const patterns = Object.keys(groups);
  const perPattern = Math.max(1, Math.floor(totalSample / patterns.length));
  const out = [];
  for (const p of patterns) {
    const arr = groups[p];
    // 等間隔抽出（ランダムではなく決定論的）
    const step = Math.max(1, Math.floor(arr.length / perPattern));
    for (let i = 0; i < arr.length && out.filter((u) => classifyPattern(u) === p).length < perPattern; i += step) {
      out.push(arr[i]);
    }
  }
  return out;
}

async function fetchAndAnalyze(url) {
  try {
    const start = Date.now();
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; doboku-note-link-verifier/1.0)",
      },
      redirect: "follow",
    });
    const elapsed = Date.now() - start;
    const status = res.status;
    const html = await res.text();
    const size = html.length;

    // <a href="/docs/..."> の数（内部リンク総数）
    const internalLinks = (html.match(/<a[^>]+href="\/docs\/[^"]+"/g) || []).length;
    // <a href="/category/..."> （カテゴリ系）
    const categoryLinks = (html.match(/<a[^>]+href="\/category\//g) || []).length;
    // 関連キーワード ラベルの存在
    const hasRelatedKeywordsLabel = /関連キーワード/.test(html);
    // RelatedKeywords コンポーネントの構造（aside 等で囲まれているか）
    const relatedKeywordsBlock = (html.match(/関連キーワード[\s\S]{0,2000}/g) || [])[0] || "";
    const relatedKeywordsLinks = (relatedKeywordsBlock.match(/<a[^>]+href="\/docs\/[^"]+"/g) || []).length;
    // pillar blockquote: 「📘 ... 学習ガイド」（旧呼称: ピラーガイド）
    const hasPillarBlockquote = /📘.+学習ガイド/.test(html) || /📘.+ピラーガイド/.test(html);
    const pillarLinks = (html.match(/<a[^>]+href="\/docs\/pe-comprehensive-management-(economic|human-resource|information|safety|social-environment)-management-pillar"/g) || []).length;
    // RelatedTextbooks
    const hasRelatedTextbooks = /関連教科書|RelatedTextbooks/.test(html);
    // <main> 存在
    const hasMain = /<main[\s>]/.test(html);

    return {
      url,
      status,
      size_kb: Math.round(size / 1024),
      elapsed_ms: elapsed,
      has_main: hasMain,
      internal_links: internalLinks,
      category_links: categoryLinks,
      has_related_keywords_label: hasRelatedKeywordsLabel,
      related_keywords_links: relatedKeywordsLinks,
      has_pillar_blockquote: hasPillarBlockquote,
      pillar_links: pillarLinks,
      has_related_textbooks: hasRelatedTextbooks,
    };
  } catch (e) {
    return { url, error: e.message?.slice(0, 200) };
  }
}

async function processWithConcurrency(items, concurrency, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
      console.log(`[${idx + 1}/${items.length}] ${items[idx]} → ${results[idx].error ? "ERROR" : `links=${results[idx].internal_links}`}`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

function aggregate(results) {
  const byPattern = {};
  for (const r of results) {
    if (r.error) continue;
    const p = classifyPattern(r.url);
    if (!byPattern[p]) {
      byPattern[p] = {
        count: 0,
        sum_internal_links: 0,
        sum_related_keywords_links: 0,
        sum_pillar_links: 0,
        zero_internal_links: 0,
        no_related_keywords_label: 0,
        no_pillar_blockquote: 0,
      };
    }
    const b = byPattern[p];
    b.count++;
    b.sum_internal_links += r.internal_links;
    b.sum_related_keywords_links += r.related_keywords_links;
    b.sum_pillar_links += r.pillar_links;
    if (r.internal_links === 0) b.zero_internal_links++;
    if (!r.has_related_keywords_label) b.no_related_keywords_label++;
    if (!r.has_pillar_blockquote) b.no_pillar_blockquote++;
  }
  const totals = results.reduce(
    (a, r) => {
      if (r.error) return { ...a, errors: a.errors + 1 };
      return {
        count: a.count + 1,
        errors: a.errors,
        avg_internal_links: a.avg_internal_links + r.internal_links,
        avg_related_keywords_links: a.avg_related_keywords_links + r.related_keywords_links,
        avg_pillar_links: a.avg_pillar_links + r.pillar_links,
        all_have_main: a.all_have_main && r.has_main,
        zero_internal_links: a.zero_internal_links + (r.internal_links === 0 ? 1 : 0),
        no_related_keywords_label: a.no_related_keywords_label + (!r.has_related_keywords_label ? 1 : 0),
        no_pillar_blockquote: a.no_pillar_blockquote + (!r.has_pillar_blockquote ? 1 : 0),
      };
    },
    {
      count: 0,
      errors: 0,
      avg_internal_links: 0,
      avg_related_keywords_links: 0,
      avg_pillar_links: 0,
      all_have_main: true,
      zero_internal_links: 0,
      no_related_keywords_label: 0,
      no_pillar_blockquote: 0,
    },
  );
  if (totals.count > 0) {
    totals.avg_internal_links = +(totals.avg_internal_links / totals.count).toFixed(1);
    totals.avg_related_keywords_links = +(totals.avg_related_keywords_links / totals.count).toFixed(1);
    totals.avg_pillar_links = +(totals.avg_pillar_links / totals.count).toFixed(1);
  }
  return { totals, byPattern };
}

function generateMarkdown(samples, agg) {
  const lines = [];
  lines.push(`## HTML 出力検証結果（${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC）`);
  lines.push(``);
  lines.push(`Issue #28 診断で「ex0 の 99% が referring_urls=0」と判明した件について、本番 HTML を直接 curl してリンク出力を検証。`);
  lines.push(``);
  lines.push(`### 検査対象`);
  lines.push(``);
  lines.push(`- ex0 から URL パターン別に層化サンプリングした **${agg.totals.count + agg.totals.errors} URL**`);
  lines.push(`- 取得成功: ${agg.totals.count} / エラー: ${agg.totals.errors}`);
  lines.push(``);
  lines.push(`### 全体集計`);
  lines.push(``);
  lines.push(`| 指標 | 値 | 判定 |`);
  lines.push(`|---|---:|---|`);
  lines.push(`| すべて \`<main>\` を含む | ${agg.totals.all_have_main ? "Yes" : "No"} | ${agg.totals.all_have_main ? "✓" : "✗ SSR 構造問題"} |`);
  lines.push(`| 平均 内部リンク数 (\`/docs/\`) | ${agg.totals.avg_internal_links} | ${agg.totals.avg_internal_links >= 5 ? "✓ 出力されている" : "✗ HTML から欠落"} |`);
  lines.push(`| 平均 RelatedKeywords リンク数 | ${agg.totals.avg_related_keywords_links} | ${agg.totals.avg_related_keywords_links >= 3 ? "✓" : "✗ コンポーネント不在"} |`);
  lines.push(`| 平均 pillar リンク数 | ${agg.totals.avg_pillar_links} | ${agg.totals.avg_pillar_links >= 1 ? "✓" : "✗ ピラーリンク不在"} |`);
  lines.push(`| 内部リンク=0 のページ | ${agg.totals.zero_internal_links} | ${agg.totals.zero_internal_links === 0 ? "✓" : "✗ 重大: 完全孤立ページ"} |`);
  lines.push(`| RelatedKeywords ラベル無し | ${agg.totals.no_related_keywords_label} | ${agg.totals.no_related_keywords_label === 0 ? "✓" : "△ コンポーネント未挿入"} |`);
  lines.push(`| pillar blockquote 無し | ${agg.totals.no_pillar_blockquote} | ${agg.totals.no_pillar_blockquote === 0 ? "✓" : "△ pillar 導線未挿入"} |`);
  lines.push(``);

  lines.push(`### URL パターン別`);
  lines.push(``);
  lines.push(`| パターン | 件数 | avg 内部リンク | avg RelatedKW | avg pillar | リンク=0 | RKW無し | pillar無し |`);
  lines.push(`|---|---:|---:|---:|---:|---:|---:|---:|`);
  for (const [p, b] of Object.entries(agg.byPattern)) {
    const avgI = (b.sum_internal_links / b.count).toFixed(1);
    const avgR = (b.sum_related_keywords_links / b.count).toFixed(1);
    const avgP = (b.sum_pillar_links / b.count).toFixed(1);
    lines.push(`| ${p} | ${b.count} | ${avgI} | ${avgR} | ${avgP} | ${b.zero_internal_links} | ${b.no_related_keywords_label} | ${b.no_pillar_blockquote} |`);
  }
  lines.push(``);

  lines.push(`### サンプル（先頭 10 件）`);
  lines.push(``);
  lines.push(`| URL | size | links | RKW | pillar |`);
  lines.push(`|---|---:|---:|---:|---:|`);
  for (const r of samples.slice(0, 10)) {
    if (r.error) {
      lines.push(`| ${r.url} | ERROR | - | - | - |`);
    } else {
      lines.push(`| ${r.url} | ${r.size_kb} KB | ${r.internal_links} | ${r.related_keywords_links} | ${r.pillar_links} |`);
    }
  }
  lines.push(``);

  // 結論
  lines.push(`### 結論`);
  lines.push(``);
  if (agg.totals.zero_internal_links === 0 && agg.totals.avg_internal_links >= 10) {
    lines.push(`**HTML 出力に内部リンクは正しく含まれている**（平均 ${agg.totals.avg_internal_links} リンク/ページ）。`);
    lines.push(``);
    lines.push(`Issue #28 で観測された「URL Inspection の referring_urls=0 が 99%」は HTML 出力バグではなく、以下のいずれか:`);
    lines.push(``);
    lines.push(`1. **URL Inspection API の \`referring_urls\` フィールド仕様** — 大量のリンクがあってもサンプル 0-5 件しか返さず、未クロール URL は 0 件で返るのが正常動作の可能性が高い`);
    lines.push(`2. **PageRank の薄さ** — 内部リンクは存在するが Google のランキング閾値に届かず、価値計算上「実質ゼロ」扱い`);
    lines.push(`3. **ドメイン権威性問題** — Issue #28 の判定 F (ブランド月間 6.3 imp) と整合`);
    lines.push(``);
    lines.push(`→ **Issue #29 (内部リンク拡充) は実装としては正常**。さらに足しても効果は薄い。**外部被リンク獲得・独自データ構築への戦略転換が必要**。`);
  } else if (agg.totals.zero_internal_links > 0 || agg.totals.avg_internal_links < 5) {
    lines.push(`**HTML 出力に内部リンクが欠落している重大なバグの可能性**。`);
    lines.push(``);
    lines.push(`- 内部リンク=0 のページ: ${agg.totals.zero_internal_links} 件`);
    lines.push(`- 平均内部リンク数: ${agg.totals.avg_internal_links}（期待値 5 以上）`);
    lines.push(``);
    lines.push(`→ **次の打ち手**: 該当ページの MDX → SSR HTML 出力パスを調査。\`<RelatedKeywords>\` コンポーネントの SSR レンダリングを確認。`);
  } else {
    lines.push(`HTML 出力は概ね正常だが、一部パターンで欠落あり。詳細はパターン別表を参照。`);
  }
  lines.push(``);

  return lines.join("\n");
}

async function main() {
  const opts = parseArgs();
  const allUrls = readFileSync(opts.urls, "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  console.log(`Loaded ${allUrls.length} URLs from ${opts.urls}`);

  const sample = stratifiedSample(allUrls, opts.sample);
  console.log(`Stratified sample: ${sample.length} URLs`);

  console.log(`\nFetching with concurrency ${opts.concurrency}...`);
  const results = await processWithConcurrency(sample, opts.concurrency, fetchAndAnalyze);

  const agg = aggregate(results);

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const jsonPath = `.tmp/html-link-verification-${ts}.json`;
  const mdPath = `.tmp/html-link-verification-${ts}.md`;
  writeFileSync(jsonPath, JSON.stringify({ samples: results, aggregate: agg }, null, 2), "utf-8");
  writeFileSync(mdPath, generateMarkdown(results, agg), "utf-8");

  console.log(`\nJSON: ${jsonPath}`);
  console.log(`MD:   ${mdPath}`);
  console.log(`\n=== Aggregate ===`);
  writeSync(1, JSON.stringify(agg.totals, null, 2) + '\n');
}

main().catch((e) => {
  console.error("Error:", e.stack || e.message);
  process.exit(1);
});
