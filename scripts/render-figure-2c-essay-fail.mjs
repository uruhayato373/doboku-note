#!/usr/bin/env node
// content/note/1級・2級土木/2級土木/施工経験記述で落ちる答案/img/ に本文用 PNG 図版を生成する。
// note-svg-policy.md 準拠（W=1200・本文 font 22+・余白 40/24・右下ブランド）。
//   node scripts/render-figure-2c-essay-fail.mjs
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'content/note/1級・2級土木/2級土木/施工経験記述で落ちる答案/img');
mkdirSync(OUT_DIR, { recursive: true });

const BRAND = '#2e6da4';
const BRAND_DEEP = '#1a3a5c';
const INK_STRONG = '#222222';
const INK_BODY = '#555555';
const INK_MUTED = '#8a8a8a';
const POSITIVE = '#3a7d44';
const POSITIVE_FILL = '#e8f5ea';
const DANGER = '#b22234';
const DANGER_FILL = '#fbe6e9';
const FONT = 'Hiragino Sans, Hiragino Kaku Gothic ProN, Yu Gothic, Noto Sans JP, sans-serif';
const W = 1200;

function brandFrame(H) {
  return `<text x="${W - 28}" y="${H - 22}" font-family="${FONT}" font-size="18" font-weight="500" fill="${INK_MUTED}" text-anchor="end">doboku-note.com</text>`;
}

// Figure 1: 落ちる4つの型と直す方向
function svgFourTypes() {
  const H = 760;
  const rows = [
    { n: '型1', bad: '課題と対応がつながらない', good: '課題の論点に対応で答える' },
    { n: '型2', bad: '誰でも書ける一般論になる', good: '数値と現場の固有条件を入れる' },
    { n: '型3', bad: '工事概要と本文が不整合', good: '概要から自然に起こる課題を選ぶ' },
    { n: '型4', bad: 'やったことの羅列で終わる', good: '対応の前に「判断の理由」を書く' },
  ];
  const badgeX = 40, badgeW = 104;
  const badX = 168, badW = 420;
  const arrowX = 604;
  const goodX = 660, goodW = 460;
  const rowH = 112, gap = 22, y0 = 192;

  const rowsSvg = rows.map((r, i) => {
    const y = y0 + i * (rowH + gap);
    const cy = y + rowH / 2;
    const textY = cy + 9;
    return `
    <rect x="${badgeX}" y="${y}" width="${badgeW}" height="${rowH}" rx="8" fill="${BRAND_DEEP}"/>
    <text x="${badgeX + badgeW / 2}" y="${textY}" font-family="${FONT}" font-size="30" font-weight="700" fill="#ffffff" text-anchor="middle">${r.n}</text>

    <rect x="${badX}" y="${y}" width="${badW}" height="${rowH}" rx="8" fill="${DANGER_FILL}" stroke="${DANGER}" stroke-width="2"/>
    <text x="${badX + 26}" y="${textY}" font-family="${FONT}" font-size="34" font-weight="700" fill="${DANGER}" text-anchor="middle">×</text>
    <text x="${badX + 56}" y="${textY}" font-family="${FONT}" font-size="24" font-weight="600" fill="${INK_STRONG}">${r.bad}</text>

    <text x="${arrowX + 16}" y="${textY}" font-family="${FONT}" font-size="34" font-weight="700" fill="${INK_MUTED}" text-anchor="middle">→</text>

    <rect x="${goodX}" y="${y}" width="${goodW}" height="${rowH}" rx="8" fill="${POSITIVE_FILL}" stroke="${POSITIVE}" stroke-width="2"/>
    <text x="${goodX + 26}" y="${textY}" font-family="${FONT}" font-size="34" font-weight="700" fill="${POSITIVE}" text-anchor="middle">○</text>
    <text x="${goodX + 56}" y="${textY}" font-family="${FONT}" font-size="24" font-weight="600" fill="${INK_STRONG}">${r.good}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <text x="40" y="68" font-family="${FONT}" font-size="36" font-weight="700" fill="${BRAND_DEEP}">施工経験記述で落ちる4つの型と直す方向</text>
  <text x="40" y="108" font-family="${FONT}" font-size="22" font-weight="500" fill="${INK_BODY}">添削する側が「評価できない」と感じる典型パターン</text>
  <line x1="40" y1="132" x2="${W - 40}" y2="132" stroke="#e5e7eb" stroke-width="2"/>
  <text x="${badX + badW / 2}" y="172" font-family="${FONT}" font-size="22" font-weight="700" fill="${DANGER}" text-anchor="middle">落ちる答案</text>
  <text x="${goodX + goodW / 2}" y="172" font-family="${FONT}" font-size="22" font-weight="700" fill="${POSITIVE}" text-anchor="middle">直す方向</text>
  ${rowsSvg}
  ${brandFrame(H)}
</svg>`;
}

async function render(svg, outName) {
  const outPath = join(OUT_DIR, outName);
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log(`  ok: ${outName}`);
}

async function main() {
  console.log('Rendering figures for 施工経験記述で落ちる答案…');
  await render(svgFourTypes(), 'figure-1-four-failure-types.png');
  console.log('Done.');
}
main();
