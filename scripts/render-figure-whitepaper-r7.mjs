#!/usr/bin/env node
// content/note/技術士総監/白書R7完全対応集/img/ に note 用 PNG/SVG 図版 3 枚を生成する。
// （2026-05-25 まで content/note/技術士総監/magazines/whitepaper-r7-strategy/img/ に配置していたが、
//  M2 を ¥2,480 magazine → 完全無料リード磁石へ転換した際に単独記事配置へ移動）
//
// 設計ルール（.claude/knowledge/reference/note-svg-policy.md 準拠）:
//   - キャンバス幅 1200（同一記事内で統一）
//   - フォント ≥ 22px（補足キャプションを含めて統一）
//   - 色トークン（src/styles/globals.css と整合）のみ使用
//   - 識別は右下 doboku-note.com テキストのみ
//
// 使い方:
//   node scripts/render-figure-whitepaper-r7.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'content/note/技術士総監/白書R7完全対応集/img');
mkdirSync(OUT_DIR, { recursive: true });

// ブランドトークン
const BRAND = '#2e6da4';
const BRAND_FILL = '#e8f0fe';
const BRAND_DEEP = '#1a3a5c';
const INK_STRONG = '#222222';
const INK_BODY = '#555555';
const INK_MUTED = '#8a8a8a';
const POSITIVE = '#3a7d44';
const POSITIVE_FILL = '#e6f1e8';
const WARN = '#d4a017';
const WARN_FILL = '#fbf3df';
const DANGER = '#b22234';
const DANGER_FILL = '#fbe5e7';
const SURFACE_ALT = '#f8fafc';
const BORDER_LIGHT = '#e2e8f0';

const FONT = 'Hiragino Sans, Hiragino Kaku Gothic ProN, Yu Gothic, Noto Sans JP, sans-serif';
const W = 1200;

function xml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function header(title, subtitle) {
  return `
  <text x="40" y="60" font-family="${FONT}" font-size="32" font-weight="800" fill="${INK_STRONG}">${xml(title)}</text>
  <text x="40" y="96" font-family="${FONT}" font-size="22" fill="${INK_BODY}">${xml(subtitle)}</text>`;
}

function brandMark(H) {
  return `
  <text x="${W - 24}" y="${H - 16}" font-family="${FONT}" font-size="18" fill="${INK_MUTED}" text-anchor="end">doboku-note.com</text>`;
}

