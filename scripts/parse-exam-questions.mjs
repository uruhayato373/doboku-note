#!/usr/bin/env node
/**
 * parse-exam-questions.mjs
 *
 * 各年度の technicalsupport.../article.mdx から過去問 40 問を抽出し、
 * src/config/exam-questions.json に保存する。
 *
 * 出力スキーマ:
 *   {
 *     generatedAt: ISO-8601,
 *     years: [
 *       {
 *         year: "r07",
 *         title: "技術士二次試験 総合技術監理部門 令和7年度 択一式",
 *         questions: [
 *           {
 *             id: "r07-01",
 *             label: "Ⅰ-1-1",
 *             body: "問題本文（markdown 記号除去済）",
 *             options: [{ num: 1, text: "..." }, ...],
 *             correct: 2,
 *             judgments: [{ num: 1, text: "...", result: "✅" }, ...],
 *             examPoint: { summary, items: [...] } | null,
 *             management: "economic|human|info|safety|social"  // 5管理推定
 *           },
 *           ...
 *         ]
 *       }
 *     ]
 *   }
 *
 * Usage:
 *   node scripts/parse-exam-questions.mjs              # 全年度
 *   node scripts/parse-exam-questions.mjs --year r07   # 単年度
 *   node scripts/parse-exam-questions.mjs --check      # 統計のみ
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const POSTS_DIR = join(ROOT, "content/site/pe-comprehensive-management");
const OUTPUT_JSON = join(ROOT, "src/config/exam-questions.json");

// h2\d だけだと h30 を拾えず、h30-primary/article.mdx が実在するのに 16 年度 640 問で
// 生成されていた（2026-08-17 発覚）。Kindle B「平成合本 h21-h30」の収録数にも波及するため
// h30 を明示的に含める。年度が増えたらここを更新する。
const YEAR_PATTERN = /^(h2\d|h30|r0\d)-primary$/;

function stripMarkdown(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function inferManagement(text) {
  // 5 管理推定: 問題本文の頻出語から判定
  if (/(コスト|原価|品質管理|工程|事業計画|フィージビ|減価償却|投資|NPV|採算)/.test(text)) return "economic";
  if (/(労働|賃金|モチベーション|リーダーシップ|人事|採用|研修|働き方|労務)/.test(text)) return "human";
  if (/(情報|セキュリティ|データ|ネットワーク|システム開発|AI|知的財産)/.test(text)) return "info";
  if (/(安全|事故|災害|リスク|危機|ヒヤリ|労働災害|防災|地震|BCP)/.test(text)) return "safety";
  if (/(環境|温暖化|生物多様性|CO2|脱炭素|大気|水質|廃棄物|SDGs|公害)/.test(text)) return "social";
  return "economic"; // フォールバック
}

function parseQuestion(label, block) {
  const detailsRe = /<details>\s*<summary>解答・解説<\/summary>([\s\S]+?)<\/details>/;
  const detailsMatch = block.match(detailsRe);
  const beforeDetails = block.split("<details>")[0].trim();
  const detailsContent = detailsMatch ? detailsMatch[1].trim() : "";

  // 問題本文: 最初の番号付きリスト「1.」の前まで
  const firstOpt = beforeDetails.search(/^1\.\s/m);
  const body = firstOpt > 0
    ? stripMarkdown(beforeDetails.slice(0, firstOpt).trim())
    : stripMarkdown(beforeDetails);

  // 選択肢
  const options = [];
  // 改行込みで maxBuffer 確保: ^\d+\.\s ... 次の ^\d+\.\s または block 末尾まで
  const optionsBlock = firstOpt > 0 ? beforeDetails.slice(firstOpt) : "";
  const optionRe = /^(\d+)\.\s+([\s\S]+?)(?=^\d+\.\s|$)/gm;
  let m;
  while ((m = optionRe.exec(optionsBlock)) !== null) {
    options.push({ num: parseInt(m[1]), text: stripMarkdown(m[2].trim()) });
  }

  // 正答
  const correctMatch = detailsContent.match(/\*\*正答：?(\d+)\*\*/);
  const correct = correctMatch ? parseInt(correctMatch[1]) : null;

  // 各選択肢の判定（簡易: ✅ / ❌ を含む行を抽出）
  const judgments = [];
  const judgeRe = /^(\d+)\.\s+([\s\S]+?)\s*([✅❌])/gm;
  while ((m = judgeRe.exec(detailsContent)) !== null) {
    judgments.push({
      num: parseInt(m[1]),
      text: stripMarkdown(m[2].trim()),
      result: m[3],
    });
  }

  // ExamPoint
  const examRe = /<ExamPoint[\s\S]*?summary=["']([^"']+)["'][\s\S]*?items=\{(\[[\s\S]+?\])\}/;
  const examMatch = detailsContent.match(examRe);
  let examPoint = null;
  if (examMatch) {
    const summary = examMatch[1];
    let items = [];
    try {
      // JSX 配列 ["..", "..", ...] を JSON parse
      const cleaned = examMatch[2].replace(/,\s*\]/g, "]");
      items = JSON.parse(cleaned);
    } catch {
      // 単純な引用符 split フォールバック
      items = [...examMatch[2].matchAll(/["']([^"']+)["']/g)].map((x) => x[1]);
    }
    examPoint = { summary, items };
  }

  const management = inferManagement(body);

  return { label, body, options, correct, judgments, examPoint, management };
}

