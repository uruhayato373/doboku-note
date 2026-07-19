#!/usr/bin/env node
/**
 * 5 ピラー（経済性管理 / 人的資源管理 / 情報管理 / 安全管理 / 社会環境管理）ごとに、
 * 配下キーワードに紐づく過去問設問を集計して `src/config/pillar-exam-questions.json` を生成する。
 *
 * 入力:
 *   - src/config/exam-question-keywords.json （過去問設問 → キーワード slug 配列）
 *   - .local/r2/posts/pe-comprehensive-management/keyword-2026/article.mdx （5 管理 → キーワード集合）
 *
 * 出力:
 *   src/config/pillar-exam-questions.json
 *
 * Issue: #72 ピラーページ拡充（過去問掲載）
 *
 * Usage:
 *   node .claude/scripts/build-pillar-exam-questions.mjs           # 一括実行
 *   node .claude/scripts/build-pillar-exam-questions.mjs --check   # 件数のみ表示、書き込まない
 */

import { readFileSync, writeFileSync } from "node:fs";

// ── Config ──

const KEYWORD_2026_PATH = ".local/r2/posts/pe-comprehensive-management/keyword-2026/article.mdx";
const EXAM_KW_JSON = "src/config/exam-question-keywords.json";
const OUT_PATH = "src/config/pillar-exam-questions.json";

const PILLAR_INFO = {
  economic: { label: "経済性管理", slug: "pe-comprehensive-management-economic-management-pillar" },
  "human-resource": { label: "人的資源管理", slug: "pe-comprehensive-management-human-resource-management-pillar" },
  information: { label: "情報管理", slug: "pe-comprehensive-management-information-management-pillar" },
  safety: { label: "安全管理", slug: "pe-comprehensive-management-safety-management-pillar" },
  "social-environment": { label: "社会環境管理", slug: "pe-comprehensive-management-social-environment-management-pillar" },
};

const EXCLUDE_SLUGS = new Set([
  "keyword-2026",
  "exam-index",
  "general-overview",
  "essay-exam-strategy",
  "exam-application-guide",
  "exam-passing-strategy",
  "management-tradeoffs",
  "economic-management-pillar",
  "human-resource-management-pillar",
  "information-management-pillar",
  "safety-management-pillar",
  "social-environment-management-pillar",
  // 国土交通白書 × テーマ別トレードオフ × 過去問適用 シリーズ (2026-05 追加)
  // group: guide の上位概念記事のため、ピラー過去問計算から除外
  "mlit-whitepaper-2025",
  "essay-mlit-aging-infrastructure",
  "essay-mlit-construction-2024",
  "essay-mlit-river-basin-management",
  "essay-mlit-green-transformation",
  "essay-mlit-i-construction-2",
  "essay-mlit-infrastructure-group-mgmt",
  "essay-mlit-foreign-workers",
]);

// 年度の表示順（最新が先頭）
const YEAR_ORDER = ["r08", "r07", "r06", "r05", "r04", "r03", "r02", "r01", "h30", "h29", "h28", "h27", "h26", "h25", "h24", "h23", "h22", "h21"];

// ── slug → 管理分野マップ ──

function buildSlugToAreaMap() {
  const raw = readFileSync(KEYWORD_2026_PATH, "utf-8");
  const lines = raw.split(/\r?\n/);
  const map = new Map();
  let area = null;
  const sectionRe = /^##\s+(\d+)\.\s+(.+)$/;
  const linkRe = /\/docs\/pe-comprehensive-management-([a-z0-9-]+)/g;
  for (const line of lines) {
    const sm = line.match(sectionRe);
    if (sm) {
      const num = sm[1];
      if (num === "2") area = "economic";
      else if (num === "3") area = "human-resource";
      else if (num === "4") area = "information";
      else if (num === "5") area = "safety";
      else if (num === "6") area = "social-environment";
      else area = null;
      continue;
    }
    if (!area) continue;
    let m;
    while ((m = linkRe.exec(line)) !== null) {
      const slug = m[1];
      if (EXCLUDE_SLUGS.has(slug)) continue;
      if (!map.has(slug)) map.set(slug, area);
    }
  }
  return map;
}

// ── 過去問設問 → ピラーへの集計 ──

