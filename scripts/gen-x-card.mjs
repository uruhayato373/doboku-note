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

function parseTweetsFile(content) {
  const blocks = content.split(/^## Tweet /m).filter((_, i) => i > 0);
  return blocks
    .map((block) => {
      const lines = block.split("\n");
      const headerMatch = lines[0].match(/^(\d+):\s*(.+)/);
      if (!headerMatch) return null;

      const num = parseInt(headerMatch[1]);
      const sectionTitle = headerMatch[2].trim();

      // 管理分野をハッシュタグから検出
      const hashtagLine = lines
        .filter((l) => /^#[^\d]/.test(l.trim()))
        .join(" ");
      let category = null;
      for (const cat of Object.keys(CATEGORY_COLORS)) {
        if (hashtagLine.includes(cat)) {
          category = cat;
          break;
        }
      }

      // キーワード名を 【総監キーワード解説】<名前> #N パターンから抽出
      const allText = lines.join("\n");
      let keywordName = "";
      const kwMatch = allText.match(/【総監キーワード解説】(.+?) ?#\d+/);
      if (kwMatch) keywordName = kwMatch[1].trim();

      // 本文コンテンツ（先頭ヘッダ行・URL・ハッシュタグ・区切り線を除外）
      const contentLines = lines.slice(1).filter((l) => {
        const t = l.trim();
        if (!t) return false;
        if (t === "---") return false;
        if (/^【総監/.test(t)) return false;
        if (/^#[^\d]/.test(t)) return false;
        if (/^https?:\/\//.test(t)) return false;
        if (/^(解説|詳しい解説|全解説) →/.test(t)) return false;
        return true;
      });

      return { num, sectionTitle, keywordName, category, contentLines };
    })
    .filter(Boolean);
}

// ─── SVG 生成 ────────────────────────────────────────────────────────────────

function buildSvg({ num, sectionTitle, keywordName, category, contentLines }) {
  const { bg, fill } = CATEGORY_COLORS[category] || DEFAULT_COLORS;
  const catLabel = category || "総合技術監理";
  const badgeW = Math.max(100, catLabel.length * 23 + 40);
  const badgeX = 1160 - badgeW;

  const CONTENT_START_Y = 252;
  const MAX_CONTENT_Y = 612;
  const LINE_HEIGHT = 38;

  const tspans = [];
  let currentY = CONTENT_START_Y;
  let first = true;

  for (const line of contentLines.slice(0, 8)) {
    if (currentY > MAX_CONTENT_Y) break;
    for (const wline of wrapJa(line)) {
      if (currentY > MAX_CONTENT_Y) break;
      if (first) {
        tspans.push(
          `<tspan x="60" y="${currentY}">${escapeXml(wline)}</tspan>`
        );
        first = false;
      } else {
        tspans.push(
          `<tspan x="60" dy="${LINE_HEIGHT}">${escapeXml(wline)}</tspan>`
        );
      }
      currentY += LINE_HEIGHT;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <!-- Background -->
  <rect width="1200" height="675" fill="${fill}"/>

  <!-- Header band -->
  <rect width="1200" height="80" fill="${bg}"/>
  <text x="40" y="40" font-family="${FONT}" font-size="28" font-weight="700" fill="white" dominant-baseline="middle">総監キーワード解説 #${num}</text>

  <!-- Category badge -->
  <rect x="${badgeX}" y="18" width="${badgeW}" height="44" rx="22" fill="white"/>
  <text x="${badgeX + Math.round(badgeW / 2)}" y="40" font-family="${FONT}" font-size="21" font-weight="700" fill="${bg}" text-anchor="middle" dominant-baseline="middle">${escapeXml(catLabel)}</text>

  <!-- Keyword name -->
  <text x="60" y="148" font-family="${FONT}" font-size="44" font-weight="800" fill="#222222">${escapeXml(keywordName)}</text>

  <!-- Section title -->
  <text x="60" y="194" font-family="${FONT}" font-size="28" font-weight="400" fill="#555555">${escapeXml(sectionTitle)}</text>

  <!-- Divider -->
  <line x1="60" y1="212" x2="1140" y2="212" stroke="${bg}" stroke-width="2" opacity="0.35"/>

  <!-- Content lines -->
  <text font-family="${FONT}" font-size="27" fill="#333333">${tspans.join("")}</text>

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

  const content = readFileSync(tweetsPath, "utf8");
  const tweets = parseTweetsFile(content);

  console.log(`\n📁 ${name} (${tweets.length} tweets, slug: ${slug})`);

  for (const tweet of tweets) {
    const nn = String(tweet.num).padStart(2, "0");
    const pngPath = join(imgDir, `tweet-${nn}-${slug}.png`);
    if (existsSync(pngPath) && !force) {
      console.log(`  ⏭  ${nn} 既存スキップ`);
      continue;
    }
    const svg = buildSvg(tweet);
    await sharp(Buffer.from(svg)).png().toFile(pngPath);
    console.log(`  ✅ ${nn} → tweet-${nn}-${slug}.png`);
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