function parseYear(year) {
  const dir = join(POSTS_DIR, `${year}-primary`);
  const mdxPath = join(dir, "article.mdx");
  if (!existsSync(mdxPath)) return null;
  const content = readFileSync(mdxPath, "utf8");

  // 各問題を ^## Ⅰ-N-M で split
  // split で配列: [先頭, label1, body1, label2, body2, ...]
  const blocks = content.split(/^##\s+([ⅠⅡ]-\d+-\d+)\s*$/m);
  // 先頭は frontmatter+導入文を含むので除外
  const questions = [];
  for (let i = 1; i < blocks.length; i += 2) {
    const label = blocks[i];
    const block = blocks[i + 1];
    const num = (i + 1) / 2;
    const q = parseQuestion(label, block);
    questions.push({ id: `${year}-${String(num).padStart(2, "0")}`, ...q });
  }

  // タイトル取得
  const titleMatch = content.match(/^title:\s*(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : `${year} primary`;

  return { year, title, questions };
}

function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");
  const yearArg = args.includes("--year") ? args[args.indexOf("--year") + 1] : null;

  const allDirs = readdirSync(POSTS_DIR).filter((d) => YEAR_PATTERN.test(d));
  const years = allDirs.map((d) => d.replace("-primary", "")).sort();
  const targets = yearArg ? years.filter((y) => y === yearArg) : years;

  console.log(`Parsing years: ${targets.join(", ")}`);

  const result = { generatedAt: new Date().toISOString(), years: [] };
  let totalQ = 0;
  let totalCorrect = 0;
  let totalExamPoint = 0;

  for (const year of targets) {
    const parsed = parseYear(year);
    if (!parsed) continue;
    totalQ += parsed.questions.length;
    totalCorrect += parsed.questions.filter((q) => q.correct).length;
    totalExamPoint += parsed.questions.filter((q) => q.examPoint).length;
    console.log(`  ${year}: ${parsed.questions.length} questions parsed`);
    result.years.push(parsed);
  }

  console.log(`\nSummary:`);
  console.log(`  Years processed: ${result.years.length}`);
  console.log(`  Total questions: ${totalQ}`);
  console.log(`  With correct answer: ${totalCorrect}`);
  console.log(`  With ExamPoint:      ${totalExamPoint}`);

  if (checkOnly) {
    console.log("\n(--check mode: no file written)");
    return;
  }

  writeFileSync(OUTPUT_JSON, JSON.stringify(result, null, 2) + "\n", "utf8");
  console.log(`\n✅ Wrote ${OUTPUT_JSON}`);
}

main();
