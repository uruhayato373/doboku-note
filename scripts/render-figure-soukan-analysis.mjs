#!/usr/bin/env node
// content/note/技術士総監/総監択一式17年分分析/img/ に本文用 PNG 図版を 2 枚生成する。
//
// note は markdown の表記法 (| ... | ... |) をレンダリングしないため、本文中の表 2 つを
// 図版に置き換える。設計ルールは .claude/knowledge/reference/note-svg-policy.md に準拠。
//
// 使い方:
//   node scripts/render-figure-soukan-analysis.mjs
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'content/note/技術士総監/総監択一式17年分分析/img');
mkdirSync(OUT_DIR, { recursive: true });

// ブランドトークン（src/styles/globals.css と整合）
const BRAND = '#2e6da4';        // brand
const BRAND_FILL = '#e8f0fe';   // brand-fill
const BRAND_DEEP = '#1a3a5c';   // brand-deep
const INK_STRONG = '#222222';   // ink-strong
const INK_BODY = '#555555';     // ink-body
const INK_MUTED = '#8a8a8a';    // ink-muted
const POSITIVE = '#3a7d44';     // positive
const WARN = '#d4a017';         // warn
const WARN_FILL = '#fbf3df';
const DANGER = '#b22234';       // danger
const DANGER_FILL = '#fbe6e9';
const FONT = 'Hiragino Sans, Hiragino Kaku Gothic ProN, Yu Gothic, Noto Sans JP, sans-serif';

// note-svg-policy 準拠のキャンバス幅
const W = 1200;

function xml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 右下 doboku-note.com ブランディングのみ（左端 brand アクセント縦線は note-svg-policy 改訂で廃止） */
function brandFrame(H) {
  return `
  <text x="${W - 28}" y="${H - 22}" font-family="${FONT}" font-size="18" font-weight="500" fill="${INK_MUTED}" text-anchor="end">doboku-note.com</text>`;
}

