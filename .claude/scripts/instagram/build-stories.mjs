#!/usr/bin/env node
/**
 * build-stories.mjs
 *
 * 各過去問パックの reels/img/ から「ストーリー連投用 4 枚」を整備する。
 *
 * 4 枚構成（IG ストーリーのベストプラクティス）:
 *   01-cover.png    ← 1 番目: 興味喚起「新パック」告知
 *                     **Stories 専用 cover** を renderSlide で独立生成
 *                     (data.mode === 'stories' で「まずは1問やってみる」chip)
 *   02-problem.png  ← 2 番目: Q1（reels からコピー）
 *   03-answer.png   ← 3 番目: A1（reels からコピー）
 *   04-cta.png      ← 4 番目: CTA（reels からコピー）
 *
 * 設計意図:
 *   Stories は 1 問抜粋の試食なので、Carousel 用「スワイプで4問にチャレンジ」も
 *   Reels 用「答えは動画内で発表」も文脈に合わない。Stories 専用 cover を
 *   独立生成し、tokens.json の swipeTextStories で文言を分岐する。
 *
 * Usage:
 *   node .claude/scripts/instagram/build-stories.mjs <pack-dir>
 *   node .claude/scripts/instagram/build-stories.mjs content/sns/instagram/cem/exam-packs/r07/pack-01
 *
 * バッチで全パック:
 *   for d in content/sns/instagram/cem/exam-packs/r{03..07}/pack-*; do
 *     node .claude/scripts/instagram/build-stories.mjs "$d"
 *   done
 */

import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderSlide } from '#lib/sns-common/slide-render.mjs';

// .claude/scripts/instagram/ → リポジトリルートへ 3 階層
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const { renderExamCoverIg } = await import(pathToFileURL(resolve(ROOT, '.claude/scripts/sns/templates/exam-cover-ig.mjs')).href);
const { svgToPng } = await import(pathToFileURL(resolve(ROOT, '.claude/scripts/sns/lib/svg-to-png.mjs')).href);

const target = process.argv[2];
if (!target) {
  console.error('Usage: node build-stories.mjs <pack-dir>');
  process.exit(1);
}

const packDir = resolve(target);
const slideDataPath = join(packDir, 'slide-data.json');
if (!existsSync(slideDataPath)) {
  console.error(`Not found: ${slideDataPath}`);
  process.exit(1);
}

const data = JSON.parse(readFileSync(slideDataPath, 'utf8'));
const year = data._meta?.year || basename(resolve(packDir, '..'));
const packNum = data._meta?.packNum || basename(packDir).replace('pack-', '');
const packNumLabel = String(packNum).replace(/^0+/, '') || packNum;
// year は "r06" / "h28" 等。era + 年番号を導出（cover-title「令和{N}年度」と整合）
const yearNum = String(year).replace(/^[rRhH]0*/, '') || packNum;
const isHeisei = /^h/i.test(year);
const yearLabel = `${isHeisei ? 'H' : 'R'}${yearNum}`;            // "R6"
const yearJp = `${isHeisei ? '平成' : '令和'}${yearNum}年度`;     // "令和6年度"

const reelsDir = join(packDir, 'reels', 'img');
const storiesDir = join(packDir, 'stories');
const storiesImgDir = join(storiesDir, 'img');

if (!existsSync(reelsDir)) {
  console.error(`reels/img/ が存在しません: ${reelsDir}`);
  console.error('  先に ig-post-create --size reels を実行してください');
  process.exit(1);
}

mkdirSync(storiesImgDir, { recursive: true });

// Stories 専用 01-cover.png を renderSlide で独立生成
// (Reels の 00-cover.png をコピーすると Reels 用 chip 文言が Stories 文脈に合わない)
const coverSlide = data.slides.find((s) => s.type === 'cover');
if (coverSlide) {
  const examYear = data._meta?.year || basename(resolve(packDir, '..'));
  const examPackNum = data._meta?.packNum || basename(packDir).replace('pack-', '');
  let png;
  if (data._meta?.exam) {
    // 多資格: 試験識別カバー（stories レイアウト・上下 UI 域を確保）
    const svg = renderExamCoverIg({
      exam: data._meta.examDir || data._meta.exam,
      tag: coverSlide.sectionTag || '過去問',
      year: coverSlide.title || examYear,
      fmtLabel: data._meta.fmtLabel || coverSlide.subtitle || '',
      page: [1, data.slides.length],
      format: 'stories',
    });
    png = await svgToPng(svg, { width: 1080 });
  } else {
    // 従来（総監レガシー等 _meta.exam 無し）: quiz-cover の stories モード
    const storiesCoverData = {
      ...coverSlide,
      year: examYear,
      packNum: examPackNum,
      pageIndex: 1,
      totalPages: data.slides.length,
      mode: 'stories',  // quiz-slides.mjs の buildQuizCover が swipeTextStories に分岐
    };
    png = await renderSlide({
      width: 1080,
      height: 1920,
      slide: { type: 'quiz-cover', data: storiesCoverData },
    });
  }
  writeFileSync(join(storiesImgDir, '01-cover.png'), png);
}

