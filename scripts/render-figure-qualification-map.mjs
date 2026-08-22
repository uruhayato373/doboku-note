#!/usr/bin/env node
// content/note/技術士総監/自治体技術職員の資格地図/img/ に本文用 PNG/SVG 図版を生成する。
//
// figure-1-qualification-map: 「自治体の技術職員 キャリアと資格の3層地図」
//   - 3層を縦に積み重ねた帯（下から上へ: 施工現場系→専門技術系→管理統合系）
//   - 上ほど強調色（brand 濃→中→薄）
//   - 右側に下→上の縦矢印 + ラベル「上の層ほど広く俯瞰する」
//
// 設計ルール（.claude/knowledge/reference/note-svg-policy.md 準拠）:
//   - キャンバス幅 1200（同一記事内で統一）
//   - フォント ≥ 22px（補足 18px 以上）
//   - 帯間隔 24px 以上、カード内パディング 20px
//   - タイトル下 40px → コンテンツ開始
//   - 矢印と帯テキストの間に 24px 以上の余白
//   - 末尾余白 80px 加算
//   - 識別は右下 doboku-note.com テキストのみ（左端縦線なし）
//
// 使い方:
//   node scripts/render-figure-qualification-map.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'content/note/技術士総監/自治体技術職員の資格地図/img');
mkdirSync(OUT_DIR, { recursive: true });

// ブランドトークン（src/styles/globals.css と整合）
const BRAND       = '#2e6da4'; // brand
const BRAND_FILL  = '#e8f0fe'; // brand-fill
const BRAND_DEEP  = '#1a3a5c'; // brand-deep
const INK_STRONG  = '#222222'; // ink-strong
const INK_BODY    = '#555555'; // ink-body
const INK_MUTED   = '#8a8a8a'; // ink-muted
const FONT = 'Hiragino Sans, Hiragino Kaku Gothic ProN, Yu Gothic, Noto Sans JP, sans-serif';

// 第1層用（薄め）
const LAYER1_BG     = '#f0f5fa'; // 非常に薄い brand tint
const LAYER1_STROKE = '#9bbcd8'; // 薄い brand
const LAYER1_LABEL  = '#5580a0'; // 中間 brand

// 第2層用（中間）
const LAYER2_BG     = BRAND_FILL;  // #e8f0fe
const LAYER2_STROKE = BRAND;       // #2e6da4
const LAYER2_LABEL  = BRAND;       // #2e6da4

// 第3層用（最も強調）
const LAYER3_BG     = BRAND;       // #2e6da4
const LAYER3_STROKE = BRAND_DEEP;  // #1a3a5c
const LAYER3_LABEL  = '#ffffff';   // 白文字

const W = 1200;

function xml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 右下 doboku-note.com ブランディングのみ */
function brandFrame(H) {
  return `  <text x="${W - 28}" y="${H - 22}" font-family="${FONT}" font-size="18" font-weight="500" fill="${INK_MUTED}" text-anchor="end">doboku-note.com</text>`;
}

