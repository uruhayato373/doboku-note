#!/usr/bin/env node
/**
 * IG 投稿用 caption.txt を slide-data.json から生成する
 *
 * Usage:
 *   node .claude/scripts/instagram/generate-caption.cjs <slide-data.json>
 *
 * 入力: docs/sns/instagram/{slug}/slide-data.json
 * 出力: 同ディレクトリに caption.txt
 *
 * caption の構成:
 *   - 1 行目: 【用語集】{keyword} — {subtitle}
 *   - 2-N 行目: slide body の要約（最大 3 件、type=board の本文）
 *   - CTA: 「保存して試験前日に復習」「プロフィールの doboku-note サイトで詳細解説」
 *   - ハッシュタグ: 大3 + 中5 + 小ニッチ7 = 15 個（戦略 v5 §252-255）
 */

const fs = require("node:fs");
const path = require("node:path");

const [, , inputArg] = process.argv;
if (!inputArg) {
  console.error("Usage: node generate-caption.cjs <slide-data.json>");
  process.exit(1);
}

const inputPath = path.resolve(inputArg);
if (!fs.existsSync(inputPath)) {
  console.error(`Not found: ${inputPath}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
const dir = path.dirname(inputPath);
const outputPath = path.join(dir, "caption.txt");

const { slides, cta, _meta } = data;
// 旧スキーマ (cover フィールド) と新スキーマ (slides[0].type === 'cover') 両対応
const coverSlide = Array.isArray(slides)
  ? slides.find((s) => s.type === "cover")
  : null;
const cover = data.cover || coverSlide || {};
const coverTitle = cover.keyword || cover.title;

if (!coverTitle) {
  console.error("slide-data.json に cover.keyword/title が必要です");
  process.exit(1);
}

const isBundle = Boolean(_meta?.bundleId);
const isExamPack = Boolean(_meta?.year && _meta?.packNum);
const kwCount = _meta?.keywordCount
  ?? (Array.isArray(slides) ? slides.filter((s) => s.type === "board").length : 0);
const qCount = Array.isArray(slides)
  ? slides.filter((s) => s.type === "problem").length
  : 0;

const lines = [];

// タイトル行（モード別）
if (isExamPack) {
  const yearLabel = _meta.year.toUpperCase();
  lines.push(`【過去問】${coverTitle}｜${yearLabel} ${qCount}問パック`);
} else if (isBundle) {
  const chapterLabel = _meta?.chapterTitle ? `【${_meta.chapterTitle}】` : "【保存版】";
  lines.push(`${chapterLabel}${coverTitle}（${kwCount}キーワードまとめ）`);
} else {
  lines.push(`【用語集】${coverTitle}${cover.subtitle ? ` — ${cover.subtitle}` : ""}`);
}
lines.push("");

// body 要約
if (isExamPack) {
  // 過去問パック: 各 problem の主題（answer.correctText）+ 正答番号 + 論点（pointText）を要約
  // 4 問パックなので 4 問すべて表示する
  const problems = (slides || []).filter((s) => s.type === "problem");
  const answers = (slides || []).filter((s) => s.type === "answer");
  problems.forEach((p, i) => {
    const ans = answers[i];
    // 主題は answer.correctText（pack-02 Q1 なら「品質管理の統計的手法」）
    // フォールバック: problem の bodyLines 冒頭 50 字
    let topic = ans?.correctText?.trim();
    if (!topic) {
      const bodyText = Array.isArray(p.bodyLines) ? p.bodyLines.join("") : (p.body || "");
      topic = bodyText.length > 50 ? bodyText.slice(0, 50) + "…" : bodyText;
    }
    lines.push(`▶ Q${p.qNum ?? i + 1}: ${topic}`);
    // 正答番号 + 論点を 1 行に
    if (ans?.correctNum) {
      const point = ans.pointText
        ? (ans.pointText.length > 50 ? ans.pointText.slice(0, 50) + "…" : ans.pointText)
        : "";
      const suffix = point ? `: ${point}` : "";
      lines.push(`  → 正答 ${ans.correctNum}${suffix}`);
    }
    lines.push("");
  });
} else {
  const boards = (slides || []).filter((s) => s.type === "board").slice(0, 3);
  for (const s of boards) {
    const body = (s.body || "").replace(/\s+/g, "");
    const truncated = body.length > 80 ? body.slice(0, 80) + "…" : body;
    lines.push(`▶ ${s.heading || ""}`);
    lines.push(truncated);
    lines.push("");
  }
}

// CTA
lines.push("─────────");
let saveLabel = "📌 保存して試験前日に見返す用語集";
if (isExamPack) saveLabel = "📌 保存して試験前日に見返す過去問パック";
else if (isBundle) saveLabel = "📌 保存して試験前日に見返すまとめ";
lines.push(saveLabel);
lines.push("🔗 詳細解説はプロフィールの doboku-note サイトで");
lines.push("");

// 関連キーワード（cta.related があれば）
if (Array.isArray(cta?.related) && cta.related.length > 0) {
  lines.push(`📚 関連: ${cta.related.slice(0, 4).join(" / ")}`);
  lines.push("");
}

// ハッシュタグ（v5 §252-255: 大3 + 中5 + 小ニッチ7 = 15 個）
const hashtags = [
  // 大（発見性）
  "#技術士",
  "#資格勉強",
  "#国家資格",
  // 中（関連性）
  "#技術士総監",
  "#技術士総合技術監理",
  "#1級土木施工管理技士",
  "#施工管理技士",
  "#建設業",
  // 小ニッチ（受験者直撃）
  "#技術士総監受験",
  "#2026年技術士",
  "#社会人勉強垢",
  "#資格取得",
  "#土木技術者",
  "#建設技術者",
  "#総監キーワード",
];

lines.push(hashtags.join(" "));

const output = lines.join("\n");
fs.writeFileSync(outputPath, output, "utf-8");
console.log(`✓ ${outputPath} を生成しました (${output.length} 文字)`);
