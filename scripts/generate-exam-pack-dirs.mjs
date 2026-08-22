#!/usr/bin/env node
/**
 * generate-exam-pack-dirs.mjs
 *
 * exam-questions.json から「4 問パック」単位で
 * content/sns/instagram/{exam}/exam-packs/<year>/pack-NN/slide-data.json を生成。
 *
 * 1 パック = cover + 4×(problem+answer) + cta = 10 枚カルーセル。
 * パック内 4 問は同じ管理（既存 quiz-ig.mjs 4 問パックと同構造）。
 *
 * Usage:
 *   node scripts/generate-exam-pack-dirs.mjs              # 全年度
 *   node scripts/generate-exam-pack-dirs.mjs --year r07   # 単年度
 *   node scripts/generate-exam-pack-dirs.mjs --force      # 既存上書き
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const INPUT_JSON = join(ROOT, "src/config/exam-questions.json");
const OUTPUT_BASE = join(ROOT, "content/sns/instagram/cem/exam-packs");

const MGMT_LABEL_MAP = {
  economic: "経済性管理",
  human: "人的資源管理",
  info: "情報管理",
  safety: "安全管理",
  social: "社会環境管理",
};

const MGMT_ORDER = ["economic", "human", "info", "safety", "social"];
const MGMT_SECTION_PREFIX = {
  economic: "2",
  human: "3",
  info: "4",
  safety: "5",
  social: "6",
};

/** 問題本文を句読点優先で自然に折り返す */
function wrapBody(text, idealLen = 22, maxLen = 30) {
  if (!text) return [];
  const lines = [];
  let buf = "";
  for (const ch of text) {
    buf += ch;
    if (ch === "。") {
      // 句点で必ず改行
      lines.push(buf);
      buf = "";
    } else if (buf.length >= idealLen && /[、）」』]/.test(ch)) {
      // 理想長を超えた読点・括弧閉じで改行
      lines.push(buf);
      buf = "";
    } else if (buf.length >= maxLen) {
      // 最大長超過は強制改行
      lines.push(buf);
      buf = "";
    }
  }
  if (buf) lines.push(buf);
  return lines;
}

/** 1 問の slide データを生成 (problem + answer の 2 枚分) */
function makeQuestionSlides(q, qNum, totalQ) {
  // 正答情報
  const correctJudgment = q.judgments.find((j) => j.result === "✅");
  const correctOption = q.options.find((o) => o.num === q.correct);
  const correctText = q.examPoint?.summary || (correctOption?.text || "").slice(0, 28);

  // 解説本文（正答理由 → 誤答理由 → ExamPoint items）
  const wrongJudgments = q.judgments.filter((j) => j.result === "❌");
  const parts = [];
  if (correctJudgment) {
    // 「正答 N」は card で既に表示されているので冗長。「○ 正答の根拠:」だけに
    parts.push(`○ 正答の根拠: ${correctJudgment.text}`);
  }
  for (const w of wrongJudgments.slice(0, 2)) {
    parts.push(`✗ ${w.num}: ${w.text}`);
  }
  // ExamPoint items の表示数: judgments が少ない場合は多めに（解説欠落対策）
  const examPointItemCount = parts.length === 0
    ? 5
    : parts.length === 1
      ? 4
      : 2;
  for (const item of (q.examPoint?.items || []).slice(0, examPointItemCount)) {
    parts.push(`▷ ${item}`);
  }
  // それでも解説が極端に少なければ correctText を再掲（最終フォールバック）
  if (parts.length === 0 || parts.length === 1) {
    const correctOptionText = (correctOption?.text || "").slice(0, 80);
    if (correctOptionText) {
      parts.push(`○ 正答 ${q.correct}: ${correctOptionText}`);
    }
  }
  const explanationLines = parts.flatMap((p) => wrapBody(p, 24, 32));

  return [
    {
      type: "problem",
      bodyLines: wrapBody(q.body, 28),
      options: q.options,
      qNum,
      totalQ,
    },
    {
      type: "answer",
      correctNum: q.correct,
      correctText,
      correctSub: q.examPoint?.summary && q.examPoint.summary !== correctText
        ? q.examPoint.summary
        : null,
      explanationLines,
      qNum,
      totalQ,
    },
  ];
}

