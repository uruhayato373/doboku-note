#!/usr/bin/env node
// content/note/技術士総監/自治体技術職員の択一盲点/img/ に本文用 PNG/SVG 図版を生成する。
//
// figure-1-coverage-gap: 「発注者の実務感覚と択一出題範囲のズレ」
//   - 5管理 × 4列の表（5管理 / 発注者の実務との距離 / 択一の出題 / 盲点）
//   - 盲点3行（経済性管理・人的資源管理・安全管理）は danger 系薄背景でハイライト
//   - 「択一の出題」列は全行「8問」で均等であることを視覚化
//
// 設計ルール（.claude/knowledge/reference/note-svg-policy.md 準拠）:
//   - キャンバス幅 1200（同一記事内で統一）
//   - フォント ≥ 22px（補足を含めて 18px 以上）
//   - 色トークン（src/styles/globals.css と整合）のみ使用
//   - 識別は右下 doboku-note.com テキストのみ（左端縦線なし）
//
// 使い方:
//   node scripts/render-figure-civil-servant-blindspots.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'content/note/技術士総監/自治体技術職員の択一盲点/img');
mkdirSync(OUT_DIR, { recursive: true });

// ブランドトークン（src/styles/globals.css と整合）
const BRAND      = '#2e6da4'; // brand
const BRAND_FILL = '#e8f0fe'; // brand-fill
const BRAND_DEEP = '#1a3a5c'; // brand-deep
const INK_STRONG = '#222222'; // ink-strong
const INK_BODY   = '#555555'; // ink-body
const INK_MUTED  = '#8a8a8a'; // ink-muted
const DANGER     = '#b22234'; // danger
const DANGER_FILL = '#fbe6e9'; // danger 薄背景
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
// figure-1: 発注者の実務感覚と択一出題範囲のズレ
// ------------------------------------------------------------------
function svgCoverageGap() {
  // ============================================================
  // レイアウト定数
  // ============================================================
  const PAD_X    = 40;   // 左右キャンバスマージン
  const TITLE_Y  = 62;   // タイトルベースライン
  // タイトル下 40px 確保 → ヘッダ行開始
  const HEADER_TOP = TITLE_Y + 16 + 40; // = 118

  // 列定義（W=1200、PAD_X=40 → 使用幅=1120）
  // 列幅は機械計算: 前列x + width + マージン
  // 列間マージン: 12px
  // 列1（5管理）:       x=40,   w=180
  // 列2（実務との距離）: x=232,  w=380  ← テキストが長いので幅広め
  // 列3（択一の出題）:   x=624,  w=160
  // 列4（盲点）:         x=796,  w=364  → 右端 x+w = 1160 = W-40 ✓
  const COL_GAP = 12;

  const COL1_X = PAD_X;      // 40
  const COL1_W = 180;
  const COL2_X = COL1_X + COL1_W + COL_GAP; // 232
  const COL2_W = 376;
  const COL3_X = COL2_X + COL2_W + COL_GAP; // 620
  const COL3_W = 160;
  const COL4_X = COL3_X + COL3_W + COL_GAP; // 792
  const COL4_W = W - PAD_X - COL4_X;        // 1200 - 40 - 792 = 368

  // ヘッダ行
  const HEADER_H = 60;
  const RX = 6;

  // データ行の定義
  // ポリシー: 行高 ≥ 60px
  // 列2が2行になる行があるので行高を90pxに設定
  const ROW_H   = 90;
  const DATA_TOP = HEADER_TOP + HEADER_H + 40; // ヘッダ → データ行 40px

  // テーブルデータ
  const rows = [
    {
      col1: '経済性管理',
      // 2行に折り返し
      col2Lines: ['積算・予算は近いが、', 'QC・計算手法は遠い'],
      col3: '8問',
      col4: '盲点（手法系）',
      isBlindspot: true,
    },
    {
      col1: '人的資源管理',
      col2Lines: ['遠い', '（人事・労務は別部署の所管）'],
      col3: '8問',
      col4: '盲点',
      isBlindspot: true,
    },
    {
      col1: '情報管理',
      col2Lines: ['一部のみ近い'],
      col3: '8問',
      col4: '—',
      isBlindspot: false,
    },
    {
      col1: '安全管理',
      col2Lines: ['遠い', '（労働安全は施工者の領域）'],
      col3: '8問',
      col4: '盲点',
      isBlindspot: true,
    },
    {
      col1: '社会環境管理',
      col2Lines: ['近い', '（環境配慮・住民対応）'],
      col3: '8問',
      col4: '—',
      isBlindspot: false,
    },
  ];

  const NUM_ROWS = rows.length;
  const ROW_GAP  = 0; // 表なので行間なし（連続した帯）

  // 全体高さ: DATA_TOP + 5行×ROW_H + 末尾余白80
  const H = DATA_TOP + NUM_ROWS * ROW_H + 80;

  // ============================================================
  // SVG 構築
  // ============================================================
  let body = '';

  // ---- タイトル ----
  body += `
  <!-- タイトル -->
  <text x="${W / 2}" y="${TITLE_Y}" font-family="${FONT}" font-size="34" font-weight="800" fill="${INK_STRONG}" text-anchor="middle">発注者の実務感覚と択一出題範囲のズレ</text>
`;

  // ---- テーブル外枠（薄いストローク）----
  const TABLE_W = COL4_X + COL4_W - COL1_X;
  const TABLE_H = HEADER_H + 40 + NUM_ROWS * ROW_H;
  // 外枠は描かず行ごとに背景で構成

  // ---- ヘッダ行 ----
  const colHeaders = [
    { x: COL1_X, w: COL1_W, label: '5管理' },
    { x: COL2_X, w: COL2_W, label: '発注者の実務との距離' },
    { x: COL3_X, w: COL3_W, label: '択一の出題' },
    { x: COL4_X, w: COL4_W, label: '盲点' },
  ];

  body += `\n  <!-- テーブルヘッダ -->`;
  for (const col of colHeaders) {
    const textX = col.x + col.w / 2;
    const textY  = HEADER_TOP + HEADER_H / 2 + 9; // 垂直中央（ベースライン補正）
    body += `
  <rect x="${col.x}" y="${HEADER_TOP}" width="${col.w}" height="${HEADER_H}" rx="${RX}" fill="${BRAND}"/>
  <text x="${textX}" y="${textY}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">${xml(col.label)}</text>`;
  }

  // ---- データ行 ----
  body += `\n\n  <!-- テーブルデータ行 -->`;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowY = DATA_TOP + i * ROW_H;
    const rowCY = rowY + ROW_H / 2; // 行の垂直中央

    // 行背景（盲点行は danger_fill、非盲点行は交互）
    const rowBg = r.isBlindspot
      ? DANGER_FILL
      : (i % 2 === 0 ? '#ffffff' : '#f8fafc');

    // 行全体背景
    const fullRowX = COL1_X;
    const fullRowW = COL4_X + COL4_W - COL1_X;
    const isFirstRow = i === 0;
    const isLastRow  = i === rows.length - 1;

    body += `\n  <!-- 行 ${i + 1}: ${r.col1} -->`;
    body += `
  <rect x="${fullRowX}" y="${rowY}" width="${fullRowW}" height="${ROW_H}" fill="${rowBg}"/>`;

    // 列間の区切り線（縦線）
    for (const sep of [COL2_X, COL3_X, COL4_X]) {
      body += `
  <line x1="${sep - COL_GAP / 2}" y1="${rowY}" x2="${sep - COL_GAP / 2}" y2="${rowY + ROW_H}" stroke="#dde1e7" stroke-width="1"/>`;
    }

    // 行区切り（横線）
    if (i > 0) {
      body += `
  <line x1="${fullRowX}" y1="${rowY}" x2="${fullRowX + fullRowW}" y2="${rowY}" stroke="#dde1e7" stroke-width="1"/>`;
    }

    // ---- 列1: 5管理（太字）----
    const col1TextX = COL1_X + COL1_W / 2;
    const col1Fill  = r.isBlindspot ? DANGER : BRAND_DEEP;
    body += `
  <text x="${col1TextX}" y="${rowCY + 9}" font-family="${FONT}" font-size="22" font-weight="700" fill="${col1Fill}" text-anchor="middle">${xml(r.col1)}</text>`;

    // ---- 列2: 実務との距離（折り返し対応）----
    const col2TextX = COL2_X + 20; // 左寄せ（パディング20px）
    const LINE_DY   = 30; // 行間
    const numLines  = r.col2Lines.length;
    // 複数行の場合: 垂直中央に揃える
    // 1行目Y = rowCY - (numLines-1)*LINE_DY/2 + 9
    const col2Text1Y = rowCY - ((numLines - 1) * LINE_DY) / 2 + 9;
    for (let li = 0; li < numLines; li++) {
      body += `
  <text x="${col2TextX}" y="${col2Text1Y + li * LINE_DY}" font-family="${FONT}" font-size="22" font-weight="400" fill="${INK_BODY}" text-anchor="start">${xml(r.col2Lines[li])}</text>`;
    }

    // ---- 列3: 択一の出題「8問」（全行統一・強調）----
    const col3TextX = COL3_X + COL3_W / 2;
    body += `
  <text x="${col3TextX}" y="${rowCY + 9}" font-family="${FONT}" font-size="26" font-weight="700" fill="${BRAND}" text-anchor="middle">${xml(r.col3)}</text>`;

    // ---- 列4: 盲点（盲点行は danger 色・太字）----
    const col4TextX = COL4_X + COL4_W / 2;
    const col4Fill  = r.isBlindspot ? DANGER : INK_MUTED;
    const col4Weight = r.isBlindspot ? '700' : '400';
    const col4Size   = r.isBlindspot ? '24' : '22';
    body += `
  <text x="${col4TextX}" y="${rowCY + 9}" font-family="${FONT}" font-size="${col4Size}" font-weight="${col4Weight}" fill="${col4Fill}" text-anchor="middle">${xml(r.col4)}</text>`;
  }

  // テーブル外枠（最終ライン）
  const fullRowX = COL1_X;
  const fullRowW = COL4_X + COL4_W - COL1_X;
  const tableBottom = DATA_TOP + NUM_ROWS * ROW_H;
  body += `
  <!-- テーブル外枠 -->
  <rect x="${fullRowX}" y="${HEADER_TOP}" width="${fullRowW}" height="${HEADER_H + 40 + NUM_ROWS * ROW_H}" rx="${RX}" fill="none" stroke="#ccd0d8" stroke-width="1.5"/>`;

  // ---- 凡例 ----
  const LEGEND_Y = tableBottom + 28;
  body += `
  <!-- 凡例 -->
  <rect x="${COL1_X}" y="${LEGEND_Y}" width="18" height="18" rx="3" fill="${DANGER_FILL}" stroke="${DANGER}" stroke-width="1.5"/>
  <text x="${COL1_X + 26}" y="${LEGEND_Y + 14}" font-family="${FONT}" font-size="20" font-weight="400" fill="${INK_MUTED}" text-anchor="start">= 発注者の盲点（実務から遠い分野）</text>`;

  // ---- ブランドフレーム ----
  body += `\n\n  ${brandFrame(H)}`;

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
  console.log('Rendering figures for 自治体技術職員の択一盲点…');
  await render(svgCoverageGap(), 'figure-1-coverage-gap');
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
