// 著者オーソリティ 汎用バナー（note 商品 top/bottom 用）
// 1280角の上部いっぱいに可読性の高いコピーを置き、下部380pxだけにキーアートを敷く。
// note.com のモバイル縮小後も、見出しと資格三本柱が読める正方形レイアウト。
// フレーミング厳守: 総監=分析力 / 元発注者=審査する側の視点 / 施工管理技士=当事者（予想的中とは呼ばない）。
// **「採点者」と名乗らない**（2026-08-11 訂正）: 発注者が実務で行うのは施工計画書の審査・
// 工事成績評定・出来形検査であって、施工管理技士試験の答案採点ではない。両者は別物で、
// 「発注者だから採点者」は成り立たない＝資格・立場の誇張にあたる。
// 再生成: node scripts/render-note-author-authority.mjs --variant civil|concrete
import sharp from 'sharp';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { NOTE_CONTENT_ROOT } from './lib/repository-paths.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(NOTE_CONTENT_ROOT, '共通', '著者オーソリティ', 'img');
const PREVIEW_DIR = join(__dirname, '..', '.tmp', 'author-banner');

const VARIANTS = {
  civil: {
    base: 'base-keyart.png',
    out: 'figure-author-authority.png',
    eyebrow: 'この教材・添削をつくっている人',
    headline: ['技術士（総合技術監理部門）', 'を持つ元発注者が、', '施工管理技士の記述を', '分析してつくっています'],
    creds: [
      '総監（技術士）｜上位資格の分析力',
      '元発注者（自治体）｜審査する側の視点',
      '施工管理技士｜合格した当事者',
    ],
  },
  concrete: {
    base: 'base-keyart-concrete.png',
    out: 'figure-author-authority-concrete.png',
    eyebrow: 'この教材をつくっている人',
    headline: ['技術士（総合技術監理部門）', 'を持つ元発注者が、', 'コンクリート資格の答案を', '分析してつくっています'],
    creds: [
      '総監（技術士）｜上位資格の分析力',
      '元発注者（自治体）｜審査する側の視点',
      '主任技士・診断士｜合格した当事者',
    ],
  },
};

const args = process.argv.slice(2);
const inlineVariant = args.find((arg) => arg.startsWith('--variant='));
const variantIndex = args.indexOf('--variant');
const variant = inlineVariant?.slice('--variant='.length)
  ?? (variantIndex >= 0 ? args[variantIndex + 1] : 'civil');

if (!VARIANTS[variant]) {
  throw new Error(`Unknown variant: ${variant ?? '(missing)'}. Use civil or concrete.`);
}

const config = VARIANTS[variant];
let BASE = join(DIR, config.base);
const OUT = join(DIR, config.out);

if (variant === 'concrete' && !existsSync(BASE)) {
  BASE = join(DIR, 'base-keyart.png');
  console.warn('WARN: base-keyart-concrete.png not found; falling back to base-keyart.png');
}

const W = 1280, H = 1280;
const BAND_TOP = 900, BAND_H = H - BAND_TOP;
const FONT = "'Hiragino Sans','Hiragino Kaku Gothic ProN','Yu Gothic','Noto Sans JP',sans-serif";
const NAVY = '#1a3a5c';   // brand-deep
const BRAND = '#2e6da4';  // brand
const GREEN = '#2a7050';  // civil-2 / 承認
const MUTED = '#8a8a8a';  // ink-muted
const X = 72;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// 見出し（4行）
const headEls = config.headline
  .map((t, i) => `<text x="${X}" y="${183 + i * 96}" font-size="76" font-weight="800" fill="${NAVY}">${esc(t)}</text>`)
  .join('');

// 資格三本柱（✓バッジ + 一行）
const credEls = config.creds
  .map((t, i) => {
    const y = 568 + i * 73;
    const cy = y - 19;
    return (
      `<circle cx="${X + 20}" cy="${cy}" r="20" fill="${GREEN}"/>` +
      `<polyline points="${X + 8},${cy} ${X + 17},${cy + 9} ${X + 32},${cy - 10}" ` +
      `fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<text x="${X + 58}" y="${y}" font-size="56" font-weight="700" fill="${NAVY}">${esc(t)}</text>`
    );
  })
  .join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="band-fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <style>text{font-family:${FONT};}</style>
  <!-- キーアート上端のブレンド -->
  <rect x="0" y="${BAND_TOP}" width="${W}" height="80" fill="url(#band-fade)"/>
  <!-- アクセント短線 -->
  <rect x="${X}" y="35" width="54" height="5" rx="2.5" fill="${BRAND}"/>
  <!-- アイブロウ -->
  <text x="${X}" y="94" font-size="40" font-weight="700" letter-spacing="1.5" fill="${BRAND}">${esc(config.eyebrow)}</text>
  <!-- 見出し -->
  ${headEls}
  <!-- 三本柱 -->
  ${credEls}
  <!-- シンセシス -->
  <text x="${X}" y="807" font-size="60" font-weight="800" fill="${NAVY}">分析力 <tspan fill="${BRAND}">×</tspan> 審査の目 <tspan fill="${BRAND}">×</tspan> 当事者性</text>
  <text x="${X}" y="871" font-size="42" font-weight="600" fill="${BRAND}">＝ 合否を分ける記述へ</text>
  <!-- ブランド -->
  <rect x="54" y="1187" width="305" height="67" rx="14" fill="#ffffff" fill-opacity="0.88"/>
  <text x="${X}" y="1234" font-size="30" font-weight="600" fill="${MUTED}">doboku-note.com</text>
</svg>`;

// 元画像の右約65%・中央約45%から、視覚的な主役を残す横長バンドを切り出す。
const metadata = await sharp(BASE).metadata();
if (!metadata.width || !metadata.height) {
  throw new Error(`Could not read key art dimensions: ${BASE}`);
}
const cropWidth = Math.max(1, Math.round(metadata.width * 0.65));
const cropHeight = Math.max(1, Math.round(metadata.height * 0.45));
const cropLeft = metadata.width - cropWidth;
const cropTop = Math.round((metadata.height - cropHeight) / 2);
const band = await sharp(BASE)
  .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
  .resize(W, BAND_H, { fit: 'cover', position: 'centre' })
  .png()
  .toBuffer();

// 1280角へ直接合成し、アルファ除去と note 用の軽量PNG圧縮を行う。
await sharp({
  create: { width: W, height: H, channels: 4, background: '#f6f9fc' },
})
  .composite([
    { input: band, top: BAND_TOP, left: 0 },
    { input: Buffer.from(svg), top: 0, left: 0 },
  ])
  .flatten({ background: '#ffffff' })
  .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
  .toFile(OUT);

mkdirSync(PREVIEW_DIR, { recursive: true });
const previewOut = join(PREVIEW_DIR, `${basename(OUT, '.png')}-343.png`);
await sharp(OUT)
  .resize({ width: 343 })
  .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
  .toFile(previewOut);

console.log('written:', OUT, `(${Math.round(statSync(OUT).size / 1024)}KB)`);
console.log('preview:', previewOut, `(${Math.round(statSync(previewOut).size / 1024)}KB)`);
