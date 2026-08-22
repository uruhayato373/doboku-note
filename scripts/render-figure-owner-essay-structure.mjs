#!/usr/bin/env node
// content/note/技術士総監/発注者視点の記述式の組み立て/img/ に本文用 PNG/SVG 図版を生成する。
//
// figure-1-three-layer: 「発注者の立場で書く 総監記述式の三層構造」
//   - 3層を縦に積み重ねた帯（上から: 第3層=将来展望 → 第2層=施策 → 第1層=管理対象と前提条件）
//   - 答案は第1層から書いて第3層へ展開するが、図は「将来展望が頂点」を示すため上に第3層
//   - 左側に下→上の縦矢印 + ラベル「答案は第1層から書き、第3層へ展開する」
//
// 設計ルール（.claude/knowledge/reference/note-svg-policy.md 準拠）:
//   - キャンバス幅 1200（同一記事内で統一）
//   - フォント ≥ 22px（補足 18px 以上）、16 未満絶対禁止
//   - 帯間隔 24px 以上、カード内パディング 20px
//   - タイトル下 40px → コンテンツ開始
//   - 矢印と帯テキストの間に 24px 以上の余白
//   - 末尾余白 80px 加算
//   - 識別は右下 doboku-note.com テキストのみ（左端縦線なし）
//
// 使い方:
//   node scripts/render-figure-owner-essay-structure.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'content/note/技術士総監/発注者視点の記述式の組み立て/img');
mkdirSync(OUT_DIR, { recursive: true });

// ブランドトークン（src/styles/globals.css と整合）
const BRAND       = '#2e6da4'; // brand
const BRAND_FILL  = '#e8f0fe'; // brand-fill
const BRAND_DEEP  = '#1a3a5c'; // brand-deep
const INK_STRONG  = '#222222'; // ink-strong
const INK_BODY    = '#555555'; // ink-body
const INK_MUTED   = '#8a8a8a'; // ink-muted
const POSITIVE    = '#3a7d44'; // positive
const FONT = 'Hiragino Sans, Hiragino Kaku Gothic ProN, Yu Gothic, Noto Sans JP, sans-serif';

// 第1層（最下段・土台）: 安定した緑系 — 前提条件・管理対象
const LAYER1_BG     = '#edf5ee'; // 薄い positive tint
const LAYER1_STROKE = '#7bb580'; // 中間 positive
const LAYER1_LABEL  = POSITIVE;  // #3a7d44

// 第2層（中段）: ブランド系 — 施策・トレードオフ統合
const LAYER2_BG     = BRAND_FILL; // #e8f0fe
const LAYER2_STROKE = BRAND;      // #2e6da4
const LAYER2_LABEL  = BRAND;      // #2e6da4

// 第3層（最上段・頂点）: 深いブランド — 将来展望
const LAYER3_BG     = BRAND;      // #2e6da4
const LAYER3_STROKE = BRAND_DEEP; // #1a3a5c
const LAYER3_LABEL  = '#ffffff';  // 白文字

const W = 1200;

function xml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 右下 doboku-note.com ブランディングのみ */
function brandMark(H) {
  return `  <text x="${W - 28}" y="${H - 22}" font-family="${FONT}" font-size="18" font-weight="500" fill="${INK_MUTED}" text-anchor="end">doboku-note.com</text>`;
}