// ------------------------------------------------------------------
// 図 1: 7 大テーマ × 5 管理 トレードオフマトリクス
// ------------------------------------------------------------------
function svgTradeoffMatrix() {
  const themes = [
    'インフラ老朽化',
    '建設業 2024 年問題',
    '外国人材受入',
    'GX・カーボンニュートラル',
    'i-Construction 2.0',
    '地域インフラ群マネジメント',
    '流域治水',
  ];

  const mgmts = ['経済性', '人的資源', '情報', '安全', '社会環境'];

  // ◎=DANGER, ○=BRAND, △=WARN, 空=空白
  // 行: テーマ, 列: 管理 [経, 人, 情, 安, 社]
  const matrix = [
    ['◎', '○', '△', '◎', '○'], // インフラ老朽化
    ['○', '◎', '△', '○', '△'], // 建設業2024
    ['○', '◎', '△', '◎', '○'], // 外国人材
    ['◎', '△', '○', '△', '◎'], // GX/CN
    ['◎', '○', '◎', '○', '△'], // i-Con 2.0
    ['◎', '○', '△', '△', '◎'], // 群マネジメント
    ['△', '△', '○', '◎', '◎'], // 流域治水
  ];

  const symbolColor = {
    '◎': DANGER,
    '○': BRAND,
    '△': WARN,
    '': INK_MUTED,
  };

  const symbolFill = {
    '◎': DANGER_FILL,
    '○': BRAND_FILL,
    '△': WARN_FILL,
    '': SURFACE_ALT,
  };

  // 行ラベルの最長は「地域インフラ群マネジメント」14 文字 × 22px ≈ 308px → labelW = 360
  const labelW = 360;
  const cellW = 152;
  const headerH = 56;
  const rowH = 72;
  const xStart = 40;
  const headerY = 120;

  const totalW = labelW + cellW * mgmts.length;
  const H = headerY + headerH + rowH * themes.length + 80 + 60 + 50; // +キャプション+余白

  let body = '';

  // 列ヘッダ
  body += `
  <rect x="${xStart}" y="${headerY}" width="${labelW}" height="${headerH}" rx="6" fill="${BRAND_DEEP}"/>
  <text x="${xStart + labelW / 2}" y="${headerY + 36}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">テーマ ＼ 管理</text>`;

  for (let j = 0; j < mgmts.length; j++) {
    const x = xStart + labelW + j * cellW;
    body += `
  <rect x="${x}" y="${headerY}" width="${cellW}" height="${headerH}" rx="6" fill="${BRAND_DEEP}"/>
  <text x="${x + cellW / 2}" y="${headerY + 36}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">${xml(mgmts[j])}</text>`;
  }

  // データ行
  for (let i = 0; i < themes.length; i++) {
    const y = headerY + headerH + i * rowH;
    const rowFill = i % 2 === 0 ? '#ffffff' : SURFACE_ALT;

    // 行ラベル
    body += `
  <rect x="${xStart}" y="${y}" width="${labelW}" height="${rowH}" fill="${rowFill}" stroke="${BORDER_LIGHT}" stroke-width="1"/>
  <text x="${xStart + 16}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}">${xml(themes[i])}</text>`;

    // 各セル
    for (let j = 0; j < mgmts.length; j++) {
      const sym = matrix[i][j];
      const x = xStart + labelW + j * cellW;
      const color = symbolColor[sym] || INK_MUTED;
      const fill = symbolFill[sym] || SURFACE_ALT;
      body += `
  <rect x="${x}" y="${y}" width="${cellW}" height="${rowH}" fill="${fill}" stroke="${BORDER_LIGHT}" stroke-width="1"/>
  <text x="${x + cellW / 2}" y="${y + rowH / 2 + 12}" font-family="${FONT}" font-size="32" font-weight="800" fill="${color}" text-anchor="middle">${xml(sym)}</text>`;
    }
  }

  // 凡例
  const legendY = headerY + headerH + themes.length * rowH + 24;
  const legendItems = [
    { sym: '◎', label: '主要トレードオフ', color: DANGER },
    { sym: '○', label: '関連あり', color: BRAND },
    { sym: '△', label: '軽微な関連', color: WARN },
  ];
  let lx = xStart;
  for (const li of legendItems) {
    body += `
  <text x="${lx}" y="${legendY + 22}" font-family="${FONT}" font-size="28" font-weight="800" fill="${li.color}">${xml(li.sym)}</text>
  <text x="${lx + 36}" y="${legendY + 22}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">${xml(li.label)}</text>`;
    lx += 240;
  }

  // キャプション
  const captY = legendY + 48;
  body += `
  <rect x="${xStart}" y="${captY}" width="${totalW}" height="44" rx="6" fill="${BRAND_FILL}"/>
  <text x="${xStart + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}">経済性が 4 テーマで主軸 — 経×情・人×経が R8 第 1 候補</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('白書 R7 — 7 大テーマと 5 管理トレードオフ', '◎=主要トレードオフ ○=関連 △=軽微')}
${body}
${brandMark(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 2: R08 再出題確率スコア 横棒グラフ
// 注: スコアと順位は article §1-2 の表（「R7 白書の戦略概観 — 7 大テーマと再出題確率」）と整合
// ------------------------------------------------------------------
function svgR08Probability() {
  const themes = [
    { name: 'i-Construction 2.0', score: 9.5, badge: 'DX 推進' },
    { name: '建設業 2024 年問題', score: 9.0, badge: '労働改革' },
    { name: 'インフラ老朽化', score: 8.5, badge: '予防保全' },
    { name: '流域治水', score: 8.5, badge: '気候適応' },
    { name: 'GX・カーボンニュートラル', score: 8.0, badge: '白書最重点' },
    { name: '外国人材受入', score: 7.0, badge: '制度変革' },
    { name: '地域インフラ群マネジメント', score: 6.5, badge: '群マネ' },
  ];

  const barColor = (score) => {
    if (score >= 9.0) return DANGER;
    if (score >= 8.0) return WARN;
    return BRAND;
  };

  // labelW=360（最長「地域インフラ群マネジメント」14 文字 × 22px ≈ 308 + 余白）
  // 合計: 40 + 360 + 560 + 70 + 140 = 1170（W=1200、右余白 30）
  const labelW = 360;
  const barMaxW = 560;
  const badgeW = 140;
  const scoreW = 70;
  const xStart = 40;
  const headerY = 130;
  const rowH = 80;
  const rowGap = 16;
  const barH = 44;

  const H = headerY + (rowH + rowGap) * themes.length + 100 + 60;

  let body = '';

  // 軸ラベル（0/5/10 を独立配置、スペース埋めしない）
  const axisY = headerY - 8;
  const barOriginX = xStart + labelW;
  body += `
  <text x="${barOriginX}" y="${axisY}" font-family="${FONT}" font-size="20" fill="${INK_MUTED}" text-anchor="middle">0</text>
  <text x="${barOriginX + barMaxW / 2}" y="${axisY}" font-family="${FONT}" font-size="20" fill="${INK_MUTED}" text-anchor="middle">5</text>
  <text x="${barOriginX + barMaxW}" y="${axisY}" font-family="${FONT}" font-size="20" fill="${INK_MUTED}" text-anchor="middle">10</text>`;

  for (let i = 0; i < themes.length; i++) {
    const t = themes[i];
    const y = headerY + i * (rowH + rowGap);
    const barW = (t.score / 10) * barMaxW;
    const color = barColor(t.score);

    // 行背景
    body += `
  <rect x="${xStart}" y="${y}" width="${W - 80}" height="${rowH}" rx="6" fill="${i % 2 === 0 ? '#ffffff' : SURFACE_ALT}" stroke="${BORDER_LIGHT}" stroke-width="1"/>`;

    // テーマ名
    body += `
  <text x="${xStart + 12}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}">${xml(t.name)}</text>`;

    // バー
    const barX = xStart + labelW;
    const barY = y + (rowH - barH) / 2;
    body += `
  <rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="6" fill="${color}"/>`;

    // スコア
    body += `
  <text x="${barX + barW + 12}" y="${barY + barH / 2 + 9}" font-family="${FONT}" font-size="26" font-weight="800" fill="${color}">${t.score}</text>`;

    // バッジ
    const badgeX = barX + barMaxW + scoreW;
    body += `
  <rect x="${badgeX}" y="${barY + 4}" width="${badgeW}" height="${barH - 8}" rx="14" fill="${color}"/>
  <text x="${badgeX + badgeW / 2}" y="${barY + barH / 2 + 8}" font-family="${FONT}" font-size="20" font-weight="700" fill="#ffffff" text-anchor="middle">${xml(t.badge)}</text>`;
  }

  // 凡例
  const legendY = headerY + (rowH + rowGap) * themes.length + 16;
  const legendItems = [
    { color: DANGER, label: '9.0 以上 — 最優先テーマ' },
    { color: WARN, label: '8.0〜8.9 — 高確率' },
    { color: BRAND, label: '7.0〜7.9 — 要注意' },
  ];
  let lx = xStart;
  for (const li of legendItems) {
    body += `
  <rect x="${lx}" y="${legendY}" width="28" height="28" rx="4" fill="${li.color}"/>
  <text x="${lx + 40}" y="${legendY + 22}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">${xml(li.label)}</text>`;
    lx += 320;
  }

  // キャプション
  const captY = legendY + 52;
  body += `
  <rect x="${xStart}" y="${captY}" width="${W - 80}" height="44" rx="6" fill="${DANGER_FILL}"/>
  <text x="${xStart + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${DANGER}">i-Construction 2.0 (9.5) と建設業 2024 年問題 (9.0) が R8 第 1 候補</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('R08 再出題確率スコア（10 段階）', 'スコアと直近のバッジで優先度を可視化')}
