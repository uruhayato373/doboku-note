#!/usr/bin/env node
// content/note/技術士総監/発注者業務を5管理に翻訳/img/ に本文用 PNG/SVG 図版を生成する。
//
// figure-1-translate-table: 「発注者の日常業務を5管理に翻訳する」
//   - 5管理 × 3列の表（5管理 / 発注者の日常業務の例 / 翻訳のしやすさ）
//   - 「翻訳のしやすさ」列は 高=positive(#3a7d44)・中=warn(#d4a017)・低=danger(#b22234) バッジ
//   - 行は「しやすさ」順（高→低）: 経済性管理・社会環境管理・情報管理・安全管理・人的資源管理
//   - 2列目はテキストが長いので列幅を十分取り、必要なら2行折り返し
//
// 設計ルール（.claude/knowledge/reference/note-svg-policy.md 準拠）:
//   - キャンバス幅 W=1200（同一記事内で統一）
//   - フォント ≥ 22px（補足を含めて 18px 以上）
//   - 色トークン（src/styles/globals.css と整合）のみ使用
//   - 識別は右下 doboku-note.com テキストのみ（左端縦線なし）
//
// 使い方:
//   node scripts/render-figure-translate-5mgmt.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'content/note/技術士総監/発注者業務を5管理に翻訳/img');
mkdirSync(OUT_DIR, { recursive: true });

