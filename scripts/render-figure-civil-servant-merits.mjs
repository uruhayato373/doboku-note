#!/usr/bin/env node
// content/note/技術士総監/公務員が総監を取るメリット/img/ に本文用 PNG/SVG 図版を生成する。
//
// figure-1-five-merits: 「自治体の技術職員が総監を取る5つのメリット」
//   - 5枚の番号付きカードを縦に積む
//   - 左: 番号バッジ（brand 色の円）
//   - 右: 見出し（太字）+ 説明1行
//   - メリット4（定年後）のみ positive 色バッジ
//
// 設計ルール（.claude/knowledge/reference/note-svg-policy.md 準拠）:
//   - キャンバス幅 1200
//   - フォント ≥ 22px（補足を含めて 18px 以上）
//   - タイトル下 40px → コンテンツ開始
//   - カード間隙間 24px 以上、カード内パディング 20px
//   - 色トークン（src/styles/globals.css と整合）のみ使用
//   - 識別は右下 doboku-note.com テキストのみ（左端縦線なし）
//   - 末尾余白 80px
//
// 使い方:
//   node scripts/render-figure-civil-servant-merits.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'content/note/技術士総監/公務員が総監を取るメリット/img');
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
// 図 1: 自治体の技術職員が総監を取る5つのメリット
// ------------------------------------------------------------------
function svgFiveMerits() {
  // ============================================================
  // レイアウト定数
  // ============================================================
  const PAD_X    = 48;   // 左右キャンバスマージン
  const TITLE_Y  = 60;   // タイトルベースライン
  // タイトルは2行に収まるよう設計
  const SUBTITLE_Y = TITLE_Y + 40; // サブタイトル行（タイトル補足）
  // タイトル下 40px 確保 → コンテンツ開始
  const CONTENT_TOP = SUBTITLE_Y + 40 + 8; // = 148

  // カード定数
  const CARD_W    = W - 2 * PAD_X; // = 1104
  const CARD_H    = 148;  // 各カード高さ（番号バッジ + 2行テキスト）
  const CARD_GAP  = 24;   // カード間隙間（ポリシー最低値 24px）
  const CARD_PAD  = 24;   // カード内パディング（左右上下）
  const RX        = 8;    // 角丸

  // 番号バッジ（円）
  const BADGE_R   = 34;   // 半径
  const BADGE_CX  = PAD_X + CARD_PAD + BADGE_R; // 円中心X
  // テキスト開始X: バッジ右端 + マージン
  const TEXT_X    = BADGE_CX + BADGE_R + 24; // 機械計算: バッジx + 直径 + マージン24

  // タイトル行・説明行のY座標（カード内）
  // カード中心 = cardY + CARD_H/2
  // 2行（タイトル + 説明）の合計高さ = 28 + 16 + 22 = 66px
  // 1行目ベースライン = カード中心 - 33 + 9
  const TITLE_DY  = 38;   // タイトルと説明行の行間（≥16px 確保）

  // メリットデータ
  const merits = [
    {
      num: '1',
      heading: '発注者業務の「判断軸」が増える',
      body: '5管理のトレードオフ思考が日常の判断に効く',
      badgeFill: BRAND,
      cardBg: '#ffffff',
      cardStroke: BRAND,
      headingFill: BRAND_DEEP,
    },
    {
      num: '2',
      heading: '技術士の中で「管理職に向かう人」の資格',
      body: '専門技術の深さより、組織・事業を俯瞰する力を問われる',
      badgeFill: BRAND,
      cardBg: '#ffffff',
      cardStroke: BRAND,
      headingFill: BRAND_DEEP,
    },
    {
      num: '3',
      heading: '昇任・人事評価で評価されることがある',
      body: 'ただし扱いは自治体によって差あり（まず人事規程を確認）',
      badgeFill: BRAND,
      cardBg: '#ffffff',
      cardStroke: BRAND,
      headingFill: BRAND_DEEP,
    },
    {
      num: '4',
      heading: '定年後の選択肢が広がる',
      body: '建設コンサル等への再就職で強い武器になる',
      badgeFill: POSITIVE,
      cardBg: POSITIVE_FILL,
      cardStroke: POSITIVE,
      headingFill: '#1e5c2a',
      note: '退職後に効く',
    },
    {
      num: '5',
      heading: 'これまでの経験が「言語化」される',
      body: '5管理の枠組みで実務経験を棚卸しできる',
      badgeFill: BRAND,
      cardBg: '#ffffff',
      cardStroke: BRAND,
      headingFill: BRAND_DEEP,
    },
  ];

  // 全体高さ計算: コンテンツ開始 + 5カード×高さ + 4ギャップ + 末尾余白80
  const TOTAL_CARDS_H = merits.length * CARD_H + (merits.length - 1) * CARD_GAP;
  const H = CONTENT_TOP + TOTAL_CARDS_H + 80;

  // ============================================================
  // SVG 構築
  // ============================================================
  let body = '';

  // ---- タイトル（2行） ----
  body += `
  <!-- タイトル -->
  <text x="${W / 2}" y="${TITLE_Y}" font-family="${FONT}" font-size="34" font-weight="800" fill="${INK_STRONG}" text-anchor="middle">自治体の技術職員が総監を取る</text>
  <text x="${W / 2}" y="${SUBTITLE_Y}" font-family="${FONT}" font-size="34" font-weight="800" fill="${BRAND}" text-anchor="middle">5つのメリット</text>
`;

  // ---- 各メリットカード ----
  for (let i = 0; i < merits.length; i++) {
    const m = merits[i];
    const cardX = PAD_X;
    const cardY = CONTENT_TOP + i * (CARD_H + CARD_GAP);

    // 番号バッジの垂直中心: カード垂直中央
    const badgeCY = cardY + CARD_H / 2;

    // テキスト2行の高さ: タイトル28px + 間16px + 説明22px
    // テキストブロック合計: 38 + 22 = 60px（TITLE_DY=38 を行間として利用）
    // 1行目ベースライン: カード中央 - (TITLE_DY/2) + 9（ベースライン補正）
    const headingY = badgeCY - TITLE_DY / 2 + 9;
    const bodyY    = headingY + TITLE_DY;

    body += `
  <!-- メリット ${m.num} カード -->
  <rect x="${cardX}" y="${cardY}" width="${CARD_W}" height="${CARD_H}" rx="${RX}" fill="${m.cardBg}" stroke="${m.cardStroke}" stroke-width="2"/>

  <!-- 番号バッジ -->
  <circle cx="${BADGE_CX}" cy="${badgeCY}" r="${BADGE_R}" fill="${m.badgeFill}"/>
  <text x="${BADGE_CX}" y="${badgeCY + 14}" font-family="${FONT}" font-size="36" font-weight="900" fill="#ffffff" text-anchor="middle">${xml(m.num)}</text>
`;

    body += `
  <!-- メリット ${m.num} テキスト -->
  <text x="${TEXT_X}" y="${headingY}" font-family="${FONT}" font-size="28" font-weight="800" fill="${m.headingFill}" text-anchor="start">${xml(m.heading)}</text>
  <text x="${TEXT_X}" y="${bodyY}" font-family="${FONT}" font-size="22" font-weight="400" fill="${INK_BODY}" text-anchor="start">${xml(m.body)}</text>
`;

    // メリット4（定年後）は「退職後に効く」ラベルをカード右上にピル表示
    if (m.note) {
      const PILL_W = 148;
      const PILL_H = 32;
      const PILL_X = PAD_X + CARD_W - PILL_W - 16;
      const PILL_Y = cardY + 12;
      body += `
  <!-- メリット ${m.num} ノートラベル（ピル） -->
  <rect x="${PILL_X}" y="${PILL_Y}" width="${PILL_W}" height="${PILL_H}" rx="16" fill="${m.badgeFill}"/>
  <text x="${PILL_X + PILL_W / 2}" y="${PILL_Y + PILL_H / 2 + 8}" font-family="${FONT}" font-size="18" font-weight="700" fill="#ffffff" text-anchor="middle">${xml(m.note)}</text>
`;
    }
  }

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
  console.log('Rendering figures for 公務員が総監を取るメリット…');
  await render(svgFiveMerits(), 'figure-1-five-merits');
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
