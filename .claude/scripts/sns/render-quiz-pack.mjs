#!/usr/bin/env node
/**
 * クイズパック画像 一括生成スクリプト。
 *
 * 使い方:
 *   node .claude/scripts/sns/render-quiz-pack.mjs <pack-dir>
 *
 * 例:
 *   node .claude/scripts/sns/render-quiz-pack.mjs content/sns/x/draft/002-クイズ-択一1問1答-R7新規20問
 *
 * 出力:
 *   <pack-dir>/instagram-carousel/img/{NN}-{cat-slug}/{01-cover,02-q1,03-a1,...,10-cta}.{svg,png}
 *   <pack-dir>/x/img/{tweet|answer}-{NN}-{cat-shortcode}.{svg,png}
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { parseQuizSource } from './lib/quiz-parser.mjs';
import * as IG from './templates/quiz-ig.mjs';
import * as X from './templates/quiz-x.mjs';
import { svgToPng } from './lib/svg-to-png.mjs';

const CATEGORY_SHORTCODES = {
  'economic': 'eco',
  'human-resource': 'hr',
  'information': 'info',
  'safety': 'safe',
  'social-environment': 'env',
};

const CATEGORY_DIR_PREFIX = {
  'economic': '01-経済性',
  'human-resource': '02-人的資源',
  'information': '03-情報',
  'safety': '04-安全',
  'social-environment': '05-社会環境',
};

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function writeSvgAndPng(outBase, svg) {
  ensureDir(dirname(outBase));
  writeFileSync(`${outBase}.svg`, svg, 'utf8');
  // PNG は SVG の width 属性に従って実寸でレンダ
  const png = svgToPng(svg);
  writeFileSync(`${outBase}.png`, png);
}

function main() {
  const packDir = process.argv[2];
  if (!packDir) {
    console.error('Usage: node render-quiz-pack.mjs <pack-dir>');
    process.exit(1);
  }
  const sourcePath = join(packDir, 'source.md');
  if (!existsSync(sourcePath)) {
    console.error(`source.md not found: ${sourcePath}`);
    process.exit(1);
  }
  const { categories } = parseQuizSource(sourcePath);
  if (categories.length === 0) {
    console.error('No categories parsed from source.md');
    process.exit(1);
  }

  const allCategories = categories.map(c => ({ slug: c.slug, shortName: c.shortName }));
  const totalPacks = categories.length;

  let svgCount = 0, pngCount = 0;

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const packIndex = i + 1;
    const catDirName = CATEGORY_DIR_PREFIX[cat.slug];
    const igCatDir = join(packDir, 'instagram-carousel', 'img', catDirName);
    ensureDir(igCatDir);

    // Slide 1: cover
    const coverSvg = IG.renderCover({ category: cat, packIndex, totalPacks, allCategories });
    writeSvgAndPng(join(igCatDir, '01-cover'), coverSvg);
    svgCount++; pngCount++;

    // Slides 2-9: Q/A pairs
    for (let qi = 0; qi < cat.questions.length; qi++) {
      const q = cat.questions[qi];
      const slotIndex = qi + 1;
      const qNum = String(2 + qi * 2).padStart(2, '0');
      const aNum = String(3 + qi * 2).padStart(2, '0');

      const qSvg = IG.renderQuestion({ category: cat, q, slotIndex, totalSlots: cat.questions.length });
      writeSvgAndPng(join(igCatDir, `${qNum}-q${slotIndex}`), qSvg);
      svgCount++; pngCount++;

      const aSvg = IG.renderAnswer({ category: cat, q });
      writeSvgAndPng(join(igCatDir, `${aNum}-a${slotIndex}`), aSvg);
      svgCount++; pngCount++;
    }

    // Slide 10: CTA
    const topics = cat.questions.map(q => q.topic);
    const ctaSvg = IG.renderCta({ category: cat, packIndex, totalPacks, topics });
    writeSvgAndPng(join(igCatDir, '10-cta'), ctaSvg);
    svgCount++; pngCount++;

    // X images: tweet/answer per question
    const xDir = join(packDir, 'x', 'img');
    ensureDir(xDir);
    for (const q of cat.questions) {
      const nn = String(q.num).padStart(2, '0');
      const code = CATEGORY_SHORTCODES[cat.slug];

      const tweetSvg = X.renderTweet({ category: cat, q });
      writeSvgAndPng(join(xDir, `tweet-${nn}-${code}`), tweetSvg);
      svgCount++; pngCount++;

      const ansSvg = X.renderAnswer({ category: cat, q });
      writeSvgAndPng(join(xDir, `answer-${nn}-${code}`), ansSvg);
      svgCount++; pngCount++;
    }

    console.log(`✓ ${cat.shortName}: 10 IG + ${cat.questions.length * 2} X 画像生成`);
  }

  console.log(`\n完了: ${svgCount} SVG + ${pngCount} PNG = ${svgCount + pngCount} ファイル`);
}

main();
