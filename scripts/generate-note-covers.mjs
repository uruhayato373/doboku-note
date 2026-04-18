#!/usr/bin/env node
// docs/note-drafts 配下の各ディレクトリに img/cover.png を生成する。
//
// note.com のカバー画像（推奨 1280x670）を、ブランドトークンに合わせて統一デザインで出力する。
// 各記事の article.md の H1 を基に、フック(【...】) / メイン / サブ(｜以降) に分解して配置。
//
// 使い方:
//   node scripts/generate-note-covers.mjs
//   node scripts/generate-note-covers.mjs 02-一般部門との違い   # 1件だけ生成
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DRAFTS_DIR = join(ROOT, 'docs/note-drafts');

const W = 1280;
const H = 670;
// ブランドトークン（src/styles/globals.css と整合）
const BRAND = '#2e6da4';
const BRAND_FILL = '#e8f0fe';
const BRAND_DEEP = '#1a3a5c';
const INK_STRONG = '#222222';
const INK_BODY = '#555555';
const FONT = 'Hiragino Sans, Hiragino Kaku Gothic ProN, Yu Gothic, Noto Sans JP, sans-serif';

function xml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** 日本語テキストを最大文字数で折り返し */
function wrap(text, maxChar) {
  const lines = [];
  let cur = '';
  for (const ch of text) {
    if (cur.length >= maxChar) {
      lines.push(cur);
      cur = '';
    }
    cur += ch;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** H1 からフック・メイン・サブを抽出 */
function parseTitle(h1) {
  const raw = h1.replace(/^#\s+/, '').trim();
  const hookMatch = raw.match(/^【([^】]+)】(.+)$/);
  const hook = hookMatch ? hookMatch[1] : null;
  const rest = hookMatch ? hookMatch[2] : raw;
  const [mainRaw, ...subParts] = rest.split('｜');
  const main = mainRaw.trim();
  const sub = subParts.join('｜').trim() || null;
  return { hook, main, sub };
}

function makeSvg({ hook, main, sub, tag = '技術士 総合技術監理部門' }) {
  // コンテンツエリア: y=100（ブランドバンド下）〜 y=600（フッター手前、下アクセント用余白）
  const AREA_TOP = 100;
  const AREA_BOTTOM = 600;
  const AREA_CENTER = (AREA_TOP + AREA_BOTTOM) / 2;  // 350

  // 折り返し: 2〜3行に収めるため、文字数に応じて改行幅を動的調整
  const mainMax = main.length > 28 ? 15 : main.length > 18 ? 16 : 17;
  const mainLines = wrap(main, mainMax);
  const subLines = sub ? wrap(sub, 32) : [];

  const mainSize = mainLines.length >= 3 ? 54 : mainLines.length === 2 ? 64 : 72;
  const mainLH = mainSize + 16;
  const hookH = hook ? 56 : 0;
  const hookGap = hook ? 26 : 0;
  const subSize = 26;
  const subLH = subSize + 10;
  const subGap = subLines.length ? 44 : 0;

  const mainH = mainLines.length * mainLH - 16;
  const subH = subLines.length * subLH - 10;
  const totalH = hookH + hookGap + mainH + subGap + subH;

  const blockTop = AREA_CENTER - totalH / 2;
  const hookY = blockTop;
  const mainTop = hookY + hookH + hookGap + mainSize;
  const subTop = mainTop + (mainLines.length - 1) * mainLH + subGap + subSize;

  const hookWidth = hook ? Math.min(hook.length * 28 + 48, W - 120) : 0;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <!-- 背景 -->
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <!-- 上部ブランドバンド -->
  <rect width="${W}" height="90" fill="${BRAND_FILL}"/>
  <!-- 左縦アクセント -->
  <rect x="0" y="0" width="14" height="${H}" fill="${BRAND}"/>
  <!-- 下部アクセントゾーン（装飾） -->
  <rect x="0" y="${H - 60}" width="${W}" height="60" fill="${BRAND_FILL}"/>
  <rect x="0" y="${H - 6}" width="${W}" height="6" fill="${BRAND}"/>

  <!-- ブランド名 -->
  <text x="60" y="58" font-family="${FONT}" font-size="28" font-weight="700" fill="${BRAND_DEEP}">doboku-note</text>
  <!-- カテゴリタグ -->
  <text x="${W - 60}" y="58" font-family="${FONT}" font-size="20" font-weight="600" fill="${BRAND}" text-anchor="end">${xml(tag)}</text>

  ${hook ? `
  <!-- フック -->
  <rect x="60" y="${hookY}" width="${hookWidth}" height="${hookH}" rx="6" fill="${BRAND}"/>
  <text x="${60 + 24}" y="${hookY + hookH - 18}" font-family="${FONT}" font-size="24" font-weight="700" fill="#ffffff">${xml(hook)}</text>
  ` : ''}

  <!-- メインタイトル -->
  ${mainLines.map((line, i) => `
  <text x="60" y="${mainTop + i * mainLH}" font-family="${FONT}" font-size="${mainSize}" font-weight="800" fill="${INK_STRONG}" letter-spacing="-1">${xml(line)}</text>`).join('')}

  <!-- サブタイトル -->
  ${subLines.map((line, i) => `
  <text x="60" y="${subTop + i * subLH}" font-family="${FONT}" font-size="${subSize}" font-weight="500" fill="${INK_BODY}">${xml(line)}</text>`).join('')}

  <!-- 下部装飾: URL -->
  <text x="${W / 2}" y="${H - 22}" font-family="${FONT}" font-size="18" font-weight="500" fill="${BRAND_DEEP}" text-anchor="middle">doboku-note.com</text>
</svg>`;
}

async function renderCover(dirName) {
  const dir = join(DRAFTS_DIR, dirName);
  const articlePath = join(dir, 'article.md');
  if (!existsSync(articlePath)) {
    console.warn(`  skip: article.md not found in ${dirName}`);
    return;
  }
  const content = readFileSync(articlePath, 'utf-8');
  const h1 = content.split('\n').find((l) => l.startsWith('# '));
  if (!h1) {
    console.warn(`  skip: no H1 in ${dirName}`);
    return;
  }
  const parsed = parseTitle(h1);
  const svg = makeSvg(parsed);

  const imgDir = join(dir, 'img');
  mkdirSync(imgDir, { recursive: true });
  const svgPath = join(imgDir, 'cover.svg');
  const pngPath = join(imgDir, 'cover.png');
  writeFileSync(svgPath, svg);
  await sharp(Buffer.from(svg)).png().toFile(pngPath);
  console.log(`  ok: ${dirName}`);
}

async function main() {
  const target = process.argv[2];
  const dirs = readdirSync(DRAFTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((n) => !target || n === target);

  if (dirs.length === 0) {
    console.error('no draft directories found');
    process.exit(1);
  }

  console.log(`Generating covers for ${dirs.length} draft(s)...`);
  for (const d of dirs) {
    await renderCover(d);
  }
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
