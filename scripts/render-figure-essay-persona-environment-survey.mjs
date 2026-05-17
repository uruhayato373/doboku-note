#!/usr/bin/env node
// docs/note/magazines/総監模範論文-環境調査/img/ に
// 環境調査ペルソナの典型5管理トレードオフ・プロファイル図版を1枚生成する。
//
// 設計ルール（docs/reference/note-svg-policy.md 準拠）:
//   - キャンバス幅 1200、高さ 800
//   - フォント ≥ 22px（補足キャプションも含めて厳守）
//   - 色トークン（src/styles/globals.css と整合）のみ使用
//   - 識別は右下 doboku-note.com テキストのみ
//
// 使い方:
//   node scripts/render-figure-essay-persona-environment-survey.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'docs/note/magazines/総監模範論文-環境調査/img');
mkdirSync(OUT_DIR, { recursive: true });

// デザイントークン
const BRAND      = '#2e6da4'; // 経済性
const BRAND_FILL = '#e8f0fe';
const BRAND_DEEP = '#1a3a5c';
const INK_STRONG = '#222222';
const INK_BODY   = '#555555';
const INK_MUTED  = '#8a8a8a';
const POSITIVE   = '#3a7d44'; // 情報
const POSITIVE_FILL = '#e6f1e8';
const WARN       = '#d4a017'; // 人的資源
const WARN_FILL  = '#fbf3df';
const DANGER     = '#b22234'; // 安全
const DANGER_FILL = '#fbe5e7';
const SURFACE_ALT = '#f8fafc';
const BORDER_LIGHT = '#e2e8f0';

const FONT = 'Hiragino Sans, Hiragino Kaku Gothic ProN, Yu Gothic, Noto Sans JP, sans-serif';
const W = 1200;
const H = 800;

