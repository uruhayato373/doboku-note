#!/usr/bin/env node
// content/note/技術士総監/総監をAIで勉強する/img/ に本文用 PNG/SVG 図版を生成する。
//
// figure-1-ai-tools: 「総監対策に使えるAIツールの使い分け」
//   - 3行3列の表（ツール / 役割 / 向いている人）
//   - 1行目(NotebookLM)・2行目(対話型AI)は通常表示
//   - 3行目(Claude Code)は warn 系（#d4a017 / 薄背景 #fbf3df）で上級者向け区別
//   - 「ツール」列は brand 色のラベル
//
// figure-2-ai-limits: 「AIが得意なこと / AIに任せても埋まらないこと」
//   - 左右2カラム対比図
//   - 左（positive系）: AIが得意な3項目
//   - 右（danger系）: AIでは埋まらない3項目
//   - 右カラム下部に brand 帯で「教材が埋める」CTA
//
// 設計ルール（.claude/knowledge/reference/note-svg-policy.md 準拠）:
//   - キャンバス幅 1200（同一記事内で統一）
//   - フォント ≥ 22px（補足を含めて 18px 以上）
//   - 色トークン（src/styles/globals.css と整合）のみ使用
//   - 識別は右下 doboku-note.com テキストのみ（左端縦線なし）
//
// 使い方:
//   node scripts/render-figure-ai-tools.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'content/note/技術士総監/総監をAIで勉強する/img');
mkdirSync(OUT_DIR, { recursive: true });

