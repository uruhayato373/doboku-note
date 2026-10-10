/**
 * 技術士建設部門 BK マガジン模範解答の字数上限チェック（再発防止ゲート）
 *
 * pe-secondary-exam-writer が出荷した模範解答（content/note/技術士建設部門/magazines/BK-*）の
 * 「## フル模範解答」セクション内の各選択肢ブロックを実測し、区分別ハード上限
 * （答案用紙の枚数 × 1 枚の字数。config/pe-answer-sheets.json）超過＝手書きで写しきれない答案を検出する。
 *
 * 字数は日本語に強い code point 数で測る（awk|wc -m は Windows で過小カウントするため使わない）。
 * markdown 記号（# * ` - | [ ] ( ) > 全角/半角空白・tab）を除去した残りを数える。
 *
 * Usage:
 *   node scripts/check-note-charlimits.mjs            # 全 BK マガジンを監査（詳細出力）
 *   node scripts/check-note-charlimits.mjs --staged   # git staged の BK article*.md のみ（pre-commit 用）
 *
 * 終了コード: HARD 上限超過が 1 件でもあれば 1（コミットをブロック）。SKIP_NOTE_CHARLIMITS=1 で回避可。
 * 目標（上限 × targetRatio）超過（ハード上限内）は警告のみ・ブロックしない。
 */
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import { REPO_ROOT, NOTE_CONTENT_ROOT } from "./lib/repository-paths.mjs";
import { listFiles } from "./lib/fs-walk.mjs";
import { readDataset } from "./lib/dataset-io.mjs";

const STAGED = process.argv.includes("--staged");
const MAG_ROOT = path.join(NOTE_CONTENT_ROOT, "技術士建設部門", "magazines");

// exam_type -> [hard, target]（答案用紙の枚数 × 1 枚の字数・目標は上限 × targetRatio）
const SHEETS = readDataset(REPO_ROOT, "config.pe-answer-sheets");
const LIMITS = Object.fromEntries(
  Object.entries(SHEETS.sheets["pe-construction"]).map(([et, n]) => [et, [n * SHEETS.charsPerSheet, Math.round(n * SHEETS.charsPerSheet * SHEETS.targetRatio)]]),
);
const TARGET_PCT = `${Math.round(SHEETS.targetRatio * 100)}%`;

function examTypeFromName(file) {
  const b = path.basename(file);
  if (b === "article.md") return "I";
  if (b === "article-II1.md") return "II-1";
  if (b === "article-II2.md") return "II-2";
  if (b === "article-III.md") return "III";
  return null;
}

function stripCount(s) {
  const cleaned = s.replace(/[#*`\-|\[\]()>　 \t]+/g, "").replace(/\s/g, "");
  return [...cleaned].length;
}

function answerSection(text) {
  const m = text.match(/^##\s+フル模範解答/m);
  if (!m) return null;
  const rest = text.slice(m.index + m[0].length);
  const nx = rest.match(/^##\s/m);
  return nx ? rest.slice(0, nx.index) : rest;
}

function blocks(sec) {
  const out = [];
  const hs = [...sec.matchAll(/^###\s+(.+)$/gm)];
  for (let i = 0; i < hs.length; i++) {
    const b0 = hs[i].index + hs[i][0].length;
    const b1 = i + 1 < hs.length ? hs[i + 1].index : sec.length;
    out.push([hs[i][1].trim(), sec.slice(b0, b1)]);
  }
  return out;
}

// MAG_ROOT 配下の BK-* マガジン（BK-*/<年度>/article*.md の 2 階層）から article*.md を収集（fs.globSync は Node20 非対応）
function walkArticles() {
  return listFiles(MAG_ROOT, {
    allowMissing: true,
    followLinks: true,
    maxDepth: 2,
    match: (p) => {
      const [mag, , file] = path.relative(MAG_ROOT, p).split(path.sep);
      return file !== undefined && mag.startsWith("BK-") && /^article(-II1|-II2|-III)?\.md$/.test(file);
    },
  });
}

function targetFiles() {
  if (STAGED) {
    // -z（NUL 区切り・無クォート）で全 staged を取得し JS でフィルタ。
    // 既定 core.quotePath=true だと日本語パスが \xxx エスケープ出力され existsSync が外すため -z が必須。
    // pathspec グロブ（magazines/*/*/...）も非ASCIIで不安定なので使わず JS の正規表現で絞る。
    let out = "";
    try {
      out = execSync("git -c core.quotepath=false diff --cached --name-only --diff-filter=ACM -z", {
        encoding: "utf-8",
        maxBuffer: 32 * 1024 * 1024,
      });
    } catch {
      return [];
    }
    return out
      .split("\0")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((p) =>
        /(^|\/)content\/note\/技術士建設部門\/magazines\/BK-[^/]+\/[^/]+\/article(-II1|-II2|-III)?\.md$/.test(p)
      )
      .map((p) => path.join(REPO_ROOT, p))
      .filter(existsSync);
  }
  return walkArticles();
}

const tag = "[check-note-charlimits]";

if (process.env.SKIP_NOTE_CHARLIMITS === "1") {
  console.log(`${tag} SKIP_NOTE_CHARLIMITS=1 によりスキップ`);
  process.exit(0);
}

const files = targetFiles();
const hardViol = [];
const targetViol = [];
let scanned = 0;

for (const file of files) {
  const et = examTypeFromName(file);
  if (!et) continue;
  scanned++;
  const [hard, tgt] = LIMITS[et];
  const sec = answerSection(readFileSync(file, "utf-8"));
  if (sec == null) continue;
  const shown = path.relative(REPO_ROOT, file).split(path.sep).join("/");
  for (const [head, body] of blocks(sec)) {
    const n = stripCount(body);
    if (n === 0) continue;
    if (n > hard) hardViol.push({ file: shown, et, head: head.slice(0, 28), n, lim: hard });
    else if (n > tgt) targetViol.push({ file: shown, et, head: head.slice(0, 28), n, lim: tgt });
  }
}

if (STAGED && scanned === 0) process.exit(0);

if (hardViol.length) {
  console.error(`${tag} ✗ HARD 上限超過 ${hardViol.length} 件（手書き不可・要修正）:`);
  for (const v of hardViol.sort((a, b) => b.n - a.n)) {
    console.error(`  ${v.n}字 (>上限${v.lim}) ${v.et} ${v.head}  ${v.file}`);
  }
}

if (!STAGED) {
  console.log(`${tag} 走査 ${scanned} ファイル / HARD超過 ${hardViol.length} / ${TARGET_PCT}目標超過 ${targetViol.length}`);
  if (targetViol.length) {
    console.log(`${tag} （参考）${TARGET_PCT}目標超過だがハード上限内＝手書き可・非ブロック ${targetViol.length} 件`);
  }
} else if (targetViol.length) {
  console.log(`${tag} 参考: ${TARGET_PCT}目標超過 ${targetViol.length} 件（ハード上限内・非ブロック）`);
}

if (hardViol.length) {
  console.error(`${tag} 区分別ハード上限: ${Object.entries(LIMITS).map(([et, [hard]]) => `${et}=${hard}`).join(" / ")} 字。冗長表現を削って上限内に（SKIP_NOTE_CHARLIMITS=1 で緊急回避可）。`);
  process.exit(1);
}

if (!STAGED) console.log(`${tag} ✓ HARD 上限超過なし`);
process.exit(0);