// 残り 3 枚（problem 1 / answer 1 / cta）は reels からコピーで足りる
const sourceFiles = [
  { src: '01-problem.png',  dst: '02-problem.png', role: 'Q1 を見せて「解いてみて」' },
  { src: '02-answer.png',   dst: '03-answer.png',  role: 'Q1 の解答「答え合わせ」' },
  { src: '09-cta.png',      dst: '04-cta.png',     role: '「全パックはフィードへ」誘導' },
];

const copied = [
  // 01-cover は独立生成済みなので copied リストには手動追加（caption.txt 等のループ用）
  { src: '(stories-mode renderSlide)', dst: '01-cover.png', role: '興味喚起・パック告知（Stories 専用文言）' },
];
for (const f of sourceFiles) {
  const srcPath = join(reelsDir, f.src);
  const dstPath = join(storiesImgDir, f.dst);
  if (!existsSync(srcPath)) {
    console.warn(`  ⚠ skip: ${f.src} が見つかりません`);
    continue;
  }
  copyFileSync(srcPath, dstPath);
  copied.push(f);
}

// caption.txt（各ストーリーに重ねるテキスト案）
const captionText = [
  '# ストーリー連投時のテキスト案（リンクスタンプと組み合わせて使用）',
  '',
  '## ① 01-cover.png',
  '🆕 新作！' + yearJp + ' 択一式 過去問 #' + packNumLabel,
  '今日のテーマで挑戦してみて 👇',
  '',
  '## ② 02-problem.png',
  '🤔 Q1：これ、わかる？',
  '↑ スワイプの前に、自分で考えてみよう',
  '',
  '## ③ 03-answer.png',
  '✅ 答えはこれ！',
  '解説で論点をチェック',
  '',
  '## ④ 04-cta.png',
  '📚 残り 3 問は フィードのカルーセル投稿で',
  '→ プロフィールから 👀',
  '',
  '## 共通：すべてのストーリーに重ねる',
  '',
  '### リンクスタンプ',
  '- カルーセル投稿の URL（投稿後コピー）',
  '- または doboku-note.com の ' + yearLabel + ' 解説ページ',
  '',
  '### メンション',
  '@dobokunotecom',
  '',
].join('\n');
writeFileSync(join(storiesDir, 'caption.txt'), captionText, 'utf8');

// note.md（投稿手順書）
const noteText = [
  `# ${yearLabel} 過去問 #${packNumLabel} ストーリー投稿手順`,
  '',
  '## 投稿フロー',
  '',
  '```',
  '1. フィードに ' + yearLabel + ' 過去問 #' + packNumLabel + ' カルーセル投稿（先に投稿しておく）',
  '       ↓ 同日中',
  '2. ストーリーに 4 枚を順番に連投（01 → 02 → 03 → 04）',
  '   - 各ストーリーに caption.txt のテキストを重ねる（タップでテキスト追加）',
  '   - 02-problem, 04-cta にはリンクスタンプで カルーセル投稿 URL or サイト URL を貼る',
  '       ↓ 24h 以内',
  '3. ストーリーを「ハイライトに追加」',
  '   - ハイライト名: 「' + yearLabel + ' 過去問」（複数パックを 1 ハイライトに集約）',
  '   - 24h 過ぎたストーリーはハイライト追加不可',
  '```',
  '',
  '## 4 枚の役割',
  '',
  copied.map((f, i) => `${i + 1}. \`${f.dst}\` — ${f.role}`).join('\n'),
  '',
  '## キャプション案',
  '',
  '`caption.txt` 参照。各ストーリーに重ねるテキストを 1 行ずつ。',
  '',
  '## リンクスタンプの貼り方',
  '',
  '### 推奨',
  '- 02-problem.png に「カルーセル投稿 URL」（IG 内部リンク）',
  '- 04-cta.png に「doboku-note.com の ' + yearLabel + ' 解説ページ」（外部リンク）',
  '',
  '### IG Web 版の場合',
  '- リンクスタンプ機能のみ利用可（投稿ステッカーは未対応）',
  '- スマホアプリでは「ステッカー → 投稿を追加」で URL 不要',
  '',
  '## ハイライト戦略',
  '',
  '- 1 ハイライト「' + yearLabel + ' 過去問」に 全パック × 4 枚を集約（上限 100）',
  '- IG プロフィール訪問者が「タップ 1 回で ' + yearLabel + ' 全パックの試食」が可能',
  '- 拡張：他年度完成時は年度別ハイライト（例「R05 過去問」）を追加',
  '',
].join('\n');
writeFileSync(join(storiesDir, 'note.md'), noteText, 'utf8');

console.log(`✓ stories/ 整備: ${packDir}`);
console.log(`  ${copied.length} 枚コピー → ${storiesImgDir}`);
copied.forEach((f) => console.log(`    ${f.dst}  (${f.role})`));