function makePackSlideData({ year, packNum, totalPacks, management, questions }) {
  const yearLabel = year.toUpperCase();
  const mgmtLabel = MGMT_LABEL_MAP[management] || "総監";
  const sectionPrefix = MGMT_SECTION_PREFIX[management] || "?";

  const innerSlides = questions.flatMap((q, i) =>
    makeQuestionSlides(q, i + 1, questions.length),
  );

  return {
    slides: [
      {
        type: "cover",
        title: mgmtLabel,
        subtitle: `${yearLabel} ${questions.length}問パック`,
        sectionTag: `${sectionPrefix} ${mgmtLabel}`,
        pageIndex: 1,
        totalPages: 2 + innerSlides.length,
      },
      ...innerSlides,
      {
        type: "cta",
        pageIndex: 2 + innerSlides.length,
        totalPages: 2 + innerSlides.length,
      },
    ],
    _meta: {
      year,
      packNum,
      totalPacks,
      management,
      questionIds: questions.map((q) => q.id),
    },
  };
}

function processYear(yearData, force) {
  const year = yearData.year;
  const byMgmt = {};
  for (const q of yearData.questions) {
    if (!byMgmt[q.management]) byMgmt[q.management] = [];
    byMgmt[q.management].push(q);
  }

  // 各管理から 4 問ずつパック化（残りは廃棄）
  const packs = [];
  for (const mgmt of MGMT_ORDER) {
    const qs = byMgmt[mgmt] || [];
    const packCount = Math.floor(qs.length / 4);
    for (let p = 0; p < packCount; p++) {
      packs.push({
        management: mgmt,
        questions: qs.slice(p * 4, p * 4 + 4),
      });
    }
  }

  const totalPacks = packs.length;
  const yearDir = join(OUTPUT_BASE, year);

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < packs.length; i++) {
    const pack = packs[i];
    const packNum = String(i + 1).padStart(2, "0");
    const packDir = join(yearDir, `pack-${packNum}`);
    const target = join(packDir, "slide-data.json");

    if (existsSync(target) && !force) {
      skipped++;
      continue;
    }

    mkdirSync(join(packDir, "carousel", "img"), { recursive: true });
    mkdirSync(join(packDir, "reels"), { recursive: true });

    const slideData = makePackSlideData({
      year,
      packNum,
      totalPacks,
      management: pack.management,
      questions: pack.questions,
    });
    writeFileSync(target, JSON.stringify(slideData, null, 2) + "\n", "utf8");
    created++;
  }

  return { year, totalPacks, created, skipped, byMgmt };
}

function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const yearArg = args.includes("--year") ? args[args.indexOf("--year") + 1] : null;

  const data = JSON.parse(readFileSync(INPUT_JSON, "utf8"));
  const targets = yearArg ? data.years.filter((y) => y.year === yearArg) : data.years;

  console.log(`Generating exam packs for ${targets.length} year(s)...\n`);
  let total = { packs: 0, created: 0, skipped: 0 };

  for (const yearData of targets) {
    const r = processYear(yearData, force);
    const summary = MGMT_ORDER.map((m) => {
      const cnt = (r.byMgmt[m] || []).length;
      const packs = Math.floor(cnt / 4);
      return `${m}:${cnt}→${packs}p`;
    }).join(" ");
    console.log(
      `  ${r.year}: ${r.totalPacks} packs (${r.created} created, ${r.skipped} skipped)  [${summary}]`,
    );
    total.packs += r.totalPacks;
    total.created += r.created;
    total.skipped += r.skipped;
  }

  console.log(`\nTotal: ${total.packs} packs across years`);
  console.log(`  Created: ${total.created}`);
  console.log(`  Skipped: ${total.skipped}`);
  console.log(`\n✅ Output under ${OUTPUT_BASE}`);
}

main();
