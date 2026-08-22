#!/usr/bin/env node
// 2級土木 集客クラスター A層(A2-A5)の本文用 PNG 図版を生成。
// note-svg-policy.md 準拠（W=1200・本文 font 22+・余白 40/24・右下ブランド）。
//   node scripts/render-figure-2c-essay-cluster.mjs
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const NOTE = join(ROOT, 'content/note/1級・2級土木/2級土木');

const BRAND = '#2e6da4';
const BRAND_FILL = '#e8f0fe';
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

function xml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function brandFrame(H) {
  return `<text x="${W - 28}" y="${H - 22}" font-family="${FONT}" font-size="18" font-weight="500" fill="${INK_MUTED}" text-anchor="end">doboku-note.com</text>`;
}
function header(title, sub) {
  return `
  <text x="40" y="68" font-family="${FONT}" font-size="36" font-weight="700" fill="${BRAND_DEEP}">${xml(title)}</text>
  <text x="40" y="108" font-family="${FONT}" font-size="22" font-weight="500" fill="${INK_BODY}">${xml(sub)}</text>
  <line x1="40" y1="132" x2="${W - 40}" y2="132" stroke="#e5e7eb" stroke-width="2"/>`;
}
function frame(H, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  ${inner}
  ${brandFrame(H)}
</svg>`;
}

// ラベル列 + 説明カードの行リスト（A2, A4）
function labelRows(title, sub, rows, col1W = 300) {
  const x0 = 40, gap = 22, rowH = 116, y0 = 172;
  const col1X = x0, col2X = x0 + col1W + 20, col2W = W - col2X - 40;
  const H = y0 + rows.length * (rowH + gap) - gap + 60;
  const body = rows.map((r, i) => {
    const y = y0 + i * (rowH + gap);
    const ty = y + rowH / 2 + 9;
    return `
    <rect x="${col1X}" y="${y}" width="${col1W}" height="${rowH}" rx="8" fill="${BRAND_DEEP}"/>
    <text x="${col1X + col1W / 2}" y="${ty}" font-family="${FONT}" font-size="26" font-weight="700" fill="#ffffff" text-anchor="middle">${xml(r.label)}</text>
    <rect x="${col2X}" y="${y}" width="${col2W}" height="${rowH}" rx="8" fill="${BRAND_FILL}" stroke="${BRAND}" stroke-width="2"/>
    <text x="${col2X + 28}" y="${ty}" font-family="${FONT}" font-size="25" font-weight="600" fill="${INK_STRONG}">${xml(r.desc)}</text>`;
  }).join('');
  return frame(H, header(title, sub) + body);
}

// 2列比較（A3）: col0ラベル + 左 + 右
function compare2(title, sub, headL, headR, rows) {
  const x0 = 40, gap = 20, rowH = 110, y0 = 210;
  const lblW = 220, colW = 440;
  const lX = x0 + lblW + 20, rX = lX + colW + 20;
  const H = y0 + rows.length * (rowH + gap) - gap + 60;
  const heads = `
  <text x="${lX + colW / 2}" y="190" font-family="${FONT}" font-size="24" font-weight="700" fill="${INK_MUTED}" text-anchor="middle">${xml(headL)}</text>
  <text x="${rX + colW / 2}" y="190" font-family="${FONT}" font-size="24" font-weight="700" fill="${BRAND}" text-anchor="middle">${xml(headR)}</text>`;
  const body = rows.map((r, i) => {
    const y = y0 + i * (rowH + gap);
    const ty = y + rowH / 2 + 9;
    return `
    <rect x="${x0}" y="${y}" width="${lblW}" height="${rowH}" rx="8" fill="${BRAND_DEEP}"/>
    <text x="${x0 + lblW / 2}" y="${ty}" font-family="${FONT}" font-size="23" font-weight="700" fill="#ffffff" text-anchor="middle">${xml(r.label)}</text>
    <rect x="${lX}" y="${y}" width="${colW}" height="${rowH}" rx="8" fill="#f3f4f6" stroke="#d1d5db" stroke-width="2"/>
    <text x="${lX + colW / 2}" y="${ty}" font-family="${FONT}" font-size="24" font-weight="600" fill="${INK_BODY}" text-anchor="middle">${xml(r.l)}</text>
    <rect x="${rX}" y="${y}" width="${colW}" height="${rowH}" rx="8" fill="${BRAND_FILL}" stroke="${BRAND}" stroke-width="2"/>
    <text x="${rX + colW / 2}" y="${ty}" font-family="${FONT}" font-size="24" font-weight="700" fill="${INK_STRONG}" text-anchor="middle">${xml(r.r)}</text>`;
  }).join('');
  return frame(H, header(title, sub) + heads + body);
}

// 縦ステップ（A5）+ 末尾2ボックス
function stepsBox(title, sub, steps, keepLabel, keep, swapLabel, swap) {
  const x0 = 40, gap = 18, rowH = 96, y0 = 168;
  const badgeW = 96;
  const cardX = x0 + badgeW + 20, cardW = W - cardX - 40;
  const stepsH = steps.length * (rowH + gap);
  const boxY = y0 + stepsH + 16, boxH = 120, boxW = (W - 80 - 24) / 2;
  const H = boxY + boxH + 60;
  const body = steps.map((s, i) => {
    const y = y0 + i * (rowH + gap);
    const ty = y + rowH / 2 + 9;
    return `
    <rect x="${x0}" y="${y}" width="${badgeW}" height="${rowH}" rx="8" fill="${BRAND}"/>
    <text x="${x0 + badgeW / 2}" y="${ty}" font-family="${FONT}" font-size="30" font-weight="700" fill="#ffffff" text-anchor="middle">${i + 1}</text>
    <rect x="${cardX}" y="${y}" width="${cardW}" height="${rowH}" rx="8" fill="${BRAND_FILL}" stroke="${BRAND}" stroke-width="2"/>
    <text x="${cardX + 28}" y="${ty}" font-family="${FONT}" font-size="25" font-weight="600" fill="${INK_STRONG}">${xml(s)}</text>`;
  }).join('');
  const boxes = `
  <rect x="${x0}" y="${boxY}" width="${boxW}" height="${boxH}" rx="8" fill="${POSITIVE_FILL}" stroke="${POSITIVE}" stroke-width="2"/>
  <text x="${x0 + 24}" y="${boxY + 44}" font-family="${FONT}" font-size="22" font-weight="700" fill="${POSITIVE}">${xml(keepLabel)}</text>
  <text x="${x0 + 24}" y="${boxY + 84}" font-family="${FONT}" font-size="25" font-weight="700" fill="${INK_STRONG}">${xml(keep)}</text>
  <rect x="${x0 + boxW + 24}" y="${boxY}" width="${boxW}" height="${boxH}" rx="8" fill="${DANGER_FILL}" stroke="${DANGER}" stroke-width="2"/>
  <text x="${x0 + boxW + 48}" y="${boxY + 44}" font-family="${FONT}" font-size="22" font-weight="700" fill="${DANGER}">${xml(swapLabel)}</text>
  <text x="${x0 + boxW + 48}" y="${boxY + 84}" font-family="${FONT}" font-size="25" font-weight="700" fill="${INK_STRONG}">${xml(swap)}</text>`;
  return frame(H, header(title, sub) + body + boxes);
}

async function render(dir, name, svg) {
  const outDir = join(NOTE, dir, 'img');
  mkdirSync(outDir, { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(join(outDir, name));
  console.log(`  ok: ${dir}/img/${name}`);
}

async function main() {
  // A2 工事概要の整合
  await render('工事概要の書き方', 'figure-1-outline-consistency.png',
    labelRows('工事概要と本文をかみ合わせる3つの整合', '発注者が一瞬で不整合を見抜くポイント', [
      { label: '工種 ↔ 管理項目', desc: 'その工種で自然に問題になる管理項目を選ぶ' },
      { label: '施工量 ↔ 規模感', desc: '施工量が示す規模と課題の大きさを釣り合わせる' },
      { label: '立場 ↔ 対応', desc: 'その立場で判断・指示できる対応を書く' },
    ], 320));

  // A3 新旧形式の比較
  await render('経験記述R6新形式', 'figure-1-format-comparison.png',
    compare2('施工経験記述 新旧形式の比較', '令和6年度から「2テーマ必答」へ', '令和5年度以前', '令和6年度以降', [
      { label: 'テーマ', l: '1テーマを選択', r: '2テーマ必答' },
      { label: '項目数', l: '3項目', r: '各2項目' },
      { label: '準備の要点', l: '1本を作り込む', r: '複数管理を横断' },
    ]));

  // A4 3管理が書きやすい現場
  await render('経験記述テーマ選び', 'figure-1-theme-by-site.png',
    labelRows('安全・品質・工程はどんな現場で書きやすいか', '自分の経験で最も具体的に語れる管理項目を選ぶ', [
      { label: '安全管理', desc: '重機の輻輳・高所/足場・近接施工・熱中症対策' },
      { label: '品質管理', desc: 'コンクリの打設養生・締固め・出来形の数値管理' },
      { label: '工程管理', desc: '天候不良・他工事調整・資材待ちの遅延と挽回' },
    ], 240));

  // A5 置換4ステップ + 残す/替える
  await render('経験記述を自分の現場に置換', 'figure-1-adapt-steps.png',
    stepsBox('完成答案を自分の現場に置き換える手順', '丸写しは失格。骨格を借り、中身は自分の経験に', [
      '論理の骨格を読み取る',
      '自分の似た経験を当てる',
      '固有の中身（数値・現場条件）を入れ替える',
      '通して読み、自分の言葉に均す',
    ], '残す＝論理の骨格', '課題→検討→対応の組み立て', '替える＝中身', '数値と現場の固有条件'));

  console.log('Done.');
}
main();