// ブランドトークン（src/styles/globals.css と整合）
const BRAND       = '#2e6da4'; // brand
const BRAND_FILL  = '#e8f0fe'; // brand-fill
const BRAND_DEEP  = '#1a3a5c'; // brand-deep
const INK_STRONG  = '#222222'; // ink-strong
const INK_BODY    = '#555555'; // ink-body
const INK_MUTED   = '#8a8a8a'; // ink-muted
const WARN        = '#d4a017'; // warn
const WARN_FILL   = '#fbf3df'; // warn 薄背景
const POSITIVE    = '#3a7d44'; // positive
const POSITIVE_FILL = '#e6f1e8'; // positive 薄背景
const DANGER      = '#b22234'; // danger
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
// figure-1: 総監対策に使えるAIツールの使い分け
// ------------------------------------------------------------------
function svgAiTools() {
  // ============================================================
  // レイアウト定数
  // ============================================================
  const PAD_X   = 40;   // 左右キャンバスマージン
  const TITLE_Y = 62;   // タイトルベースライン

  // タイトル下 40px 確保 → サブタイトル行（なし）→ ヘッダ行開始
  const HEADER_TOP = TITLE_Y + 16 + 40; // = 118

  // 列定義（W=1200、PAD_X=40 → 使用幅=1120）
  // 列間マージン: 12px
  // 列1（ツール）:         x=40,  w=220
  // 列2（役割）:           x=272, w=540  ← テキストが長いので幅広め
  // 列3（向いている人）:   x=824, w=336  → 右端 824+336=1160 = W-40 ✓
  const COL_GAP = 12;

  const COL1_X = PAD_X;                         // 40
  const COL1_W = 220;
  const COL2_X = COL1_X + COL1_W + COL_GAP;    // 272
  const COL2_W = 540;
  const COL3_X = COL2_X + COL2_W + COL_GAP;    // 824
  const COL3_W = W - PAD_X - COL3_X;           // 1200 - 40 - 824 = 336

  // ヘッダ行
  const HEADER_H = 64;
  const RX = 6;

  // データ行の定義
  // 列2が2行になる行があるので行高を100pxに設定
  // ポリシー: 行高 ≥ 60px
  const ROW_H   = 108;
  const DATA_TOP = HEADER_TOP + HEADER_H + 40; // ヘッダ → データ行 40px

  // テーブルデータ
  const rows = [
    {
      col1: 'NotebookLM',
      col2Lines: [
        'キーワード集・過去問を読み込ませて質問する。',
        '資料の中だけで答えるので雑音が少ない',
      ],
      col3Lines: [
        '誰でも',
        '（ノーセットアップ・無料枠あり）',
      ],
      isWarn: false,
    },
    {
      col1: '対話型AI\n(Claude / ChatGPT)',
      col1Lines: ['対話型AI', '(Claude / ChatGPT)'],
      col2Lines: [
        '用語をかみ砕いて説明・言い換え。',
        '自分の理解を試す壁打ち相手',
      ],
      col3Lines: [
        '誰でも',
        '（最終確認は公式資料で）',
      ],
      isWarn: false,
    },
    {
      col1: 'Claude Code',
      col2Lines: [
        'ファイルを生成・更新できる。',
        '「自分だけの参考書」を構築できる',
      ],
      col3Lines: [
        '上級者',
        '（ターミナル操作・有料プランが必要）',
      ],
      isWarn: true,
    },
  ];

  const NUM_ROWS = rows.length;

  // 全体高さ: DATA_TOP + 3行×ROW_H + 末尾余白80
  const H = DATA_TOP + NUM_ROWS * ROW_H + 80;

  // ============================================================
  // SVG 構築
  // ============================================================
  let body = '';

  // ---- タイトル ----
  body += `
  <!-- タイトル -->
  <text x="${W / 2}" y="${TITLE_Y}" font-family="${FONT}" font-size="34" font-weight="800" fill="${INK_STRONG}" text-anchor="middle">総監対策に使えるAIツールの使い分け</text>
`;

  // ---- ヘッダ行 ----
  const colHeaders = [
    { x: COL1_X, w: COL1_W, label: 'ツール' },
    { x: COL2_X, w: COL2_W, label: '役割' },
    { x: COL3_X, w: COL3_W, label: '向いている人' },
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
    const rowY = DATA_TOP + i * ROW_H;
    const rowCY = rowY + ROW_H / 2; // 行の垂直中央

    // 行背景（warnは薄黄背景、通常は白/薄グレー交互）
    const rowBg = r.isWarn
      ? WARN_FILL
      : (i % 2 === 0 ? '#ffffff' : '#f8fafc');

    // 行全体背景
    const fullRowX = COL1_X;
    const fullRowW = COL3_X + COL3_W - COL1_X;

    body += `\n  <!-- 行 ${i + 1}: ${r.col1} -->`;
    body += `
  <rect x="${fullRowX}" y="${rowY}" width="${fullRowW}" height="${ROW_H}" fill="${rowBg}"/>`;

    // 列間の区切り線（縦線）
    for (const sep of [COL2_X, COL3_X]) {
      body += `
  <line x1="${sep - COL_GAP / 2}" y1="${rowY}" x2="${sep - COL_GAP / 2}" y2="${rowY + ROW_H}" stroke="#dde1e7" stroke-width="1"/>`;
    }

    // 行区切り（横線）
    if (i > 0) {
      body += `
  <line x1="${fullRowX}" y1="${rowY}" x2="${fullRowX + fullRowW}" y2="${rowY}" stroke="#dde1e7" stroke-width="1"/>`;
    }

    // ---- 列1: ツール名（中央揃え・2行対応）----
    const col1TextX = COL1_X + COL1_W / 2;
    const col1Fill  = r.isWarn ? WARN : BRAND;
    const col1Lines = r.col1Lines ?? [r.col1];
    const numCol1Lines = col1Lines.length;
    const LINE_DY_LABEL = 30;
    const col1Text1Y = rowCY - ((numCol1Lines - 1) * LINE_DY_LABEL) / 2 + 9;
    for (let li = 0; li < numCol1Lines; li++) {
      body += `
  <text x="${col1TextX}" y="${col1Text1Y + li * LINE_DY_LABEL}" font-family="${FONT}" font-size="22" font-weight="700" fill="${col1Fill}" text-anchor="middle">${xml(col1Lines[li])}</text>`;
    }

    // ---- 列2: 役割（左寄せ・折り返し対応）----
    const col2TextX = COL2_X + 24; // 左寄せ（パディング24px）
    const LINE_DY   = 30; // 行間
    const col2Lines = r.col2Lines;
    const numCol2Lines = col2Lines.length;
    const col2Text1Y = rowCY - ((numCol2Lines - 1) * LINE_DY) / 2 + 9;
    for (let li = 0; li < numCol2Lines; li++) {
      body += `
  <text x="${col2TextX}" y="${col2Text1Y + li * LINE_DY}" font-family="${FONT}" font-size="22" font-weight="400" fill="${INK_BODY}" text-anchor="start">${xml(col2Lines[li])}</text>`;
    }

    // ---- 列3: 向いている人（中央揃え・2行対応）----
    const col3TextX = COL3_X + COL3_W / 2;
    const col3Lines = r.col3Lines;
    const numCol3Lines = col3Lines.length;
    const col3Text1Y = rowCY - ((numCol3Lines - 1) * LINE_DY) / 2 + 9;
    const col3MainFill   = r.isWarn ? WARN : BRAND_DEEP;
    const col3SubFill    = r.isWarn ? WARN : INK_MUTED;
    for (let li = 0; li < numCol3Lines; li++) {
      const isMain = li === 0;
      body += `
  <text x="${col3TextX}" y="${col3Text1Y + li * LINE_DY}" font-family="${FONT}" font-size="${isMain ? '24' : '20'}" font-weight="${isMain ? '700' : '400'}" fill="${isMain ? col3MainFill : col3SubFill}" text-anchor="middle">${xml(col3Lines[li])}</text>`;
    }
  }

  // テーブル外枠
  const fullRowX = COL1_X;
  const fullRowW = COL3_X + COL3_W - COL1_X;
  const tableBottom = DATA_TOP + NUM_ROWS * ROW_H;
  body += `
  <!-- テーブル外枠 -->
  <rect x="${fullRowX}" y="${HEADER_TOP}" width="${fullRowW}" height="${HEADER_H + 40 + NUM_ROWS * ROW_H}" rx="${RX}" fill="none" stroke="#ccd0d8" stroke-width="1.5"/>`;

  // ---- 凡例 ----
  const LEGEND_Y = tableBottom + 28;
  body += `
  <!-- 凡例 -->
  <rect x="${COL1_X}" y="${LEGEND_Y}" width="18" height="18" rx="3" fill="${WARN_FILL}" stroke="${WARN}" stroke-width="1.5"/>
  <text x="${COL1_X + 26}" y="${LEGEND_Y + 14}" font-family="${FONT}" font-size="20" font-weight="400" fill="${INK_MUTED}" text-anchor="start">= 上級者向け（ターミナル操作・有料プランが必要）</text>`;

  // ---- ブランドフレーム ----
  body += `\n\n  ${brandFrame(H)}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${body}
</svg>`;
}

