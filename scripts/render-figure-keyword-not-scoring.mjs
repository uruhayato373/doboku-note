#!/usr/bin/env node
// docs/note/キーワード集が点にならない理由/img/ に本文用 PNG/SVG 図版を生成する。
//
// figure-1-reading-shift: 「通読の失敗を『出題視点』で読み直す」
//   - 3行の before → after 対応図
//   - 左列（失敗 / danger 系）→ 中央矢印 → 右列（修正 / positive 系）
//
// 設計ルール（docs/reference/note-svg-policy.md 準拠）:
//   - キャンバス幅 1200（同一記事内で統一）
//   - フォント ≥ 22px（補足を含めて 18px 以上）
//   - 色トークン（src/styles/globals.css と整合）のみ使用
//   - 識別は右下 doboku-note.com テキストのみ（左端縦線なし）
//
// 使い方:
//   node scripts/render-figure-keyword-not-scoring.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'docs/note/キーワード集が点にならない理由/img');
mkdirSync(OUT_DIR, { recursive: true });

// ブランドトークン（src/styles/globals.css と整合）
const BRAND      = '#2e6da4'; // brand
const BRAND_FILL = '#e8f0fe'; // brand-fill
const BRAND_DEEP = '#1a3a5c'; // brand-deep
const INK_STRONG = '#222222'; // ink-strong
const INK_BODY   = '#555555'; // ink-body
const INK_MUTED  = '#8a8a8a'; // ink-muted
const POSITIVE   = '#3a7d44'; // positive
const POSITIVE_FILL = '#e6f1e8';
const DANGER     = '#b22234'; // danger
const DANGER_FILL = '#fbe6e9';
const FONT = 'Hiragino Sans, Hiragino Kaku Gothic ProN, Yu Gothic, Noto Sans JP, sans-serif';

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
// 複数行テキストを <tspan> に分割して描画するヘルパー
// lines: string[], x: number, y: number（1行目の基準Y）, dy: number（行間px）
// ------------------------------------------------------------------
function multilineText(lines, x, y, dy, opts = {}) {
  const {
    fontFamily = FONT,
    fontSize = 22,
    fontWeight = 400,
    fill = INK_BODY,
    textAnchor = 'middle',
  } = opts;
  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${y + i * dy}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${fill}" text-anchor="${textAnchor}">${xml(line)}</text>`
    )
    .join('\n  ');
}

// ------------------------------------------------------------------
// 右向き矢印（&#x25B6;）のSVG要素
// cx, cy: 矢印の中心座標
// ------------------------------------------------------------------
function arrowRight(cx, cy) {
  return `<text x="${cx}" y="${cy + 12}" font-family="${FONT}" font-size="36" font-weight="900" fill="${BRAND}" text-anchor="middle">&#x25B6;</text>`;
}

