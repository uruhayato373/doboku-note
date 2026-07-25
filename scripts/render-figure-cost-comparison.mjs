#!/usr/bin/env node
// docs/note/技術士総監/総監受験コスト比較/img/ に本文用 PNG 図版を生成する。
//
// 設計ルールは .claude/knowledge/reference/note-svg-policy.md 準拠:
// - キャンバス 1200×720
// - 最低 font-size 22px（本文）/ 18px（補足）
// - 右下 doboku-note.com ブランディングのみ
//
// 使い方:
//   node scripts/render-figure-cost-comparison.mjs
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'docs/note/技術士総監/総監受験コスト比較/img');
mkdirSync(OUT_DIR, { recursive: true });

// ブランドトークン（.claude/knowledge/reference/note-svg-policy.md §4 と整合）
const BRAND = '#2e6da4';
const BRAND_FILL = '#e8f0fe';
const BRAND_DEEP = '#1a3a5c';
const INK_STRONG = '#222222';
const INK_BODY = '#555555';
const INK_MUTED = '#8a8a8a';
const POSITIVE = '#3a7d44';
const POSITIVE_FILL = '#e8f5e9';
const DANGER = '#b22234';
const DANGER_FILL = '#fbe6e9';
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

/** Figure 1: コスト比較横棒（受験料込み総支出、昇順） */
function svgCostComparison() {
  // 7 バーを昇順で配置（読み手の視線移動: 安い → 高い）
  const bars = [
    { label: '独学 1 回合格', tag: '理想形', value: 14000, color: INK_BODY,  highlight: false },
    { label: 'マガジン 1 冊 + 1 回合格', tag: '推奨', value: 16480, color: POSITIVE, highlight: true },
    { label: 'マガジン全 6 + 1 回合格', tag: '全網羅', value: 28880, color: POSITIVE, highlight: true },
    { label: 'スタディング + 1 回合格', tag: '最安スクール', value: 43700, color: BRAND, highlight: false },
    { label: '独学 6 回受験', tag: '数学的期待値', value: 84000, color: DANGER, highlight: true },
    { label: 'アガルート フル + 1 回合格', tag: '添削+口頭模試', value: 130000, color: BRAND, highlight: false },
    { label: 'JES 総監 + 1 回合格', tag: '個別対応', value: 192100, color: BRAND_DEEP, highlight: false },
  ];

  const maxValue = 192100;
  const labelX = 350;
  const barX0 = 360;
  const barXMax = 1060;
  const barMaxW = barXMax - barX0;

  const y0 = 160;
  const barH = 50;
  const gap = 14;
  const rowH = barH + gap;

  const barSvgs = bars.map((b, i) => {
    const y = y0 + i * rowH;
    const barW = Math.round((b.value / maxValue) * barMaxW);
    const valueText = `¥${b.value.toLocaleString()}`;
    const cy = y + barH / 2;

    // ハイライト行は背景を淡色で塗る
    const rowBg = b.highlight
      ? `<rect x="20" y="${y - 4}" width="${W - 40}" height="${barH + 8}" rx="8" fill="${b.color === POSITIVE ? POSITIVE_FILL : b.color === DANGER ? DANGER_FILL : BRAND_FILL}"/>`
      : '';

    const labelWeight = b.highlight ? 800 : 700;
    const tagWeight = b.highlight ? 700 : 500;

    return `
  ${rowBg}
  <text x="${labelX}" y="${cy - 4}" font-family="${FONT}" font-size="22" font-weight="${labelWeight}" fill="${INK_STRONG}" text-anchor="end">${xml(b.label)}</text>
  <text x="${labelX}" y="${cy + 22}" font-family="${FONT}" font-size="18" font-weight="${tagWeight}" fill="${b.color}" text-anchor="end">${xml(b.tag)}</text>
  <rect x="${barX0}" y="${y + 8}" width="${barW}" height="${barH - 16}" rx="6" fill="${b.color}"/>
  <text x="${barX0 + barW + 16}" y="${cy + 8}" font-family="${FONT}" font-size="22" font-weight="800" fill="${INK_STRONG}">${xml(valueText)}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${brandFrame()}

  <!-- タイトル -->
  <text x="${W / 2}" y="70" font-family="${FONT}" font-size="32" font-weight="800" fill="${INK_STRONG}" text-anchor="middle">総監合格までの総支出比較（受験料 ¥14,000 込み）</text>
  <text x="${W / 2}" y="108" font-family="${FONT}" font-size="22" font-weight="500" fill="${INK_BODY}" text-anchor="middle">独学 6 回受験 ¥84,000 は、マガジン路線の約 5 倍／最安スクール路線の約 2 倍</text>

  <!-- 軸目盛り -->
  <line x1="${barX0}" y1="${y0 - 8}" x2="${barXMax}" y2="${y0 - 8}" stroke="${INK_MUTED}" stroke-width="1"/>
  <text x="${barX0}" y="${y0 - 16}" font-family="${FONT}" font-size="18" font-weight="500" fill="${INK_MUTED}" text-anchor="start">¥0</text>
  <text x="${(barX0 + barXMax) / 2}" y="${y0 - 16}" font-family="${FONT}" font-size="18" font-weight="500" fill="${INK_MUTED}" text-anchor="middle">¥100,000</text>
  <text x="${barXMax}" y="${y0 - 16}" font-family="${FONT}" font-size="18" font-weight="500" fill="${INK_MUTED}" text-anchor="end">¥200,000</text>

${barSvgs}

  <!-- 凡例 -->
  <g transform="translate(40, ${H - 60})">
    <rect x="0" y="-12" width="18" height="18" rx="3" fill="${POSITIVE}"/>
    <text x="26" y="3" font-family="${FONT}" font-size="18" font-weight="600" fill="${INK_BODY}">doboku-note 路線</text>
    <rect x="220" y="-12" width="18" height="18" rx="3" fill="${DANGER}"/>
    <text x="246" y="3" font-family="${FONT}" font-size="18" font-weight="600" fill="${INK_BODY}">独学多数回（数学的期待値）</text>
    <rect x="610" y="-12" width="18" height="18" rx="3" fill="${BRAND}"/>
    <text x="636" y="3" font-family="${FONT}" font-size="18" font-weight="600" fill="${INK_BODY}">主要スクール（2026年5月時点）</text>
  </g>
</svg>`;
}

async function render() {
  const svg = svgCostComparison();
  const svgPath = join(OUT_DIR, 'figure-1-cost-comparison.svg');
  const pngPath = join(OUT_DIR, 'figure-1-cost-comparison.png');
  writeFileSync(svgPath, svg, 'utf8');
  await sharp(Buffer.from(svg), { density: 144 }).png().toFile(pngPath);
  console.log(`✓ ${svgPath}`);
  console.log(`✓ ${pngPath}`);
}

render().catch((err) => {
  console.error(err);
  process.exit(1);
});