// ------------------------------------------------------------------
// figure-2: AIが得意なこと / AIに任せても埋まらないこと
// ------------------------------------------------------------------
function svgAiLimits() {
  // ============================================================
  // レイアウト定数
  // ============================================================
  const PAD_X    = 48;  // 左右キャンバスマージン
  const TITLE_Y  = 64;  // タイトルベースライン
  // タイトル下40px確保 → コンテンツ開始
  const CONTENT_TOP = TITLE_Y + 16 + 40; // = 120

  // 列構成（W=1200 内）
  // [PAD_X=48] [左カラム=510] [GAP=84] [右カラム=510] [PAD_X=48]
  // 48 + 510 + 84 + 510 + 48 = 1200 ✓
  const COL_GAP   = 84;
  const LEFT_X    = PAD_X;                       // 48
  const LEFT_W    = 510;
  const RIGHT_X   = LEFT_X + LEFT_W + COL_GAP;  // 642
  const RIGHT_W   = W - PAD_X - RIGHT_X;        // 1200 - 48 - 642 = 510

  // カラムヘッダ
  const HEADER_H = 64;
  const HEADER_Y = CONTENT_TOP;             // 120
  const ITEMS_TOP = HEADER_Y + HEADER_H + 40; // ヘッダ下40px → アイテム開始 = 224

  // アイテムカード定義
  // 1行 or 2行テキスト対応。行高120px、gap=16px
  const CARD_H   = 120;
  const CARD_GAP = 16;
  const CARD_PAD_X = 20;
  const CARD_PAD_Y = 20;
  const RX = 8;

  const leftItems = [
    { lines: ['用語を調べる・かみ砕いて説明させる'] },
    { lines: ['自分の理解を試す（アクティブリコール）'] },
    { lines: ['記述答案を校正・改訂する'] },
  ];

  const rightItems = [
    { lines: ['何を優先して覚えるか'] },
    { lines: ['引っかけパターンの先回り'] },
    { lines: ['17年分の出題頻度という', '「学習の地図」'] },
  ];

  // CTA帯（右カラム下部）
  const CTA_MARGIN_TOP = 24; // アイテム下端 → CTA帯上端
  const CTA_H = 80;          // CTA帯高さ
  const NUM_ITEMS = 3;
  const ITEMS_BLOCK_H = NUM_ITEMS * CARD_H + (NUM_ITEMS - 1) * CARD_GAP;
  const CTA_Y = ITEMS_TOP + ITEMS_BLOCK_H + CTA_MARGIN_TOP;

  // 全体高さ: CTA_Y + CTA_H + 末尾余白80
  const H = CTA_Y + CTA_H + 80;

  // ============================================================
  // SVG 構築
  // ============================================================
  let body = '';

  // ---- タイトル ----
  body += `
  <!-- タイトル -->
  <text x="${W / 2}" y="${TITLE_Y}" font-family="${FONT}" font-size="34" font-weight="800" fill="${INK_STRONG}" text-anchor="middle">AIが得意なこと / AIに任せても埋まらないこと</text>
`;

  // ---- カラムヘッダ ----
  body += `
  <!-- 左カラムヘッダ（positive） -->
  <rect x="${LEFT_X}" y="${HEADER_Y}" width="${LEFT_W}" height="${HEADER_H}" rx="${RX}" fill="${POSITIVE}"/>
  <text x="${LEFT_X + LEFT_W / 2}" y="${HEADER_Y + HEADER_H / 2 + 10}" font-family="${FONT}" font-size="26" font-weight="700" fill="#ffffff" text-anchor="middle">AIが得意</text>

  <!-- 右カラムヘッダ（danger） -->
  <rect x="${RIGHT_X}" y="${HEADER_Y}" width="${RIGHT_W}" height="${HEADER_H}" rx="${RX}" fill="${DANGER}"/>
  <text x="${RIGHT_X + RIGHT_W / 2}" y="${HEADER_Y + HEADER_H / 2 + 10}" font-family="${FONT}" font-size="26" font-weight="700" fill="#ffffff" text-anchor="middle">AIに任せても埋まらない</text>
`;

  // ---- 左カラム アイテム ----
  body += `\n  <!-- 左カラム アイテム -->`;
  for (let i = 0; i < leftItems.length; i++) {
    const item = leftItems[i];
    const cardY = ITEMS_TOP + i * (CARD_H + CARD_GAP);
    const cardCY = cardY + CARD_H / 2;
    const numLines = item.lines.length;
    const DY = 30;
    const textBlockH = (numLines - 1) * DY;
    const text1Y = cardCY - textBlockH / 2 + 9; // ベースライン補正

    body += `
  <rect x="${LEFT_X}" y="${cardY}" width="${LEFT_W}" height="${CARD_H}" rx="${RX}" fill="${POSITIVE_FILL}" stroke="${POSITIVE}" stroke-width="2"/>`;
    for (let li = 0; li < numLines; li++) {
      body += `
  <text x="${LEFT_X + CARD_PAD_X}" y="${text1Y + li * DY}" font-family="${FONT}" font-size="22" font-weight="600" fill="${POSITIVE}" text-anchor="start">${xml(item.lines[li])}</text>`;
    }
  }

  // ---- 右カラム アイテム ----
  body += `\n\n  <!-- 右カラム アイテム -->`;
  for (let i = 0; i < rightItems.length; i++) {
    const item = rightItems[i];
    const cardY = ITEMS_TOP + i * (CARD_H + CARD_GAP);
    const cardCY = cardY + CARD_H / 2;
    const numLines = item.lines.length;
    const DY = 30;
    const textBlockH = (numLines - 1) * DY;
    const text1Y = cardCY - textBlockH / 2 + 9;

    body += `
  <rect x="${RIGHT_X}" y="${cardY}" width="${RIGHT_W}" height="${CARD_H}" rx="${RX}" fill="${DANGER_FILL}" stroke="${DANGER}" stroke-width="2"/>`;
    for (let li = 0; li < numLines; li++) {
      body += `
  <text x="${RIGHT_X + CARD_PAD_X}" y="${text1Y + li * DY}" font-family="${FONT}" font-size="22" font-weight="600" fill="${DANGER}" text-anchor="start">${xml(item.lines[li])}</text>`;
    }
  }

  // ---- 右カラム下部 CTA 帯（brand色） ----
  // 右カラムの直下に収まる帯。右カラム幅と同じ x/w。
  body += `

  <!-- CTA 帯（brand色）右カラム下部 -->
  <rect x="${RIGHT_X}" y="${CTA_Y}" width="${RIGHT_W}" height="${CTA_H}" rx="${RX}" fill="${BRAND_FILL}" stroke="${BRAND}" stroke-width="2"/>
  <text x="${RIGHT_X + CARD_PAD_X}" y="${CTA_Y + CTA_H / 2 - 6}" font-family="${FONT}" font-size="22" font-weight="700" fill="${BRAND}" text-anchor="start">&#x2192; ここは「出題視点で分析された教材</text>
  <text x="${RIGHT_X + CARD_PAD_X}" y="${CTA_Y + CTA_H / 2 + 24}" font-family="${FONT}" font-size="22" font-weight="700" fill="${BRAND}" text-anchor="start">（精読ガイド）」が埋める</text>
`;

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
  console.log('Rendering figures for 総監をAIで勉強する…');
  await render(svgAiTools(), 'figure-1-ai-tools');
  await render(svgAiLimits(), 'figure-2-ai-limits');
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
