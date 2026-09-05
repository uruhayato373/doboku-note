// 著者オーソリティ 汎用バナーを note 商品 article.md へ配布・挿入する（冪等）。
// - 画像を各記事の img/ にコピー
// - H1 直後に top バナー、末尾のマガジン/記事カード直前に bottom バナー＋橋渡し1文を挿入
// - フレーミング厳守: 総監=分析力 / 元発注者=審査する側の視点 / 施工管理技士=当事者（「予想的中」とは呼ばない）
// - 冪等: バナー画像名と著者文マーカーの両方を含む記事はスキップ
// 使い方:
//   node scripts/distribute-author-authority-banner.mjs                            # civil の入口ページ(notePricing: free)のみ
//   node scripts/distribute-author-authority-banner.mjs --exam concrete --all      # concrete 3資格の全 article.md
//   node scripts/distribute-author-authority-banner.mjs --migrate --dry             # civil の既存バナーを変更せず移行確認
//   node scripts/distribute-author-authority-banner.mjs --exam concrete --migrate   # concrete の既存バナーを移行
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NOTE_CONTENT_ROOT } from './lib/repository-paths.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const EXAM_CONFIG = {
  civil: {
    baseDirs: [join(NOTE_CONTENT_ROOT, '1級・2級土木')],
    bannerName: 'figure-author-authority.png',
    proseP1:
      'この教材は、技術士（総合技術監理部門）を持つ元・地方自治体の土木職（発注者）がつくっています。1級・2級土木施工管理技士にも自分で合格しており、受験者と同じ答案を書いた当事者です。',
  },
  concrete: {
    baseDirs: [
      join(NOTE_CONTENT_ROOT, 'コンクリート技士'),
      join(NOTE_CONTENT_ROOT, 'コンクリート主任技士'),
      join(NOTE_CONTENT_ROOT, 'コンクリート診断士'),
    ],
    bannerName: 'figure-author-authority-concrete.png',
    proseP1:
      'この教材は、技術士（総合技術監理部門）を持つ元・地方自治体の土木職（発注者）がつくっています。コンクリート主任技士・コンクリート診断士にも自分で合格しており、小論文・記述式を書いた当事者です。',
  },
};
const PROSE_MARKER = 'この教材は、技術士（総合技術監理部門）を持つ';
const PROSE_P2 =
  '総監の5つの管理の視点で記述を分析し、発注者として施工計画書や工事成績評定の書類を審査してきた目で「評価される書き方」を整理しています。';
const ALT = '';
const BRIDGE =
  '上位資格の分析力・発注者として書類を評価してきた目・合格者の当事者性で、あなたの答案を合格ラインへ引き上げます。';

const args = process.argv.slice(2);
const ALL = args.includes('--all');
const DRY = args.includes('--dry');
const MIGRATE = args.includes('--migrate');
const examArg = args.indexOf('--exam');
const EXAM = examArg >= 0 ? args[examArg + 1] : 'civil';
if (!EXAM_CONFIG[EXAM]) {
  console.error('--exam は civil または concrete を指定してください。');
  process.exit(1);
}
const { baseDirs: BASE_DIRS, bannerName: BANNER_NAME, proseP1: PROSE_P1 } = EXAM_CONFIG[EXAM];
const BANNER_SRC = join(NOTE_CONTENT_ROOT, '共通', '著者オーソリティ', 'img', BANNER_NAME);

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

const bannerImageRe = /^(\s*)!\[([^\]]*)\]\(([^)]*figure-author-authority[^)]*)\)(\s*)$/;
const hasHandWrittenProse = (lines) =>
  lines.some((line) => ['元・地方自治体の土木職', '元・自治体', '発注者側'].some((text) => line.includes(text)));

let applied = 0, migrated = 0, skipped = 0, noFree = 0, excluded = 0;
const results = [];
const needsReview = [];

for (const file of BASE_DIRS.flatMap(findArticles)) {
  // 転職/キャリア系は除外
  if (EXAM === 'civil' && isExcluded(file)) { excluded++; results.push(['skip(キャリア系)', file]); continue; }

  const raw = readFileSync(file, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(/\r?\n/);

  // frontmatter 範囲
  const fmEnd = lines.indexOf('---', 1);
  const fm = fmEnd > 0 ? lines.slice(0, fmEnd + 1).join('\n') : '';

  if (MIGRATE) {
    let out = lines.map((line) =>
      line.replace(bannerImageRe, (match, before, alt, target, after) =>
        alt ? `${before}![](${target})${after}` : match,
      ),
    );
    const firstBanner = out.findIndex((line, i) => i > fmEnd && bannerImageRe.test(line));
    if (firstBanner < 0) continue;

    if (!raw.includes(PROSE_MARKER)) {
      if (hasHandWrittenProse(out.slice(firstBanner + 1, firstBanner + 7))) {
        needsReview.push(file);
      } else {
        const proseBlock = ['', PROSE_P1, '', PROSE_P2];
        if (out[firstBanner + 1] !== '') proseBlock.push('');
        out.splice(firstBanner + 1, 0, ...proseBlock);
      }
    }

    if (DRY) {
      results.push(['would-migrate', file]);
      migrated++;
      continue;
    }

    const imgDir = join(dirname(file), 'img');
    if (!existsSync(imgDir)) mkdirSync(imgDir, { recursive: true });
    copyFileSync(BANNER_SRC, join(imgDir, BANNER_NAME));

    writeFileSync(file, out.join(eol), 'utf8');
    migrated++;
    results.push(['migrated', file]);
    continue;
  }

  // 入口モード: notePricing: free のみ
  if (!ALL && !/^notePricing:\s*free\s*$/m.test(fm)) { noFree++; continue; }
  // 冪等
  if (raw.includes(BANNER_NAME) && raw.includes(PROSE_MARKER)) {
    skipped++;
    results.push(['skip(既存)', file]);
    continue;
  }

  const imgRel = `img/${BANNER_NAME}`;
  const topBlock = ['', `![${ALT}](${imgRel})`, '', PROSE_P1, '', PROSE_P2, ''];
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

  const next = out.join(eol);

  if (DRY) { results.push(['would-apply', file]); applied++; continue; }

  // 画像配布
  const imgDir = join(dirname(file), 'img');
  if (!existsSync(imgDir)) mkdirSync(imgDir, { recursive: true });
  copyFileSync(BANNER_SRC, join(imgDir, BANNER_NAME));

  writeFileSync(file, next, 'utf8');
  applied++;
  results.push(['applied', file]);
}

for (const [tag, f] of results) console.log(`  ${tag}\t${f.replace(ROOT + '\\', '').replace(ROOT + '/', '')}`);
console.log(`mode=${MIGRATE ? 'migrate' : ALL ? 'all' : 'entry(free)'} exam=${EXAM}${DRY ? ' [dry]' : ''}`);
console.log(
  `applied=${applied} migrated=${migrated} skipped(既存)=${skipped} skipped(非free)=${noFree} skipped(キャリア系)=${excluded} needs-review=${needsReview.length}`,
);
if (needsReview.length) {
  console.log('needs-review files:');
  for (const file of needsReview) console.log(`  ${file.replace(ROOT + '\\', '').replace(ROOT + '/', '')}`);
}