function xml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ------------------------------------------------------------------
// 図: 環境調査典型 5 管理トレードオフ・プロファイル
// レイアウト:
//   [タイトル行]  y=0〜80
//   [ペルソナ概要行]  y=80〜170
//   [主要トレードオフ 3行]  y=170〜450
//   [年度別テーブル]  y=450〜760
//   [ブランド]  y=760〜800
// ------------------------------------------------------------------
function svgPersonaProfile() {
  // -- 管理色の凡例チップ用ヘルパー --
  function chip(x, y, color, label) {
    return `
  <rect x="${x}" y="${y}" width="16" height="16" rx="3" fill="${color}"/>
  <text x="${x + 24}" y="${y + 13}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">${xml(label)}</text>`;
  }

  // ===== セクション1: タイトル =====
  const titleY = 48;
  const titleBlock = `
  <rect width="${W}" height="76" fill="${BRAND_DEEP}"/>
  <text x="40" y="${titleY}" font-family="${FONT}" font-size="28" font-weight="800" fill="#ffffff">環境調査会社 環境影響評価部門 部長｜典型 5 管理トレードオフ・プロファイル</text>`;

  // ===== セクション2: ペルソナ概要 =====
  // y=76〜170
  const personaY = 76;
  const personaH = 86;
  const personaBlock = `
  <rect x="0" y="${personaY}" width="${W}" height="${personaH}" fill="${SURFACE_ALT}"/>
  <rect x="0" y="${personaY}" width="6" height="${personaH}" fill="${BRAND}"/>
  <text x="28" y="${personaY + 34}" font-family="${FONT}" font-size="24" font-weight="700" fill="${INK_STRONG}">組織規模</text>
  <text x="28" y="${personaY + 62}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">正社員 15 名 + 外注個人事業者 5 名 + アルバイト 5 名（計 25 名）</text>
  <text x="500" y="${personaY + 34}" font-family="${FONT}" font-size="24" font-weight="700" fill="${INK_STRONG}">業務領域</text>
  <text x="500" y="${personaY + 62}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">環境影響評価・希少動植物調査・森林資源調査・土砂災害対応</text>
  <text x="1040" y="${personaY + 34}" font-family="${FONT}" font-size="24" font-weight="700" fill="${INK_STRONG}">立場</text>
  <text x="1040" y="${personaY + 62}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">部長</text>`;

  // ===== セクション3: 主要 5 管理トレードオフ =====
  // y=170〜450（ヘッダ40 + カード3枚 × 70 + gap × 2 × 10 + 余白）
  const tradeoffSectionY = 162;
  const tradeoffHeaderH = 48;
  const cardH = 68;
  const cardGap = 12;

  // ヘッダ
  const tradeoffHeader = `
  <rect x="40" y="${tradeoffSectionY}" width="${W - 80}" height="${tradeoffHeaderH}" rx="6" fill="${BRAND_DEEP}"/>
  <text x="60" y="${tradeoffSectionY + 32}" font-family="${FONT}" font-size="24" font-weight="800" fill="#ffffff">主要 5 管理トレードオフ（3 パターン）</text>`;

  // カード定義 (color1, color2, num, label, description)
  const cards = [
    {
      color1: POSITIVE, color2: WARN, num: '①',
      label: '情報 × 人的資源',
      desc: '暗黙知の形式知化（ナレッジ蓄積）vs ベテラン依存（人材流出リスク）',
      fill1: POSITIVE_FILL, fill2: WARN_FILL,
    },
    {
      color1: POSITIVE, color2: BRAND, num: '②',
      label: '情報 × 経済性',
      desc: 'ISMS・DX 投資（セキュリティ・業務変革）vs 中小組織の限定的 IT 投資余力',
      fill1: POSITIVE_FILL, fill2: BRAND_FILL,
    },
    {
      color1: INK_STRONG, color2: BRAND, num: '③',
      label: '社会環境 × 経済性',
      desc: '環境配慮・CN 対応（社会的要求）vs 受託コスト・収益圧迫（中小経営の制約）',
      fill1: '#f0f0f0', fill2: BRAND_FILL,
    },
  ];

  let tradeoffCards = '';
  cards.forEach((c, i) => {
    const cy = tradeoffSectionY + tradeoffHeaderH + 12 + i * (cardH + cardGap);
    const chipW = 180;
    const chip2X = 240;
    tradeoffCards += `
  <rect x="40" y="${cy}" width="${W - 80}" height="${cardH}" rx="6" fill="#ffffff" stroke="${BORDER_LIGHT}" stroke-width="1"/>
  <rect x="40" y="${cy}" width="6" height="${cardH}" rx="3" fill="${c.color1}"/>
  <text x="60" y="${cy + 26}" font-family="${FONT}" font-size="26" font-weight="800" fill="${INK_STRONG}">${xml(c.num)}</text>
  <rect x="90" y="${cy + 12}" width="${chipW}" height="42" rx="6" fill="${c.fill1}" stroke="${c.color1}" stroke-width="2"/>
  <text x="${90 + chipW / 2}" y="${cy + 39}" font-family="${FONT}" font-size="22" font-weight="700" fill="${c.color1}" text-anchor="middle">${xml(c.label.split('×')[0].trim())}</text>
  <text x="${90 + chipW + 10}" y="${cy + 39}" font-family="${FONT}" font-size="26" font-weight="800" fill="${INK_STRONG}" text-anchor="middle">×</text>
  <rect x="${chip2X + chipW / 2 + 20}" y="${cy + 12}" width="${chipW}" height="42" rx="6" fill="${c.fill2}" stroke="${c.color2}" stroke-width="2"/>
  <text x="${chip2X + chipW / 2 + 20 + chipW / 2}" y="${cy + 39}" font-family="${FONT}" font-size="22" font-weight="700" fill="${c.color2}" text-anchor="middle">${xml(c.label.split('×')[1].trim())}</text>
  <text x="520" y="${cy + 39}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">${xml(c.desc)}</text>`;
  });

  // ===== セクション4: 年度別テーブル =====
  // y=450〜760
  const tableY = tradeoffSectionY + tradeoffHeaderH + 12 + cards.length * (cardH + cardGap) + 24;
  const tableHeaderH = 48;
  const rowH = 64;

  // テーブルヘッダ
  const colXs = [40, 120, 320, 640];
  const colWs = [80, 200, 320, W - 80 - (colXs[3] - 40)];
  const colLabels = ['年度', 'テーマ', '主軸トレードオフ', '論文内のポイント'];

  let tableBlock = `
  <rect x="40" y="${tableY}" width="${W - 80}" height="${tableHeaderH}" rx="6" fill="${BRAND}"/>`;
  colLabels.forEach((label, i) => {
    const tx = i === 0 ? colXs[i] + 6 : colXs[i] + 8;
    tableBlock += `
  <text x="${tx}" y="${tableY + 32}" font-family="${FONT}" font-size="22" font-weight="800" fill="#ffffff">${xml(label)}</text>`;
  });

  // テーブルデータ
  const rows = [
    {
      year: 'R03', theme: 'データ利活用',
      axis: '情報 × 人的資源',
      axisColor1: POSITIVE, axisColor2: WARN,
      point: 'UAV・センサデータの一元化でナレッジ移転、IT 投資と採用困難のトレードオフ',
    },
    {
      year: 'R04', theme: 'DX 推進計画策定',
      axis: '情報 × 人的資源 × 経済性',
      axisColor1: POSITIVE, axisColor2: WARN,
      point: '暗黙知→形式知化 × DX 投資余力。タスクフォース 13 週工程で現状診断を最重要に',
    },
    {
      year: 'R05', theme: 'SWOT 戦略立案',
      axis: '社会環境 × 経済性',
      axisColor1: INK_STRONG, axisColor2: BRAND,
      point: '強み（環境規制対応力）× 弱み（規模）を SWOT で整理、受託コスト圧迫への対策',
    },
    {
      year: 'R06', theme: 'CN 対応',
      axis: '社会環境 × 情報',
      axisColor1: INK_STRONG, axisColor2: POSITIVE,
      point: 'カーボンニュートラル要求の外部環境 × UAV・リモセン情報活用の技術基盤強化',
    },
    {
      year: 'R07', theme: '少子高齢化',
      axis: '情報 × 人的資源 × 経済性',
      axisColor1: POSITIVE, axisColor2: WARN,
      point: 'ナレッジマネジメント 5 年計画 + パート→正社員登用 + IT 投資余力の 3 軸トレードオフ',
    },
  ];

  rows.forEach((r, i) => {
    const ry = tableY + tableHeaderH + i * rowH;
    const fillBg = i % 2 === 0 ? '#ffffff' : SURFACE_ALT;
    const isLast = i === rows.length - 1;
    const rxBL = isLast ? '6' : '0';
    const rxBR = isLast ? '6' : '0';
    tableBlock += `
  <rect x="40" y="${ry}" width="${W - 80}" height="${rowH}" fill="${fillBg}" stroke="${BORDER_LIGHT}" stroke-width="1"/>
  <text x="${colXs[0] + 6}" y="${ry + 39}" font-family="${FONT}" font-size="22" font-weight="700" fill="${BRAND_DEEP}">${xml(r.year)}</text>
  <text x="${colXs[1] + 8}" y="${ry + 39}" font-family="${FONT}" font-size="22" fill="${INK_STRONG}">${xml(r.theme)}</text>
  <text x="${colXs[2] + 8}" y="${ry + 39}" font-family="${FONT}" font-size="22" font-weight="600" fill="${r.axisColor1}">${xml(r.axis)}</text>
  <text x="${colXs[3] + 8}" y="${ry + 39}" font-family="${FONT}" font-size="20" fill="${INK_BODY}">${xml(r.point)}</text>`;
  });

  // 凡例（年度別テーブルの下）
  const legendY = tableY + tableHeaderH + rows.length * rowH + 16;
  const legendBlock = `
  <text x="60" y="${legendY + 16}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}">凡例:</text>
  ${chip(130, legendY, BRAND, '経済性')}
  ${chip(260, legendY, WARN, '人的資源')}
  ${chip(420, legendY, DANGER, '安全')}
  ${chip(560, legendY, POSITIVE, '情報')}
  ${chip(700, legendY, INK_STRONG, '社会環境')}`;

  // ブランド識別
  const brandBlock = `
  <text x="${W - 40}" y="${H - 12}" font-family="${FONT}" font-size="18" fill="${INK_MUTED}" text-anchor="end">doboku-note.com</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${titleBlock}
${personaBlock}
${tradeoffHeader}
${tradeoffCards}
${tableBlock}
${legendBlock}
${brandBlock}
</svg>`;
}

// ------------------------------------------------------------------
// 生成・書き出し
// ------------------------------------------------------------------
async function main() {
  const svgContent = svgPersonaProfile();
  const svgPath = join(OUT_DIR, 'figure-persona-profile.svg');
  const pngPath = join(OUT_DIR, 'figure-persona-profile.png');

  writeFileSync(svgPath, svgContent, 'utf-8');
  console.log(`SVG written: ${svgPath}`);

  await sharp(Buffer.from(svgContent))
    .png()
    .toFile(pngPath);
  console.log(`PNG written: ${pngPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
