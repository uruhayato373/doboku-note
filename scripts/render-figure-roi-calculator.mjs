#!/usr/bin/env node
// docs/note/技術士総監/総監受験は投資としてペイするか/img/ に本文用 PNG/SVG 図版を生成する。
//
// figure-1-roi-by-age: 「年代別 投資回収シミュレーション — 30代/40代/50代で総監はペイするか」
//   - 前提カード 1 枚（brand-fill 背景）
//   - 年代別カード 3 枚を縦に積む
//   - 左: 年代ラベル / 中央: コスト→回収→累積リターン / 右: 評価バッジ
//
// 設計ルール（.claude/knowledge/reference/note-svg-policy.md 準拠）:
//   - キャンバス幅 1200、高さ 920 固定（末尾余白 80px 確保）
//   - フォント ≥ 18px（補足含む）
//   - タイトル下 40px → コンテンツ開始
//   - カード間隙間 24px、カード内パディング 20px 以上
//   - 色トークン（src/styles/globals.css と整合）のみ使用
//   - 識別は右下 doboku-note.com テキストのみ
//
// 使い方:
//   node scripts/render-figure-roi-calculator.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'docs/note/技術士総監/総監受験は投資としてペイするか/img');
mkdirSync(OUT_DIR, { recursive: true });

// ブランドトークン（src/styles/globals.css と整合）
const BRAND        = '#2e6da4'; // brand
const BRAND_FILL   = '#e8f0fe'; // brand-fill
const BRAND_DEEP   = '#1a3a5c'; // brand-deep
const INK_STRONG   = '#222222'; // ink-strong
const INK_BODY     = '#555555'; // ink-body
const INK_MUTED    = '#8a8a8a'; // ink-muted
const POSITIVE     = '#3a7d44'; // positive
const POSITIVE_FILL = '#e6f1e8';
const WARN         = '#c87e1e'; // warn（タスク指定の hex）
const WARN_FILL    = '#fdf2e0';
const FONT = 'Hiragino Sans, Hiragino Kaku Gothic ProN, Yu Gothic, Noto Sans JP, sans-serif';

const W = 1200;
const H = 920;

function xml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 右下 doboku-note.com ブランディング */
function brandMark() {
  return `  <text x="${W - 28}" y="${H - 22}" font-family="${FONT}" font-size="18" font-weight="500" fill="${INK_MUTED}" text-anchor="end">doboku-note.com</text>`;
}