// ブランドトークン（src/styles/globals.css と整合）
const BRAND      = '#2e6da4'; // brand
const BRAND_FILL = '#e8f0fe'; // brand-fill
const BRAND_DEEP = '#1a3a5c'; // brand-deep
const INK_STRONG = '#222222'; // ink-strong
const INK_BODY   = '#555555'; // ink-body
const INK_MUTED  = '#8a8a8a'; // ink-muted
const POSITIVE   = '#3a7d44'; // positive
const POSITIVE_FILL = '#e6f4ea'; // positive 薄背景
const WARN       = '#d4a017'; // warn
const WARN_FILL  = '#fdf6e3'; // warn 薄背景
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
// figure-1: 発注者の日常業務を5管理に翻訳する
// ------------------------------------------------------------------
function svgTranslateTable() {
  // ============================================================
  // レイアウト定数
  // ============================================================
  const PAD_X    = 40;   // 左右キャンバスマージン
  const TITLE_Y  = 62;   // タイトルベースライン（font-size=34 → top約28px）
  // タイトル下 40px 確保 → ヘッダ行開始
  const HEADER_TOP = TITLE_Y + 16 + 40; // ≈ 118

  // 列定義（W=1200、PAD_X=40 → 使用幅=1120）
  // 列間マージン: 12px
  // 列1（5管理）:             x=40,   w=200  ← 漢字5文字+ルビなし
  // 列2（発注者の日常業務の例）: x=252,  w=640  ← テキスト最長・折り返しあり
  // 列3（翻訳のしやすさ）:     x=904,  w=256  → 右端 904+256=1160 = W-40 ✓
  const COL_GAP = 12;

  const COL1_X = PAD_X;      // 40
  const COL1_W = 200;
  const COL2_X = COL1_X + COL1_W + COL_GAP; // 252
  const COL2_W = 640;
  const COL3_X = COL2_X + COL2_W + COL_GAP; // 904
  const COL3_W = W - PAD_X - COL3_X;        // 1200 - 40 - 904 = 256

  // ヘッダ行
  const HEADER_H = 60;
  const RX = 6;

  // データ行
  // 2列目が2行になる行があるので行高を96px（60px以上・2行収容）
  const ROW_H   = 96;
  const DATA_TOP = HEADER_TOP + HEADER_H + 40; // ヘッダ → データ行 40px

  // 凡例エリア高さ
  const LEGEND_ITEM_H = 32;
  const LEGEND_ITEMS  = 3;
  const LEGEND_TOP_OFFSET = 32; // テーブル下から凡例まで

  // テーブルデータ（「しやすさ」降順: 高→中→低）
  // col2Lines: 1行か2行に分割してレイアウト計算
  const rows = [
    {
      col1: '経済性管理',
      col2Lines: [
        '事業の必要性評価・予算要求・積算・工程監督・コスト縮減',
      ],
      ease: '高',
      easeColor: POSITIVE,
      easeFill: POSITIVE_FILL,
    },
    {
      col1: '社会環境管理',
      col2Lines: [
        '環境影響評価・住民説明と合意形成・騒音配慮・建設副産物',
      ],
      ease: '高',
      easeColor: POSITIVE,
      easeFill: POSITIVE_FILL,
    },
    {
      col1: '情報管理',
      col2Lines: [
        '図面/点検データの管理・電子納品・台帳/GIS・情報公開',
      ],
      ease: '中',
      easeColor: WARN,
      easeFill: WARN_FILL,
    },
    {
      col1: '安全管理',
      col2Lines: [
        '安全管理計画の確認・災害時対応・施設のリスク評価',
      ],
      ease: '中',
      easeColor: WARN,
      easeFill: WARN_FILL,
    },
    {
      col1: '人的資源管理',
      col2Lines: [
        '課の体制づくり・委託先/受注者との関係・技術継承',
      ],
      ease: '低',
      easeColor: DANGER,
      easeFill: DANGER_FILL,
    },
  ];

  const NUM_ROWS = rows.length;

  // 全体高さ計算:
  //   HEADER_TOP + HEADER_H + 40(gap) + NUM_ROWS*ROW_H + LEGEND_TOP_OFFSET + LEGEND_ITEMS*LEGEND_ITEM_H + 80(末尾余白)
  const LEGEND_TOP = DATA_TOP + NUM_ROWS * ROW_H + LEGEND_TOP_OFFSET;
  const H = LEGEND_TOP + LEGEND_ITEMS * LEGEND_ITEM_H + 80;

  // ============================================================
  // SVG 構築
  // ============================================================
  let body = '';

  // ---- タイトル ----
  body += `
  <!-- タイトル -->
  <text x="${W / 2}" y="${TITLE_Y}" font-family="${FONT}" font-size="34" font-weight="800" fill="${INK_STRONG}" text-anchor="middle">発注者の日常業務を5管理に翻訳する</text>
`;

  // ---- ヘッダ行 ----
  const colHeaders = [
    { x: COL1_X, w: COL1_W, label: '5管理' },
    { x: COL2_X, w: COL2_W, label: '発注者の日常業務の例' },
    { x: COL3_X, w: COL3_W, label: '翻訳のしやすさ' },
  ];

  body += `\n  <!-- テーブルヘッダ -->`;
  for (const col of colHeaders) {
    const textX = col.x + col.w / 2;
    const textY  = HEADER_TOP + HEADER_H / 2 + 9; // 垂直中央（ベースライン補正）
    body += `
  <rect x="${col.x}" y="${HEADER_TOP}" width="${col.w}" height="${HEADER_H}" rx="${RX}" fill="${BRAND}"/>
  <text x="${textX}" y="${textY}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">${xml(col.label)}</text>`;
  }

  // テーブル全幅
  const fullRowX = COL1_X;
  const fullRowW = COL3_X + COL3_W - COL1_X;

  // ---- データ行 ----
  body += `\n\n  <!-- テーブルデータ行 -->`;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowY = DATA_TOP + i * ROW_H;
    const rowCY = rowY + ROW_H / 2; // 行の垂直中央

    // 行背景: ease ごとの薄い塗り
    const rowBg = r.easeFill;

    body += `\n  <!-- 行 ${i + 1}: ${r.col1} -->`;

    // 行全体背景
    body += `
  <rect x="${fullRowX}" y="${rowY}" width="${fullRowW}" height="${ROW_H}" fill="${rowBg}"/>`;

    // 列間の区切り線（縦線）
    for (const sepX of [COL2_X, COL3_X]) {
      body += `
  <line x1="${sepX - COL_GAP / 2}" y1="${rowY}" x2="${sepX - COL_GAP / 2}" y2="${rowY + ROW_H}" stroke="#dde1e7" stroke-width="1"/>`;
    }

    // 行区切り横線（最初の行以降）
    if (i > 0) {
      body += `
  <line x1="${fullRowX}" y1="${rowY}" x2="${fullRowX + fullRowW}" y2="${rowY}" stroke="#dde1e7" stroke-width="1"/>`;
    }

    // ---- 列1: 5管理（太字・brand-deep）----
    const col1TextX = COL1_X + COL1_W / 2;
    body += `
  <text x="${col1TextX}" y="${rowCY + 9}" font-family="${FONT}" font-size="22" font-weight="700" fill="${BRAND_DEEP}" text-anchor="middle">${xml(r.col1)}</text>`;

    // ---- 列2: 日常業務の例（折り返し対応・左寄せ）----
    const col2TextX = COL2_X + 20; // 左パディング 20px
    const LINE_DY   = 32; // 行間（22px + 10px余白）
    const numLines  = r.col2Lines.length;
    // 複数行垂直中央: 1行目Y = rowCY - (numLines-1)*LINE_DY/2 + 9
    const col2Text1Y = rowCY - ((numLines - 1) * LINE_DY) / 2 + 9;
    for (let li = 0; li < numLines; li++) {
      body += `
  <text x="${col2TextX}" y="${col2Text1Y + li * LINE_DY}" font-family="${FONT}" font-size="22" font-weight="400" fill="${INK_BODY}" text-anchor="start">${xml(r.col2Lines[li])}</text>`;
    }

    // ---- 列3: 翻訳のしやすさ バッジ ----
    // バッジ: 角丸長方形 + テキスト
    const BADGE_W = 90;
    const BADGE_H = 46;
    const col3CX  = COL3_X + COL3_W / 2;
    const badgeX  = col3CX - BADGE_W / 2;
    const badgeY  = rowCY - BADGE_H / 2;
    body += `
  <rect x="${badgeX}" y="${badgeY}" width="${BADGE_W}" height="${BADGE_H}" rx="8" fill="${r.easeColor}"/>
  <text x="${col3CX}" y="${rowCY + 9}" font-family="${FONT}" font-size="26" font-weight="700" fill="#ffffff" text-anchor="middle">${xml(r.ease)}</text>`;
  }

  // テーブル外枠
  const tableH = HEADER_H + 40 + NUM_ROWS * ROW_H;
  body += `
  <!-- テーブル外枠 -->
  <rect x="${fullRowX}" y="${HEADER_TOP}" width="${fullRowW}" height="${tableH}" rx="${RX}" fill="none" stroke="#ccd0d8" stroke-width="1.5"/>`;

  // ---- 凡例 ----
  body += `\n\n  <!-- 凡例 -->`;
  const legendItems = [
    { color: POSITIVE, fill: POSITIVE_FILL, label: '高 = 発注者の日常業務と重なりやすい（得点しやすい）' },
    { color: WARN,     fill: WARN_FILL,     label: '中 = 一部重なるが専門的知識も必要' },
    { color: DANGER,   fill: DANGER_FILL,   label: '低 = 実務から遠く、理解に時間がかかる（盲点になりやすい）' },
  ];
  for (let i = 0; i < legendItems.length; i++) {
    const item = legendItems[i];
    const ly = LEGEND_TOP + i * LEGEND_ITEM_H;
    const SWATCH_W = 40;
    const SWATCH_H = 22;
    body += `
  <rect x="${COL1_X}" y="${ly}" width="${SWATCH_W}" height="${SWATCH_H}" rx="4" fill="${item.fill}" stroke="${item.color}" stroke-width="1.5"/>
  <text x="${COL1_X + SWATCH_W + 12}" y="${ly + 17}" font-family="${FONT}" font-size="20" font-weight="400" fill="${INK_MUTED}" text-anchor="start">${xml(item.label)}</text>`;
  }

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
  console.log(`  ok: ${svgPath}`);
  console.log(`  ok: ${pngPath}`);
}

async function main() {
  console.log('Rendering figures for 発注者業務を5管理に翻訳...');
  await render(svgTranslateTable(), 'figure-1-translate-table');
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
