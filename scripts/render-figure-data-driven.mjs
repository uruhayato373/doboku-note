#!/usr/bin/env node
// docs/note/magazines/data-driven-strategy/img/ に本文用 PNG/SVG 図版 3 枚を生成する。
//
// 設計ルール（docs/reference/note-svg-policy.md 準拠）:
//   - キャンバス幅 1200（同一記事内で統一）
//   - フォント ≥ 22px（補足キャプションを含めて統一）
//   - 色トークン（src/styles/globals.css と整合）のみ使用
//   - 識別は右下 doboku-note.com テキストのみ
//
// 使い方:
//   node scripts/render-figure-data-driven.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'docs/note/magazines/data-driven-strategy/img');
mkdirSync(OUT_DIR, { recursive: true });

// ブランドトークン
const BRAND = '#2e6da4';
const BRAND_FILL = '#e8f0fe';
const BRAND_DEEP = '#1a3a5c';
const INK_STRONG = '#222222';
const INK_BODY = '#555555';
const INK_MUTED = '#8a8a8a';
const POSITIVE = '#3a7d44';
const WARN = '#d4a017';
const DANGER = '#b22234';
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

function brandId(H) {
  return `
  <text x="${W - 16}" y="${H - 12}" font-family="${FONT}" font-size="18" fill="${INK_MUTED}" text-anchor="end">doboku-note.com</text>`;
}

