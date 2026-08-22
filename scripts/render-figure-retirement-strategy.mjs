#!/usr/bin/env node
// content/note/技術士総監/公務員技術者の定年後資格戦略/img/ に本文用 PNG/SVG 図版を生成する。
//
// figure-1-retirement-options:
//   「公務員技術者の定年後 — 選択肢と総監の効き方」
//   - 5行2列の表（定年後の選択肢 / 総監がどう効くか）
//   - 左列: brand 色系のラベル（太字、BRAND_DEEP/BRAND 系）
//   - 右列: 本文テキスト（折り返し対応）
//   - 行は白/薄グレー交互
//
// 設計ルール（.claude/knowledge/reference/note-svg-policy.md 準拠）:
//   - キャンバス幅 1200（同一記事内で統一）
//   - フォント ≥ 22px（補足を含めて 18px 以上）
//   - タイトル下 40px 確保 → コンテンツ開始
//   - テーブル行高 ≥ 60px（折り返しあり行は 90px）
//   - ヘッダ → データ行 40px 必須
//   - 色トークン（src/styles/globals.css と整合）のみ使用
//   - 識別は右下 doboku-note.com テキストのみ（左端縦線なし）
//   - 末尾余白 80px
//   - 列x座標は「前列x + width + マージン」で機械計算（重なり防止）
//
// 使い方:
//   node scripts/render-figure-retirement-strategy.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'content/note/技術士総監/公務員技術者の定年後資格戦略/img');
mkdirSync(OUT_DIR, { recursive: true });