/** Figure A: 40 問が 5 管理に 8 問ずつ均等配分されている図 */
function svgDistribution() {
  const H = 720;
  const bands = [
    { range: '問 1〜8',    area: '経済性管理',   count: '8 問', color: BRAND },
    { range: '問 9〜16',   area: '人的資源管理', count: '8 問', color: POSITIVE },
    { range: '問 17〜24',  area: '情報管理',     count: '8 問', color: WARN },
    { range: '問 25〜32',  area: '安全管理',     count: '8 問', color: DANGER },
    { range: '問 33〜40',  area: '社会環境管理', count: '8 問', color: BRAND_DEEP },
  ];
  const bandY0 = 160;
  const bandH = 80;
  const bandGap = 14;
  const bandX = 80;
  const bandW = W - 160;

  const bandSvgs = bands.map((b, i) => {
    const y = bandY0 + i * (bandH + bandGap);
    return `
  <rect x="${bandX}" y="${y}" width="${bandW}" height="${bandH}" rx="10" fill="${b.color}"/>
  <text x="${bandX + 32}" y="${y + bandH / 2 + 10}" font-family="${FONT}" font-size="28" font-weight="700" fill="#ffffff">${xml(b.range)}</text>
  <text x="${bandX + bandW / 2}" y="${y + bandH / 2 + 11}" font-family="${FONT}" font-size="30" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(b.area)}</text>
  <text x="${bandX + bandW - 32}" y="${y + bandH / 2 + 9}" font-family="${FONT}" font-size="24" font-weight="600" fill="#ffffff" text-anchor="end">${xml(b.count)}</text>`;
  }).join('');

  // 帯下部の合計バナー
  const bandsEndY = bandY0 + 5 * bandH + 4 * bandGap; // = 160 + 456 = 616
  const bannerY = bandsEndY + 30; // = 646
  const bannerW = 480;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${brandFrame(H)}

  <!-- タイトル -->
  <text x="${W / 2}" y="78" font-family="${FONT}" font-size="32" font-weight="800" fill="${INK_STRONG}" text-anchor="middle">40 問は 5 つの管理分野に 8 問ずつ均等配分</text>
  <text x="${W / 2}" y="118" font-family="${FONT}" font-size="22" font-weight="500" fill="${INK_BODY}" text-anchor="middle">問題番号で出題分野が固定 — 17 年間共通の基本構造</text>
${bandSvgs}

  <!-- 合計バナー -->
  <rect x="${(W - bannerW) / 2}" y="${bannerY}" width="${bannerW}" height="42" rx="21" fill="${BRAND_FILL}" stroke="${BRAND}" stroke-width="2"/>
  <text x="${W / 2}" y="${bannerY + 28}" font-family="${FONT}" font-size="22" font-weight="700" fill="${BRAND_DEEP}" text-anchor="middle">合計 40 問 ＝ 8 問 × 5 管理（毎年同じ構造）</text>
</svg>`;
}

/** Figure B: 17 年間の出題傾向タイムライン（3 フェーズ・等幅 + 比例年軸） */
function svgTimeline() {
  const H = 720;
  const phases = [
    {
      label: 'フェーズ 1',
      range: 'H21〜H26',
      span: '6 年間',
      headline: '用語定義中心',
      desc: ['数値・名称・定義を', '正確に覚えているか', 'が直接問われる時期'],
      fill: BRAND_FILL,
      stroke: BRAND,
      ink: BRAND_DEEP,
    },
    {
      label: 'フェーズ 2',
      range: 'H27〜H30',
      span: '4 年間',
      headline: '計算問題が定着',
      desc: ['NPV / PERT / 工程能力', '指数など複数概念を', '組み合わせた応用問題'],
      fill: WARN_FILL,
      stroke: WARN,
      ink: '#806010',
    },
    {
      label: 'フェーズ 3',
      range: 'R01〜R07',
      span: '7 年間',
      headline: '時事テーマ急増',
      desc: ['BCP / 働き方改革 /', 'DX / カーボンニュートラル', '— 白書チェック必須'],
      fill: DANGER_FILL,
      stroke: DANGER,
      ink: '#7a1623',
    },
  ];

  // 等幅 3 ボックス（policy 準拠で読みやすさを優先）
  const boxW = 320;
  const boxGap = 30;
  const totalW = 3 * boxW + 2 * boxGap; // 1020
  const boxX0 = (W - totalW) / 2;        // 90
  const boxY = 180;
  const boxH = 350;

  const phaseSvgs = phases.map((p, i) => {
    const x = boxX0 + i * (boxW + boxGap);
    const cx = x + boxW / 2;
    return `
  <!-- フェーズ ${i + 1} -->
  <rect x="${x}" y="${boxY}" width="${boxW}" height="${boxH}" rx="14" fill="${p.fill}" stroke="${p.stroke}" stroke-width="2"/>
  <text x="${cx}" y="${boxY + 44}" font-family="${FONT}" font-size="22" font-weight="600" fill="${p.ink}" text-anchor="middle">${xml(p.label)}</text>
  <text x="${cx}" y="${boxY + 96}" font-family="${FONT}" font-size="36" font-weight="800" fill="${p.ink}" text-anchor="middle">${xml(p.range)}</text>
  <text x="${cx}" y="${boxY + 132}" font-family="${FONT}" font-size="22" font-weight="500" fill="${INK_MUTED}" text-anchor="middle">${xml(p.span)}</text>
  <line x1="${x + 32}" y1="${boxY + 158}" x2="${x + boxW - 32}" y2="${boxY + 158}" stroke="${p.stroke}" stroke-width="1.5" opacity="0.4"/>
  <text x="${cx}" y="${boxY + 204}" font-family="${FONT}" font-size="26" font-weight="700" fill="${INK_STRONG}" text-anchor="middle">${xml(p.headline)}</text>
  ${p.desc.map((line, j) => `<text x="${cx}" y="${boxY + 254 + j * 32}" font-family="${FONT}" font-size="22" font-weight="400" fill="${INK_BODY}" text-anchor="middle">${xml(line)}</text>`).join('\n  ')}`;
  }).join('\n');

  // 比例年軸（実年数を視覚化）
  const TOTAL_YEARS = 17;
  const axisX0 = boxX0;
  const axisX1 = boxX0 + totalW;
  const axisW = axisX1 - axisX0;
  const yearW = axisW / TOTAL_YEARS;
  const tickP1End = axisX0 + 6 * yearW;   // H26 / H27 境界
  const tickP2End = axisX0 + 10 * yearW;  // H30 / R01 境界
  const axisY = 600;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${brandFrame(H)}

  <!-- タイトル -->
  <text x="${W / 2}" y="78" font-family="${FONT}" font-size="32" font-weight="800" fill="${INK_STRONG}" text-anchor="middle">17 年間で問われ方が 3 段階に変化した</text>
  <text x="${W / 2}" y="118" font-family="${FONT}" font-size="22" font-weight="500" fill="${INK_BODY}" text-anchor="middle">用語暗記 → 計算応用 → 時事テーマへとシフト</text>

  <!-- フェーズボックス -->
${phaseSvgs}

  <!-- 比例年軸 -->
  <line x1="${axisX0}" y1="${axisY}" x2="${axisX1}" y2="${axisY}" stroke="${INK_MUTED}" stroke-width="1.5"/>
  <line x1="${axisX0}" y1="${axisY - 6}" x2="${axisX0}" y2="${axisY + 6}" stroke="${INK_MUTED}" stroke-width="1.5"/>
  <line x1="${tickP1End}" y1="${axisY - 6}" x2="${tickP1End}" y2="${axisY + 6}" stroke="${INK_MUTED}" stroke-width="1.5"/>
  <line x1="${tickP2End}" y1="${axisY - 6}" x2="${tickP2End}" y2="${axisY + 6}" stroke="${INK_MUTED}" stroke-width="1.5"/>
  <line x1="${axisX1}" y1="${axisY - 6}" x2="${axisX1}" y2="${axisY + 6}" stroke="${INK_MUTED}" stroke-width="1.5"/>
  <text x="${axisX0}" y="${axisY + 30}" font-family="${FONT}" font-size="20" font-weight="600" fill="${INK_BODY}" text-anchor="middle">H21</text>
  <text x="${tickP1End}" y="${axisY + 30}" font-family="${FONT}" font-size="20" font-weight="600" fill="${INK_BODY}" text-anchor="middle">H27</text>
  <text x="${tickP2End}" y="${axisY + 30}" font-family="${FONT}" font-size="20" font-weight="600" fill="${INK_BODY}" text-anchor="middle">R01</text>
  <text x="${axisX1}" y="${axisY + 30}" font-family="${FONT}" font-size="20" font-weight="600" fill="${INK_BODY}" text-anchor="middle">R07</text>
  <text x="${W / 2}" y="${axisY + 62}" font-family="${FONT}" font-size="18" font-weight="500" fill="${INK_MUTED}" text-anchor="middle">（横軸の刻み幅は実年数に比例）</text>
</svg>`;
}

async function render(svg, outName) {
  const outPath = join(OUT_DIR, outName);
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log(`  ok: ${outName}`);
  return outPath;
}

async function main() {
  console.log('Rendering figures for 総監択一式17年分分析…');
  await render(svgDistribution(), 'figure-distribution-40q.png');
  await render(svgTimeline(), 'figure-trend-timeline.png');
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
