/**
 * Study Notebook（案C）デザイン サンプル PNG 生成スクリプト
 *
 * 題材: ハインリッヒの法則
 * 出力:
 *   .tmp/notebook-sample/reels/    — 1080×1920 (IG Reels / YT Shorts)
 *   .tmp/notebook-sample/carousel/ — 1080×1350 (IG Carousel)
 *
 * 実行: node .claude/scripts/gen-notebook-sample.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { renderSlide } from './lib/sns-common/slide-render.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const OUT_DIR = resolve(ROOT, '.tmp/notebook-sample');

/** ハインリッヒの法則サンプルデータ */
const SLIDES = [
  {
    file: '00-cover.png',
    slide: {
      type: 'notebook-cover',
      data: {
        keyword: 'ハインリッヒの法則',
        keywordLines: ['ハインリッヒの', '法則'],
        subtitle: '1 : 29 : 300',
        numbers: [
          { n: 1,   label: '重大事故（死亡・重傷）',     color: '#b22234' },
          { n: 29,  label: '軽微事故（休業 4 日未満）',  color: '#d4a017' },
          { n: 300, label: 'ヒヤリハット（無傷の異常）', color: '#2e6da4' },
        ],
        stickyText: '1929年\n50万件\n調査',
        management: 'safety',
        caption: '労災 1:29:300\nこれ、何の比率？',
      },
    },
  },
  {
    file: '01-board.png',
    slide: {
      type: 'notebook-board',
      data: {
        heading: 'ハインリッヒの法則',
        body: '重大事故 1 件の背後に\n軽微事故 29 件\nヒヤリハット 300 件が潜む経験則',
        noteText: '300 の段階で気付けば\n事故は防げる ＝ KYT の根拠',
        management: 'safety',
        caption: 'ヒヤリハット段階で予防＝KYT',
      },
    },
  },
  {
    file: '02-cta.png',
    slide: {
      type: 'notebook-cta',
      data: {
        related: ['バードの法則', 'KYT', '4M-4E', '不安全行動'],
        management: 'safety',
        caption: '続きは doboku-note で',
      },
    },
  },
];

/** canvas サイズ設定 */
const SIZES = [
  { name: 'reels',    dir: 'reels',    width: 1080, height: 1920, label: 'IG Reels / YT Shorts' },
  { name: 'carousel', dir: 'carousel', width: 1080, height: 1350, label: 'IG Carousel' },
];

for (const size of SIZES) {
  const outDir = resolve(OUT_DIR, size.dir);
  mkdirSync(outDir, { recursive: true });

  console.log(`\n[${size.label}] ${size.width}×${size.height}`);

  for (const { file, slide } of SLIDES) {
    const start = Date.now();
    const png = await renderSlide({ width: size.width, height: size.height, slide });
    const outPath = resolve(outDir, file);
    writeFileSync(outPath, png);
    console.log(`  ✓ ${file}  (${Date.now() - start}ms, ${(png.length / 1024).toFixed(0)}KB)`);
  }
}

console.log('\nDone. Opening folder...');
try {
  execSync(`open "${OUT_DIR}"`);
} catch {
  console.log(`Folder: ${OUT_DIR}`);
}
