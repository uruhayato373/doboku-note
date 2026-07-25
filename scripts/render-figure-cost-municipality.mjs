#!/usr/bin/env node
// docs/note/技術士総監/総監コスト公務員版/img/ に本文用 PNG 図版を生成する。
//
// 設計ルールは .claude/knowledge/reference/note-svg-policy.md 準拠:
// - キャンバス 1200×720
// - 最低 font-size 22px（本文）/ 18px（補足）
// - 右下 doboku-note.com ブランディングのみ
//
// 使い方:
//   node scripts/render-figure-cost-municipality.mjs
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'docs/note/技術士総監/総監コスト公務員版/img');
mkdirSync(OUT_DIR, { recursive: true });

const BRAND = '#2e6da4';
const BRAND_FILL = '#e8f0fe';
const BRAND_DEEP = '#1a3a5c';
const INK_STRONG = '#222222';
const INK_BODY = '#555555';
const INK_MUTED = '#8a8a8a';
const POSITIVE = '#3a7d44';
const POSITIVE_FILL = '#e8f5e9';
const DANGER = '#b22234';
const WARN = '#d4a017';
const FONT = 'Hiragino Sans, Hiragino Kaku Gothic ProN, Yu Gothic, Noto Sans JP, sans-serif';

const W = 1200;
const H = 720;

function xml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function brandFrame() {
  return `<text x="${W - 28}" y="${H - 22}" font-family="${FONT}" font-size="18" font-weight="500" fill="${INK_MUTED}" text-anchor="end">doboku-note.com</text>`;
}

/** Figure 1: 公務員 vs 民間 — 総監保有による 30 年累積ベネフィット（資格手当 + 自己啓発支援） */
function svgBenefitComparison() {
  // 30 年累積ベネフィット（資格手当 + 自己啓発支援、推定値）
  // 単位: ¥1,000（千円）
  const bars = [
    { label: '一般市町村（公務員）',  tag: '資格手当少 or なし', value: 900,  color: INK_BODY,  highlight: false, note: '月 ¥0-5k × 30 年' },
    { label: 'ゼネコン勤務',         tag: '業務命令時のみ',   value: 1000, color: BRAND,     highlight: false, note: '受験補助は手厚いが手当は少' },
    { label: '建設コンサル勤務',     tag: '会社補助厚め',     value: 1800, color: BRAND,     highlight: false, note: '業務密接、補助あり' },
    { label: '中核市・特例市（公務員）', tag: '中庸',          value: 2700, color: POSITIVE,  highlight: false, note: '月 ¥5-10k × 30 年' },
    { label: '都道府県（公務員）',    tag: '安定',             value: 3600, color: POSITIVE,  highlight: true,  note: '月 ¥8-12k × 30 年' },
    { label: '政令指定都市（公務員）', tag: '最大',            value: 4500, color: POSITIVE,  highlight: true,  note: '月 ¥10-15k × 30 年' },
  ];

  const maxValue = 4500;
  const labelX = 380;
  const barX0 = 390;
  const barXMax = 1020;
  const barMaxW = barXMax - barX0;

  const y0 = 160;
  const barH = 60;
  const gap = 16;
  const rowH = barH + gap;

  const barSvgs = bars.map((b, i) => {
    const y = y0 + i * rowH;
    const barW = Math.round((b.value / maxValue) * barMaxW);
    const valueText = `¥${(b.value / 1000).toFixed(1)}M`;
    const cy = y + barH / 2;

    const rowBg = b.highlight
      ? `<rect x="20" y="${y - 4}" width="${W - 40}" height="${barH + 8}" rx="8" fill="${POSITIVE_FILL}"/>`
      : '';

    const labelWeight = b.highlight ? 800 : 700;

    return `
  ${rowBg}
  <text x="${labelX}" y="${cy - 6}" font-family="${FONT}" font-size="22" font-weight="${labelWeight}" fill="${INK_STRONG}" text-anchor="end">${xml(b.label)}</text>
  <text x="${labelX}" y="${cy + 22}" font-family="${FONT}" font-size="18" font-weight="500" fill="${b.color}" text-anchor="end">${xml(b.tag)}</text>
  <rect x="${barX0}" y="${y + 12}" width="${barW}" height="${barH - 24}" rx="6" fill="${b.color}"/>
  <text x="${barX0 + barW + 16}" y="${cy + 8}" font-family="${FONT}" font-size="24" font-weight="800" fill="${INK_STRONG}">${xml(valueText)}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${brandFrame()}

  <!-- タイトル -->
  <text x="${W / 2}" y="68" font-family="${FONT}" font-size="32" font-weight="800" fill="${INK_STRONG}" text-anchor="middle">公務員 vs 民間 — 総監保有の 30 年累積ベネフィット</text>
  <text x="${W / 2}" y="106" font-family="${FONT}" font-size="22" font-weight="500" fill="${INK_BODY}" text-anchor="middle">資格手当 + 自己啓発支援金の累計（投資 ¥17,000 で得られる cash return の推定）</text>

  <!-- 軸目盛り -->
  <line x1="${barX0}" y1="${y0 - 8}" x2="${barXMax}" y2="${y0 - 8}" stroke="${INK_MUTED}" stroke-width="1"/>
  <text x="${barX0}" y="${y0 - 16}" font-family="${FONT}" font-size="18" font-weight="500" fill="${INK_MUTED}" text-anchor="start">¥0</text>
  <text x="${(barX0 + barXMax) / 2}" y="${y0 - 16}" font-family="${FONT}" font-size="18" font-weight="500" fill="${INK_MUTED}" text-anchor="middle">¥2.5M</text>
  <text x="${barXMax}" y="${y0 - 16}" font-family="${FONT}" font-size="18" font-weight="500" fill="${INK_MUTED}" text-anchor="end">¥5M</text>

${barSvgs}

  <!-- 注釈 -->
  <rect x="40" y="${H - 100}" width="${W - 80}" height="56" rx="8" fill="${BRAND_FILL}" stroke="${BRAND}" stroke-width="1.5"/>
  <text x="60" y="${H - 76}" font-family="${FONT}" font-size="20" font-weight="700" fill="${BRAND_DEEP}">投資 ¥17,000（受験料 + マガジン）で、公務員（政令市）は 30 年で ¥4.5M の return</text>
  <text x="60" y="${H - 54}" font-family="${FONT}" font-size="18" font-weight="500" fill="${INK_BODY}">※ 資格手当・支援金は自治体条例次第。本図は政令市〜一般市の平均的傾向の推定値です。</text>
</svg>`;
}

async function render() {
  const svg = svgBenefitComparison();
  const svgPath = join(OUT_DIR, 'figure-1-benefit-comparison.svg');
  const pngPath = join(OUT_DIR, 'figure-1-benefit-comparison.png');
  writeFileSync(svgPath, svg, 'utf8');
  await sharp(Buffer.from(svg), { density: 144 }).png().toFile(pngPath);
  console.log(`✓ ${svgPath}`);
  console.log(`✓ ${pngPath}`);
}

render().catch((err) => {
  console.error(err);
  process.exit(1);
});
