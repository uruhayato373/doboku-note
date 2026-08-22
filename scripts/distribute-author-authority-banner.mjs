// 著者オーソリティ 汎用バナーを note 商品 article.md へ配布・挿入する（冪等）。
// - 画像を各記事の img/ にコピー
// - H1 直後に top バナー、末尾のマガジン/記事カード直前に bottom バナー＋橋渡し1文を挿入
// - フレーミング厳守: 総監=分析力 / 元発注者=審査する側の視点 / 施工管理技士=当事者（「予想的中」とは呼ばない）
// - 冪等: マーカー author-authority: を含む記事はスキップ
// 使い方:
//   node scripts/distribute-author-authority-banner.mjs           # 入口ページ(notePricing: free)のみ
//   node scripts/distribute-author-authority-banner.mjs --all     # civil note 全 article.md
//   node scripts/distribute-author-authority-banner.mjs --dry     # 変更せず対象だけ表示
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NOTE_CONTENT_ROOT } from './lib/repository-paths.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASE_DIR = join(NOTE_CONTENT_ROOT, '1級・2級土木');
const BANNER_SRC = join(NOTE_CONTENT_ROOT, '共通', '著者オーソリティ', 'img', 'figure-author-authority.png');
const BANNER_NAME = 'figure-author-authority.png';
const MARKER = BANNER_NAME; // 冪等判定は画像ファイル名の存在で（note に残る HTML コメントは使わない）
const ALT =
  '技術士（総合技術監理部門）を持つ元発注者が、施工管理技士の記述を分析して作成。総監＝上位資格の分析力、元発注者＝審査する側の視点、施工管理技士＝合格した当事者';
const BRIDGE =
  '上位資格の分析力・発注者として書類を評価してきた目・合格者の当事者性で、あなたの答案を合格ラインへ引き上げます。';

const args = process.argv.slice(2);
const ALL = args.includes('--all');
const DRY = args.includes('--dry');

// 転職/キャリア系ファネルは文脈不一致（記述・添削の差別化バナーは貼らない）
const EXCLUDE = ['転職', '年収', 'ホワイトな建設会社', '公務員土木か民間', 'ビルドジョブ', '辞める前に', '市場価値が変わる'];
const isExcluded = (p) => EXCLUDE.some((k) => p.includes(k));

// 再帰で article.md を列挙
function findArticles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...findArticles(p));
    else if (name === 'article.md') out.push(p);
  }
  return out;
}

const noteUrlRe = /^https?:\/\/note\.com\/\S+\s*$/;
const firstUrlOf = (fm) => (fm.match(/^noteUrl:\s*["']?(https?:\/\/note\.com\/\S+?)["']?\s*$/m) || [])[1];

let applied = 0, skipped = 0, noFree = 0, excluded = 0;
const results = [];

for (const file of findArticles(BASE_DIR)) {
  // 転職/キャリア系は除外
  if (isExcluded(file)) { excluded++; results.push(['skip(キャリア系)', file]); continue; }

  const raw = readFileSync(file, 'utf8');
  const lines = raw.split(/\r?\n/);

  // frontmatter 範囲
  const fmEnd = lines.indexOf('---', 1);
  const fm = fmEnd > 0 ? lines.slice(0, fmEnd + 1).join('\n') : '';

  // 入口モード: notePricing: free のみ
  if (!ALL && !/^notePricing:\s*free\s*$/m.test(fm)) { noFree++; continue; }
  // 冪等
  if (raw.includes(MARKER)) { skipped++; results.push(['skip(既存)', file]); continue; }

  const imgRel = `img/${BANNER_NAME}`;
  const topBlock = ['', `![${ALT}](${imgRel})`, ''];
  const bottomBlock = ['', `![${ALT}](${imgRel})`, '', BRIDGE, ''];

  // TOP: 最初の H1 直後へ
  let out = [...lines];
  const h1 = out.findIndex((l, i) => i > fmEnd && /^#\s+/.test(l));
  if (h1 >= 0) {
    let ins = h1 + 1;
    if (out[ins] === '') ins++; // 既存空行の後ろへ
    out.splice(ins, 0, ...topBlock);
  } else {
    out.splice(fmEnd + 1, 0, ...topBlock);
  }

  // BOTTOM: 末尾の note カード(URL単独行)直前へ。無ければ frontmatter の noteUrl でカード新設
  let lastCard = -1;
  for (let i = out.length - 1; i >= 0; i--) {
    if (noteUrlRe.test(out[i])) { lastCard = i; break; }
  }
  if (lastCard >= 0) {
    out.splice(lastCard, 0, ...bottomBlock);
  } else {
    const url = firstUrlOf(fm);
    const tail = ['', ...bottomBlock.slice(1)]; // 先頭空行重複回避
    if (url) tail.push(url, '');
    // 末尾の余分な空行を1つに
    while (out.length && out[out.length - 1] === '') out.pop();
    out.push(...tail);
  }

  const next = out.join('\n');

  if (DRY) { results.push(['would-apply', file]); applied++; continue; }

  // 画像配布
  const imgDir = join(dirname(file), 'img');
  if (!existsSync(imgDir)) mkdirSync(imgDir, { recursive: true });
  copyFileSync(BANNER_SRC, join(imgDir, BANNER_NAME));

  writeFileSync(file, next, 'utf8'); // LF 固定
  applied++;
  results.push(['applied', file]);
}

console.log(`mode=${ALL ? 'all' : 'entry(free)'}${DRY ? ' [dry]' : ''}`);
console.log(`applied=${applied} skipped(既存)=${skipped} skipped(非free)=${noFree} skipped(キャリア系)=${excluded}`);
for (const [tag, f] of results) console.log(`  ${tag}\t${f.replace(ROOT + '\\', '').replace(ROOT + '/', '')}`);
