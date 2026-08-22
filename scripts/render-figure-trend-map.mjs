#!/usr/bin/env node
// content/note/技術士総監/出題傾向変遷マップ/img/ に本文用 PNG 図版を生成する。
//
// 元の markdown 表（17 行 × 5 列の年度別出題テーマ表）は note でレンダーされない
// ため、SVG で描画して PNG に書き出す。設計ルールは .claude/knowledge/reference/note-svg-policy.md
// に準拠（フォント ≥22px、キャンバス幅 1200、左 brand アクセント縦線、
// 右下 doboku-note.com ブランディング）。
//
// 使い方:
//   node scripts/render-figure-trend-map.mjs
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'content/note/技術士総監/出題傾向変遷マップ/img');
mkdirSync(OUT_DIR, { recursive: true });

// ブランドトークン（src/styles/globals.css と整合）
const BRAND = '#2e6da4';
const BRAND_FILL = '#e8f0fe';
const BRAND_DEEP = '#1a3a5c';
const INK_STRONG = '#222222';
const INK_BODY = '#555555';
const INK_MUTED = '#8a8a8a';
const WARN = '#d4a017';
const WARN_FILL = '#fbf3df';
const WARN_INK = '#806010';
const NEUTRAL = '#6b7280';
const NEUTRAL_FILL = '#eef0f3';
const NEUTRAL_INK = '#3a3a52';

const FONT = 'Hiragino Sans, Hiragino Kaku Gothic ProN, Yu Gothic, Noto Sans JP, sans-serif';

const W = 1200;

function xml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function brandFrame(H) {
  // 識別は右下 doboku-note.com テキストのみ。左端アクセント縦線は使わない（note-svg-policy）
  return `
  <text x="${W - 28}" y="${H - 22}" font-family="${FONT}" font-size="18" font-weight="500" fill="${INK_MUTED}" text-anchor="end">doboku-note.com</text>`;
}

