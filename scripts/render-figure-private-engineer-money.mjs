#!/usr/bin/env node
// content/note/技術士総監/民間建設技術者の総監メリット/img/ に本文用 PNG/SVG 図版を生成する。
//
// figure-1-money-chain: 「3レイヤー金銭構造 — 経審 Z 点から月7.5万円手当まで連鎖する仕組み」
//   - 3枚のカードを横並び（左→右）に矢印で結ぶ連鎖図
//   - 各カード: ヘッダ + 中央メイン数値 + 補足2行 + カード下ラベル2行
//
// 設計ルール（.claude/knowledge/reference/note-svg-policy.md 準拠）:
//   - キャンバス 1200×720 固定
//   - フォント ≥ 22px（補足 22px、ヘッダ 24px、中央 30px）
//   - タイトル下 40px → コンテンツ開始
//   - カード間 80px 矢印帯、カード内パディング 24px
//   - 色トークン（src/styles/globals.css と整合）のみ使用
//   - 識別は右下 doboku-note.com テキストのみ
//
// 使い方:
//   node scripts/render-figure-private-engineer-money.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'content/note/技術士総監/民間建設技術者の総監メリット/img');
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
const POSITIVE_DEEP = '#1a5c2e';
const WARN         = '#c87e1e'; // warn（カスタム）
const WARN_FILL    = '#fdf2e0';
const WARN_DEEP    = '#8c5a14';
const FONT = 'Hiragino Sans, Hiragino Kaku Gothic ProN, Yu Gothic, Noto Sans JP, sans-serif';

const W = 1200;
const H = 760;

function xml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 右下 doboku-note.com ブランディングのみ */
function brandFrame() {
  return `  <text x="${W - 28}" y="${H - 22}" font-family="${FONT}" font-size="18" font-weight="500" fill="${INK_MUTED}" text-anchor="end">doboku-note.com</text>`;
}

