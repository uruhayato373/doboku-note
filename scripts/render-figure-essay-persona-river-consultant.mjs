#!/usr/bin/env node
// docs/note/技術士総監/magazines/総監模範論文-河川コンサル/img/ に本文用 PNG/SVG 図版 1 枚を生成する。
//
// 設計ルール（.claude/knowledge/reference/note-svg-policy.md 準拠）:
//   - キャンバス幅 1200（W固定）
//   - フォント ≥ 22px（補足キャプションを含めて統一）
//   - 色トークン（src/styles/globals.css と整合）のみ使用
//   - 識別は右下 doboku-note.com テキストのみ
//
// 使い方:
//   node scripts/render-figure-essay-persona-river-consultant.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'docs/note/技術士総監/magazines/総監模範論文-河川コンサル/img');
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

// ------------------------------------------------------------------
// 図: 河川コンサル典型 5 管理トレードオフ・プロファイル（1 枚）
// ------------------------------------------------------------------
function svgPersonaProfile() {
  const H = 900;

  // --- 上部: ペルソナ概要バー ---
  const personaY = 40;
  const personaH = 120;
  const personaItems = [
    { label: '組織規模', value: '売上 100-300 億円' },
    { label: '社員数', value: '300-500 名' },
    { label: '部門規模', value: '50 名（河川・砂防）' },
    { label: '業務領域', value: '流域 GIS・防災・グリーンインフラ' },
    { label: '立場', value: '部長（部門統括・対外折衝）' },
  ];
  const colW = (W - 80) / personaItems.length;

  let body = '';

  // ペルソナヘッダ
  body += `
  <rect x="40" y="${personaY}" width="${W - 80}" height="${personaH}" rx="8" fill="${BRAND_DEEP}"/>
  <text x="${W / 2}" y="${personaY + 44}" font-family="${FONT}" font-size="32" font-weight="800" fill="#ffffff" text-anchor="middle">中堅建設コンサル 河川・砂防部門 部長</text>
  <text x="${W / 2}" y="${personaY + 82}" font-family="${FONT}" font-size="22" fill="#c8d8e8" text-anchor="middle">典型 5 管理トレードオフ・プロファイル</text>`;

  // ペルソナ詳細カード
  const cardY = personaY + personaH + 16;
  const cardH = 90;
  for (let i = 0; i < personaItems.length; i++) {
    const it = personaItems[i];
    const cx = 40 + i * colW + colW / 2;
    const bx = 40 + i * colW;
    body += `
  <rect x="${bx + 4}" y="${cardY}" width="${colW - 8}" height="${cardH}" rx="8" fill="${BRAND_FILL}" stroke="${BRAND}" stroke-width="1.5"/>
  <text x="${cx}" y="${cardY + 32}" font-family="${FONT}" font-size="20" font-weight="700" fill="${BRAND_DEEP}" text-anchor="middle">${xml(it.label)}</text>
  <text x="${cx}" y="${cardY + 62}" font-family="${FONT}" font-size="22" font-weight="800" fill="${INK_STRONG}" text-anchor="middle">${xml(it.value)}</text>`;
  }

  // --- 中部: 主要 5 管理トレードオフ ---
  const sectionY = cardY + cardH + 40;
  body += `
  <text x="40" y="${sectionY + 28}" font-family="${FONT}" font-size="28" font-weight="800" fill="${INK_STRONG}">主要 5 管理トレードオフ</text>
  <line x1="40" y1="${sectionY + 40}" x2="${W - 40}" y2="${sectionY + 40}" stroke="${BORDER_LIGHT}" stroke-width="2"/>`;

  const tradeoffs = [
    {
      no: '①',
      pair: '社会環境 × 経済性',
      desc: '環境配慮 vs コスト',
      frame: 'ALARP（合理的に低減可能なレベルまで）',
      c1: '#555555',      // INK_STRONG for 社会環境
      c2: BRAND,          // 経済性
    },
    {
      no: '②',
      pair: '情報 × 人的資源',
      desc: 'DX 推進 vs リスキリング',
      frame: '段階的実施（スモールスタート→横展開）',
      c1: POSITIVE,       // 情報
      c2: WARN,           // 人的資源
    },
    {
      no: '③',
      pair: '社会環境 × 安全',
      desc: '住民合意 vs 工期厳守',
      frame: '合意形成プロセスの前倒し計画化',
      c1: '#555555',      // 社会環境
      c2: DANGER,         // 安全
    },
  ];

  const rowH = 84;
  const rowGap = 12;
  let rowY = sectionY + 56;

  for (const tr of tradeoffs) {
    // 行背景
    body += `
  <rect x="40" y="${rowY}" width="${W - 80}" height="${rowH}" rx="8" fill="${SURFACE_ALT}" stroke="${BORDER_LIGHT}" stroke-width="1.5"/>`;

    // No バッジ
    body += `
  <rect x="56" y="${rowY + 18}" width="52" height="48" rx="8" fill="${BRAND_DEEP}"/>
  <text x="82" y="${rowY + 50}" font-family="${FONT}" font-size="26" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(tr.no)}</text>`;

    // 対立ペア（色付き）
    body += `
  <text x="126" y="${rowY + 38}" font-family="${FONT}" font-size="28" font-weight="800" fill="${INK_STRONG}">${xml(tr.pair)}</text>
  <text x="126" y="${rowY + 68}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">${xml(tr.desc)}</text>`;

    // 解決フレーム
    body += `
  <rect x="680" y="${rowY + 18}" width="${W - 80 - 640}" height="48" rx="6" fill="${BRAND_FILL}"/>
  <text x="700" y="${rowY + 50}" font-family="${FONT}" font-size="22" font-weight="700" fill="${BRAND_DEEP}">解決: ${xml(tr.frame)}</text>`;

    rowY += rowH + rowGap;
  }

  // --- 下部: 年度別テーブル ---
  const tableY = rowY + 40;
  body += `
  <text x="40" y="${tableY + 28}" font-family="${FONT}" font-size="28" font-weight="800" fill="${INK_STRONG}">年度別テーマ × 5 管理軸マトリクス</text>
  <line x1="40" y1="${tableY + 40}" x2="${W - 40}" y2="${tableY + 40}" stroke="${BORDER_LIGHT}" stroke-width="2"/>`;

  // テーブルヘッダ
  const tblHeaderY = tableY + 56;
  const tblHeaderH = 52;
  const wYear = 120;
  const wTheme = 380;
  const wManage1 = 300;
  const wManage2 = 260;
  const tblX = 40;

  body += `
  <rect x="${tblX}" y="${tblHeaderY}" width="${wYear}" height="${tblHeaderH}" rx="6" fill="${BRAND_DEEP}"/>
  <text x="${tblX + wYear / 2}" y="${tblHeaderY + 35}" font-family="${FONT}" font-size="24" font-weight="700" fill="#ffffff" text-anchor="middle">年度</text>
  <rect x="${tblX + wYear}" y="${tblHeaderY}" width="${wTheme}" height="${tblHeaderH}" rx="6" fill="${BRAND_DEEP}"/>
  <text x="${tblX + wYear + wTheme / 2}" y="${tblHeaderY + 35}" font-family="${FONT}" font-size="24" font-weight="700" fill="#ffffff" text-anchor="middle">テーマ・施策</text>
  <rect x="${tblX + wYear + wTheme}" y="${tblHeaderY}" width="${wManage1}" height="${tblHeaderH}" rx="6" fill="${BRAND_DEEP}"/>
  <text x="${tblX + wYear + wTheme + wManage1 / 2}" y="${tblHeaderY + 35}" font-family="${FONT}" font-size="24" font-weight="700" fill="#ffffff" text-anchor="middle">主 管理軸 1</text>
  <rect x="${tblX + wYear + wTheme + wManage1}" y="${tblHeaderY}" width="${wManage2}" height="${tblHeaderH}" rx="6" fill="${BRAND_DEEP}"/>
  <text x="${tblX + wYear + wTheme + wManage1 + wManage2 / 2}" y="${tblHeaderY + 35}" font-family="${FONT}" font-size="24" font-weight="700" fill="#ffffff" text-anchor="middle">主 管理軸 2</text>`;

  // 年度データ行
  // 管理軸の色: 経済性=BRAND, 人的資源=WARN, 安全=DANGER, 情報=POSITIVE, 社会環境=INK_STRONG
  const years = [
    { yr: 'R03', theme: '流域 GIS データ活用', axis1: '情報管理', c1: POSITIVE, axis2: '経済性管理', c2: BRAND },
    { yr: 'R04', theme: '流域 DX 推進計画', axis1: '情報管理', c1: POSITIVE, axis2: '人的資源管理', c2: WARN },
    { yr: 'R05', theme: 'SWOT 戦略立案', axis1: '社会環境管理', c1: INK_BODY, axis2: '経済性管理', c2: BRAND },
    { yr: 'R06', theme: 'グリーンインフラ × CN', axis1: '社会環境管理', c1: INK_BODY, axis2: '経済性管理', c2: BRAND },
    { yr: 'R07', theme: '流域治水 × 住民参画', axis1: '社会環境管理', c1: INK_BODY, axis2: '人的資源管理', c2: WARN },
  ];

  const tblRowH = 64;
  let tblRowY = tblHeaderY + tblHeaderH + 4;
  for (let i = 0; i < years.length; i++) {
    const yr = years[i];
    const bg = i % 2 === 0 ? '#ffffff' : SURFACE_ALT;
    body += `
  <rect x="${tblX}" y="${tblRowY}" width="${wYear + wTheme + wManage1 + wManage2}" height="${tblRowH}" rx="4" fill="${bg}" stroke="${BORDER_LIGHT}" stroke-width="1"/>
  <text x="${tblX + wYear / 2}" y="${tblRowY + tblRowH / 2 + 9}" font-family="${FONT}" font-size="26" font-weight="800" fill="${BRAND_DEEP}" text-anchor="middle">${xml(yr.yr)}</text>
  <text x="${tblX + wYear + 16}" y="${tblRowY + tblRowH / 2 + 9}" font-family="${FONT}" font-size="24" fill="${INK_STRONG}">${xml(yr.theme)}</text>`;

    // 管理軸バッジ 1
    const badge1X = tblX + wYear + wTheme + 20;
    body += `
  <rect x="${badge1X}" y="${tblRowY + 12}" width="240" height="40" rx="6" fill="${yr.c1}" opacity="0.15"/>
  <text x="${badge1X + 120}" y="${tblRowY + 38}" font-family="${FONT}" font-size="22" font-weight="700" fill="${yr.c1}" text-anchor="middle">${xml(yr.axis1)}</text>`;

    // 管理軸バッジ 2
    const badge2X = tblX + wYear + wTheme + wManage1 + 20;
    body += `
  <rect x="${badge2X}" y="${tblRowY + 12}" width="210" height="40" rx="6" fill="${yr.c2}" opacity="0.15"/>
  <text x="${badge2X + 105}" y="${tblRowY + 38}" font-family="${FONT}" font-size="22" font-weight="700" fill="${yr.c2}" text-anchor="middle">${xml(yr.axis2)}</text>`;

    tblRowY += tblRowH;
  }

  // 凡例
  const legendY = tblRowY + 40;
  const legendItems = [
    { label: '経済性管理', color: BRAND },
    { label: '情報管理', color: POSITIVE },
    { label: '人的資源管理', color: WARN },
    { label: '安全管理', color: DANGER },
    { label: '社会環境管理', color: INK_BODY },
  ];
  const legendGap = 200;
  const legendStartX = 40;
  body += `
  <text x="${legendStartX}" y="${legendY + 22}" font-family="${FONT}" font-size="20" fill="${INK_MUTED}" font-weight="700">凡例:</text>`;
  for (let i = 0; i < legendItems.length; i++) {
    const it = legendItems[i];
    const lx = legendStartX + 80 + i * legendGap;
    body += `
  <rect x="${lx}" y="${legendY + 6}" width="20" height="20" rx="4" fill="${it.color}"/>
  <text x="${lx + 28}" y="${legendY + 22}" font-family="${FONT}" font-size="20" fill="${INK_BODY}">${xml(it.label)}</text>`;
  }

  // 右下ブランドウォーターマーク
  body += `
  <text x="${W - 40}" y="${H - 20}" font-family="${FONT}" font-size="18" fill="${INK_MUTED}" text-anchor="end">doboku-note.com</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${body}
</svg>`;
}

// ------------------------------------------------------------------
// 生成・保存
// ------------------------------------------------------------------
async function main() {
  const svg = svgPersonaProfile();
  const svgPath = join(OUT_DIR, 'figure-persona-profile.svg');
  const pngPath = join(OUT_DIR, 'figure-persona-profile.png');

  writeFileSync(svgPath, svg, 'utf8');
  console.log(`SVG written: ${svgPath}`);

  await sharp(Buffer.from(svg))
    .png()
    .toFile(pngPath);
  console.log(`PNG written: ${pngPath}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