/** 17 年分 年度別表（期 / 年度 / 主要テーマ / 設問数 / 論述対象） */
function svgPeriodYearlyTable() {
  const rowH = 62;
  const headerH = 72;
  const titleY = 90;
  const subtitleY = 124;
  const tableTop = 160;

  const tableLeft = 80;
  const tableWidth = W - 160; // 1040

  const colW = {
    period: 170,
    year: 110,
    theme: 440,
    count: 110,
    target: 210,
  };
  const colX = {
    period: tableLeft,
    year: tableLeft + colW.period,
    theme: tableLeft + colW.period + colW.year,
    count: tableLeft + colW.period + colW.year + colW.theme,
    target: tableLeft + colW.period + colW.year + colW.theme + colW.count,
  };

  const periods = [
    {
      name: '第1期',
      subtitle: '実験期',
      range: 'H21〜H27',
      fill: NEUTRAL_FILL,
      stroke: NEUTRAL,
      ink: NEUTRAL_INK,
      years: [
        { year: 'H21', theme: '不測事態・リスク認識', count: '3問', target: 'プロジェクト' },
        { year: 'H22', theme: '技術の負の遺産化', count: '3問', target: '事業（ケース選択）' },
        { year: 'H23', theme: 'BCP（東日本大震災後）', count: '3問', target: '事業モデル' },
        { year: 'H24', theme: '環境変化への対応', count: '3問', target: 'プロジェクト' },
        { year: 'H25', theme: 'メンテナンス最適化', count: '2問', target: '事業（LCC）' },
        { year: 'H26', theme: '人口減少社会', count: '3問', target: '施設・事業' },
        { year: 'H27', theme: 'リスクマネジメント', count: '3問', target: 'プロジェクト' },
      ],
    },
    {
      name: '第2期',
      subtitle: '転換期',
      range: 'H28〜R02',
      fill: WARN_FILL,
      stroke: WARN,
      ink: WARN_INK,
      years: [
        { year: 'H28', theme: '科学技術進展と事業変化', count: '4問', target: '事業' },
        { year: 'H29', theme: '事業の持続可能性（SDGs）', count: '4問', target: '事業' },
        { year: 'H30', theme: '働き方改革', count: '3問', target: '事業・プロジェクト' },
        { year: 'R01', theme: 'ヒューマンエラー', count: '2問', target: '事業・プロジェクト' },
        { year: 'R02', theme: '異常気象（BCP）', count: '3問', target: '事業場' },
      ],
    },
    {
      name: '第3期',
      subtitle: '定着期',
      range: 'R03〜R07',
      fill: BRAND_FILL,
      stroke: BRAND,
      ink: BRAND_DEEP,
      years: [
        { year: 'R03', theme: 'データ利活用', count: '3問', target: '事業・プロジェクト' },
        { year: 'R04', theme: 'DX（デジタル変革）', count: '3問', target: '事業・組織' },
        { year: 'R05', theme: 'SWOT分析・組織戦略', count: '3問', target: '組織' },
        { year: 'R06', theme: 'カーボンニュートラル', count: '3問', target: '事業・組織' },
        { year: 'R07', theme: '少子高齢化', count: '3問', target: '事業・組織' },
      ],
    },
  ];

  const totalRows = periods.reduce((s, p) => s + p.years.length, 0);
  const tableBottom = tableTop + headerH + totalRows * rowH;
  const H = tableBottom + 60;

  // Header row
  const headerY = tableTop;
  const headerRow = `
  <rect x="${tableLeft}" y="${headerY}" width="${tableWidth}" height="${headerH}" fill="${BRAND_FILL}" stroke="${BRAND}" stroke-width="2"/>
  <text x="${colX.period + colW.period / 2}" y="${headerY + headerH / 2 + 10}" font-family="${FONT}" font-size="24" font-weight="800" fill="${BRAND_DEEP}" text-anchor="middle">期</text>
  <text x="${colX.year + colW.year / 2}" y="${headerY + headerH / 2 + 10}" font-family="${FONT}" font-size="24" font-weight="800" fill="${BRAND_DEEP}" text-anchor="middle">年度</text>
  <text x="${colX.theme + colW.theme / 2}" y="${headerY + headerH / 2 + 10}" font-family="${FONT}" font-size="24" font-weight="800" fill="${BRAND_DEEP}" text-anchor="middle">主要テーマ</text>
  <text x="${colX.count + colW.count / 2}" y="${headerY + headerH / 2 + 10}" font-family="${FONT}" font-size="24" font-weight="800" fill="${BRAND_DEEP}" text-anchor="middle">設問数</text>
  <text x="${colX.target + colW.target / 2}" y="${headerY + headerH / 2 + 10}" font-family="${FONT}" font-size="24" font-weight="800" fill="${BRAND_DEEP}" text-anchor="middle">論述対象</text>`;

  // Body rows
  let body = '';
  let y = tableTop + headerH;
  for (const p of periods) {
    const periodH = p.years.length * rowH;
    body += `
  <rect x="${colX.period}" y="${y}" width="${colW.period}" height="${periodH}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="1.5"/>
  <text x="${colX.period + colW.period / 2}" y="${y + periodH / 2 - 8}" font-family="${FONT}" font-size="26" font-weight="800" fill="${p.ink}" text-anchor="middle">${xml(p.name)}</text>
  <text x="${colX.period + colW.period / 2}" y="${y + periodH / 2 + 22}" font-family="${FONT}" font-size="22" font-weight="600" fill="${p.ink}" text-anchor="middle">${xml(p.subtitle)}</text>
  <text x="${colX.period + colW.period / 2}" y="${y + periodH / 2 + 48}" font-family="${FONT}" font-size="18" font-weight="500" fill="${p.ink}" text-anchor="middle">${xml(p.range)}</text>`;

    for (const yr of p.years) {
      body += `
  <rect x="${colX.year}" y="${y}" width="${tableWidth - colW.period}" height="${rowH}" fill="#ffffff" stroke="#dde2e8" stroke-width="1"/>
  <line x1="${colX.theme}" y1="${y}" x2="${colX.theme}" y2="${y + rowH}" stroke="#dde2e8" stroke-width="1"/>
  <line x1="${colX.count}" y1="${y}" x2="${colX.count}" y2="${y + rowH}" stroke="#dde2e8" stroke-width="1"/>
  <line x1="${colX.target}" y1="${y}" x2="${colX.target}" y2="${y + rowH}" stroke="#dde2e8" stroke-width="1"/>
  <text x="${colX.year + colW.year / 2}" y="${y + rowH / 2 + 8}" font-family="${FONT}" font-size="24" font-weight="700" fill="${INK_STRONG}" text-anchor="middle">${xml(yr.year)}</text>
  <text x="${colX.theme + 20}" y="${y + rowH / 2 + 8}" font-family="${FONT}" font-size="22" font-weight="500" fill="${INK_BODY}">${xml(yr.theme)}</text>
  <text x="${colX.count + colW.count / 2}" y="${y + rowH / 2 + 8}" font-family="${FONT}" font-size="22" font-weight="600" fill="${INK_STRONG}" text-anchor="middle">${xml(yr.count)}</text>
  <text x="${colX.target + 20}" y="${y + rowH / 2 + 8}" font-family="${FONT}" font-size="22" font-weight="500" fill="${INK_BODY}">${xml(yr.target)}</text>`;
      y += rowH;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${brandFrame(H)}

  <text x="${W / 2}" y="${titleY}" font-family="${FONT}" font-size="32" font-weight="800" fill="${INK_STRONG}" text-anchor="middle">17年分 年度別出題テーマと論述対象</text>
  <text x="${W / 2}" y="${subtitleY}" font-family="${FONT}" font-size="22" font-weight="500" fill="${INK_BODY}" text-anchor="middle">H21〜R07 を3期に区分 — 設問数・論述対象の推移</text>
${headerRow}
${body}
</svg>`;
}

async function render(svg, outName) {
  const svgPath = join(OUT_DIR, outName.replace(/\.png$/, '.svg'));
  const pngPath = join(OUT_DIR, outName);
  writeFileSync(svgPath, svg);
  await sharp(Buffer.from(svg)).png().toFile(pngPath);
  console.log(`  ok: ${outName}`);
}

async function main() {
  console.log('Rendering figures for 出題傾向変遷マップ…');
  await render(svgPeriodYearlyTable(), 'figure-3-period-yearly-table.png');
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
