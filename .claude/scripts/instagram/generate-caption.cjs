#!/usr/bin/env node
/**
 * IG 投稿用 caption.txt を slide-data.json から生成する
 *
 * Usage:
 *   node .claude/scripts/instagram/generate-caption.cjs <slide-data.json>
 *
 * 入力: content/sns/instagram/{slug}/slide-data.json
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

const args = process.argv.slice(2);
const inputArg = args.find((a) => !a.startsWith("--"));
const formatArg = (() => {
  const i = args.findIndex((a) => a === "--format");
  if (i >= 0 && args[i + 1]) return args[i + 1];
  const eq = args.find((a) => a.startsWith("--format="));
  return eq ? eq.slice(9) : "carousel";
})();
if (!inputArg) {
  console.error("Usage: node generate-caption.cjs <slide-data.json> [--format carousel|reels]");
  process.exit(1);
}
if (!["carousel", "reels"].includes(formatArg)) {
  console.error(`--format は carousel または reels`);
  process.exit(1);
}

const inputPath = path.resolve(inputArg);
if (!fs.existsSync(inputPath)) {
  console.error(`Not found: ${inputPath}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
const dir = path.dirname(inputPath);
// メディア別サブディレクトリに保存（carousel/caption.txt or reels/caption.txt）
// pack 直下に置くと「どのフォーマット用か」が一目でわからないため
const outputDir = path.join(dir, formatArg);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, "caption.txt");

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
// 論点（頻出問題）パック: 科目テーマ × 論点で括り、複数年度から4問採録
const isThemePack = Boolean(_meta?.theme && _meta?.subtopic);
const starStr = (n) => "★".repeat(Math.max(1, Math.min(3, n || 1))) + "☆".repeat(3 - Math.max(1, Math.min(3, n || 1)));
const kwCount = _meta?.keywordCount
  ?? (Array.isArray(slides) ? slides.filter((s) => s.type === "board").length : 0);
const qCount = Array.isArray(slides)
  ? slides.filter((s) => s.type === "problem").length
  : 0;

const lines = [];

// タイトル行（モード別）
if (isThemePack) {
  const stars = starStr(_meta.freqStars);
  lines.push(`【頻出論点】${_meta.theme.label} / ${_meta.subtopic.label}  ${stars}`);
  if (_meta.yearsLabel) lines.push(`出題  ${_meta.yearsLabel}`);
} else if (isExamPack) {
  // 管理混在問題を回避するため、cover-title の管理名（経済性管理など）は出さず、
  // 年度ベースの統一タイトル + パック番号で識別。
  // 年度コードは [rh]NN（総監/1級）に加え 2級の前期/後期サフィックス z/k を許容。
  // 期は fmtLabel 側に入る(例「第一次検定 前期」)ため、yearLabel からは z/k を除く。
  const ym = String(_meta.year).match(/^([rRhH])(\d+)([zk])?$/);
  const yearLabel = ym ? `${ym[1].toUpperCase()}${ym[2]}` : _meta.year.toUpperCase();
  const yearNum = ym ? String(parseInt(ym[2], 10)) : (String(_meta.year).replace(/^[rRhH]0*/, '') || _meta.year);
  const eraJp = /^h/i.test(_meta.year) ? '平成' : '令和';
  const packNumLabel = String(_meta.packNum).replace(/^0+/, '') || _meta.packNum;
  // fmtLabel があれば採用（例: 1級「第一次検定 過去問」/ 2級「第一次検定 前期」）。無ければ従来の「択一式 過去問」。
  const fmtLabel = _meta.fmtLabel || '択一式 過去問';
  lines.push(`【${eraJp}${yearNum}年度 ${fmtLabel}】${yearLabel} 過去問 #${packNumLabel}`);
} else if (isBundle) {
  const chapterLabel = _meta?.chapterTitle ? `【${_meta.chapterTitle}】` : "【保存版】";
  lines.push(`${chapterLabel}${coverTitle}（${kwCount}キーワードまとめ）`);
} else {
  lines.push(`【用語集】${coverTitle}${cover.subtitle ? ` — ${cover.subtitle}` : ""}`);
}
lines.push("");

