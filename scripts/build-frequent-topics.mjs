#!/usr/bin/env node
/**
 * 総合技術監理部門 過去問 頻出論点ランキングの独自データ資産を生成する。
 *
 * 真実源:
 *   - src/config/past-exam-backlinks.json … 論点キーワード → {年度・設問} 出現リスト
 *     （refresh-indexes が文字起こし済み過去問から生成。680問・17年度・552論点）
 *   - content/site/pe-comprehensive-management/keyword-2026/article.mdx
 *     … 5管理（経済性/人的資源/情報/安全/社会環境）→ 論点 slug のマスター構造
 *
 * 出力: content/site/pe-comprehensive-management/frequent-topics/article.mdx
 *
 * 設計: 集計はすべてデータ由来（編集者の主観で頻度を作らない）。新年度の過去問を
 *       追加して refresh-indexes を回せば、本スクリプト再実行で自動更新される。
 *       「正確な出題回数」ではなく「論点タグ付けベースの出題傾向指標」として提示する。
 */
import { readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { writeMdxFile } from "../.claude/scripts/lib/mdx-io.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const BACKLINKS = `${ROOT}src/config/past-exam-backlinks.json`;
const KEYWORD_2026 = `${ROOT}content/site/pe-comprehensive-management/keyword-2026/article.mdx`;
const OUT = `${ROOT}content/site/pe-comprehensive-management/frequent-topics/article.mdx`;

const PREFIX = "pe-comprehensive-management-";

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
  // "令和7年度" / "平成30年度" を昇順比較できる数値へ
  const m = y.match(/(令和|平成)(\d+)/);
  if (!m) return 0;
  return (m[1] === "令和" ? 2018 : 1988) + Number(m[2]);
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
    yearsCount: years.size,
    latestYear: sortedYears[sortedYears.length - 1],
    recent5: occs.filter((o) => yearOrder(o.year) >= 2021).length, // R03 以降
  });
}

const totalTopics = topics.length;
const totalQuestions = allQuestions.size;
const totalLinks = topics.reduce((s, t) => s + t.count, 0);

// 並べ替え: 出現回数 desc → 出題年度数 desc
const byFreq = (a, b) => b.count - a.count || b.yearsCount - a.yearsCount || a.title.localeCompare(b.title, "ja");
const ranked = [...topics].sort(byFreq);

// --- 3. MDX 生成 ---
const row = (i, t) =>
  `| ${i} | [${t.title}](/docs/pe-comprehensive-management-${t.slug}) | ${t.count} | ${t.yearsCount} | ${t.latestYear} |`;

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
title: 総合技術監理部門 過去問 頻出論点ランキング（17年度・680問の出題傾向データ）
shortTitle: 頻出論点ランキング
subtitle: 平成21年度〜令和7年度の択一を5管理・552論点で集計
description: >-
  技術士総合技術監理部門の択一過去問17年度分（${totalQuestions}問）を${totalTopics}論点に分類し、出現頻度で集計した出題傾向データ。経済性・人的資源・情報・安全・社会環境の5管理別に頻出論点をランキング化。労働安全衛生法・労働基準法・環境影響評価などの頻出度を年度数とともに一覧で確認できる。
category: pe-comprehensive-management
group: guide
tags:
  - 総合技術監理
  - 出題傾向
  - 過去問
published: true
publishedAt: '2026-06-23'
seoTitle: "総合技術監理 出題傾向・頻出論点ランキング｜17年度680問を5管理で集計【技術士総監】"
---`;

const body = `本ページは、技術士総合技術監理部門の**第一次・択一式（必須科目Ⅰ）過去問を平成21年度〜令和7年度の17年度分**にわたり収集し、各設問を論点キーワードに分類して**出現頻度を集計した独自の出題傾向データ**である。対象は ${totalQuestions} 問、分類した論点は ${totalTopics}、延べ ${totalLinks} 件の論点–設問リンクを基礎データとする。

<Callout type="info" title="このデータの読み方">
- **出現**: その論点が過去問設問に紐づいた延べ件数。1 設問が複数論点にまたがる場合は各論点で計上するため、設問数とは一致しない。
- **出題年度数**: その論点が出題された年度の数（最大 17）。**毎年のように問われる論点ほど数値が大きい**。
- 本データは「正確な出題回数」ではなく、**論点タグ付けに基づく出題傾向の指標**である。学習の優先順位付けに用いることを想定している。
</Callout>

## 全体 頻出論点ランキング TOP30

5 管理を横断した出現頻度の上位 30 論点。**出題年度数が多い（＝ほぼ毎年問われる）論点から優先的に押さえる**のが得点効率の高い学習順序となる。

${overallTable}

## 5 管理別 頻出論点 TOP10

総合技術監理は経済性管理・人的資源管理・情報管理・安全管理・社会環境管理の 5 管理で体系化される。管理ごとに頻出論点を把握しておくと、択一でも記述でも論点の引き出しが揃う。

${kanriBlocks}

## 出典と方法論

- **基礎データ**: 当サイトが文字起こしした技術士総合技術監理部門 択一過去問（平成21年度〜令和7年度）。各設問は[総合技術監理 キーワード集 2026](/docs/pe-comprehensive-management-keyword-2026)の論点体系に沿って分類した。
- **集計**: 論点ごとの設問紐づけ件数・出題年度を機械集計（\`scripts/build-frequent-topics.mjs\`）。新年度の過去問を追加すると自動で更新される。
- 各論点名のリンク先は、その論点の定義・過去問・試験対策ポイントをまとめた個別解説ページである。

<Callout type="note" title="関連ページ">
- [総合技術監理 キーワード集 2026](/docs/pe-comprehensive-management-keyword-2026) — 5管理600+論点の全文解説
</Callout>
`;

mkdirSync(dirname(OUT), { recursive: true });
writeMdxFile(OUT, `${frontmatter}\n\n${body}`);
console.log(`[build-frequent-topics] wrote ${OUT}`);
console.log(`  topics=${totalTopics} questions=${totalQuestions} links=${totalLinks}`);
console.log(`  TOP5: ${ranked.slice(0, 5).map((t) => `${t.title}(${t.count})`).join(", ")}`);
