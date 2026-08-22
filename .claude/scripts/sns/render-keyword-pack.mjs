#!/usr/bin/env node
/**
 * 解説型キーワードパック画像 一括生成スクリプト。
 *
 * 使い方:
 *   node .claude/scripts/sns/render-keyword-pack.mjs <pack-dir> [<pack-dir2> ...]
 *
 * 例:
 *   node .claude/scripts/sns/render-keyword-pack.mjs content/sns/x/draft/008-キーワード-design-review
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseKeywordPack, parseKeywordTweets } from './lib/keyword-parser.mjs';
import { RENDERERS } from './templates/keyword-ig.mjs';
import { renderKeywordTweet } from './templates/keyword-x.mjs';
import { svgToPng } from './lib/svg-to-png.mjs';

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function writeSvgAndPng(outBase, svg) {
  ensureDir(dirname(outBase));
  writeFileSync(`${outBase}.svg`, svg, 'utf8');
  const png = svgToPng(svg);
  writeFileSync(`${outBase}.png`, png);
}

const ROLE_NAMES = [
  '01-cover',
  '02-definition',
  '03-figure',
  '04-explanation',
  '05-explanation',
  '06-explanation',
  '07-explanation',
  '08-tricks',
  '09-related',
  '10-cta',
];

function renderPack(packDir) {
  const { meta, slides } = parseKeywordPack(packDir);
  const igDir = join(packDir, 'instagram-carousel', 'img');
  ensureDir(igDir);

  let igCount = 0;
  for (const slide of slides) {
    const renderer = RENDERERS[slide.type];
    if (!renderer) {
      console.warn(`  skip slide #${slide.slideIndex}: unknown type "${slide.type}"`);
      continue;
    }
    const svg = renderer({ data: slide, meta });
    const role = ROLE_NAMES[slide.slideIndex - 1] || `${String(slide.slideIndex).padStart(2, '0')}-slide`;
    writeSvgAndPng(join(igDir, role), svg);
    igCount++;
  }

  // X tweet images
  const { tweets } = parseKeywordTweets(packDir);
  let xCount = 0;
  if (tweets.length > 0) {
    const xDir = join(packDir, 'x', 'img');
    ensureDir(xDir);
    for (const tweet of tweets) {
      const svg = renderKeywordTweet({ tweet, meta });
      const fileName = `tweet-${String(tweet.num).padStart(2, '0')}-${meta.keywordSlug}`;
      writeSvgAndPng(join(xDir, fileName), svg);
      xCount++;
    }
  }
  console.log(`✓ ${meta.keywordName} (${meta.keywordSlug}): ${igCount} IG + ${xCount} X`);
  return igCount + xCount;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node render-keyword-pack.mjs <pack-dir> [<pack-dir2> ...]');
    process.exit(1);
  }
  let total = 0;
  for (const packDir of args) {
    if (!existsSync(join(packDir, 'instagram-carousel.md'))) {
      console.error(`  skip ${packDir}: instagram-carousel.md not found`);
      continue;
    }
    total += renderPack(packDir);
  }
  console.log(`\n完了: ${total} slides 生成 (SVG + PNG)`);
}

main();