// body 要約
if (isExamPack || isThemePack) {
  const problems = (slides || []).filter((s) => s.type === "problem");
  const answers = (slides || []).filter((s) => s.type === "answer");

  if (formatArg === "reels") {
    // Reels 用: 主題リストのみ（正答ネタバレなし）+ 「動画で確認」誘導
    lines.push("🎯 動画で 4 問チャレンジ！");
    lines.push("");
    problems.forEach((p, i) => {
      const ans = answers[i];
      let topic = ans?.correctText?.trim();
      if (!topic) {
        const bodyText = Array.isArray(p.bodyLines) ? p.bodyLines.join("") : (p.body || "");
        topic = bodyText.length > 40 ? bodyText.slice(0, 40) + "…" : bodyText;
      }
      lines.push(`▶ Q${p.qNum ?? i + 1}: ${topic}`);
    });
    lines.push("");
    lines.push("正答と論点解説は動画で ▶");
    lines.push("");
  } else {
    // カルーセル用: 各問の主題 + 正答番号 + 論点
    problems.forEach((p, i) => {
      const ans = answers[i];
      let topic = ans?.correctText?.trim();
      if (!topic) {
        const bodyText = Array.isArray(p.bodyLines) ? p.bodyLines.join("") : (p.body || "");
        topic = bodyText.length > 50 ? bodyText.slice(0, 50) + "…" : bodyText;
      }
      lines.push(`▶ Q${p.qNum ?? i + 1}: ${topic}`);
      if (ans?.correctNum) {
        const point = ans.pointText
          ? (ans.pointText.length > 50 ? ans.pointText.slice(0, 50) + "…" : ans.pointText)
          : "";
        const suffix = point ? `: ${point}` : "";
        lines.push(`  → 正答 ${ans.correctNum}${suffix}`);
      }
      lines.push("");
    });
  }
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
if (formatArg === "reels" && (isExamPack || isThemePack)) {
  // Reels はエンゲージメント喚起（IG アルゴリズム最適化: シェア・コメント・保存）
  lines.push("📌 保存して試験前日に見返す");
  lines.push("💬 「○問正解」をコメントで教えて！");
  lines.push("↗ 友達にもシェア");
  lines.push("🔗 全問解説はプロフィールの doboku-note サイトで");
} else {
  let saveLabel = "📌 保存して試験前日に見返す用語集";
  if (isThemePack) saveLabel = "📌 保存して試験前日に見返す頻出論点パック";
  else if (isExamPack) saveLabel = "📌 保存して試験前日に見返す過去問パック";
  else if (isBundle) saveLabel = "📌 保存して試験前日に見返すまとめ";
  lines.push(saveLabel);
  lines.push("🔗 詳細解説はプロフィールの doboku-note サイトで");
}
lines.push("");

// 関連キーワード（cta.related があれば）
if (Array.isArray(cta?.related) && cta.related.length > 0) {
  lines.push(`📚 関連: ${cta.related.slice(0, 4).join(" / ")}`);
  lines.push("");
}

// ハッシュタグ（v5 §252-255: 大3 + 中5 + 小ニッチ7 = 15 個）
// 試験別に切替（_meta.exam）。総監（exam 未設定）は従来セットを維持。
const HASHTAG_SETS = {
  "civil-1": [
    // 大（発見性）
    "#資格勉強",
    "#国家資格",
    "#施工管理技士",
    // 中（関連性）
    "#1級土木施工管理技士",
    "#土木施工管理技士",
    "#土木",
    "#建設業",
    "#現場監督",
    // 小ニッチ（受験者直撃）
    "#1級土木",
    "#施工管理",
    "#2026年受験",
    "#社会人勉強垢",
    "#土木技術者",
    "#建設技術者",
    "#過去問",
  ],
  "civil-2": [
    // 大（発見性）
    "#資格勉強",
    "#国家資格",
    "#施工管理技士",
    // 中（関連性）
    "#2級土木施工管理技士",
    "#土木施工管理技士",
    "#土木",
    "#建設業",
    "#現場監督",
    // 小ニッチ（受験者直撃）
    "#2級土木",
    "#施工管理",
    "#2026年受験",
    "#社会人勉強垢",
    "#土木技術者",
    "#建設技術者",
    "#過去問",
  ],
  default: [
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
  ],
};
const hashtags = HASHTAG_SETS[_meta?.exam] || HASHTAG_SETS.default;

lines.push(hashtags.join(" "));

const output = lines.join("\n");
fs.writeFileSync(outputPath, output, "utf-8");
console.log(`✓ ${outputPath} を生成しました (${output.length} 文字)`);