// ------------------------------------------------------------------
// 図 1: 年代別 投資回収シミュレーション
// ------------------------------------------------------------------
function svgRoiByAge() {
  const PAD_X   = 60;   // 左右キャンバスマージン
  const RX      = 8;    // 角丸

  // ---- タイトル領域（Y: 30〜130） ----
  const TITLE_Y    = 72;   // メインタイトルベースライン
  const SUBTITLE_Y = 112;  // サブタイトルベースライン

  // ---- 前提カード（Y: 150〜240） ----
  const PREM_Y  = 150;
  const PREM_H  = 90;
  const PREM_W  = W - 2 * PAD_X; // 1080
  const PREM_TX = PAD_X + 24;    // テキスト開始X
  const PREM_TY = PREM_Y + 56;   // テキストベースライン（カード垂直中央）

  // ---- 年代別カード（Y: 280〜850） ----
  const CARD_TOP  = 280;
  const CARD_W    = W - 2 * PAD_X; // 1080
  const CARD_H    = 170;
  const CARD_GAP  = 24;

  // 左ラベルゾーン幅
  const LABEL_ZONE_W = 160;
  // 右評価ゾーン幅
  const EVAL_ZONE_W  = 240;
  // 中央ゾーン: カード幅 - LABEL_ZONE_W - EVAL_ZONE_W - 3つのパッド(24×3)
  const CENTER_X     = PAD_X + LABEL_ZONE_W + 24; // 中央ゾーン開始X
  const CENTER_W     = CARD_W - LABEL_ZONE_W - EVAL_ZONE_W - 24 * 3; // 中央テキスト幅
  const EVAL_X       = PAD_X + CARD_W - EVAL_ZONE_W - 16; // 評価ゾーン開始X

  const cards = [
    {
      age: '30 代',
      remaining: '残り 30 年',
      main: 'コスト ¥76 万  →  2 年目で回収',
      sub: '30 年で累計 ¥1,105 万（一時金 ＋ 手当）',
      eval: '◎ ペイする',
      cardBg: POSITIVE_FILL,
      cardStroke: POSITIVE,
      labelFill: BRAND_DEEP,
      evalFill: POSITIVE,
    },
    {
      age: '40 代',
      remaining: '残り 20 年',
      main: 'コスト ¥76 万  →  2 年目で回収',
      sub: '20 年で累計 ¥745 万（一時金 ＋ 手当）',
      eval: '○ ペイする',
      cardBg: POSITIVE_FILL,
      cardStroke: POSITIVE,
      labelFill: BRAND_DEEP,
      evalFill: POSITIVE,
    },
    {
      age: '50 代',
      remaining: '残り 10 年',
      main: 'コスト ¥76 万  →  2 年目で回収',
      sub: '10 年で累計 ¥385 万 ＋ 定年後プレミアム',
      eval: '△ 定年後で逆転',
      cardBg: WARN_FILL,
      cardStroke: WARN,
      labelFill: '#8c5a14',
      evalFill: WARN,
    },
  ];

  let body = '';

  // ---- タイトル ----
  body += `
  <!-- タイトル -->
  <text x="${W / 2}" y="${TITLE_Y}" font-family="${FONT}" font-size="36" font-weight="800" fill="${INK_STRONG}" text-anchor="middle">年代別 投資回収シミュレーション</text>
  <text x="${W / 2}" y="${SUBTITLE_Y}" font-family="${FONT}" font-size="22" font-weight="400" fill="${INK_BODY}" text-anchor="middle">コスト 76 万円（学習時間 200h × 時給 3,500 円 + 受験料 ¥20,500 + 参考書代 5 万円）の前提</text>
`;

  // ---- 前提カード ----
  body += `
  <!-- 前提カード -->
  <rect x="${PAD_X}" y="${PREM_Y}" width="${PREM_W}" height="${PREM_H}" rx="${RX}" fill="${BRAND_FILL}" stroke="${BRAND}" stroke-width="3"/>
  <!-- 左アクセントバー -->
  <rect x="${PAD_X}" y="${PREM_Y}" width="6" height="${PREM_H}" rx="3" fill="${BRAND}"/>
  <text x="${PREM_TX + 12}" y="${PREM_TY}" font-family="${FONT}" font-size="24" font-weight="700" fill="${BRAND_DEEP}" text-anchor="start">前提：月手当 ¥3 万（建コン中堅） / 合格一時金 ¥25 万 / 年間リターン ¥36 万</text>
`;

  // ---- 年代別カード ----
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const cardX = PAD_X;
    const cardY = CARD_TOP + i * (CARD_H + CARD_GAP);
    const cardCY = cardY + CARD_H / 2;

    // 左ラベル（年代・勤続年数）
    const labelCX   = cardX + LABEL_ZONE_W / 2;
    const ageLabelY = cardCY - 12; // 年代テキストベースライン（上寄り）
    const remLabelY = cardCY + 28; // 勤続テキストベースライン（下寄り）

    // 中央テキスト
    const mainTextY = cardCY - 8;  // メイン行ベースライン（上寄り）
    const subTextY  = cardCY + 30; // サブ行ベースライン（下寄り）

    // 右評価バッジ
    const evalBadgeW = EVAL_ZONE_W - 16;
    const evalBadgeH = 54;
    const evalBadgeX = EVAL_X + 8;
    const evalBadgeY = cardCY - evalBadgeH / 2;
    const evalTextY  = cardCY + 11; // バッジ内テキストベースライン

    body += `
  <!-- カード ${c.age} -->
  <rect x="${cardX}" y="${cardY}" width="${CARD_W}" height="${CARD_H}" rx="${RX}" fill="${c.cardBg}" stroke="${c.cardStroke}" stroke-width="2"/>

  <!-- 左ラベル -->
  <text x="${labelCX}" y="${ageLabelY}" font-family="${FONT}" font-size="48" font-weight="900" fill="${c.labelFill}" text-anchor="middle">${xml(c.age)}</text>
  <text x="${labelCX}" y="${remLabelY}" font-family="${FONT}" font-size="22" font-weight="400" fill="${INK_BODY}" text-anchor="middle">${xml(c.remaining)}</text>

  <!-- 縦区切り線（左ラベル / 中央） -->
  <line x1="${cardX + LABEL_ZONE_W + 8}" y1="${cardY + 20}" x2="${cardX + LABEL_ZONE_W + 8}" y2="${cardY + CARD_H - 20}" stroke="${c.cardStroke}" stroke-width="1" stroke-dasharray="4 4"/>

  <!-- 中央: メイン行 + サブ行 -->
  <text x="${CENTER_X + 8}" y="${mainTextY}" font-family="${FONT}" font-size="28" font-weight="700" fill="${INK_STRONG}" text-anchor="start">${xml(c.main)}</text>
  <text x="${CENTER_X + 8}" y="${subTextY}" font-family="${FONT}" font-size="22" font-weight="400" fill="${INK_BODY}" text-anchor="start">${xml(c.sub)}</text>

  <!-- 右: 評価バッジ -->
  <rect x="${evalBadgeX}" y="${evalBadgeY}" width="${evalBadgeW}" height="${evalBadgeH}" rx="6" fill="${c.evalFill}"/>
  <text x="${evalBadgeX + evalBadgeW / 2}" y="${evalTextY}" font-family="${FONT}" font-size="26" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(c.eval)}</text>
`;
  }

  // ---- 注釈 ----
  const NOTE_Y = 862;
  body += `
  <!-- 注釈 -->
  <text x="${PAD_X}" y="${NOTE_Y}" font-family="${FONT}" font-size="18" font-weight="400" fill="${INK_MUTED}" text-anchor="start">※ 自社に資格手当制度がない / 勤続予定 2 年未満の場合はペイしない（本文「3 つのペイしないパターン」参照）</text>
`;

  // ---- ブランドマーク ----
  body += `\n${brandMark()}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#f8fafc"/>
${body}
</svg>`;
}

// ------------------------------------------------------------------
// レンダリング
// ------------------------------------------------------------------
async function render(svg, baseName) {
  const svgPath = join(OUT_DIR, `${baseName}.svg`);
  const pngPath = join(OUT_DIR, `${baseName}.png`);
  writeFileSync(svgPath, svg, 'utf8');
  await sharp(Buffer.from(svg)).png().toFile(pngPath);
  console.log(`  ok: ${baseName}.svg + ${baseName}.png`);
}

async function main() {
  console.log('Rendering figures for 総監受験は投資としてペイするか…');
  await render(svgRoiByAge(), 'figure-1-roi-by-age');
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
