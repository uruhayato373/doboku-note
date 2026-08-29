#!/usr/bin/env node
/**
 * 総合技術監理部門 過去問 頻出論点ランキングの独自データ資産を生成する。
 *
 * 真実源:
 *   - src/config/past-exam-backlinks.json … 論点キーワード → {年度・設問} 出現リスト
 *     （refresh-indexes が文字起こし済み過去問から生成。年度数・問数・論点数はすべてここから導く）
 *   - content/site/pe-comprehensive-management/keyword-2026/article.mdx
 *     … 5管理（経済性/人的資源/情報/安全/社会環境）→ 論点 slug のマスター構造
 *
 * 出力: content/site/pe-comprehensive-management/frequent-topics/article.mdx
 *
 * 設計: 集計はすべてデータ由来（編集者の主観で頻度を作らない）。新年度の過去問を
 *       追加して refresh-indexes を回せば、本スクリプト再実行で自動更新される。
 *       「正確な出題回数」ではなく「論点タグ付けベースの出題傾向指標」として提示する。
 */
import { readFileSync, mkdirSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readMdxFile, writeMdxFile } from "../.claude/scripts/lib/mdx-io.mjs";

// fileURLToPath を使う: Windows では `new URL("..", import.meta.url).pathname` が
// `/C:/Users/…` を返し、文字列連結すると `C:\C:\Users\…` になって ENOENT で落ちる。
// このスクリプトは 2026-08-25 までこの状態で、Windows では一度も実行できていなかった
// （frequent-topics が「17年度・680問」のまま止まっていた真因）。
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BACKLINKS = join(ROOT, "src/config/past-exam-backlinks.json");
const KEYWORD_2026 = join(ROOT, "content/site/pe-comprehensive-management/keyword-2026/article.mdx");
const OUT = join(ROOT, "content/site/pe-comprehensive-management/frequent-topics/article.mdx");
const CSV_OUT = join(ROOT, "public/data/pe-cem-frequent-topics.csv");
const SITE_DIR = join(ROOT, "content/site/pe-comprehensive-management");

const PUBLIC_KEYWORD_ROOT = "/exam/pe-comprehensive-management/keywords";
const PUBLIC_KEYWORD_GUIDE = "/exam/pe-comprehensive-management/guide/keyword-2026";

function publicKeywordPath(slug) {
  return `${PUBLIC_KEYWORD_ROOT}/${slug}`;
}

