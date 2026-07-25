#!/usr/bin/env node
// docs/note/技術士総監/総監を取って独立した技術者の収入実態/img/ に本文用 PNG/SVG 図版を生成する。
//
// figure-1-independence-cases: 「独立した技術士の収入実態 5 ケース」
//   - 5枚のケースカードを縦に積む
//   - 左: 番号バッジ（brand 色の円）
//   - 中央: タイトル + 本文
//   - 右: 収入指標（positive/warn）
//   - ケース5（アンケート）のみ warn 色バッジ
//
// 設計ルール（.claude/knowledge/reference/note-svg-policy.md 準拠）:
//   - キャンバス幅 1200
//   - フォント ≥ 22px（補足を含めて 18px 以上）
//   - タイトル下 40px → コンテンツ開始
//   - カード間隙間 16px、カード内パディング 20px
//   - 色トークン（src/styles/globals.css と整合）のみ使用
//   - 識別は右下 doboku-note.com テキストのみ（左端縦線なし）
//   - 末尾余白 80px
//
// 使い方:
//   node scripts/render-figure-independence-income.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'docs/note/技術士総監/総監を取って独立した技術者の収入実態/img');
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
const WARN         = '#c87e1e'; // warn
const WARN_FILL    = '#fdf2e0'; // warn-fill
const WARN_DEEP    = '#8c5a14'; // warn-deep
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
// 図 1: 独立した技術士の収入実態 5 ケース
// ------------------------------------------------------------------
function svgIndependenceCases() {
  // ============================================================
  // レイアウト定数
  // ============================================================
  const PAD_X      = 60;   // 左右キャンバスマージン
  const TITLE_Y    = 75;   // タイトルベースライン
  const SUBTITLE_Y = TITLE_Y + 40; // サブタイトル行

  // タイトル下 40px 確保 → コンテンツ開始（ポリシー §3 必須）
  const CONTENT_TOP = SUBTITLE_Y + 40;

  // カード定数
  const CARD_W    = W - 2 * PAD_X; // = 1080
  const CARD_H    = 160; // 各カード高さ
  const CARD_GAP  = 16;  // カード間隙間（仕様値）
  const RX        = 8;   // 角丸

  // 番号バッジ（円）
  const BADGE_R   = 34;                      // 半径
  const BADGE_CX  = PAD_X + 24 + BADGE_R;   // = 118（仕様値）

  // テキスト中央ブロック: X=180、幅=700
  const TEXT_X    = 180;
  const TEXT_W    = 700;

  // 右の収入指標エリア: X=900〜1140（240px 幅）
  const METRIC_X  = 900;
  const METRIC_MID = METRIC_X + 120; // 中央揃え用

  // 行間隔
  const HEADING_DY = 36; // タイトルと本文の行間

  // ケースデータ
  const cases = [
    {
      num: '1',
      title: '秋元技術士事務所',
      body1: '51歳でリーマンショック後に独立',
      body2: 'プラスチック成形ニッチ特化',
      metric: '5年で前職水準到達',
      badgeFill:  BRAND,
      cardBg:     '#ffffff',
      cardStroke: BRAND,
      titleFill:  BRAND_DEEP,
      metricFill: POSITIVE,
    },
    {
      num: '2',
      title: 'TPEO（副業形態）',
      body1: '在職中の副業として note で連載',
      body2: '透明な数字公開',
      metric: '3ヶ月で ¥157,000',
      badgeFill:  BRAND,
      cardBg:     '#ffffff',
      cardStroke: BRAND,
      titleFill:  BRAND_DEEP,
      metricFill: POSITIVE,
    },
    {
      num: '3',
      title: '新規開業技術士支援研究会',
      body1: '開業1〜8年目の技術士が在籍',
      body2: '独立後の相互支援組織（CEA）',
      metric: '収入数字は非公開',
      badgeFill:  BRAND,
      cardBg:     '#ffffff',
      cardStroke: BRAND,
      titleFill:  BRAND_DEEP,
      metricFill: INK_MUTED,
    },
    {
      num: '4',
      title: '建設部門 独立者',
      body1: '公共系コンサルから独立',
      body2: '元請10年 ＋ 人脈が前提',
      metric: '初年度 売上 2,000万超',
      badgeFill:  BRAND,
      cardBg:     '#ffffff',
      cardStroke: BRAND,
      titleFill:  BRAND_DEEP,
      metricFill: POSITIVE,
    },
    {
      num: '5',
      title: '技術士独立開業研究会',
      body1: '「年1,000万円」を掲げる会',
      body2: '達成している会員も存在',
      metric: '1,000万円/年 が目標',
      badgeFill:  BRAND,
      cardBg:     '#ffffff',
      cardStroke: BRAND,
      titleFill:  BRAND_DEEP,
      metricFill: POSITIVE,
    },
  ];

  // 全体高さ計算: コンテンツ開始 + 5カード×高さ + 4ギャップ + 末尾余白80
  const TOTAL_CARDS_H = cases.length * CARD_H + (cases.length - 1) * CARD_GAP;
  const H = CONTENT_TOP + TOTAL_CARDS_H + 80;

  // ============================================================
  // SVG 構築
  // ============================================================
  let body = '';

  // ---- タイトル ----
  body += `
  <!-- タイトル -->
  <text x="${W / 2}" y="${TITLE_Y}" font-family="${FONT}" font-size="36" font-weight="800" fill="${INK_STRONG}" text-anchor="middle">独立した技術士の収入実態 5ケース</text>
  <text x="${W / 2}" y="${SUBTITLE_Y}" font-family="${FONT}" font-size="22" font-weight="400" fill="${INK_BODY}" text-anchor="middle">公開情報5事例。独立技術士は年商100万円以下が約7割という二極化が前提</text>
`;

  // ---- 各ケースカード ----
  for (let i = 0; i < cases.length; i++) {
    const c       = cases[i];
    const cardX   = PAD_X;
    const cardY   = CONTENT_TOP + i * (CARD_H + CARD_GAP);

    // バッジ垂直中心: カード垂直中央
    const badgeCY = cardY + CARD_H / 2;

    // テキスト3行の垂直配置
    // 3行: タイトル(28px) + body1(22px) + body2(22px)
    // 合計高さ(行間含む): 36 + 28 = 64px (HEADING_DY=36 を行間として利用)
    // 1行目ベースライン: カード中央 - (全体高さ/2) + タイトル分のベースライン補正
    // 全テキストブロック高: titleSize + 2*(HEADING_DY) = 28 + 36 + 22 = 86px
    const textBlockH  = 28 + HEADING_DY + 22;   // 86px
    const titleY      = badgeCY - textBlockH / 2 + 28; // ベースライン = top + ascent(28)
    const body1Y      = titleY + HEADING_DY;
    const body2Y      = body1Y + 28; // body1 と body2 は 28px 行間

    // 収入指標: カード縦中央
    const metricY = badgeCY + 10; // ベースライン補正

    body += `
  <!-- ケース ${c.num} カード -->
  <rect x="${cardX}" y="${cardY}" width="${CARD_W}" height="${CARD_H}" rx="${RX}" fill="${c.cardBg}" stroke="${c.cardStroke}" stroke-width="2"/>

  <!-- 番号バッジ -->
  <circle cx="${BADGE_CX}" cy="${badgeCY}" r="${BADGE_R}" fill="${c.badgeFill}"/>
  <text x="${BADGE_CX}" y="${badgeCY + 14}" font-family="${FONT}" font-size="36" font-weight="900" fill="#ffffff" text-anchor="middle">${xml(c.num)}</text>

  <!-- ケース ${c.num} 中央テキスト -->
  <text x="${TEXT_X}" y="${titleY}" font-family="${FONT}" font-size="28" font-weight="800" fill="${c.titleFill}" text-anchor="start">${xml(c.title)}</text>
  <text x="${TEXT_X}" y="${body1Y}" font-family="${FONT}" font-size="22" font-weight="400" fill="${INK_BODY}" text-anchor="start">${xml(c.body1)}</text>
  <text x="${TEXT_X}" y="${body2Y}" font-family="${FONT}" font-size="22" font-weight="400" fill="${INK_MUTED}" text-anchor="start">${xml(c.body2)}</text>

  <!-- ケース ${c.num} 収入指標 -->
  <text x="${METRIC_MID}" y="${metricY}" font-family="${FONT}" font-size="24" font-weight="800" fill="${c.metricFill}" text-anchor="middle">${xml(c.metric)}</text>
`;
  }

  // ---- 区切り線（右ペインとテキストの境界をわかりやすく） ----
  // 収入指標エリア左端に縦の補助線（薄いグレー）
  for (let i = 0; i < cases.length; i++) {
    const cardY = CONTENT_TOP + i * (CARD_H + CARD_GAP);
    body += `
  <line x1="${METRIC_X - 10}" y1="${cardY + 16}" x2="${METRIC_X - 10}" y2="${cardY + CARD_H - 16}" stroke="#d0d0d0" stroke-width="1"/>`;
  }

  // ---- ブランドフレーム ----
  body += `\n${brandFrame(H)}`;

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
  console.log('Rendering figures for 総監を取って独立した技術者の収入実態…');
  await render(svgIndependenceCases(), 'figure-1-independence-cases');
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
