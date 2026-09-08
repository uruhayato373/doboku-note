#!/usr/bin/env node
/**
 * スキャン PDF の埋め込み JPEG を読み、回転後に単ページか見開きかを判定する。
 * 出力した singlePdfPages を reference-sources.json へ固定し、再実行時の通しページ番号を安定させる。
 *
 *   node scripts/inspect-reference-book-layout.mjs --pdf /path/to/input.pdf --rotation 90
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const value = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const pdf = value('pdf');
const rotation = Number(value('rotation', '90'));
const threshold = Number(value('threshold', '1.15'));
if (!pdf || !fs.existsSync(pdf)) throw new Error('--pdf に実在する PDF が必要');
if (![0, 90, 180, 270].includes(rotation)) throw new Error('--rotation は 0|90|180|270');
if (!(threshold >= 1 && threshold <= 1.5)) throw new Error('--threshold は 1..1.5');

const output = execFileSync('pdfimages', ['-list', pdf], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const rows = output.split('\n').flatMap((line) => {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 9 || parts[2] !== 'image' || !/^\d+$/.test(parts[0])) return [];
  return [{ page: Number(parts[0]), width: Number(parts[3]), height: Number(parts[4]), encoding: parts[8] }];
});
const perPage = new Map();
for (const row of rows) perPage.set(row.page, [...(perPage.get(row.page) || []), row]);
const invalid = [...perPage].filter(([, images]) => images.length !== 1 || images[0].encoding !== 'jpeg');
if (invalid.length) throw new Error(`1 PDF page = 1 JPEG でないページ: ${invalid.map(([page]) => page).join(', ')}`);

const quarterTurn = rotation === 90 || rotation === 270;
const singlePdfPages = [];
const layouts = [];
for (const [page, images] of [...perPage].sort((a, b) => a[0] - b[0])) {
  const image = images[0];
  const width = quarterTurn ? image.height : image.width;
  const height = quarterTurn ? image.width : image.height;
  const aspect = width / height;
  const layout = aspect <= threshold ? 'single' : 'spread';
  if (layout === 'single') singlePdfPages.push(page);
  layouts.push({ page, layout, width, height, aspect: Number(aspect.toFixed(3)) });
}

console.log(JSON.stringify({
  pdf: path.basename(pdf),
  pdfPages: perPage.size,
  rotation,
  singlePageAspectThreshold: threshold,
  singlePdfPages,
  spreadPdfPages: perPage.size - singlePdfPages.length,
  outputPages: perPage.size * 2 - singlePdfPages.length,
  layouts,
}, null, 2));