// JST（会社PCのローカルTZ非依存で日付を出す。CI/ローカルどちらでも同じ結果にするため）
// Date#getTime() は常に UTC epoch ミリ秒なので、getTimezoneOffset() で補正すると
// ローカルTZ が既に JST のとき二重加算になる（9h 分ずれて翌日になるバグを実測で確認）。
// 単純に UTC epoch へ 9 時間を足して UTC メソッドで読めば TZ 非依存で JST の日付になる。
function todayJST() {
  const jst = new Date(Date.now() + 9 * 60 * 60000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function csvEscape(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// 既存記事の frontmatter から created / dateModified / ogp を保全する。
// このスクリプトはテンプレートで frontmatter を毎回組み立てるため、保全しないと
// 再生成のたびに手作業で足した created/dateModified/ogp が消える。
let preservedCreated = null;
let preservedOgpBlock = null;
let existingEol = "\n";
if (existsSync(OUT)) {
  const { raw, eol } = readMdxFile(OUT);
  existingEol = eol;
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fmMatch) {
    const fm = fmMatch[1];
    const createdMatch = fm.match(/^created:\s*(.+)$/m);
    if (createdMatch) preservedCreated = createdMatch[1].trim();
    const ogpMatch = fm.match(/^ogp:\r?\n((?:  .+\r?\n?)+)/m);
    if (ogpMatch) preservedOgpBlock = `ogp:\n${ogpMatch[1].trimEnd().split(/\r?\n/).map((l) => l).join("\n")}`;
  }
}

// --- 1. keyword-2026 を解析: slug → {kanri, title} ---
const kanriSections = [
  "経済性管理",
  "人的資源管理",
  "情報管理",
  "安全管理",
  "社会環境管理",
];
const slugMeta = new Map(); // slug -> { kanri, title }
{
  const lines = readFileSync(KEYWORD_2026, "utf-8").split("\n");
  let current = null;
  const h2 = /^##\s+(?:\d+\.\s*)?(.+?)\s*$/;
  const link = /\[([^\]]+)\]\(\/docs\/pe-comprehensive-management-([a-z0-9-]+)\)/g;
  for (const line of lines) {
    const m = line.match(h2);
    if (m) {
      const found = kanriSections.find((k) => m[1].includes(k));
      current = found || null;
      continue;
    }
    let lm;
    while ((lm = link.exec(line)) !== null) {
      const [, title, slug] = lm;
      if (!slugMeta.has(slug)) slugMeta.set(slug, { kanri: current, title });
    }
  }
}

// --- 2. backlinks を集計: slug → {count, years:Set, latestYear} ---
const backlinks = JSON.parse(readFileSync(BACKLINKS, "utf-8"));
const yearOrder = (y) => {
  // "令和7年度" / "平成30年度" / "令和元年度" を昇順比較できる数値へ。
  // **「元年」は数字を持たない**ので \d+ だけだとマッチせず 0 に落ち、最古の年度として
  // 先頭に並んでしまう（2026-08-25: 年度範囲を「令和元年度〜令和8年度」と誤表示していた）。
  const m = y.match(/(令和|平成)(元|\d+)/);
  if (!m) return 0;
  return (m[1] === "令和" ? 2018 : 1988) + (m[2] === "元" ? 1 : Number(m[2]));
};
const topics = [];
const allQuestions = new Set();
for (const [slug, occs] of Object.entries(backlinks)) {
  const years = new Set();
  for (const o of occs) {
    years.add(o.year);
    allQuestions.add(`${o.examSlug}::${o.question}`);
  }
  const meta = slugMeta.get(slug) || { kanri: "その他", title: slug };
  const sortedYears = [...years].sort((a, b) => yearOrder(a) - yearOrder(b));
  topics.push({
    slug,
    title: meta.title,
    kanri: meta.kanri || "その他",
    count: occs.length,
    years: sortedYears,
    yearsCount: years.size,
    latestYear: sortedYears[sortedYears.length - 1],
    recent5: occs.filter((o) => yearOrder(o.year) >= 2021).length, // R03 以降
  });
}

const totalTopics = topics.length;
const totalQuestions = allQuestions.size;
const totalLinks = topics.reduce((s, t) => s + t.count, 0);

// 年度の範囲と本数もデータから出す。ここを固定文字列にしていたため、新年度を足しても
// **本文の集計値だけが動いてタイトル/seoTitle/リードの「17年度・680問」が取り残される**
// 状態になっていた（公開 SEO ページなので食い違いがそのまま外に出る）。2026-08-25 修正。
const allYears = [...new Set(topics.flatMap((t) => t.years))].sort((a, b) => yearOrder(a) - yearOrder(b));
const yearSpan = allYears.length;
const firstYear = allYears[0];
const lastYear = allYears[allYears.length - 1];
const yearRange = `${firstYear}〜${lastYear}`;

// 並べ替え: 出現回数 desc → 出題年度数 desc
const byFreq = (a, b) => b.count - a.count || b.yearsCount - a.yearsCount || a.title.localeCompare(b.title, "ja");
const ranked = [...topics].sort(byFreq);

// --- 3. MDX 生成 ---
const row = (i, t) =>
  `| ${i} | [${t.title}](${publicKeywordPath(t.slug)}) | ${t.count} | ${t.yearsCount} | ${t.latestYear} |`;

const overallTable = [
  "| 順位 | 論点 | 出現 | 出題年度数 | 直近出題 |",
  "|---|---|---|---|---|",
  ...ranked.slice(0, 30).map((t, i) => row(i + 1, t)),
].join("\n");

const kanriBlocks = kanriSections
  .map((k) => {
    const list = ranked.filter((t) => t.kanri === k).slice(0, 10);
    if (!list.length) return "";
    const table = [
      "| 順位 | 論点 | 出現 | 出題年度数 | 直近出題 |",
      "|---|---|---|---|---|",
      ...list.map((t, i) => row(i + 1, t)),
    ].join("\n");
    return `### ${k}\n\n${table}\n`;
  })
  .filter(Boolean)
  .join("\n");

const frontmatter = `---
title: 総合技術監理部門 過去問 頻出論点ランキング（${yearSpan}年度・${totalQuestions}問の出題傾向データ）
shortTitle: 頻出論点ランキング
subtitle: ${yearRange}の択一を5管理・${totalTopics}論点で集計
description: >-
  技術士総合技術監理部門の択一過去問${yearSpan}年度分（${totalQuestions}問）を${totalTopics}論点に分類し、出現頻度で集計した出題傾向データ。経済性・人的資源・情報・安全・社会環境の5管理別に頻出論点をランキング化。労働安全衛生法・労働基準法・環境影響評価などの頻出度を年度数とともに一覧で確認できる。
category: pe-comprehensive-management
group: guide
tags:
  - 総合技術監理
  - 出題傾向
  - 過去問
published: true
publishedAt: '2026-06-23'
seoTitle: "総合技術監理 出題傾向・頻出論点ランキング｜${yearSpan}年度${totalQuestions}問を5管理で集計【技術士総監】"
created: ${preservedCreated || todayJST()}
dateModified: ${todayJST()}${preservedOgpBlock ? `\n${preservedOgpBlock}` : ""}
---`;

const body = `本ページは、技術士総合技術監理部門の**第一次・択一式（必須科目Ⅰ）過去問を${yearRange}の${yearSpan}年度分**にわたり収集し、各設問を論点キーワードに分類して**出現頻度を集計した独自の出題傾向データ**である。対象は ${totalQuestions} 問、分類した論点は ${totalTopics}、延べ ${totalLinks} 件の論点–設問リンクを基礎データとする。

<Callout type="info" title="このデータの読み方">
- **出現**: その論点が過去問設問に紐づいた延べ件数。1 設問が複数論点にまたがる場合は各論点で計上するため、設問数とは一致しない。
- **出題年度数**: その論点が出題された年度の数（最大 ${yearSpan}）。**毎年のように問われる論点ほど数値が大きい**。
- 本データは「正確な出題回数」ではなく、**論点タグ付けに基づく出題傾向の指標**である。学習の優先順位付けに用いることを想定している。
</Callout>

## 全体 頻出論点ランキング TOP30

5 管理を横断した出現頻度の上位 30 論点。**出題年度数が多い（＝ほぼ毎年問われる）論点から優先的に押さえる**のが得点効率の高い学習順序となる。

${overallTable}

## 5 管理別 頻出論点 TOP10

総合技術監理は経済性管理・人的資源管理・情報管理・安全管理・社会環境管理の 5 管理で体系化される。管理ごとに頻出論点を把握しておくと、択一でも記述でも論点の引き出しが揃う。

${kanriBlocks}

## 出典と方法論

- **基礎データ**: 当サイトが文字起こしした技術士総合技術監理部門 択一過去問（${yearRange}）。各設問は[総合技術監理 キーワード集 2026](${PUBLIC_KEYWORD_GUIDE})の論点体系に沿って分類した。
- **集計**: 論点ごとの設問紐づけ件数・出題年度を機械集計（\`scripts/build-frequent-topics.mjs\`）。新年度の過去問を追加すると自動で更新される。
- 各論点名のリンク先は、その論点の定義・過去問・試験対策ポイントをまとめた個別解説ページである。
- **カバー率**: キーワード集掲載 ${slugMeta.size} 論点のうち出題実績（本データの出現）を持つのは ${totalTopics}（${((totalTopics / slugMeta.size) * 100).toFixed(1)}%）。5 管理への分類率は ${((topics.filter((t) => t.kanri !== "その他").length / totalTopics) * 100).toFixed(1)}%（未分類は「その他」に計上）。
- **全 ${totalTopics} 論点の集計データ**は [CSV でダウンロード](/data/pe-cem-frequent-topics.csv) できる（出典リンクの明記を条件に引用・転載可）。

<Callout type="note" title="関連ページ">
- [総合技術監理 キーワード集 2026](${PUBLIC_KEYWORD_GUIDE}) — 5管理600+論点の全文解説
</Callout>
`;

// --check: 入力の読み込み・集計・MDX 本文の組み立てまでを完走したことだけ確認し、書かない。
// quality-audit のゲートから毎回呼ぶ。動機は monetization-coverage --check と同じ
// （.claude/scripts/report-monetization-coverage.mts 参照）——このスクリプトは
// Windows で `new URL("..", import.meta.url).pathname` が `/C:/Users/…` を返すバグにより
// **一度も実行できていない**期間があった（2026-08-25 発覚）。実行可能性を確かめる検出器が
// 無かったので、frequent-topics は「17年度・680問」のまま何週間も公開され続けた。
if (process.argv.includes('--check')) {
  console.log(`[build-frequent-topics] OK: topics=${totalTopics} questions=${totalQuestions} links=${totalLinks}（--check・未書き込み）`);
  process.exit(0);
}

mkdirSync(dirname(OUT), { recursive: true });
writeMdxFile(OUT, `${frontmatter}\n\n${body}`, existingEol);
console.log(`[build-frequent-topics] wrote ${OUT}`);
console.log(`  topics=${totalTopics} questions=${totalQuestions} links=${totalLinks}`);
console.log(`  TOP5: ${ranked.slice(0, 5).map((t) => `${t.title}(${t.count})`).join(", ")}`);

// --- 4. CSV 全量出力（562 論点。ページURL は記事ディレクトリが実在する slug のみ埋める） ---
const csvHeader = ["slug", "論点名", "5管理分類", "出現回数", "出題年度数", "直近出題年度", "出題年度リスト", "ページURL"];
const csvRows = ranked.map((t) => {
  const dirExists = existsSync(join(SITE_DIR, t.slug));
  const url = dirExists ? `https://doboku-note.com${publicKeywordPath(t.slug)}` : "";
  return [t.slug, t.title, t.kanri, t.count, t.yearsCount, t.latestYear, t.years.join(";"), url];
});
const csvContent =
  "﻿" +
  [csvHeader, ...csvRows].map((row) => row.map(csvEscape).join(",")).join("\n") +
  "\n";
mkdirSync(dirname(CSV_OUT), { recursive: true });
writeFileSync(CSV_OUT, csvContent, "utf-8");
console.log(`[build-frequent-topics] wrote ${CSV_OUT}（${csvRows.length} 行）`);