// ------------------------------------------------------------------
// 図 1: 発注者の立場で書く 総監記述式の三層構造
// ------------------------------------------------------------------
function svgThreeLayer() {
  // ============================================================
  // レイアウト定数
  // ============================================================
  const PAD_X      = 48;   // 左右キャンバスマージン
  const TITLE_Y    = 64;   // タイトルベースライン
  // タイトル下 40px → コンテンツ開始
  const CONTENT_TOP = TITLE_Y + 40 + 16; // = 120

  // 矢印ゾーン（左側）: 帯の左端と矢印の間に 24px 以上の余白
  const ARROW_ZONE_W = 120; // 矢印ゾーン幅（含む左マージン 48px）
  const ARROW_CX = PAD_X + ARROW_ZONE_W - 28; // 矢印中心X（帯左端から内側に配置）

  // 帯: 矢印ゾーンの右から始まり右マージンまで
  // 矢印中心と帯左端の間に 24px 以上
  const CARD_X = PAD_X + ARROW_ZONE_W; // 帯の左端X = 48 + 120 = 168
  const CARD_W = W - CARD_X - PAD_X;   // 帯幅 = 1200 - 168 - 48 = 984

  // 各帯の高さ: テキスト3行 + 上下パディング
  // 行1: 層名（28px） — 太字・大きめ
  // 行2: 発注者視点での書き方（22px）— 2行に折り返す可能性あり
  // 行間: 16px
  // テキストブロック: 28 + 16 + 22 + 16 + 22 = 104px（2行説明）
  // 帯高さ: 20(上パッド) + 104 + 20(下パッド) = 144px → 余裕で 160px
  const CARD_H   = 160; // 各層の帯高さ
  const CARD_GAP = 24;  // 帯間の隙間（ポリシー最低値 24px）
  const CARD_PAD_X = 28; // カード内左右パディング
  const CARD_PAD_Y = 20; // カード内上下パディング
  const LINE_GAP   = 16; // 行間
  const RX = 8;          // 角丸

  // 3層データ: 配列インデックス 0 = SVGの最初に描く = 画面最上段 = 第3層（将来展望）
  // 表示順（上から）: 第3層 → 第2層 → 第1層
  const layers = [
    {
      tier: '第3層',
      name: '将来展望',
      // 説明は行1 / 行2 に分割して渡す
      desc1: '個別事業を超えた持続性・次世代への継承を意識する',
      desc2: '広域的な視点で社会インフラの将来像を示す',
      bg: LAYER3_BG,
      stroke: LAYER3_STROKE,
      labelColor: LAYER3_LABEL,
      nameColor: '#d0e4f5',
      descColor: '#d0e4f5',
    },
    {
      tier: '第2層',
      name: '施策',
      desc1: '管理間のトレードオフを第三の管理で統合的に解く',
      desc2: '発注者として実行可能な範囲に寄せて具体的に記述する',
      bg: LAYER2_BG,
      stroke: LAYER2_STROKE,
      labelColor: LAYER2_LABEL,
      nameColor: BRAND_DEEP,
      descColor: INK_BODY,
    },
    {
      tier: '第1層',
      name: '管理対象と前提条件',
      desc1: '自分が発注者として関わる事業を特定する',
      desc2: '予算・人員・地域事情などの前提条件を明示する',
      bg: LAYER1_BG,
      stroke: LAYER1_STROKE,
      labelColor: LAYER1_LABEL,
      nameColor: LAYER1_LABEL,
      descColor: INK_BODY,
    },
  ];

  // 全体高さ計算: CONTENT_TOP + 3層×CARD_H + 2×GAP + 末尾余白80
  const TOTAL_CARDS_H = layers.length * CARD_H + (layers.length - 1) * CARD_GAP;
  const H = CONTENT_TOP + TOTAL_CARDS_H + 80;

  // 矢印: 全帯の下端から上端まで（左側縦矢印）
  const ARROW_BOT_Y = CONTENT_TOP + TOTAL_CARDS_H; // 最下端（第1層の下辺）
  const ARROW_TOP_Y = CONTENT_TOP;                  // 最上端（第3層の上辺）
  const ARROWHEAD_H = 20;
  const ARROW_LINE_TOP = ARROW_TOP_Y + ARROWHEAD_H; // 幹の上端

  // ============================================================
  // SVG 構築
  // ============================================================
  let body = '';

  // ---- タイトル ----
  // タイトル中心: 帯の中央に揃える（矢印ゾーンは含まない）
  const CARD_CENTER_X = CARD_X + CARD_W / 2;
  body += `
  <!-- タイトル -->
  <text x="${CARD_CENTER_X}" y="${TITLE_Y}" font-family="${FONT}" font-size="34" font-weight="800" fill="${INK_STRONG}" text-anchor="middle">発注者の立場で書く 総監記述式の三層構造</text>
`;

  // ---- 各層の帯 ----
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const cardY = CONTENT_TOP + i * (CARD_H + CARD_GAP);

    // テキスト配置:
    // 行1: 層番号 + 層名（太字）— ベースライン
    // 行2: 説明文1行目
    // 行3: 説明文2行目（空の場合は省略）

    // 帯中心から均等配置
    // desc2 が空の場合: 2行（層名 + desc1）
    // desc2 がある場合: 3行（層名 + desc1 + desc2）
    const hasDesc2 = layer.desc2.length > 0;
    // テキストブロック高さ
    const LINE1_H = 28; // 層名行
    const LINE2_H = 22; // 説明行
    const blockH = hasDesc2
      ? LINE1_H + LINE_GAP + LINE2_H + LINE_GAP + LINE2_H
      : LINE1_H + LINE_GAP + LINE2_H;

    // カード中央からの垂直オフセット
    const cardCY = cardY + CARD_H / 2;
    const blockStartY = cardCY - blockH / 2; // テキストブロック開始Y（アセンダライン）

    // 各行のベースライン（テキストはベースラインで指定）
    const LINE1_BL = blockStartY + LINE1_H;       // 層名ベースライン
    const LINE2_BL = LINE1_BL + LINE_GAP + LINE2_H; // 説明1ベースライン
    const LINE3_BL = LINE2_BL + LINE_GAP + LINE2_H; // 説明2ベースライン

    // 行1: 「第N層：層名」を分割表示
    // 「第N層」は labelColor（太字強調）、区切り「：」と「層名」は nameColor
    const TIER_TEXT_W = 106; // 「第N層」の推定幅（4文字 × 26px × 0.9 ≈ 94px、余裕込み）
    const SEP_W = 24;        // 区切り「：」の幅
    const TIER_END_X = CARD_X + CARD_PAD_X + TIER_TEXT_W; // 層番号の右端

    body += `
  <!-- 層 ${layer.tier}（${layer.name}）帯 -->
  <rect x="${CARD_X}" y="${cardY}" width="${CARD_W}" height="${CARD_H}" rx="${RX}" fill="${layer.bg}" stroke="${layer.stroke}" stroke-width="2"/>

  <!-- 層番号 -->
  <text x="${CARD_X + CARD_PAD_X}" y="${LINE1_BL}" font-family="${FONT}" font-size="28" font-weight="800" fill="${layer.labelColor}" text-anchor="start">${xml(layer.tier)}</text>
  <!-- 区切りと層名 -->
  <text x="${TIER_END_X + SEP_W}" y="${LINE1_BL}" font-family="${FONT}" font-size="26" font-weight="700" fill="${layer.nameColor}" text-anchor="start">${xml(layer.name)}</text>

  <!-- 説明文1行目 -->
  <text x="${CARD_X + CARD_PAD_X}" y="${LINE2_BL}" font-family="${FONT}" font-size="22" font-weight="400" fill="${layer.descColor}" text-anchor="start">${xml(layer.desc1)}</text>
`;

    if (hasDesc2) {
      body += `  <!-- 説明文2行目 -->
  <text x="${CARD_X + CARD_PAD_X}" y="${LINE3_BL}" font-family="${FONT}" font-size="22" font-weight="400" fill="${layer.descColor}" text-anchor="start">${xml(layer.desc2)}</text>
`;
    }
  }

  // ---- 左側縦矢印（下→上 = 「答案は第1層から書き、第3層へ展開する」）----
  body += `
  <!-- 左側縦矢印（下→上） -->
  <!-- 矢印の幹 -->
  <line x1="${ARROW_CX}" y1="${ARROW_BOT_Y}" x2="${ARROW_CX}" y2="${ARROW_LINE_TOP}" stroke="${BRAND}" stroke-width="4" stroke-linecap="round"/>
  <!-- 矢印頭（上向き三角形: 右向き三角形を90度回転した形でorient対策不要） -->
  <polygon points="${ARROW_CX},${ARROW_TOP_Y} ${ARROW_CX - 12},${ARROW_LINE_TOP + 4} ${ARROW_CX + 12},${ARROW_LINE_TOP + 4}" fill="${BRAND}"/>
`;

  // 矢印ラベル（縦書き、矢印左横に配置）
  const LABEL_X = ARROW_CX - 22; // 矢印中心から左22px
  const labelText = '答案は第1層から書き、第3層へ展開する';
  const LABEL_CHARS = labelText.split('');
  const CHAR_DY = 22; // 文字間隔
  const LABEL_TOTAL_H = LABEL_CHARS.length * CHAR_DY;
  const ARROW_MID_Y = (ARROW_TOP_Y + ARROW_BOT_Y) / 2;
  const LABEL_START_Y = ARROW_MID_Y - LABEL_TOTAL_H / 2 + 18; // 縦中央揃え

  body += `
  <!-- 矢印ラベル（縦書き: 1文字ずつ） -->
  ${LABEL_CHARS.map((ch, idx) =>
    `<text x="${LABEL_X}" y="${LABEL_START_Y + idx * CHAR_DY}" font-family="${FONT}" font-size="18" font-weight="600" fill="${BRAND}" text-anchor="middle">${xml(ch)}</text>`
  ).join('\n  ')}
`;

  // ---- ブランドマーク ----
  body += `\n  ${brandMark(H)}`;

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
  console.log('Rendering figures for 発注者視点の記述式の組み立て…');
  await render(svgThreeLayer(), 'figure-1-three-layer');
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