// ------------------------------------------------------------------
// 図 1: 自治体の技術職員 キャリアと資格の3層地図
// ------------------------------------------------------------------
function svgQualificationMap() {
  // ============================================================
  // レイアウト定数
  // ============================================================
  const PAD_X      = 48;   // 左右キャンバスマージン
  const TITLE_Y    = 64;   // タイトルベースライン
  // タイトル下 40px → コンテンツ開始
  const CONTENT_TOP = TITLE_Y + 40 + 16; // = 120

  // 矢印ゾーン（右端）
  // 帯の右端と矢印の間に 24px 以上の余白を確保
  const ARROW_ZONE_W = 120; // 矢印ゾーン幅（含む右マージン 48px）
  const ARROW_X = W - PAD_X - ARROW_ZONE_W + 24; // 矢印中心X
  // 帯の幅: W - 2×PAD_X - ARROW_ZONE_W
  // = 1200 - 96 - 120 = 984px
  // ポリシー: 帯右端と矢印中心の間は 24px 以上確保
  const CARD_W = W - 2 * PAD_X - ARROW_ZONE_W; // = 984

  // 各帯（層）の高さ: テキスト3行（行間16px）+ 上下パディング（20px×2）
  // 行: 層名(26px) + 資格(22px) + 説明(22px)
  // テキストブロック = 26 + 16 + 22 + 16 + 22 = 102px
  // 帯高さ = 20 + 102 + 20 = 142px → 余裕を持って 160px
  const CARD_H  = 164;  // 各層の帯高さ
  const CARD_GAP = 24;  // 帯間の隙間（ポリシー最低値 24px）
  const CARD_PAD_X = 28; // カード内左右パディング
  const CARD_PAD_Y = 20; // カード内上下パディング
  const RX = 8;          // 角丸

  // 3層データ（下から順に定義。SVGは上から描くため配列を逆順に）
  // render順: 第1層（最下段）→ 第2層 → 第3層（最上段）
  // 配列インデックス 0=第1層, 1=第2層, 2=第3層
  const layers = [
    {
      tier: '第1層',
      tierSub: '施工現場系',
      qualification: '1級土木施工管理技士',
      description: '現場を回す力の土台',
      bg: LAYER1_BG,
      stroke: LAYER1_STROKE,
      labelColor: LAYER1_LABEL,
      textColor: INK_BODY,
      descColor: INK_BODY,
    },
    {
      tier: '第2層',
      tierSub: '専門技術系',
      qualification: '技術士（建設部門などの一般部門）・RCCM',
      description: '特定分野の高度な技術者',
      bg: LAYER2_BG,
      stroke: LAYER2_STROKE,
      labelColor: LAYER2_LABEL,
      textColor: BRAND_DEEP,
      descColor: INK_BODY,
    },
    {
      tier: '第3層',
      tierSub: '管理統合系',
      qualification: '技術士 総合技術監理部門（総監）',
      description: '5管理を統合し事業・組織を俯瞰',
      bg: LAYER3_BG,
      stroke: LAYER3_STROKE,
      labelColor: LAYER3_LABEL,
      textColor: '#ffffff',
      descColor: '#d0e4f5',
    },
  ];

  // SVGは「上から下」に描く = 第3層(index=2)が最上段
  // 配列を逆順にして最上段から配置
  const renderOrder = [...layers].reverse(); // [第3層, 第2層, 第1層]

  // 全体高さ計算: CONTENT_TOP + 3層×CARD_H + 2×GAP + 末尾余白80
  const TOTAL_CARDS_H = layers.length * CARD_H + (layers.length - 1) * CARD_GAP;
  const H = CONTENT_TOP + TOTAL_CARDS_H + 80;

  // 矢印: 全帯の下端から上端まで
  const ARROW_BOT_Y = CONTENT_TOP + TOTAL_CARDS_H; // 最下端
  const ARROW_TOP_Y = CONTENT_TOP;                   // 最上端

  // ============================================================
  // SVG 構築
  // ============================================================
  let body = '';

  // ---- タイトル ----
  body += `
  <!-- タイトル -->
  <text x="${W / 2 - ARROW_ZONE_W / 2}" y="${TITLE_Y}" font-family="${FONT}" font-size="34" font-weight="800" fill="${INK_STRONG}" text-anchor="middle">自治体の技術職員 キャリアと資格の3層地図</text>
`;

  // ---- 各層の帯 ----
  // renderOrder[0]=第3層(最上段), renderOrder[1]=第2層, renderOrder[2]=第1層
  for (let i = 0; i < renderOrder.length; i++) {
    const layer = renderOrder[i];
    const cardX = PAD_X;
    const cardY = CONTENT_TOP + i * (CARD_H + CARD_GAP);
    const cardCY = cardY + CARD_H / 2; // 帯の垂直中心

    // テキスト3行のレイアウト
    // 行1: 層名（26px）+ 層区分（22px）を同一行に横並び
    // 行2: 代表資格（22px）
    // 行3: ひとこと説明（22px）
    // 行間: 16px
    // テキストブロック合計: 26 + 16 + 22 + 16 + 22 = 102px
    // 1行目ベースライン = cardCY - 51 + 13（ベースライン補正）
    const LINE1_Y = cardCY - 34 + 13; // 層名行ベースライン
    const LINE2_Y = LINE1_Y + 38;     // 資格行（行間38px）
    const LINE3_Y = LINE2_Y + 32;     // 説明行（行間32px）

    // 層区分ピル（層名の右に添付）
    // 層名テキスト幅の推定: 「第N層」= 4文字 × 26px × 0.9 ≈ 94px
    const TIER_TEXT_W = 110; // 「第N層」の推定幅
    const TIER_SUB_X = cardX + CARD_PAD_X + TIER_TEXT_W + 16; // ピル左端X

    body += `
  <!-- 層 ${layer.tier} 帯 -->
  <rect x="${cardX}" y="${cardY}" width="${CARD_W}" height="${CARD_H}" rx="${RX}" fill="${layer.bg}" stroke="${layer.stroke}" stroke-width="2"/>

  <!-- 層名 -->
  <text x="${cardX + CARD_PAD_X}" y="${LINE1_Y}" font-family="${FONT}" font-size="26" font-weight="800" fill="${layer.labelColor}" text-anchor="start">${xml(layer.tier)}</text>
  <!-- 層区分（施工現場系/専門技術系/管理統合系） -->
  <text x="${TIER_SUB_X}" y="${LINE1_Y}" font-family="${FONT}" font-size="22" font-weight="600" fill="${layer.textColor}" text-anchor="start">${xml(layer.tierSub)}</text>

  <!-- 代表資格 -->
  <text x="${cardX + CARD_PAD_X}" y="${LINE2_Y}" font-family="${FONT}" font-size="22" font-weight="700" fill="${layer.textColor}" text-anchor="start">${xml(layer.qualification)}</text>

  <!-- ひとこと説明 -->
  <text x="${cardX + CARD_PAD_X}" y="${LINE3_Y}" font-family="${FONT}" font-size="22" font-weight="400" fill="${layer.descColor}" text-anchor="start">${xml(layer.description)}</text>
`;
  }

  // ---- 右側縦矢印（下→上 = 「上の層ほど広く俯瞰する」）----
  // 矢印の幹: ARROW_BOT_Y から ARROW_TOP_Y + 矢印頭のぶん（20px）
  const ARROW_CX = ARROW_X; // 矢印中心X
  const ARROWHEAD_H = 20;   // 矢印頭の高さ
  const ARROW_LINE_TOP = ARROW_TOP_Y + ARROWHEAD_H; // 幹の上端

  body += `
  <!-- 右側縦矢印（下→上） -->
  <!-- 矢印の幹 -->
  <line x1="${ARROW_CX}" y1="${ARROW_BOT_Y}" x2="${ARROW_CX}" y2="${ARROW_LINE_TOP}" stroke="${BRAND}" stroke-width="4" stroke-linecap="round"/>
  <!-- 矢印頭（上向き三角形） -->
  <polygon points="${ARROW_CX},${ARROW_TOP_Y} ${ARROW_CX - 12},${ARROW_LINE_TOP + 4} ${ARROW_CX + 12},${ARROW_LINE_TOP + 4}" fill="${BRAND}"/>
`;

  // 矢印ラベル（縦書き、1文字ずつ縦に並べる）
  // ラベルは矢印の右横に配置
  const LABEL_X = ARROW_CX + 20; // 矢印中心から右20px
  const LABEL_CHARS = '上の層ほど広く俯瞰する'.split('');
  const CHAR_DY = 22; // 文字間隔
  const LABEL_TOTAL_H = LABEL_CHARS.length * CHAR_DY;
  const ARROW_MID_Y = (ARROW_TOP_Y + ARROW_BOT_Y) / 2;
  const LABEL_START_Y = ARROW_MID_Y - LABEL_TOTAL_H / 2 + 16; // 縦中央揃え
  body += `
  <!-- 矢印ラベル（縦書き: 1文字ずつ） -->
  ${LABEL_CHARS.map((ch, idx) =>
    `<text x="${LABEL_X}" y="${LABEL_START_Y + idx * CHAR_DY}" font-family="${FONT}" font-size="18" font-weight="600" fill="${BRAND}" text-anchor="middle">${xml(ch)}</text>`
  ).join('\n  ')}
`;

  // ---- ブランドフレーム ----
  body += `\n  ${brandFrame(H)}`;

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
  console.log('Rendering figures for 自治体技術職員の資格地図…');
  await render(svgQualificationMap(), 'figure-1-qualification-map');
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
