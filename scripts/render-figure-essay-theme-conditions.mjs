#!/usr/bin/env node
// docs/note/技術士総監/道路担当の記述式テーマ選び/img/ に本文用 PNG/SVG 図版を生成する。
//
// figure-1-theme-conditions: 「記述式に向く『良い題材』の3条件」
//   - 3つの番号付きカードを縦に積む
//   - 左に番号バッジ（1〜3、brand色 #2e6da4 の円）
//   - 右に「条件（太字）」＋「説明」＋「道路担当の例（補足色）」
//
// 設計ルール（.claude/knowledge/reference/note-svg-policy.md 準拠）:
//   - キャンバス幅 1200
//   - フォント ≥ 22px（補足は 18px 以上）
//   - 色トークン（src/styles/globals.css と整合）のみ使用
//   - 識別は右下 doboku-note.com テキストのみ（左端縦線なし）
//   - 番号バッジとテキストの x 座標は機械計算で重なり防止
//
// 使い方:
//   node scripts/render-figure-essay-theme-conditions.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'docs/note/技術士総監/道路担当の記述式テーマ選び/img');
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
// 図 1: 記述式に向く「良い題材」の3条件
// ------------------------------------------------------------------
function svgThemeConditions() {
  // ============================================================
  // レイアウト定数
  // ============================================================
  const PAD_X       = 60;  // 左右キャンバスマージン
  const TITLE_Y     = 68;  // タイトルベースライン
  // タイトル下 40px 確保 → コンテンツ開始
  const CONTENT_TOP = TITLE_Y + 40 + 16; // = 124

  // 番号バッジ
  const BADGE_R   = 36;   // バッジ円半径
  const BADGE_CX  = PAD_X + BADGE_R; // = 96（バッジ中心X）
  const BADGE_NUM_FS = 36; // バッジ内番号フォントサイズ

  // カード寸法
  const CARD_W     = W - 2 * PAD_X;       // 1080
  const CARD_PAD_X = 20;                   // カード内左右パディング
  const CARD_PAD_Y = 24;                   // カード内上下パディング
  const RX         = 8;                    // 角丸

  // テキスト開始X（バッジ右端 + 32px マージン）
  // バッジ右端 = BADGE_CX + BADGE_R = 96 + 36 = 132
  // テキストX  = 132 + 32 = 164（カード左端 PAD_X=60 からの相対では 164-60=104）
  const TEXT_START_X = BADGE_CX + BADGE_R + 32; // 164
  const TEXT_W       = W - PAD_X - TEXT_START_X - PAD_X; // 1200 - 60 - 164 - 60 = 916

  // フォントサイズ
  const FS_TITLE       = 34;  // 図タイトル
  const FS_CONDITION   = 26;  // 条件（太字）
  const FS_BODY        = 22;  // 説明文
  const FS_EXAMPLE     = 18;  // 道路担当の例（補足）

  // 行間
  const DY_CONDITION_BODY = 40; // 条件→説明の行間
  const DY_BODY_EXAMPLE   = 32; // 説明→例の行間
  const DY_BODY_LINE      = 30; // 説明文の複数行間（使用しないが定義）

  // 各カードの内部高さ計算:
  // CARD_PAD_Y + 条件行(26) + DY_CONDITION_BODY + 説明行(22) + DY_BODY_EXAMPLE + 例行(18) + CARD_PAD_Y
  // = 24 + 26 + 40 + 22 + 32 + 18 + 24 = 186 → 200 に丸め（余裕）
  const CARD_H  = 200;
  const CARD_GAP = 24; // カード間隙間（ポリシー: 24px 以上）

  // カードデータ
  const cards = [
    {
      num: '1',
      condition: '5管理のトレードオフが自然に含まれる',
      body: '複数の管理の対立が初めから組み込まれた業務を選ぶ',
      example: '例：橋梁長寿命化（予防保全コスト × 安全 × 通行規制の住民影響）',
    },
    {
      num: '2',
      condition: '自分が判断に関与した',
      body: '「私は発注者としてこう判断した」と書ける当事者性のある業務',
      example: '例：自分が事業化を検討した道路改良',
    },
    {
      num: '3',
      condition: '将来展望につなげられる',
      body: '個別事業を超えた広域・次世代の展望に接続できる題材',
      example: '例：人口減少下の道路維持管理体制',
    },
  ];

  // 全体高さ計算:
  // CONTENT_TOP + cards.length × CARD_H + (cards.length - 1) × CARD_GAP + 末尾余白80
  const TOTAL_ROWS_H = cards.length * CARD_H + (cards.length - 1) * CARD_GAP;
  const H = CONTENT_TOP + TOTAL_ROWS_H + 80;

  // ============================================================
  // SVG 構築
  // ============================================================
  let body = '';

  // ---- タイトル ----
  body += `
  <!-- タイトル -->
  <text x="${W / 2}" y="${TITLE_Y}" font-family="${FONT}" font-size="${FS_TITLE}" font-weight="800" fill="${INK_STRONG}" text-anchor="middle">記述式に向く&#x300C;良い題材&#x300D;の3条件</text>
`;

  // ---- 各カード ----
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const cardX = PAD_X;
    const cardY = CONTENT_TOP + i * (CARD_H + CARD_GAP);

    // バッジ中心Y = カード上端 + CARD_PAD_Y + BADGE_R
    const badgeCY = cardY + CARD_PAD_Y + BADGE_R;

    // テキストのY座標計算（バッジ中心に揃えてブロック中央配置）
    // テキストブロック合計高さ = 条件行 + DY_CONDITION_BODY + 説明行 + DY_BODY_EXAMPLE + 例行
    // = 26 + 40 + 22 + 32 + 18 = 138px
    const textBlockH = FS_CONDITION + DY_CONDITION_BODY + FS_BODY + DY_BODY_EXAMPLE + FS_EXAMPLE;
    // カード垂直中心
    const cardCY = cardY + CARD_H / 2;
    // 条件行のベースラインY（テキストブロックを中央揃え）
    // ベースラインは文字の下端 → 補正: +FS_CONDITION/2 でブロック上端に
    const conditionY = cardCY - textBlockH / 2 + FS_CONDITION;
    const bodyY      = conditionY + DY_CONDITION_BODY + FS_BODY;
    const exampleY   = bodyY + DY_BODY_EXAMPLE + FS_EXAMPLE;

    body += `
  <!-- カード ${c.num} -->
  <rect x="${cardX}" y="${cardY}" width="${CARD_W}" height="${CARD_H}" rx="${RX}" fill="#ffffff" stroke="${BRAND}" stroke-width="2"/>

  <!-- 番号バッジ -->
  <circle cx="${BADGE_CX}" cy="${badgeCY}" r="${BADGE_R}" fill="${BRAND}"/>
  <text x="${BADGE_CX}" y="${badgeCY + BADGE_NUM_FS * 0.35}" font-family="${FONT}" font-size="${BADGE_NUM_FS}" font-weight="900" fill="#ffffff" text-anchor="middle">${xml(c.num)}</text>

  <!-- 条件（太字） -->
  <text x="${TEXT_START_X}" y="${conditionY}" font-family="${FONT}" font-size="${FS_CONDITION}" font-weight="800" fill="${BRAND_DEEP}" text-anchor="start">${xml(c.condition)}</text>

  <!-- 説明 -->
  <text x="${TEXT_START_X}" y="${bodyY}" font-family="${FONT}" font-size="${FS_BODY}" font-weight="400" fill="${INK_BODY}" text-anchor="start">${xml(c.body)}</text>

  <!-- 道路担当の例 -->
  <text x="${TEXT_START_X}" y="${exampleY}" font-family="${FONT}" font-size="${FS_EXAMPLE}" font-weight="400" fill="${INK_MUTED}" text-anchor="start">${xml(c.example)}</text>
`;
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
  console.log('Rendering figures for 道路担当の記述式テーマ選び…');
  await render(svgThemeConditions(), 'figure-1-theme-conditions');
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
