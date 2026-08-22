#!/usr/bin/env node
// content/note/技術士総監/キーワード集2026変更点/img/ のSVGをPNGに変換する。
//
// 使い方:
//   node scripts/render-figure-keyword-2026.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const IMG_DIR = join(ROOT, 'content/note/技術士総監/キーワード集2026変更点/img');

async function renderSvgToPng(svgName) {
  const svgPath = join(IMG_DIR, svgName);
  const pngPath = join(IMG_DIR, svgName.replace('.svg', '.png'));
  const svg = readFileSync(svgPath);
  await sharp(svg).png().toFile(pngPath);
  console.log(`  ok: ${svgName.replace('.svg', '.png')}`);
}

async function main() {
  console.log('Rendering figures for キーワード集2026変更点…');
  await renderSvgToPng('figure-1-changes-by-area.svg');
  await renderSvgToPng('figure-2-priority-matrix.svg');
  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