// ------------------------------------------------------------------
// 図 1: 通読の失敗を「出題視点」で読み直す
// ------------------------------------------------------------------
function svgReadingShift() {
  // ============================================================
  // レイアウト定数
  // ============================================================
  const PAD_X   = 48;  // 左右キャンバスマージン
  const TITLE_Y = 64;  // タイトルベースライン
  // タイトル下 40px 確保 → コンテンツ開始
  const CONTENT_TOP = TITLE_Y + 40 + 16; // = 120

  // 列構成（W=1200 内）
  // [PAD_X] [左カード] [矢印ゾーン] [右カード] [PAD_X]
  // 使用幅 = 1200 - 2×48 = 1104
  // 左カード幅 = 460、矢印ゾーン = 84、右カード幅 = 560
  // 460 + 84 + 560 = 1104 ✓
  const LEFT_X  = PAD_X;           // 48
  const LEFT_W  = 460;
  const ARR_X   = LEFT_X + LEFT_W; // 508（矢印ゾーン左端）
  const ARR_W   = 84;
  const ARR_CX  = ARR_X + ARR_W / 2; // 550（矢印中心x）
  const RIGHT_X = ARR_X + ARR_W;   // 592
  const RIGHT_W = W - PAD_X - RIGHT_X; // 1200 - 48 - 592 = 560

  // 行定義
  // ポリシー: 行高 ≥ 60px、行間gap ≥ 16px
  // 2行テキストがあるため行高を 160px、行間を 24px に設定
  const ROW_H  = 164;
  const ROW_GAP = 24;
  const CARD_PAD_X = 20; // カード内左右パディング
  const CARD_PAD_Y = 20; // カード内上下パディング
  const RX = 8; // 角丸

  const rows = [
    {
      leftLines:  ['全項目を平等に読む', '（出題頻度が分からない）'],
      rightLabel: '優先度づけ',
      rightLines: ['論点を「高・中・低」に仕分け、', '高から固める'],
    },
    {
      leftLines:  ['引っかけ方が分からない', '（用語の意味だけ覚える）'],
      rightLabel: '引っかけ先回り',
      rightLines: ['過去問の誤答パターンから', '狙われる箇所をメモ'],
    },
    {
      leftLines:  ['単体暗記で', '記述に使えない'],
      rightLabel: 'トレードオフ束ね',
      rightLines: ['各論点を「対立する管理」で', 'タグ付け'],
    },
  ];

  // ヘッダ行（カラムラベル）
  const HEADER_H = 48;
  const HEADER_Y = CONTENT_TOP;
  const CONTENT_START = HEADER_Y + HEADER_H + 16; // ヘッダ下16px→カード開始

  // 全体高さ計算: CONTENT_START + 3行×ROW_H + 2ギャップ + 末尾余白80
  const TOTAL_ROWS_H = rows.length * ROW_H + (rows.length - 1) * ROW_GAP;
  const H = CONTENT_START + TOTAL_ROWS_H + 80;

  // ============================================================
  // SVG 構築
  // ============================================================
  let body = '';

  // ---- タイトル ----
  body += `
  <!-- タイトル -->
  <text x="${W / 2}" y="${TITLE_Y}" font-family="${FONT}" font-size="34" font-weight="800" fill="${INK_STRONG}" text-anchor="middle">通読の失敗を「出題視点」で読み直す</text>
`;

  // ---- カラムヘッダ ----
  // 左ヘッダ（danger）
  body += `
  <!-- カラムヘッダ -->
  <rect x="${LEFT_X}" y="${HEADER_Y}" width="${LEFT_W}" height="${HEADER_H}" rx="${RX}" fill="${DANGER}"/>
  <text x="${LEFT_X + LEFT_W / 2}" y="${HEADER_Y + HEADER_H / 2 + 9}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">通読でこうなる（失敗）</text>

  <!-- 右ヘッダ（positive） -->
  <rect x="${RIGHT_X}" y="${HEADER_Y}" width="${RIGHT_W}" height="${HEADER_H}" rx="${RX}" fill="${POSITIVE}"/>
  <text x="${RIGHT_X + RIGHT_W / 2}" y="${HEADER_Y + HEADER_H / 2 + 9}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">出題視点でこう直す（修正）</text>
`;

  // ---- 各行 ----
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const cardY = CONTENT_START + i * (ROW_H + ROW_GAP);
    const cardCY = cardY + ROW_H / 2; // カード垂直中心

    // テキスト1行目のY（2行の場合は上下に広げる）
    const lineCount = r.leftLines.length;
    const DY = 32; // 行間px
    const textBlockH = (lineCount - 1) * DY;
    // テキスト中央揃え: 1行目Y = cardCY - textBlockH/2 + 9（ベースライン補正）
    const leftText1Y = cardCY - textBlockH / 2 + 9;

    // 左カード（danger）
    body += `
  <!-- 行 ${i + 1}: 左カード -->
  <rect x="${LEFT_X}" y="${cardY}" width="${LEFT_W}" height="${ROW_H}" rx="${RX}" fill="${DANGER_FILL}" stroke="${DANGER}" stroke-width="2"/>
  ${multilineText(r.leftLines, LEFT_X + LEFT_W / 2, leftText1Y, DY, {
    fontSize: 24,
    fontWeight: 600,
    fill: DANGER,
    textAnchor: 'middle',
  })}
`;

    // 矢印
    body += `
  <!-- 行 ${i + 1}: 矢印 -->
  ${arrowRight(ARR_CX, cardCY - 12)}
`;

    // 右カード（positive）
    const rightLineTotalH = (r.rightLines.length - 1) * DY;
    const rightText1Y = cardCY - rightLineTotalH / 2 + 9;
    // ラベル（太字）は1行目の上に配置
    // rightLines は2行、ラベルは rightText1Y - DY に配置
    const labelY = cardCY - rightLineTotalH / 2 - DY + 9;

    body += `
  <!-- 行 ${i + 1}: 右カード -->
  <rect x="${RIGHT_X}" y="${cardY}" width="${RIGHT_W}" height="${ROW_H}" rx="${RX}" fill="${POSITIVE_FILL}" stroke="${POSITIVE}" stroke-width="2"/>
  <text x="${RIGHT_X + CARD_PAD_X + 8}" y="${labelY}" font-family="${FONT}" font-size="26" font-weight="800" fill="${POSITIVE}">${xml(r.rightLabel)}</text>
  ${multilineText(r.rightLines, RIGHT_X + CARD_PAD_X + 8, rightText1Y, DY, {
    fontSize: 22,
    fontWeight: 500,
    fill: INK_BODY,
    textAnchor: 'start',
  })}
`;
  }

  // ---- ブランドフレーム ----
  body += `\n  ${brandFrame(H)}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
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
  console.log('Rendering figures for キーワード集が点にならない理由…');
  await render(svgReadingShift(), 'figure-1-reading-shift');
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