// ------------------------------------------------------------------
// 図 1: 3レイヤー金銭構造 連鎖図
// ------------------------------------------------------------------
function svgMoneyChain() {
  // ============================================================
  // レイアウト定数
  // ============================================================
  // タイトル領域: Y 30〜120
  const TITLE_Y    = 70;   // メインタイトル ベースライン
  const SUBTITLE_Y = 108;  // サブタイトル ベースライン

  // カード領域: Y 200〜500（カード高さ 300px）
  const CARD_TOP   = 160;  // カード上端
  const CARD_W     = 320;
  const CARD_H     = 340;
  const ARROW_W    = 80;   // カード間矢印帯幅
  const PAD        = 60;   // 左マージン

  // 各カードの X 左端
  // card1: 60〜380, arrow: 380〜460, card2: 460〜780, arrow: 780〜860, card3: 860〜1180
  const CARD_X = [PAD, PAD + CARD_W + ARROW_W, PAD + CARD_W * 2 + ARROW_W * 2];
  const ARROW_X = [PAD + CARD_W, PAD + CARD_W * 2 + ARROW_W];

  // 矢印 Y: カード中央高さ
  const ARROW_Y    = CARD_TOP + CARD_H / 2; // = 310

  const CARD_PAD   = 24;  // カード内パディング
  const RX         = 8;   // 角丸

  // 各カード内レイアウト（共通リズム）
  // ヘッダ高さ 52px
  const HDR_H      = 52;
  // 中央メインテキスト Y: カード上端 + ヘッダ + 64
  // 補足1行目 Y: 中央 + 48
  // 補足2行目 Y: 補足1 + 36
  // セパレータ Y: 補足2 + 28
  // ラベル1行目 Y: セパレータ + 38
  // ラベル2行目 Y: ラベル1 + 34

  // カードデータ
  const cards = [
    {
      label: '① 個人',
      headerBg: BRAND,
      cardBg: BRAND_FILL,
      cardStroke: BRAND,
      mainText: '総監合格',
      mainColor: BRAND_DEEP,
      subs: [
        { text: 'R7 合格 615 人', color: INK_BODY },
        { text: '対受験者 23.9%', color: INK_BODY },
      ],
      botLabels: [
        { text: '一時金 20〜30 万円', color: BRAND_DEEP },
        { text: '月手当 2〜7.5 万円', color: BRAND_DEEP },
      ],
    },
    {
      label: '② 会社',
      headerBg: POSITIVE,
      cardBg: POSITIVE_FILL,
      cardStroke: POSITIVE,
      mainText: '経審 Z 点 +5',
      mainColor: POSITIVE_DEEP,
      subs: [
        { text: 'P 点総合の 25% を占有', color: INK_BODY },
        { text: '建設・総合技術監理（建設）', color: INK_MUTED, size: 20 },
      ],
      botLabels: [
        { text: '入札ランクアップ', color: POSITIVE_DEEP },
        { text: '→ 売上拡大', color: POSITIVE_DEEP },
      ],
    },
    {
      label: '③ 市場',
      headerBg: WARN,
      cardBg: WARN_FILL,
      cardStroke: WARN,
      mainText: '年収 700-900 万',
      mainColor: WARN_DEEP,
      subs: [
        { text: '建コン登録の必須要件', color: INK_BODY },
        { text: '転職で年収 2 倍事例', color: INK_BODY },
      ],
      botLabels: [
        { text: '独立・副業の扉', color: WARN_DEEP },
        { text: '市場価値向上', color: WARN_DEEP },
      ],
    },
  ];

  let body = '';

  // ---- タイトル（2行） ----
  body += `
  <!-- タイトル -->
  <text x="${W / 2}" y="${TITLE_Y}" font-family="${FONT}" font-size="36" font-weight="800" fill="${INK_STRONG}" text-anchor="middle">3レイヤー金銭構造 — 経審 Z 点から月7.5万円手当まで連鎖する仕組み</text>
  <text x="${W / 2}" y="${SUBTITLE_Y}" font-family="${FONT}" font-size="22" font-weight="400" fill="${INK_BODY}" text-anchor="middle">総監を取ると、個人 → 会社 → 市場で金銭価値が連鎖する</text>
`;

  // ---- 矢印（カード間） ----
  for (const ax of ARROW_X) {
    // 水平線
    const lineX1 = ax + 12;
    const lineX2 = ax + ARROW_W - 12;
    const lineY  = ARROW_Y;
    // 三角矢印頭
    const TRI_SIZE = 14; // 三角頭の半幅
    body += `
  <!-- 矢印 -->
  <line x1="${lineX1}" y1="${lineY}" x2="${lineX2 - TRI_SIZE}" y2="${lineY}" stroke="${INK_STRONG}" stroke-width="4" stroke-linecap="round"/>
  <polygon points="${lineX2},${lineY} ${lineX2 - TRI_SIZE},${lineY - TRI_SIZE} ${lineX2 - TRI_SIZE},${lineY + TRI_SIZE}" fill="${INK_STRONG}"/>
`;
  }

  // ---- 各カード ----
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const cx = CARD_X[i];
    const cy = CARD_TOP;

    // ---- カード背景 ----
    body += `
  <!-- カード ${i + 1} -->
  <rect x="${cx}" y="${cy}" width="${CARD_W}" height="${CARD_H}" rx="${RX}" fill="${c.cardBg}" stroke="${c.cardStroke}" stroke-width="2"/>
`;

    // ---- ヘッダ背景（上部角丸） ----
    // ヘッダ: rx で角丸をつけつつ下辺をフラットにするため、rect を上端 + 先に全体角丸、下辺を別 rect で塗り潰し
    body += `
  <!-- カード ${i + 1} ヘッダ背景 -->
  <rect x="${cx}" y="${cy}" width="${CARD_W}" height="${HDR_H + RX}" rx="${RX}" fill="${c.headerBg}"/>
  <rect x="${cx}" y="${cy + HDR_H}" width="${CARD_W}" height="${RX}" fill="${c.headerBg}"/>
`;

    // ---- ヘッダテキスト ----
    const hdrTextY = cy + HDR_H / 2 + 9; // ベースライン補正
    body += `
  <text x="${cx + CARD_W / 2}" y="${hdrTextY}" font-family="${FONT}" font-size="24" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(c.label)}</text>
`;

    // ---- メインテキスト ----
    const mainY = cy + HDR_H + 64;
    body += `
  <text x="${cx + CARD_W / 2}" y="${mainY}" font-family="${FONT}" font-size="30" font-weight="800" fill="${c.mainColor}" text-anchor="middle">${xml(c.mainText)}</text>
`;

    // ---- 補足2行 ----
    const sub1Y = mainY + 48;
    const sub2Y = sub1Y + 36;
    for (let j = 0; j < c.subs.length; j++) {
      const sub = c.subs[j];
      const subY = j === 0 ? sub1Y : sub2Y;
      const fsize = sub.size || 22;
      body += `
  <text x="${cx + CARD_W / 2}" y="${subY}" font-family="${FONT}" font-size="${fsize}" font-weight="400" fill="${sub.color}" text-anchor="middle">${xml(sub.text)}</text>
`;
    }

    // ---- セパレータ ----
    const sepY = sub2Y + 28;
    body += `
  <line x1="${cx + CARD_PAD}" y1="${sepY}" x2="${cx + CARD_W - CARD_PAD}" y2="${sepY}" stroke="${c.cardStroke}" stroke-width="1.5" stroke-dasharray="4,3"/>
`;

    // ---- カード下ラベル2行 ----
    const lbl1Y = sepY + 38;
    const lbl2Y = lbl1Y + 34;
    body += `
  <text x="${cx + CARD_W / 2}" y="${lbl1Y}" font-family="${FONT}" font-size="22" font-weight="800" fill="${c.botLabels[0].color}" text-anchor="middle">${xml(c.botLabels[0].text)}</text>
  <text x="${cx + CARD_W / 2}" y="${lbl2Y}" font-family="${FONT}" font-size="22" font-weight="800" fill="${c.botLabels[1].color}" text-anchor="middle">${xml(c.botLabels[1].text)}</text>
`;
  }

  // ---- ブランドフレーム ----
  body += `\n${brandFrame()}`;

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
  console.log('Rendering figures for 民間建設技術者の総監メリット…');
  await render(svgMoneyChain(), 'figure-1-money-chain');
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
