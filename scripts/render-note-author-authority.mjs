// 著者オーソリティ 汎用バナー（note 商品 top/bottom 用）
// base-keyart.png（ChatGPT 生成・文字なしキーアート 1672x941）の左1/3余白に
// 日本語オーソリティコピーを重ねて figure-author-authority.png を書き出す。
// フレーミング厳守: 総監=分析力 / 元発注者=審査する側の視点 / 施工管理技士=当事者（予想的中とは呼ばない）。
// **「採点者」と名乗らない**（2026-08-11 訂正）: 発注者が実務で行うのは施工計画書の審査・
// 工事成績評定・出来形検査であって、施工管理技士試験の答案採点ではない。両者は別物で、
// 「発注者だから採点者」は成り立たない＝資格・立場の誇張にあたる。
// 再生成: node scripts/render-note-author-authority.mjs
import sharp from 'sharp';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { statSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '..', 'docs', 'note', '共通', '著者オーソリティ', 'img');
const BASE = join(DIR, 'base-keyart.png');
const OUT = join(DIR, 'figure-author-authority.png');

const W = 1672, H = 941;
const FONT = "'Hiragino Sans','Hiragino Kaku Gothic ProN','Yu Gothic','Noto Sans JP',sans-serif";
const NAVY = '#1a3a5c';   // brand-deep
const BRAND = '#2e6da4';  // brand
const GREEN = '#2a7050';  // civil-2 / 承認
const MUTED = '#8a8a8a';  // ink-muted
const X = 70;             // 左カラム左端

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// 見出し（4行）
const headline = ['技術士（総合技術監理部門）', 'を持つ元発注者が、', '施工管理技士の記述を', '分析してつくっています'];
const headEls = headline
  .map((t, i) => `<text x="${X}" y="${212 + i * 58}" font-size="40" font-weight="800" fill="${NAVY}">${esc(t)}</text>`)
  .join('');

// 資格三本柱（✓バッジ + 一行）
const creds = [
  '総監（技術士）｜上位資格の分析力',
  '元発注者（自治体）｜審査する側の視点',
  '施工管理技士｜合格した当事者',
];
const credEls = creds
  .map((t, i) => {
    const y = 492 + i * 58;
    const cy = y - 9;
    return (
      `<circle cx="${X + 12}" cy="${cy}" r="13" fill="${GREEN}"/>` +
      `<polyline points="${X + 4},${cy} ${X + 10},${cy + 6} ${X + 21},${cy - 7}" ` +
      `fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<text x="${X + 42}" y="${y}" font-size="28" font-weight="700" fill="${NAVY}">${esc(t)}</text>`
    );
  })
  .join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>text{font-family:${FONT};}</style>
  <!-- アクセント短線 -->
  <rect x="${X}" y="118" width="54" height="5" rx="2.5" fill="${BRAND}"/>
  <!-- アイブロウ -->
  <text x="${X}" y="160" font-size="27" font-weight="700" letter-spacing="1.5" fill="${BRAND}">この教材・添削をつくっている人</text>
  <!-- 見出し -->
  ${headEls}
  <!-- 三本柱 -->
  ${credEls}
  <!-- シンセシス -->
  <text x="${X}" y="712" font-size="30" font-weight="800" fill="${NAVY}">分析力 <tspan fill="${BRAND}">×</tspan> 審査の目 <tspan fill="${BRAND}">×</tspan> 当事者性</text>
  <text x="${X}" y="756" font-size="24" font-weight="600" fill="${BRAND}">＝ 合否を分ける記述へ</text>
  <!-- ブランド -->
  <text x="${X}" y="902" font-size="22" fill="${MUTED}">doboku-note.com</text>
</svg>`;

// note 用に軽量化: フル解像度で合成→1280幅（policy W≤1280）へ縮小・アルファ除去・PNG圧縮
// （sharp は resize→composite の順で処理するため2段階。大きい PNG は note の CDN 確定が
//  遅く note-update-body が画像欠落回避で ABORT するため軽量化する）
const composited = await sharp(BASE)
  .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
  .png()
  .toBuffer();
await sharp(composited)
  .resize({ width: 1280 })
  .flatten({ background: '#ffffff' })
  .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
  .toFile(OUT);

console.log('written:', OUT, `(${Math.round(statSync(OUT).size / 1024)}KB)`);
