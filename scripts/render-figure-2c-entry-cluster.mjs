#!/usr/bin/env node
// 2級土木 集客クラスター B層(受験入口 B1-B5)の本文用 PNG 図版を生成。
// note-svg-policy.md 準拠（W=1200・本文 font 22+・余白 40/24・右下ブランド）。
//   node scripts/render-figure-2c-entry-cluster.mjs
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
const WARN = '#d4a017';
const WARN_FILL = '#fbf3df';
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

// 番号付き縦ステップ（+任意の末尾ノート帯）
function steps(title, sub, items, note) {
  const x0 = 40, gap = 18, rowH = 100, y0 = 168, badgeW = 96;
  const cardX = x0 + badgeW + 20, cardW = W - cardX - 40;
  let H = y0 + items.length * (rowH + gap) - gap + 60;
  let noteSvg = '';
  if (note) {
    const ny = y0 + items.length * (rowH + gap) + 4, nh = 100;
    H = ny + nh + 60;
    noteSvg = `
    <rect x="${x0}" y="${ny}" width="${W - 80}" height="${nh}" rx="8" fill="${WARN_FILL}" stroke="${WARN}" stroke-width="2"/>
    <text x="${x0 + 28}" y="${ny + nh / 2 + 9}" font-family="${FONT}" font-size="24" font-weight="700" fill="${INK_STRONG}">${xml(note)}</text>`;
  }
  const body = items.map((s, i) => {
    const y = y0 + i * (rowH + gap);
    const ty = y + rowH / 2 + 9;
    return `
    <rect x="${x0}" y="${y}" width="${badgeW}" height="${rowH}" rx="8" fill="${BRAND}"/>
    <text x="${x0 + badgeW / 2}" y="${ty}" font-family="${FONT}" font-size="30" font-weight="700" fill="#ffffff" text-anchor="middle">${i + 1}</text>
    <rect x="${cardX}" y="${y}" width="${cardW}" height="${rowH}" rx="8" fill="${BRAND_FILL}" stroke="${BRAND}" stroke-width="2"/>
    <text x="${cardX + 28}" y="${ty}" font-family="${FONT}" font-size="25" font-weight="600" fill="${INK_STRONG}">${xml(s)}</text>`;
  }).join('');
  return frame(H, header(title, sub) + body + noteSvg);
}

// ラベル列 + 説明カード
function labelRows(title, sub, rows, col1W = 260) {
  const x0 = 40, gap = 22, rowH = 120, y0 = 172;
  const col2X = x0 + col1W + 20, col2W = W - col2X - 40;
  const H = y0 + rows.length * (rowH + gap) - gap + 60;
  const body = rows.map((r, i) => {
    const y = y0 + i * (rowH + gap);
    const ty = y + rowH / 2 + 9;
    return `
    <rect x="${x0}" y="${y}" width="${col1W}" height="${rowH}" rx="8" fill="${BRAND_DEEP}"/>
    <text x="${x0 + col1W / 2}" y="${ty}" font-family="${FONT}" font-size="25" font-weight="700" fill="#ffffff" text-anchor="middle">${xml(r.label)}</text>
    <rect x="${col2X}" y="${y}" width="${col2W}" height="${rowH}" rx="8" fill="${BRAND_FILL}" stroke="${BRAND}" stroke-width="2"/>
    <text x="${col2X + 28}" y="${ty}" font-family="${FONT}" font-size="25" font-weight="600" fill="${INK_STRONG}">${xml(r.desc)}</text>`;
  }).join('');
  return frame(H, header(title, sub) + body);
}

// 2列比較
function compare2(title, sub, headL, headR, rows) {
  const x0 = 40, gap = 20, rowH = 108, y0 = 210, lblW = 240, colW = 430;
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
    <text x="${x0 + lblW / 2}" y="${ty}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">${xml(r.label)}</text>
    <rect x="${lX}" y="${y}" width="${colW}" height="${rowH}" rx="8" fill="#f3f4f6" stroke="#d1d5db" stroke-width="2"/>
    <text x="${lX + colW / 2}" y="${ty}" font-family="${FONT}" font-size="24" font-weight="600" fill="${INK_BODY}" text-anchor="middle">${xml(r.l)}</text>
    <rect x="${rX}" y="${y}" width="${colW}" height="${rowH}" rx="8" fill="${BRAND_FILL}" stroke="${BRAND}" stroke-width="2"/>
    <text x="${rX + colW / 2}" y="${ty}" font-family="${FONT}" font-size="24" font-weight="700" fill="${INK_STRONG}" text-anchor="middle">${xml(r.r)}</text>`;
  }).join('');
  return frame(H, header(title, sub) + heads + body);
}

async function render(dir, name, svg) {
  const outDir = join(NOTE, dir, 'img');
  mkdirSync(outDir, { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(join(outDir, name));
  console.log(`  ok: ${dir}/img/${name}`);
}

async function main() {
  // B1 逆算スケジュール
  await render('2級土木 独学合格の学習設計', 'figure-1-reverse-schedule.png',
    steps('働きながらの逆算スケジュール', '二次（経験記述）から先に動かすのが核', [
      '二次の題材を早めに決める（経験記述）',
      '二次の骨子を書いて寝かせ、推敲する',
      '一次は過去問で頻出に絞って固める',
      '直前期は一次の総仕上げに比重を移す',
    ]));

  // B2 級の違い
  await render('2級と1級どちらから受けるか', 'figure-1-grade-compare.png',
    compare2('2級と1級の違い', '規模で分かれた段階。最終目標から受験順を決める', '2級', '1級', [
      { label: '配置できる立場', l: '主任技術者', r: '監理技術者' },
      { label: '扱える工事', l: '一般の工事', r: '大規模・下請が大きい' },
      { label: '第一次検定の年齢', l: '満17歳以上', r: '満19歳以上' },
    ]));

  // B3 受験の流れ
  await render('2級土木 受験資格と実務経験', 'figure-1-eligibility-flow.png',
    steps('2級土木 受験の流れ（新制度）', '令和6年度から一次は実務経験なしで受けられる', [
      '第一次検定を受ける（17歳以上・実務経験不要）',
      '合格して「2級土木施工管理技士補」になる',
      '区分に応じた実務経験を積む',
      '第二次検定を受ける',
    ], '経過措置：令和10年度まで新・旧どちらの受験資格でも受検できる'));

  // B4 二次の構成
  await render('2級土木 二次検定の全体像', 'figure-1-secondary-structure.png',
    labelRows('第二次検定は2本柱で構成される', 'まず配点が重い「経験記述」に比重を置く', [
      { label: '経験記述', desc: '自分が経験した工事の管理を文章で書く（配点が重い核）' },
      { label: '知識記述ほか', desc: '土工・コンクリート・品質・安全・法規などの実務知識' },
    ], 260));

  // B5 一次の着手順
  await render('第一次検定の独学突破', 'figure-1-primary-steps.png',
    steps('第一次検定 独学の着手順', 'テキスト通読でなく「過去問起点」で始める', [
      '過去問を解く（最初は解けなくてよい）',
      '間違えた選択肢の「なぜ誤りか」を確認',
      '頻出分野に時間を寄せ、基準点超えを狙う',
      '一次のうちから二次の題材を考え始める',
    ]));

  console.log('Done.');
}
main();