// ブランドトークン（src/styles/globals.css と整合）
const BRAND      = '#2e6da4'; // brand
const BRAND_FILL = '#e8f0fe'; // brand-fill
const BRAND_DEEP = '#1a3a5c'; // brand-deep
const INK_STRONG = '#222222'; // ink-strong
const INK_BODY   = '#555555'; // ink-body
const INK_MUTED  = '#8a8a8a'; // ink-muted
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
// figure-1: 公務員技術者の定年後 — 選択肢と総監の効き方
// ------------------------------------------------------------------
function svgRetirementOptions() {
  // ============================================================
  // レイアウト定数
  // ============================================================
  const PAD_X    = 40;    // 左右キャンバスマージン
  const TITLE_Y  = 62;    // タイトルベースライン（1行目）
  const TITLE2_Y = TITLE_Y + 44; // タイトル2行目（行間44px）
  // タイトル下 40px 確保 → ヘッダ行開始
  const HEADER_TOP = TITLE2_Y + 16 + 40; // = TITLE2_Y + 56

  // ============================================================
  // 列定義（W=1200、PAD_X=40 → 使用幅=1120）
  // 列間マージン: 16px
  // 列1（定年後の選択肢）: x=40,  w=320  ← ラベルが長めなので幅確保
  // 列2（総監がどう効くか）: x=376, w=784  → 右端 376+784=1160=W-40 ✓
  // ============================================================
  const COL_GAP = 16;

  const COL1_X = PAD_X;       // 40
  const COL1_W = 320;
  const COL2_X = COL1_X + COL1_W + COL_GAP; // 376
  const COL2_W = W - PAD_X - COL2_X;        // 1200 - 40 - 376 = 784

  // ヘッダ行
  const HEADER_H = 60;
  const RX = 6;

  // データ行定義
  // 右列テキストが長く2行になる行があるため行高を90pxに設定（ポリシー60px以上を満たす）
  const ROW_H    = 90;

  // データ行開始Y: ヘッダ下 + 40px（ポリシー必須）
  const DATA_TOP = HEADER_TOP + HEADER_H + 40;

  // テーブルデータ
  const rows = [
    {
      col1: '再任用・OB活動',
      col2Lines: [
        '後進指導・技術継承・研修講師。',
        '5管理の枠組みで経験を体系的に語れる',
      ],
    },
    {
      col1: '建設コンサルタント',
      col2Lines: [
        '一担当でなく、複数管理を統合し',
        'プロジェクト全体を見る立場で処遇される',
      ],
    },
    {
      col1: '建設会社',
      col2Lines: [
        '技術・安全管理・経営企画など',
        '「現場を一段引いて見る」役割で評価される',
      ],
    },
    {
      col1: '公益法人・第三者機関',
      col2Lines: [
        '検査・性能評価・技術審査。',
        'コスト/安全/環境/工程を見渡す総合判断が効く',
      ],
    },
    {
      col1: '非常勤・講師・\n技術士事務所',
      col2Lines: [
        '専門知識を活かした独立的な働き。',
        '総監は対外的な信頼の裏づけになる',
      ],
    },
  ];

  const NUM_ROWS = rows.length;

  // 全体高さ: DATA_TOP + 5行×ROW_H + 末尾余白80
  const H = DATA_TOP + NUM_ROWS * ROW_H + 80;

  // ============================================================
  // SVG 構築
  // ============================================================
  let body = '';

  // ---- タイトル（2行） ----
  body += `
  <!-- タイトル -->
  <text x="${W / 2}" y="${TITLE_Y}" font-family="${FONT}" font-size="34" font-weight="800" fill="${INK_STRONG}" text-anchor="middle">公務員技術者の定年後</text>
  <text x="${W / 2}" y="${TITLE2_Y}" font-family="${FONT}" font-size="34" font-weight="800" fill="${BRAND}" text-anchor="middle">選択肢と総監の効き方</text>
`;

  // ---- テーブルヘッダ ----
  const colHeaders = [
    { x: COL1_X, w: COL1_W, label: '定年後の選択肢' },
    { x: COL2_X, w: COL2_W, label: '総監がどう効くか' },
  ];

  body += `\n  <!-- テーブルヘッダ -->`;
  for (const col of colHeaders) {
    const textX = col.x + col.w / 2;
    const textY  = HEADER_TOP + HEADER_H / 2 + 9; // 垂直中央（ベースライン補正）
    body += `
  <rect x="${col.x}" y="${HEADER_TOP}" width="${col.w}" height="${HEADER_H}" rx="${RX}" fill="${BRAND}"/>
  <text x="${textX}" y="${textY}" font-family="${FONT}" font-size="24" font-weight="700" fill="#ffffff" text-anchor="middle">${xml(col.label)}</text>`;
  }

  // ---- データ行 ----
  body += `\n\n  <!-- テーブルデータ行 -->`;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowY  = DATA_TOP + i * ROW_H;
    const rowCY = rowY + ROW_H / 2; // 行の垂直中央

    // 行背景（白/薄グレー交互）
    const rowBg = i % 2 === 0 ? '#ffffff' : '#f3f4f6';

    // 行全体背景
    const fullRowX = COL1_X;
    const fullRowW = COL2_X + COL2_W - COL1_X;

    body += `\n  <!-- 行 ${i + 1}: ${r.col1.replace('\n', '')} -->`;
    body += `
  <rect x="${fullRowX}" y="${rowY}" width="${fullRowW}" height="${ROW_H}" fill="${rowBg}"/>`;

    // 列間の区切り線（縦線）
    body += `
  <line x1="${COL2_X - COL_GAP / 2}" y1="${rowY}" x2="${COL2_X - COL_GAP / 2}" y2="${rowY + ROW_H}" stroke="#dde1e7" stroke-width="1"/>`;

    // 行区切り（横線）
    if (i > 0) {
      body += `
  <line x1="${fullRowX}" y1="${rowY}" x2="${fullRowX + fullRowW}" y2="${rowY}" stroke="#dde1e7" stroke-width="1"/>`;
    }

    // ---- 列1: 定年後の選択肢（brand 色系・太字・垂直中央） ----
    // col1 が改行を含む場合（'\n'）は2行に分割
    const col1Lines = r.col1.split('\n');
    const col1TextX = COL1_X + COL1_W / 2;
    const LINE_DY1  = 30; // 列1行間
    const numLines1 = col1Lines.length;
    const col1Text1Y = rowCY - ((numLines1 - 1) * LINE_DY1) / 2 + 9;

    for (let li = 0; li < numLines1; li++) {
      body += `
  <text x="${col1TextX}" y="${col1Text1Y + li * LINE_DY1}" font-family="${FONT}" font-size="22" font-weight="700" fill="${BRAND_DEEP}" text-anchor="middle">${xml(col1Lines[li])}</text>`;
    }

    // ---- 列2: 総監がどう効くか（折り返し対応・左寄せ） ----
    const col2TextX  = COL2_X + 20; // 左寄せ（パディング20px）
    const LINE_DY2   = 30;  // 行間
    const numLines2  = r.col2Lines.length;
    // 複数行の場合: 垂直中央に揃える
    const col2Text1Y = rowCY - ((numLines2 - 1) * LINE_DY2) / 2 + 9;
    for (let li = 0; li < numLines2; li++) {
      body += `
  <text x="${col2TextX}" y="${col2Text1Y + li * LINE_DY2}" font-family="${FONT}" font-size="22" font-weight="400" fill="${INK_BODY}" text-anchor="start">${xml(r.col2Lines[li])}</text>`;
    }
  }

  // テーブル外枠
  const fullRowX  = COL1_X;
  const fullRowW  = COL2_X + COL2_W - COL1_X;
  const tableTop  = HEADER_TOP;
  const tableH    = HEADER_H + 40 + NUM_ROWS * ROW_H;
  body += `
  <!-- テーブル外枠 -->
  <rect x="${fullRowX}" y="${tableTop}" width="${fullRowW}" height="${tableH}" rx="${RX}" fill="none" stroke="#ccd0d8" stroke-width="1.5"/>`;

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
  console.log('Rendering figures for 公務員技術者の定年後資格戦略…');
  await render(svgRetirementOptions(), 'figure-1-retirement-options');
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