// ------------------------------------------------------------------
// 図 1: Top 20 キーワード頻度バーチャート
// ------------------------------------------------------------------
function svgTop20Keywords() {
  const data = [
    { kw: '安全管理', freq: 35 },
    { kw: '形式知', freq: 26 },
    { kw: '暗黙知', freq: 22 },
    { kw: '情報開示', freq: 20 },
    { kw: '初期投資', freq: 15 },
    { kw: '可視化', freq: 15 },
    { kw: 'ISMS', freq: 13 },
    { kw: 'サイバーセキュリティ', freq: 7 },
    { kw: 'グリーンインフラ', freq: 7 },
    { kw: 'エネルギー', freq: 7 },
    { kw: '個人情報', freq: 5 },
    { kw: '稼働率', freq: 5 },
    { kw: 'IoT', freq: 4 },
    { kw: '優先順位', freq: 4 },
    { kw: 'データ収集', freq: 4 },
    { kw: '予防保全', freq: 4 },
    { kw: 'カーボンニュートラル', freq: 4 },
    { kw: '安全教育', freq: 4 },
    { kw: 'ライセンス', freq: 3 },
    { kw: '多要素認証', freq: 3 },
  ];

  const rowH = 46;
  const labelW = 220;
  const barAreaW = 820;
  const freqLabelW = 60;
  const margin = 40;
  const barX = margin + labelW + 16;
  const maxFreq = 35;
  const topY = 130;
  const H = topY + data.length * rowH + 80 + 80; // rows + caption + bottom

  function barColor(i) {
    if (i < 4) return BRAND;
    if (i < 10) return POSITIVE;
    return INK_MUTED;
  }

  let body = '';
  // ヘッダライン
  body += `
  <line x1="${margin}" y1="${topY}" x2="${W - margin}" y2="${topY}" stroke="${BORDER_LIGHT}" stroke-width="1"/>`;

  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const y = topY + i * rowH;
    const fill = i % 2 === 0 ? '#ffffff' : SURFACE_ALT;
    const barW = Math.round((d.freq / maxFreq) * barAreaW);
    const color = barColor(i);

    // 行背景
    body += `
  <rect x="${margin}" y="${y}" width="${W - margin * 2}" height="${rowH}" fill="${fill}"/>`;

    // ラベル（右揃え）
    body += `
  <text x="${margin + labelW}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="22" fill="${INK_STRONG}" text-anchor="end">${xml(d.kw)}</text>`;

    // バー
    body += `
  <rect x="${barX}" y="${y + 10}" width="${barW}" height="${rowH - 20}" rx="4" fill="${color}"/>`;

    // 頻度数
    body += `
  <text x="${barX + barW + 10}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="22" font-weight="700" fill="${color}">${xml(d.freq)}</text>`;
  }

  // 区切り線（行末）
  const lastY = topY + data.length * rowH;
  body += `
  <line x1="${margin}" y1="${lastY}" x2="${W - margin}" y2="${lastY}" stroke="${BORDER_LIGHT}" stroke-width="1"/>`;

  // キャプション
  const captY = lastY + 24;
  body += `
  <rect x="${margin}" y="${captY}" width="${W - margin * 2}" height="48" rx="6" fill="${BRAND_FILL}"/>
  <text x="${margin + 20}" y="${captY + 32}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}">上位 4 キーワード（安全管理・形式知・暗黙知・情報開示）で Top 20 の約 47% を占有</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('Top 20 頻出キーワード（18 論文 × 637 KW 分析）', '横棒グラフ：左＝キーワード名、右＝出現頻度')}
${body}
${brandId(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 2: ペルソナ別頻度プロファイル比較
// ------------------------------------------------------------------
function svgPersonaProfile() {
  const personas = [
    {
      name: 'ゼネコン',
      color: BRAND,
      items: [
        { kw: '安全管理', score: 12 },
        { kw: '情報開示', score: 3 },
        { kw: '形式知', score: 4 },
        { kw: '暗黙知', score: 3 },
        { kw: '初期投資', score: 5 },
      ],
    },
    {
      name: '河川コンサル',
      color: POSITIVE,
      items: [
        { kw: '安全管理', score: 8 },
        { kw: '情報開示', score: 8 },
        { kw: '形式知', score: 5 },
        { kw: '暗黙知', score: 4 },
        { kw: 'グリーンインフラ', score: 5 },
      ],
    },
    {
      name: '環境調査',
      color: WARN,
      items: [
        { kw: '安全管理', score: 6 },
        { kw: '形式知', score: 12 },
        { kw: '暗黙知', score: 11 },
        { kw: 'ISMS', score: 6 },
        { kw: '個人情報', score: 3 },
      ],
    },
    {
      name: '道路発注者',
      color: DANGER,
      items: [
        { kw: '安全管理', score: 9 },
        { kw: '情報開示', score: 8 },
        { kw: '予防保全', score: 3 },
        { kw: '初期投資', score: 4 },
        { kw: '可視化', score: 4 },
      ],
    },
  ];

  const maxScore = 12;
  const colCount = personas.length;
  const margin = 40;
  const colGap = 24;
  const colW = Math.floor((W - margin * 2 - colGap * (colCount - 1)) / colCount);
  const topY = 130;
  const headerH = 52;
  const kwRowH = 52;
  const kwCount = 5;
  const barAreaH = kwCount * kwRowH;
  const captionH = 72;
  const H = topY + headerH + 40 + barAreaH + 40 + captionH + 40;

  let body = '';

  for (let ci = 0; ci < colCount; ci++) {
    const p = personas[ci];
    const colX = margin + ci * (colW + colGap);
    const barStartY = topY + headerH + 40;
    const barMaxW = colW - 80; // キーワードラベル幅分を残す

    // ペルソナ列ヘッダ
    body += `
  <rect x="${colX}" y="${topY}" width="${colW}" height="${headerH}" rx="8" fill="${p.color}"/>
  <text x="${colX + colW / 2}" y="${topY + 34}" font-family="${FONT}" font-size="24" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(p.name)}</text>`;

    for (let ki = 0; ki < p.items.length; ki++) {
      const item = p.items[ki];
      const ky = barStartY + ki * kwRowH;
      const barW = Math.round((item.score / maxScore) * barMaxW);
      const kwLabelW = 78;
      const barX = colX + kwLabelW + 8;

      // 行背景
      const fill = ki % 2 === 0 ? '#ffffff' : SURFACE_ALT;
      body += `
  <rect x="${colX}" y="${ky}" width="${colW}" height="${kwRowH}" fill="${fill}" stroke="${BORDER_LIGHT}" stroke-width="1"/>`;

      // KW ラベル
      body += `
  <text x="${colX + kwLabelW - 4}" y="${ky + kwRowH / 2 + 8}" font-family="${FONT}" font-size="22" fill="${INK_STRONG}" text-anchor="end">${xml(item.kw)}</text>`;

      // バー
      body += `
  <rect x="${barX}" y="${ky + 12}" width="${barW}" height="${kwRowH - 24}" rx="3" fill="${p.color}"/>`;

      // スコア
      body += `
  <text x="${barX + barW + 6}" y="${ky + kwRowH / 2 + 8}" font-family="${FONT}" font-size="22" font-weight="700" fill="${p.color}">${xml(item.score)}</text>`;
    }
  }

  // キャプション
  const captY = topY + headerH + 40 + barAreaH + 40;
  body += `
  <rect x="${margin}" y="${captY}" width="${W - margin * 2}" height="${captionH}" rx="6" fill="${BRAND_FILL}"/>
  <text x="${margin + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}">ゼネコンは安全偏重・環境調査は形式知/暗黙知偏重</text>
  <text x="${margin + 20}" y="${captY + 58}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">河川と道路は情報開示重視 — 立場で論点プロファイルが異なる</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('ペルソナ別キーワード傾向（4 立場の論点プロファイル）', '4 列並列バー：各列が 1 ペルソナ、バー長 = 上位 5KW の相対スコア')}