function aggregate(slugMap) {
  const examData = JSON.parse(readFileSync(EXAM_KW_JSON, "utf-8"));
  const pillars = {};
  for (const area of Object.keys(PILLAR_INFO)) {
    pillars[area] = { label: PILLAR_INFO[area].label, total: 0, by_year: {} };
  }

  for (const [examSlug, questions] of Object.entries(examData)) {
    // exam slug 例: "pe-comprehensive-management-r07-primary" → year = "r07"
    const yearMatch = examSlug.match(/-([rh]\d{2})-primary$/);
    if (!yearMatch) continue;
    const year = yearMatch[1];

    for (const [num, q] of Object.entries(questions)) {
      const heading = q.heading || `${num}`;
      const slugs = Array.isArray(q.slugs) ? q.slugs : [];
      // この設問が各ピラーに該当するか判定（複数該当可）
      const matchedAreas = new Set();
      for (const s of slugs) {
        const area = slugMap.get(s);
        if (area) matchedAreas.add(area);
      }
      for (const area of matchedAreas) {
        const pillar = pillars[area];
        if (!pillar.by_year[year]) {
          pillar.by_year[year] = {
            year,
            exam_slug: examSlug,
            questions: [],
          };
        }
        pillar.by_year[year].questions.push({
          num,
          heading,
          // anchor: 過去問ページの heading id 化（小文字 + ハイフン化）
          // 例: "Ⅱ-1-1" → "ⅱ-1-1"（generateHeadingId と整合）
          anchor: toAnchor(heading),
          keywords: slugs,
        });
        pillar.total++;
      }
    }
  }

  // by_year を YEAR_ORDER に従って配列化
  for (const area of Object.keys(pillars)) {
    const byYearObj = pillars[area].by_year;
    const arr = [];
    for (const y of YEAR_ORDER) {
      if (byYearObj[y]) {
        // 設問内ソート: num（1-1, 1-2, ...）で昇順
        byYearObj[y].questions.sort((a, b) => compareQuestionNum(a.num, b.num));
        arr.push(byYearObj[y]);
      }
    }
    pillars[area].by_year = arr;
  }

  return pillars;
}

function toAnchor(heading) {
  // build-exam-backlinks.mjs の generateHeadingId() と完全一致させる:
  // 1. NFKC 正規化（全角ハイフン → 半角、Unicode ローマ数字 → ASCII、全角数字 → 半角）
  // 2. trim + lowercase
  // 3. 先頭の ASCII ローマ数字（- 区切り）を除去（章番号 Ⅰ/Ⅱ を anchor から落とす）
  // 4. 許可文字（\w, ひらがな, カタカナ, CJK, whitespace, -）以外を除去
  // 5. whitespace と連続ハイフンを単一 - に
  // 6. 先頭/末尾の - をトリム
  // 例: "Ⅰ-1-1" / "Ⅱ-1-1" / "I-1-1" / "II-1-1" / "Ⅰ－1－1" すべて → "1-1"
  return (
    heading
      .normalize("NFKC")
      .trim()
      .toLowerCase()
      .replace(/^[ivx]+(?=-)/, "")
      .replace(/[^\w぀-ゟ゠-ヿ一-龯㐀-䶿\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "heading"
  );
}

function compareQuestionNum(a, b) {
  // "1-1", "1-10", "1-2" を section ごとに数値ソート
  const pa = a.split("-").map((s) => parseInt(s, 10));
  const pb = b.split("-").map((s) => parseInt(s, 10));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

// ── Main ──

function main() {
  const checkOnly = process.argv.includes("--check");

  const slugMap = buildSlugToAreaMap();
  console.log(`slug → 管理分野マップ: ${slugMap.size} エントリ`);

  const pillars = aggregate(slugMap);

  console.log("");
  console.log("=== ピラー別 集計 ===");
  let grand = 0;
  for (const [area, info] of Object.entries(PILLAR_INFO)) {
    const p = pillars[area];
    const yearSummary = p.by_year.map((y) => `${y.year}:${y.questions.length}`).join(" ");
    console.log(`${info.label.padEnd(8)} 合計 ${p.total} 問 [${yearSummary}]`);
    grand += p.total;
  }
  console.log(`総計（重複込）: ${grand} 問エントリ`);

  if (checkOnly) {
    console.log("(--check: 書き込みスキップ)");
    return;
  }

  const out = {
    version: 1,
    generated_at: new Date().toISOString(),
    source: {
      exam_question_keywords: EXAM_KW_JSON,
      keyword_2026: KEYWORD_2026_PATH,
    },
    pillars,
  };
  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n");
  console.log(`出力: ${OUT_PATH}`);
}

main();