${body}
${brandMark(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 3: 過去 9 年テーマ出題マッピング
// ------------------------------------------------------------------
function svg9YearMapping() {
  const years = ['H29', 'H30', 'R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R07'];

  const themes = [
    {
      name: 'インフラ老朽化',
      hits: [1, 1, 1, 1, 0, 1, 1, 1, 1],
      note: '8/9 年',
    },
    {
      name: '建設業 2024 年問題',
      hits: [0, 0, 1, 1, 0, 1, 0, 1, 1],
      note: '5/9 年',
    },
    {
      name: '外国人材受入',
      hits: [0, 0, 0, 1, 0, 1, 0, 1, 0],
      note: '3/9 年',
    },
    {
      name: 'GX・カーボンニュートラル',
      hits: [0, 0, 0, 0, 1, 1, 1, 1, 1],
      note: '5/9 年',
    },
    {
      name: 'i-Construction 2.0',
      hits: [0, 1, 1, 0, 1, 1, 0, 1, 0],
      note: '5/9 年',
    },
    {
      name: '地域インフラ群マネジメント',
      hits: [0, 0, 0, 0, 0, 0, 1, 1, 1],
      note: '3/9 年',
    },
    {
      name: '流域治水',
      hits: [0, 0, 1, 0, 1, 0, 1, 0, 1],
      note: '4/9 年',
    },
  ];

  // labelW=360 で「地域インフラ群マネジメント」14 文字 × 22px ≈ 308 を収容
  const labelW = 360;
  const noteW = 100;
  const cellW = Math.floor((W - 80 - labelW - noteW) / years.length);
  const headerH = 56;
  const rowH = 72;
  const xStart = 40;
  const headerY = 120;

  const totalW = labelW + cellW * years.length + noteW;
  const H = headerY + headerH + rowH * themes.length + 80 + 60 + 50;

  let body = '';

  // 列ヘッダ（テーマラベル列）
  body += `
  <rect x="${xStart}" y="${headerY}" width="${labelW}" height="${headerH}" rx="6" fill="${BRAND_DEEP}"/>
  <text x="${xStart + labelW / 2}" y="${headerY + 36}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">テーマ</text>`;

  // 年度列ヘッダ
  for (let j = 0; j < years.length; j++) {
    const x = xStart + labelW + j * cellW;
    body += `
  <rect x="${x}" y="${headerY}" width="${cellW}" height="${headerH}" rx="4" fill="${BRAND_DEEP}"/>
  <text x="${x + cellW / 2}" y="${headerY + 36}" font-family="${FONT}" font-size="20" font-weight="700" fill="#ffffff" text-anchor="middle">${xml(years[j])}</text>`;
  }

  // 連続出題率ヘッダ
  const noteX = xStart + labelW + cellW * years.length;
  body += `
  <rect x="${noteX}" y="${headerY}" width="${noteW}" height="${headerH}" rx="6" fill="${POSITIVE}"/>
  <text x="${noteX + noteW / 2}" y="${headerY + 26}" font-family="${FONT}" font-size="18" font-weight="700" fill="#ffffff" text-anchor="middle">出題</text>
  <text x="${noteX + noteW / 2}" y="${headerY + 48}" font-family="${FONT}" font-size="18" font-weight="700" fill="#ffffff" text-anchor="middle">実績</text>`;

  // データ行
  for (let i = 0; i < themes.length; i++) {
    const t = themes[i];
    const y = headerY + headerH + i * rowH;
    const rowFill = i % 2 === 0 ? '#ffffff' : SURFACE_ALT;

    // 行ラベル
    body += `
  <rect x="${xStart}" y="${y}" width="${labelW}" height="${rowH}" fill="${rowFill}" stroke="${BORDER_LIGHT}" stroke-width="1"/>
  <text x="${xStart + 14}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}">${xml(t.name)}</text>`;

    // 年度セル
    for (let j = 0; j < years.length; j++) {
      const hit = t.hits[j];
      const x = xStart + labelW + j * cellW;
      const cellFill = hit ? POSITIVE_FILL : rowFill;
      body += `
  <rect x="${x}" y="${y}" width="${cellW}" height="${rowH}" fill="${cellFill}" stroke="${BORDER_LIGHT}" stroke-width="1"/>
  <text x="${x + cellW / 2}" y="${y + rowH / 2 + 12}" font-family="${FONT}" font-size="28" font-weight="800" fill="${hit ? POSITIVE : '#e0e0e0'}" text-anchor="middle">${hit ? '○' : ''}</text>`;
    }

    // 出題率
    body += `
  <rect x="${noteX}" y="${y}" width="${noteW}" height="${rowH}" fill="${POSITIVE_FILL}" stroke="${BORDER_LIGHT}" stroke-width="1"/>
  <text x="${noteX + noteW / 2}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="22" font-weight="800" fill="${POSITIVE}" text-anchor="middle">${xml(t.note)}</text>`;
  }

  // 凡例
  const legendY = headerY + headerH + themes.length * rowH + 24;
  body += `
  <rect x="${xStart}" y="${legendY}" width="32" height="32" rx="4" fill="${POSITIVE_FILL}" stroke="${POSITIVE}" stroke-width="2"/>
  <text x="${xStart + 48}" y="${legendY + 24}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">○ = 出題あり</text>
  <rect x="${xStart + 240}" y="${legendY}" width="32" height="32" rx="4" fill="${SURFACE_ALT}" stroke="${BORDER_LIGHT}" stroke-width="1"/>
  <text x="${xStart + 288}" y="${legendY + 24}" font-family="${FONT}" font-size="22" fill="${INK_MUTED}">空白 = 出題なし（推定値、後修正可）</text>`;

  // キャプション
  const captY = legendY + 52;
  body += `
  <rect x="${xStart}" y="${captY}" width="${totalW}" height="44" rx="6" fill="${POSITIVE_FILL}"/>
  <text x="${xStart + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${POSITIVE}">白書テーマの 60〜70% は翌年も継続出題される</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('R7 白書 7 大テーマ × H29-R07 出題実績', '○=出題確認 空=出題なし（推定値、後修正可）')}
${body}
${brandMark(H)}
</svg>`;
}

// ------------------------------------------------------------------
// メイン: SVG 生成 → PNG 変換
// ------------------------------------------------------------------
const figures = [
  { name: 'figure-01-tradeoff-matrix', svg: svgTradeoffMatrix() },
  { name: 'figure-02-r08-probability', svg: svgR08Probability() },
  { name: 'figure-03-9year-mapping', svg: svg9YearMapping() },
];

for (const fig of figures) {
  const svgPath = join(OUT_DIR, `${fig.name}.svg`);
  const pngPath = join(OUT_DIR, `${fig.name}.png`);

  writeFileSync(svgPath, fig.svg, 'utf8');
  console.log(`SVG: ${svgPath}`);

  await sharp(Buffer.from(fig.svg))
    .png()
    .toFile(pngPath);
  console.log(`PNG: ${pngPath}`);
}

console.log('\n完了: 3 SVG + 3 PNG = 6 ファイル生成');