${body}
${brandId(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 3: χ² 検定結果（一次択一の番号偏り）
// ------------------------------------------------------------------
function svgChiSquared() {
  const H = 860;
  const margin = 40;

  // --- 上部：全体分布バー ---
  const distData = [
    { label: '選択肢1', n: 50, pct: '17.9%' },
    { label: '選択肢2', n: 56, pct: '20.0%' },
    { label: '選択肢3', n: 61, pct: '21.8%' },
    { label: '選択肢4', n: 57, pct: '20.4%' },
    { label: '選択肢5', n: 56, pct: '20.0%' },
  ];
  const topY = 130;
  const distH = 160;
  const barGap = 20;
  const barCount = distData.length;
  const distW = W - margin * 2;
  const barW = Math.floor((distW - barGap * (barCount - 1)) / barCount);
  const maxN = 65;
  const barBaseY = topY + distH;

  let body = '';

  // 期待値線
  const expBarH = Math.round((56 / maxN) * (distH - 40));
  body += `
  <line x1="${margin}" y1="${barBaseY - expBarH}" x2="${W - margin}" y2="${barBaseY - expBarH}" stroke="${INK_MUTED}" stroke-width="2" stroke-dasharray="8,6"/>
  <text x="${W - margin - 4}" y="${barBaseY - expBarH - 8}" font-family="${FONT}" font-size="22" fill="${INK_MUTED}" text-anchor="end">期待値 56</text>`;

  for (let i = 0; i < distData.length; i++) {
    const d = distData[i];
    const bx = margin + i * (barW + barGap);
    const bh = Math.round((d.n / maxN) * (distH - 40));
    const by = barBaseY - bh;
    const color = i === 2 ? BRAND : INK_BODY; // 最頻 3番 を強調

    body += `
  <rect x="${bx}" y="${by}" width="${barW}" height="${bh}" rx="4" fill="${color}" opacity="0.85"/>
  <text x="${bx + barW / 2}" y="${by - 10}" font-family="${FONT}" font-size="22" font-weight="700" fill="${color}" text-anchor="middle">${xml(d.n)}</text>
  <text x="${bx + barW / 2}" y="${by - 36}" font-family="${FONT}" font-size="22" fill="${INK_MUTED}" text-anchor="middle">${xml(d.pct)}</text>
  <text x="${bx + barW / 2}" y="${barBaseY + 28}" font-family="${FONT}" font-size="22" fill="${INK_STRONG}" text-anchor="middle">${xml(d.label)}</text>`;
  }

  // 区切り線
  body += `
  <line x1="${margin}" y1="${barBaseY + 50}" x2="${W - margin}" y2="${barBaseY + 50}" stroke="${BORDER_LIGHT}" stroke-width="1"/>`;

  // --- 中央：統計数値 ---
  const statY = barBaseY + 80;
  const statBoxH = 120;
  const statBoxW = Math.floor((W - margin * 2 - 40) / 3);

  const stats = [
    { label: 'χ² 値', value: '1.107', color: BRAND },
    { label: '臨界値（5%）', value: '9.488', color: INK_MUTED },
    { label: '判定', value: '均等', color: POSITIVE },
  ];

  for (let i = 0; i < stats.length; i++) {
    const s = stats[i];
    const sx = margin + i * (statBoxW + 20);
    body += `
  <rect x="${sx}" y="${statY}" width="${statBoxW}" height="${statBoxH}" rx="8" fill="${SURFACE_ALT}" stroke="${BORDER_LIGHT}" stroke-width="1"/>
  <text x="${sx + statBoxW / 2}" y="${statY + 36}" font-family="${FONT}" font-size="22" fill="${INK_MUTED}" text-anchor="middle">${xml(s.label)}</text>
  <text x="${sx + statBoxW / 2}" y="${statY + 90}" font-family="${FONT}" font-size="40" font-weight="800" fill="${s.color}" text-anchor="middle">${xml(s.value)}</text>`;
  }

  // 区切り線
  const midLineY = statY + statBoxH + 32;
  body += `
  <line x1="${margin}" y1="${midLineY}" x2="${W - margin}" y2="${midLineY}" stroke="${BORDER_LIGHT}" stroke-width="1"/>`;

  // --- 下部：年度別 χ² 値の小バー ---
  const yearData = [
    { year: 'R01', chi: 0.50 },
    { year: 'R02', chi: 0.75 },
    { year: 'R03', chi: 1.25 },
    { year: 'R04', chi: 0.50 },
    { year: 'R05', chi: 1.75 },
    { year: 'R06', chi: 2.75 },
    { year: 'R07', chi: 1.25 },
  ];
  const yearY = midLineY + 24;
  const yearBarAreaH = 100;
  const yearBarGap = 16;
  const yearCount = yearData.length;
  const yearDistW = W - margin * 2;
  const yearBarW = Math.floor((yearDistW - yearBarGap * (yearCount - 1)) / yearCount);
  const criticalChi = 9.488;
  const yearBarBaseY = yearY + yearBarAreaH;

  // 臨界値線（スケール上では画面外になるが参考ラベルだけ表示）
  body += `
  <text x="${W - margin}" y="${yearY + 22}" font-family="${FONT}" font-size="22" fill="${INK_MUTED}" text-anchor="end">臨界値 9.488（ずっと上）</text>`;

  for (let i = 0; i < yearData.length; i++) {
    const d = yearData[i];
    const bx = margin + i * (yearBarW + yearBarGap);
    // 臨界値(9.488)を100%として表示。最大 chi=2.75 → 2.75/9.488 ≒ 29%
    const ratio = d.chi / criticalChi;
    const bh = Math.round(ratio * yearBarAreaH);
    const by = yearBarBaseY - bh;

    body += `
  <rect x="${bx}" y="${by}" width="${yearBarW}" height="${bh}" rx="3" fill="${POSITIVE}" opacity="0.75"/>
  <text x="${bx + yearBarW / 2}" y="${by - 8}" font-family="${FONT}" font-size="22" font-weight="700" fill="${POSITIVE}" text-anchor="middle">${xml(d.chi)}</text>
  <text x="${bx + yearBarW / 2}" y="${yearBarBaseY + 26}" font-family="${FONT}" font-size="22" fill="${INK_STRONG}" text-anchor="middle">${xml(d.year)}</text>`;
  }

  // 年度セクションラベル
  body += `
  <text x="${margin}" y="${yearY + 22}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}">年度別 χ² 値（全て臨界値を大幅に下回る）</text>`;

  // キャプション
  const captY = yearBarBaseY + 56;
  body += `
  <rect x="${margin}" y="${captY}" width="${W - margin * 2}" height="52" rx="6" fill="${BRAND_FILL}"/>
  <text x="${margin + 20}" y="${captY + 34}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}">番号偏りなし → 迷ったら知識で判断、最頻 3 番マーク戦略は無効</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('一次択一統計（R01-R07 × 40 問 × 5 選択肢）', 'χ² 検定で選択肢番号の偏りを検証（n=280）')}
${body}
${brandId(H)}
</svg>`;
}

// ------------------------------------------------------------------
// レンダリング
// ------------------------------------------------------------------
async function render(svg, outName) {
  const svgPath = join(OUT_DIR, outName.replace(/\.png$/, '.svg'));
  const pngPath = join(OUT_DIR, outName);
  writeFileSync(svgPath, svg);
  await sharp(Buffer.from(svg)).png().toFile(pngPath);
  console.log(`  ok: ${outName}`);
}

async function main() {
  console.log('Rendering figures for data-driven-strategy…');
  await render(svgTop20Keywords(), 'figure-01-top20-keywords.png');
  await render(svgPersonaProfile(), 'figure-02-persona-profile.png');
  await render(svgChiSquared(), 'figure-03-chi-squared.png');
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
