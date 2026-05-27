#!/usr/bin/env node
/**
 * build-stories.mjs
 *
 * 各過去問パックの reels/img/ から「ストーリー連投用 4 枚」を選んで stories/img/ にコピー、
 * 投稿手順を note.md にまとめる。
 *
 * 4 枚構成（IG ストーリーのベストプラクティス）:
 *   01-cover.png    ← 1 番目: 興味喚起「新パック」告知
 *   02-problem.png  ← 2 番目: Q1 を見せて「解いてみて」
 *   03-answer.png   ← 3 番目: Q1 の解答「答え合わせ」
 *   04-cta.png      ← 4 番目: 「全 10 枚はフィードへ」誘導
 *
 * Usage:
 *   node .claude/scripts/instagram/build-stories.mjs <pack-dir>
 *   node .claude/scripts/instagram/build-stories.mjs docs/sns/instagram/_exam-packs/r07/pack-01
 *
 * バッチで全パック:
 *   for d in docs/sns/instagram/_exam-packs/r{03..07}/pack-*; do
 *     node .claude/scripts/instagram/build-stories.mjs "$d"
 *   done
 */

import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';

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

const reelsDir = join(packDir, 'reels', 'img');
const storiesDir = join(packDir, 'stories');
const storiesImgDir = join(storiesDir, 'img');

if (!existsSync(reelsDir)) {
  console.error(`reels/img/ が存在しません: ${reelsDir}`);
  console.error('  先に ig-post-create --size reels を実行してください');
  process.exit(1);
}

mkdirSync(storiesImgDir, { recursive: true });

// 4 枚選別（reels から指定スライドをコピー）
const sourceFiles = [
  { src: '00-cover.png',    dst: '01-cover.png',   role: '興味喚起・パック告知' },
  { src: '01-problem.png',  dst: '02-problem.png', role: 'Q1 を見せて「解いてみて」' },
  { src: '02-answer.png',   dst: '03-answer.png',  role: 'Q1 の解答「答え合わせ」' },
  { src: '09-cta.png',      dst: '04-cta.png',     role: '「全パックはフィードへ」誘導' },
];

const copied = [];
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
  '🆕 新作！令和7年度 択一式 過去問 #' + packNumLabel,
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
  '- または doboku-note.com の R7 解説ページ',
  '',
  '### メンション',
  '@doboku_note',
  '',
].join('\n');
writeFileSync(join(storiesDir, 'caption.txt'), captionText, 'utf8');

// note.md（投稿手順書）
const noteText = [
  `# R${year.replace(/^r0?/, '')} 過去問 #${packNumLabel} ストーリー投稿手順`,
  '',
  '## 投稿フロー',
  '',
  '```',
  '1. フィードに R07 過去問 #' + packNumLabel + ' カルーセル投稿（先に投稿しておく）',
  '       ↓ 同日中',
  '2. ストーリーに 4 枚を順番に連投（01 → 02 → 03 → 04）',
  '   - 各ストーリーに caption.txt のテキストを重ねる（タップでテキスト追加）',
  '   - 02-problem, 04-cta にはリンクスタンプで カルーセル投稿 URL or サイト URL を貼る',
  '       ↓ 24h 以内',
  '3. ストーリーを「ハイライトに追加」',
  '   - ハイライト名: 「R07 過去問」（複数パックを 1 ハイライトに集約）',
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
  '- 04-cta.png に「doboku-note.com の R7 解説ページ」（外部リンク）',
  '',
  '### IG Web 版の場合',
  '- リンクスタンプ機能のみ利用可（投稿ステッカーは未対応）',
  '- スマホアプリでは「ステッカー → 投稿を追加」で URL 不要',
  '',
  '## ハイライト戦略',
  '',
  '- 1 ハイライト「R07 過去問」に 全 9 パック × 4 枚 = 36 ストーリーを集約（上限 100）',
  '- IG プロフィール訪問者が「タップ 1 回で R07 全パックの試食」が可能',
  '- 拡張：R6 完成時は「R06 過去問」ハイライト追加',
  '',
].join('\n');
writeFileSync(join(storiesDir, 'note.md'), noteText, 'utf8');

console.log(`✓ stories/ 整備: ${packDir}`);
console.log(`  ${copied.length} 枚コピー → ${storiesImgDir}`);
copied.forEach((f) => console.log(`    ${f.dst}  (${f.role})`));
