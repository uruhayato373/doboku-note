#!/usr/bin/env node
/**
 * gen-x-card.mjs
 *
 * tweets.md から X 投稿用サマリカード PNG（1200×675）を生成する。
 * 管理分野ハッシュタグを自動検出して色分けし、本文冒頭を表示。
 *
 * Usage:
 *   node scripts/gen-x-card.mjs --draft 019
 *   node scripts/gen-x-card.mjs --range 019-028
 *   node scripts/gen-x-card.mjs --all
 *   node scripts/gen-x-card.mjs --draft 019 --force   # 既存上書き
 */

import { readFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
// 試験色の真実源は note-cover-tokens.json（exam-palette 経由）。ここで hex を直書きすると
// note カバー・IG・Shorts と色がずれる（x-post-policy §7 は tokens を真実源と定める）。
import { examColor } from "../.claude/scripts/sns/lib/exam-palette.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const DRAFTS_DIR = join(PROJECT_ROOT, "docs/sns/x/draft");

const FONT =
  "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Noto Sans JP', sans-serif";

const CATEGORY_COLORS = {
  経済性管理: { bg: "#2e6da4", fill: "#e8f0fe" },
  安全管理: { bg: "#b22234", fill: "#fbeaea" },
  品質管理: { bg: "#3a7d44", fill: "#eaf3ea" },
  情報管理: { bg: "#d4a017", fill: "#fdf6e0" },
  人的資源管理: { bg: "#6b4c9a", fill: "#f0ebf8" },
};
const DEFAULT_COLORS = { bg: "#2e6da4", fill: "#e8f0fe" };

// 試験別カード設定（多資格）。総監は従来どおり管理分野色＋「総監キーワード解説」。
// それ以外は試験色固定。**色は hex を書かず exam-palette（tokens.exams）から解決する**
// （x-post-policy.md §7 が tokens を真実源と定めるため。従来の直書き値 civil-1 #155293 /
// civil-2 #1c5038 は tokens の deep と同値なので、移行しても出力は変わらない）。
// fill は各試験色の淡色。tokens に淡色系の枠が無いので、deep から算出せず明示定義する。
const EXAM_FILL = {
  "civil-1": "#e7f0fa",
  "civil-2": "#e8f3ec",
  "concrete-chief": "#e4f1f1",
  "concrete-diagnosis": "#f0e9f5",
  "pe-construction": "#e9eaf3",
};
const examColors = (slug) => ({ bg: examColor(slug, "deep").use, fill: EXAM_FILL[slug] });

const EXAM_CONFIG = {
  "pe-comprehensive": { headerLabel: "総監キーワード解説", titleRe: /【総監キーワード解説】(.+?) ?#\d+/, badge: null, colors: null },
  "civil-1": { headerLabel: "1級土木 過去問", titleRe: /【1級土木 過去問】(.+?) ?#\d+/, badge: "1級土木", colors: examColors("civil-1") },
  "civil-2": { headerLabel: "2級土木 過去問", titleRe: /【2級土木 過去問】(.+?) ?#\d+/, badge: "2級土木", colors: examColors("civil-2") },
  // 正式名称は「コンクリート主任技士」（技師ではない）。exam-calendar.json の policy 参照。
  "concrete-chief": { headerLabel: "コンクリート主任技士", titleRe: /【コンクリート主任技士】(.+?) ?#\d+/, badge: "主任技士", colors: examColors("concrete-chief") },
  "concrete-diagnosis": { headerLabel: "コンクリート診断士", titleRe: /【コンクリート診断士】(.+?) ?#\d+/, badge: "診断士", colors: examColors("concrete-diagnosis") },
  "pe-construction": { headerLabel: "技術士 建設部門", titleRe: /【技術士 建設部門】(.+?) ?#\d+/, badge: "建設部門", colors: examColors("pe-construction") },
};

// 試験の判定。フォルダ名とツイート見出しの両方に効くよう、slug 形（civil-1 / concrete-chief）と
// 日本語名（1級 / コンクリート主任技士）の双方を拾う。より限定的なものを先に置く。
// **未知を黙って総監にしない**（2026-08-13 まで concrete/建設部門のドラフトが総監カードとして
// 誤生成されていた＝別資格の色のまま出る事故）。
const EXAM_PATTERNS = [
  ["concrete-chief", /concrete-chief|コンクリート主任技[士師]|主任技[士師]/],
  ["concrete-diagnosis", /concrete-diag|コンクリート診断士|診断士/],
  ["pe-construction", /pe-construction|pe-const|建設部門/],
  ["pe-comprehensive", /pe-comprehensive|sokan|総監|総合技術監理/],
  // 数字の直後を除く。除かないと "083-civil-2026-08" の年号が civil-2 に誤マッチする（実見）。
  ["civil-1", /-civil1-|civil-1(?!\d)|1級/],
  ["civil-2", /-civil2-|civil-2(?!\d)|2級/],
];
/** 判定できたら slug、できなければ null（警告しない） */
function matchExam(text) {
  for (const [slug, re] of EXAM_PATTERNS) if (re.test(text)) return slug;
  return null;
}
/** フォルダ既定の試験。判定不能なら総監へフォールバックしたうえで WARN を出す */
function detectExam(folderName) {
  const hit = matchExam(folderName);
  if (hit) return hit;
  console.warn(`  ⚠ 試験を判定できないフォルダ "${folderName}" → 既定は総監。`);
  console.warn(`     ツイート見出しに資格が書かれていればそちらを優先します（1ツイート単位で判定）。`);
  console.warn(`     見出しにも無い場合は総監色で出るので、フォルダ名か見出しに識別子を入れてください`);
  console.warn(`     （例: -civil1- / -concrete-chief- / -pe-construction-）`);
  return "pe-comprehensive";
}

// ─── テキスト処理 ────────────────────────────────────────────────────────────

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// sns-image-policy §5 に準拠（lookback 12文字、force-break +4）
function wrapJa(text, maxChars = 32) {
  const breakChars = /[、。！？「」『』（）\s→\/]/;
  const lines = [];
  let cur = "";
  for (const ch of text) {
    cur += ch;
    if (cur.length >= maxChars) {
      let breakIdx = -1;
      for (let i = cur.length - 1; i >= Math.max(0, cur.length - 12); i--) {
        if (breakChars.test(cur[i])) {
          breakIdx = i;
          break;
        }
      }
      if (breakIdx !== -1) {
        lines.push(cur.slice(0, breakIdx + 1).trimEnd());
        cur = cur.slice(breakIdx + 1);
      } else if (cur.length >= maxChars + 4) {
        lines.push(cur.slice(0, maxChars));
        cur = cur.slice(maxChars);
      }
    }
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines.length ? lines : [text];
}

// ─── tweets.md パース ────────────────────────────────────────────────────────

function parseTweetsFile(content, folderExam = "pe-comprehensive") {
  const blocks = content.split(/^## Tweet /m).filter((_, i) => i > 0);
  return blocks
    .map((rawBlock) => {
      // tweets.md は制作メモを HTML コメントで書く運用（例: 082 の「転用した勝ち型」）。
      // 除去しないとカード本文へ流れ、内部メモを載せた画像を公開する事故になる（2026-08-13 実見）。
      // 閉じ忘れにも耐えるよう、ブロック単位の除去に加えて行頭 <!-- 以降も落とす。
      const block = rawBlock.replace(/<!--[\s\S]*?-->/g, "").replace(/^\s*<!--[\s\S]*$/m, "");
      const lines = block.split("\n");
      const headerMatch = lines[0].match(/^(\d+):\s*(.+)/);
      if (!headerMatch) return null;

      const num = parseInt(headerMatch[1]);
      const sectionTitle = headerMatch[2].trim();

      // 1日3本体制では1ドラフトに複数資格が混ざる（例: 朝=1級・昼=主任技士・夜=総監）。
      // 資格は**ツイート見出し単位**で判定し、書かれていなければフォルダ既定を使う。
      // フォルダ単位のままだと混在ドラフトが全部1色になり、別資格の色で出てしまう。
      const exam = matchExam(sectionTitle) || folderExam;
      const cfg = EXAM_CONFIG[exam] || EXAM_CONFIG["pe-comprehensive"];

      // 管理分野をハッシュタグから検出（総監のみ。1級/2級は試験色固定）
      let category = null;
      if (exam === "pe-comprehensive") {
        const hashtagLine = lines.filter((l) => /^#[^\d]/.test(l.trim())).join(" ");
        for (const cat of Object.keys(CATEGORY_COLORS)) {
          if (hashtagLine.includes(cat)) { category = cat; break; }
        }
      }

      // 主題（キーワード名/問題主題）を試験別ヘッダパターンから抽出
      const allText = lines.join("\n");
      let keywordName = "";
      const kwMatch = allText.match(cfg.titleRe);
      if (kwMatch) keywordName = kwMatch[1].trim();
      if (!keywordName && exam !== "pe-comprehensive") {
        keywordName = sectionTitle
          .replace(/[（(][^）)]*[）)]\s*$/, "")
          .split("・")[0]
          .trim();
      }
      const headerLabel =
        exam !== "pe-comprehensive" && !kwMatch && allText.includes("#経験記述")
          ? `${cfg.badge} 経験記述`
          : cfg.headerLabel;
      const displaySectionTitle =
        exam !== "pe-comprehensive" && allText.includes("#経験記述")
          ? "施工経験記述のコツ"
          : sectionTitle.replace(/\s*[（(][^）)]*[）)]\s*$/, "");

      // 本文コンテンツ（先頭ヘッダ行・URL・ハッシュタグ・区切り線を除外）
      const contentLines = lines.slice(1).filter((l) => {
        const t = l.trim();
        if (!t) return false;
        if (t === "---") return false;
        if (/^【/.test(t)) return false; // 試験ラベル行（【…】）を除外
        if (/^#/.test(t)) return false;
        if (/^https?:\/\//.test(t)) return false;
        if (/^(解説|詳しい解説|全解説) →/.test(t)) return false;
        return true;
      });
      if (exam !== "pe-comprehensive" && contentLines[0]) {
        const firstSentence = contentLines[0].split("。")[0];
        const focusMatch =
          firstSentence.match(/最初に迷うのが(.+)$/) ||
          firstSentence.match(/、(.+?)と感じる人/) ||
          firstSentence.match(/覚える枠は(.+)$/);
        if (focusMatch) keywordName = focusMatch[1].replace(/[「」]/g, "").trim();
      }

      return {
        num,
        sectionTitle: displaySectionTitle,
        keywordName,
        category,
        contentLines,
        exam,
        headerLabel,
      };
    })
    .filter(Boolean);
}

// ─── SVG 生成 ────────────────────────────────────────────────────────────────

function buildSvg({ num, sectionTitle, keywordName, category, contentLines, exam = "pe-comprehensive", headerLabel: parsedHeaderLabel }) {
  const cfg = EXAM_CONFIG[exam] || EXAM_CONFIG["pe-comprehensive"];
  // 1級/2級は試験色固定、総監は管理分野色（無ければデフォルト）
  const { bg, fill } = cfg.colors || CATEGORY_COLORS[category] || DEFAULT_COLORS;
  const headerLabel = parsedHeaderLabel || cfg.headerLabel;
  const catLabel = cfg.badge || category || "総合技術監理";
  const badgeW = Math.max(100, catLabel.length * 23 + 40);
  const badgeX = 1160 - badgeW;

  // 「総監以外レイアウト」の意（大きめ本文＋白パネル）。命名は土木2資格しか無かった頃の名残で、
  // 現在はコンクリート2資格・建設部門もこちらを使う。
  const isCivil = exam !== "pe-comprehensive";
  const bodySize = isCivil ? 35 : 27;
  const lineHeight = isCivil ? 49 : 38;
  const maxChars = isCivil ? 27 : 32;
  const maxLines = isCivil ? 6 : 10;
  const wrappedLines = contentLines
    .slice(0, 8)
    .flatMap((line) => wrapJa(line, maxChars))
    .slice(0, maxLines);
  const panelTop = 232;
  const panelBottom = 600;
  const textBlockHeight = Math.max(bodySize, wrappedLines.length * lineHeight);
  const contentStartY = isCivil
    ? Math.round(panelTop + (panelBottom - panelTop - textBlockHeight) / 2 + bodySize)
    : 252;
  const tspans = wrappedLines.map((line, index) =>
    index === 0
      ? `<tspan x="${isCivil ? 82 : 60}" y="${contentStartY}">${escapeXml(line)}</tspan>`
      : `<tspan x="${isCivil ? 82 : 60}" dy="${lineHeight}">${escapeXml(line)}</tspan>`
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <!-- Background -->
  <rect width="1200" height="675" fill="${fill}"/>

  <!-- Header band -->
  <rect width="1200" height="80" fill="${bg}"/>
  <text x="40" y="40" font-family="${FONT}" font-size="28" font-weight="700" fill="white" dominant-baseline="middle">${escapeXml(headerLabel)} #${num}</text>

  <!-- Category badge -->
  <rect x="${badgeX}" y="18" width="${badgeW}" height="44" rx="22" fill="white"/>
  <text x="${badgeX + Math.round(badgeW / 2)}" y="40" font-family="${FONT}" font-size="21" font-weight="700" fill="${bg}" text-anchor="middle" dominant-baseline="middle">${escapeXml(catLabel)}</text>

  <!-- Keyword name -->
  <text x="60" y="148" font-family="${FONT}" font-size="${isCivil ? 52 : 44}" font-weight="800" fill="#222222">${escapeXml(keywordName)}</text>

  <!-- Section title -->
  <text x="60" y="194" font-family="${FONT}" font-size="28" font-weight="400" fill="#555555">${escapeXml(sectionTitle)}</text>

  <!-- Divider -->
  <line x1="60" y1="212" x2="1140" y2="212" stroke="${bg}" stroke-width="2" opacity="0.35"/>

  ${isCivil ? `<rect x="60" y="${panelTop}" width="1080" height="${panelBottom - panelTop}" rx="22" fill="white" opacity="0.58"/>` : ""}

  <!-- Content lines -->
  <text font-family="${FONT}" font-size="${bodySize}" font-weight="${isCivil ? 600 : 400}" fill="#333333">${tspans.join("")}</text>

  <!-- Footer band -->
  <rect y="625" width="1200" height="50" fill="${bg}"/>
  <text x="600" y="650" font-family="${FONT}" font-size="22" font-weight="700" fill="white" text-anchor="middle" dominant-baseline="middle">doboku-note.com</text>
</svg>`;
}

// ─── ディレクトリ解決 ─────────────────────────────────────────────────────────

function resolveDraft(draftId) {
  const padded = String(parseInt(draftId, 10)).padStart(3, "0");
  const entries = readdirSync(DRAFTS_DIR);
  const match = entries.find((e) => e.startsWith(padded + "-"));
  if (!match) throw new Error(`Draft not found: ${draftId} (padded: ${padded})`);
  return { dir: join(DRAFTS_DIR, match), name: match };
}

function extractSlug(folderName) {
  const parts = folderName.split("-");
  const kwIdx = parts.findIndex(
    (p) => p === "キーワード" || p === "スレッド" || p === "クイズ"
  );
  if (kwIdx !== -1 && kwIdx < parts.length - 1) {
    return parts.slice(kwIdx + 1).join("-");
  }
  return parts.slice(2).join("-");
}

// ─── 生成実行 ────────────────────────────────────────────────────────────────

async function generateForDraft(draftId, force = false) {
  const { dir, name } = resolveDraft(draftId);
  const tweetsPath = join(dir, "tweets.md");
  if (!existsSync(tweetsPath)) {
    console.log(`  ⚠️  tweets.md not found: ${dir}`);
    return;
  }

  const slug = extractSlug(name);
  const imgDir = join(dir, "img");
  mkdirSync(imgDir, { recursive: true });

  const exam = detectExam(name);
  const content = readFileSync(tweetsPath, "utf8");
  const tweets = parseTweetsFile(content, exam);

  console.log(`\n📁 ${name} (${tweets.length} tweets, slug: ${slug}, exam: ${exam})`);

  for (const tweet of tweets) {
    const nn = String(tweet.num).padStart(2, "0");
    const existingName = readdirSync(imgDir)
      .filter((name) => name.startsWith(`tweet-${nn}-`) && name.endsWith(".png"))
      .sort()[0];
    const outputName = existingName || `tweet-${nn}-${slug}.png`;
    const pngPath = join(imgDir, outputName);
    if (existsSync(pngPath) && !force) {
      console.log(`  ⏭  ${nn} 既存スキップ`);
      continue;
    }
    const svg = buildSvg(tweet);
    await sharp(Buffer.from(svg)).png().toFile(pngPath);
    console.log(`  ✅ ${nn} → ${outputName}`);
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");

  const draftIdx = args.findIndex((a) => a === "--draft");
  const rangeIdx = args.findIndex((a) => a === "--range");
  const allFlag = args.includes("--all");

  if (draftIdx !== -1) {
    await generateForDraft(args[draftIdx + 1], force);
  } else if (rangeIdx !== -1) {
    const range = args[rangeIdx + 1];
    const nums = range.match(/\d+/g);
    if (nums && nums.length >= 2) {
      const s = parseInt(nums[0], 10);
      const e = parseInt(nums[1], 10);
      for (let i = s; i <= e; i++) {
        const id = String(i).padStart(3, "0");
        await generateForDraft(id, force).catch((err) =>
          console.warn(`  ⚠️  ${id}: ${err.message}`)
        );
      }
    }
  } else if (allFlag) {
    const dirs = readdirSync(DRAFTS_DIR).filter((e) =>
      /^\d{3}-キーワード-/.test(e)
    );
    for (const d of dirs) {
      await generateForDraft(d.slice(0, 3), force).catch((err) =>
        console.warn(`  ⚠️  ${d}: ${err.message}`)
      );
    }
  } else {
    console.log("Usage:");
    console.log("  node scripts/gen-x-card.mjs --draft 019");
    console.log("  node scripts/gen-x-card.mjs --range 019-028");
    console.log("  node scripts/gen-x-card.mjs --all");
    console.log("  --force   既存 PNG を上書き");
  }

  console.log("\n✨ 完了");
}

main().catch(console.error);
