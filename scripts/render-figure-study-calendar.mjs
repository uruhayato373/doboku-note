#!/usr/bin/env node
// content/note/技術士総監/公務員の総監学習設計/img/ に本文用 PNG/SVG 図版を生成する。
//
// figure-1-study-calendar: 「働きながら総監に挑む 逆算学習カレンダー」
//   - 5つの時期を縦に積んだステップ表（各行＝時期カード）
//   - 左列: 時期（期間 + 補足ラベル）
//   - 右列: やること（小見出し＋説明）
//   - 行2（1〜3月 年度末）: warn 系色で繁忙期を強調
//   - 行5（7月 筆記試験）: brand-deep 色で到達点を強調
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
//   node scripts/render-figure-study-calendar.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'content/note/技術士総監/公務員の総監学習設計/img');
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
const WARN_DEEP   = '#7a5a00'; // warn 濃色テキスト用
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
// 図 1: 働きながら総監に挑む 逆算学習カレンダー
// ------------------------------------------------------------------
function svgStudyCalendar() {
  // ============================================================
  // レイアウト定数
  // ============================================================
  const PAD_X     = 48;   // 左右キャンバスマージン
  const TITLE_Y1  = 60;   // タイトル1行目ベースライン
  const TITLE_Y2  = 100;  // タイトル2行目ベースライン（34px + 6px gap）
  // タイトル2行目下 40px 確保 → コンテンツ開始
  const CONTENT_TOP = TITLE_Y2 + 40 + 8; // = 148

  // ============================================================
  // 列構成（W=1200 内, PAD_X=48 左右）
  // 使用幅 = 1200 - 2×48 = 1104
  // 左列（時期）= 280px、区切りギャップ = 24px、右列（やること）= 800px
  // 280 + 24 + 800 = 1104 ✓
  // ============================================================
  const LEFT_X    = PAD_X;              // 48
  const LEFT_W    = 280;
  const GAP_W     = 24;
  const RIGHT_X   = LEFT_X + LEFT_W + GAP_W; // = 352
  const RIGHT_W   = W - PAD_X - RIGHT_X;     // = 800
  const RX        = 8;   // 角丸
  const CARD_PAD  = 20;  // カード内パディング

  // カード高さ: 見出し26px + 行間16px + 説明文22px + 上下パディング20px×2 = 104px
  // → 2段テキスト（heading+body）を垂直中央配置するために CARD_H=136
  const CARD_H    = 136;
  const CARD_GAP  = 24;  // カード間隙間（ポリシー最低値 24px）

  // ============================================================
  // 時期データ
  // ============================================================
  //
  // theme:
  //   'normal'  - 通常（brand border, white bg）
  //   'warn'    - 繁忙期（warn 系色）
  //   'goal'    - 到達点（brand-deep 背景、白文字）
  //
  const rows = [
    {
      period:  '11〜12月',
      subPeriod: '（試験7-8か月前）',
      theme: 'normal',
      heading: '着手',
      body: 'キーワード集と択一過去問1年分。試験の感触と弱点分野をつかむ',
    },
    {
      period:  '1〜3月',
      subPeriod: '（年度末・最繁忙期）',
      theme: 'warn',
      heading: '択一中心',
      body: 'スキマ時間の択一演習で歩みを止めない。記述の本格演習は避ける',
    },
    {
      period:  '4〜5月',
      subPeriod: '（年度替わりで一段落）',
      theme: 'normal',
      heading: '記述中心',
      body: '答案の型づくりと記述演習をここに寄せる',
    },
    {
      period:  '6月',
      subPeriod: '（試験1か月前）',
      theme: 'normal',
      heading: '仕上げ',
      body: '択一の総仕上げと記述の本番形式演習',
    },
    {
      period:  '7月',
      subPeriod: '',
      theme: 'goal',
      heading: '筆記試験',
      body: '',
    },
  ];

  // 全体高さ計算: コンテンツ開始 + 5カード×高さ + 4ギャップ + 末尾余白80
  const TOTAL_CARDS_H = rows.length * CARD_H + (rows.length - 1) * CARD_GAP;
  const H = CONTENT_TOP + TOTAL_CARDS_H + 80;

  // ============================================================
  // テーマ別色定義（機械的に参照）
  // ============================================================
  const THEMES = {
    normal: {
      leftBg:     BRAND_FILL,
      leftBorder: BRAND,
      leftPeriodFill:    BRAND_DEEP,
      leftSubFill:       BRAND,
      rightBg:    '#ffffff',
      rightBorder: BRAND,
      headingFill: BRAND_DEEP,
      bodyFill:    INK_BODY,
    },
    warn: {
      leftBg:     WARN_FILL,
      leftBorder: WARN,
      leftPeriodFill:    WARN_DEEP,
      leftSubFill:       WARN,
      rightBg:    WARN_FILL,
      rightBorder: WARN,
      headingFill: WARN_DEEP,
      bodyFill:    INK_BODY,
    },
    goal: {
      leftBg:     BRAND_DEEP,
      leftBorder: BRAND_DEEP,
      leftPeriodFill:    '#ffffff',
      leftSubFill:       '#aac8e8',
      rightBg:    BRAND_DEEP,
      rightBorder: BRAND_DEEP,
      headingFill: '#ffffff',
      bodyFill:    '#aac8e8',
    },
  };

  // ============================================================
  // SVG 構築
  // ============================================================
  let body = '';

  // ---- タイトル（2行） ----
  body += `
  <!-- タイトル -->
  <text x="${W / 2}" y="${TITLE_Y1}" font-family="${FONT}" font-size="34" font-weight="800" fill="${INK_STRONG}" text-anchor="middle">働きながら総監に挑む</text>
  <text x="${W / 2}" y="${TITLE_Y2}" font-family="${FONT}" font-size="34" font-weight="800" fill="${BRAND}" text-anchor="middle">逆算学習カレンダー</text>
`;

  // ---- 各行カード ----
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const th = THEMES[r.theme];
    const cardY = CONTENT_TOP + i * (CARD_H + CARD_GAP);

    // ---- 左カード（時期）----
    // 左カードの垂直中央 Y
    const leftCY = cardY + CARD_H / 2;

    // 時期（大）: 26px
    // サブ（小）: 20px（補足のみ → 18px 許容枠だが20pxに）
    // テキストブロック高: 26 + 8（間隔）+ 20 = 54px
    // 1行目ベースライン = leftCY - 27 + 9 (ベースライン補正)
    const LEFT_PERIOD_Y   = leftCY - 18;   // 大テキストベースライン
    const LEFT_SUB_Y      = LEFT_PERIOD_Y + 30; // サブテキスト

    body += `
  <!-- 行 ${i + 1}: 左カード（時期） -->
  <rect x="${LEFT_X}" y="${cardY}" width="${LEFT_W}" height="${CARD_H}" rx="${RX}" fill="${th.leftBg}" stroke="${th.leftBorder}" stroke-width="2"/>
  <text x="${LEFT_X + LEFT_W / 2}" y="${LEFT_PERIOD_Y}" font-family="${FONT}" font-size="26" font-weight="800" fill="${th.leftPeriodFill}" text-anchor="middle">${xml(r.period)}</text>`;

    if (r.subPeriod) {
      body += `
  <text x="${LEFT_X + LEFT_W / 2}" y="${LEFT_SUB_Y}" font-family="${FONT}" font-size="20" font-weight="500" fill="${th.leftSubFill}" text-anchor="middle">${xml(r.subPeriod)}</text>`;
    }

    // ---- 繁忙期バッジ（warnのみ）----
    if (r.theme === 'warn') {
      const BADGE_W = 150;
      const BADGE_H = 30;
      const BADGE_X = LEFT_X + LEFT_W / 2 - BADGE_W / 2;
      const BADGE_Y = LEFT_SUB_Y + 12;
      body += `
  <!-- 繁忙期バッジ -->
  <rect x="${BADGE_X}" y="${BADGE_Y}" width="${BADGE_W}" height="${BADGE_H}" rx="15" fill="${WARN}"/>
  <text x="${BADGE_X + BADGE_W / 2}" y="${BADGE_Y + BADGE_H / 2 + 7}" font-family="${FONT}" font-size="18" font-weight="700" fill="#ffffff" text-anchor="middle">繁忙期</text>`;
    }

    // ---- 到達点フラグアイコン（goalのみ）----
    if (r.theme === 'goal') {
      // シンプルな★マーク
      const STAR_X = LEFT_X + LEFT_W / 2;
      const STAR_Y = LEFT_PERIOD_Y - 30;
      body += `
  <!-- 到達点フラグ -->
  <text x="${STAR_X}" y="${STAR_Y}" font-family="${FONT}" font-size="28" fill="#f0c040" text-anchor="middle">&#9733;</text>`;
    }

    // ---- 右カード（やること）----
    // heading (26px) + body (22px)、垂直中央配置
    // テキストブロック高: 26 + 16(gap) + 22 = 64px
    // heading ベースライン = cardCY - 32 + 9
    const rightCY   = cardY + CARD_H / 2;

    // goal（7月）は見出しのみ、大きく中央配置
    let headingFontSize, headingY, bodyTextEl;
    if (r.theme === 'goal' && !r.body) {
      // 見出しのみ大きく中央
      headingFontSize = 32;
      headingY = rightCY + 10;
      bodyTextEl = '';
    } else {
      headingFontSize = 26;
      const HEADING_BODY_GAP = 18; // 見出し〜本文 gap
      // テキストブロック高 = 26 + HEADING_BODY_GAP + 22 = 66px
      headingY = rightCY - 33 + 9; // 1行目ベースライン
      const bodyY = headingY + 26 + HEADING_BODY_GAP;
      bodyTextEl = `
  <text x="${RIGHT_X + CARD_PAD}" y="${bodyY}" font-family="${FONT}" font-size="22" font-weight="400" fill="${th.bodyFill}" text-anchor="start">${xml(r.body)}</text>`;
    }

    body += `
  <!-- 行 ${i + 1}: 右カード（やること） -->
  <rect x="${RIGHT_X}" y="${cardY}" width="${RIGHT_W}" height="${CARD_H}" rx="${RX}" fill="${th.rightBg}" stroke="${th.rightBorder}" stroke-width="2"/>
  <text x="${RIGHT_X + CARD_PAD}" y="${headingY}" font-family="${FONT}" font-size="${headingFontSize}" font-weight="800" fill="${th.headingFill}" text-anchor="start">${xml(r.heading)}</text>${bodyTextEl}`;

    // ---- カード間の接続矢印（最後の行は不要）----
    if (i < rows.length - 1) {
      const arrowX  = LEFT_X + LEFT_W / 2;  // 左カード中央X
      const arrowTopY = cardY + CARD_H + 4;
      const arrowBotY = cardY + CARD_H + CARD_GAP - 4;

      body += `
  <!-- 行 ${i + 1} → 行 ${i + 2} 矢印 -->
  <line x1="${arrowX}" y1="${arrowTopY}" x2="${arrowX}" y2="${arrowBotY - 12}" stroke="${BRAND}" stroke-width="3" stroke-linecap="round"/>
  <polygon points="${arrowX},${arrowBotY} ${arrowX - 10},${arrowBotY - 14} ${arrowX + 10},${arrowBotY - 14}" fill="${BRAND}"/>`;
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
  console.log('Rendering figures for 公務員の総監学習設計…');
  await render(svgStudyCalendar(), 'figure-1-study-calendar');
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
