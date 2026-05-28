#!/usr/bin/env node
/**
 * build-highlight-materials.mjs
 *
 * 教材ハイライト用 Stories 6 枚 PNG を生成する。
 *
 * 戦略: docs/project/03_SNS/01_SNS集客戦略.md v7.1 §2 Highlight 6 種目「教材」
 * ポリシー: docs/reference/ig-stories-policy.md §5 系統 C
 * 雛形: docs/sns/instagram/highlight-materials/slide-data.json
 *
 * Usage:
 *   node .claude/scripts/instagram/build-highlight-materials.mjs
 *
 * 出力:
 *   docs/sns/instagram/highlight-materials/img/{01-cover,02-author,...,06-cta}.png
 *
 * 構造:
 *   slide-data.json の slides[] を読み、各スライドの role / title / subtitle /
 *   body / items / chipCta を highlight-slides.mjs の buildHighlightMaterial に
 *   渡して PNG を生成する（1080×1920 Stories サイズ）。
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderSlide } from '#lib/sns-common/slide-render.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const BASE_DIR = join(ROOT, 'docs', 'sns', 'instagram', 'highlight-materials');
const SLIDE_DATA_PATH = join(BASE_DIR, 'slide-data.json');
const OUT_DIR = join(BASE_DIR, 'img');

const WIDTH = 1080;
const HEIGHT = 1920;

async function main() {
  if (!existsSync(SLIDE_DATA_PATH)) {
    console.error(`Not found: ${SLIDE_DATA_PATH}`);
    process.exit(1);
  }

  const slideData = JSON.parse(readFileSync(SLIDE_DATA_PATH, 'utf8'));
  if (!Array.isArray(slideData.slides) || slideData.slides.length === 0) {
    console.error('slide-data.json に slides が無いか空です');
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const total = slideData.slides.length;
  console.log(`[build-highlight-materials] ${total} 枚生成 → ${OUT_DIR}\n`);

  let ok = 0;
  let failed = 0;

  for (const slide of slideData.slides) {
    const filename = slide.filename;
    if (!filename) {
      console.warn(`  ⚠ slide.filename なし、スキップ: index=${slide.index}`);
      continue;
    }
    const t0 = Date.now();
    try {
      const png = await renderSlide({
        width: WIDTH,
        height: HEIGHT,
        slide: {
          type: 'highlight-material',
          data: {
            ...slide,
            _totalSlides: total,  // ページ番号 N/6 用
          },
        },
      });
      const outPath = join(OUT_DIR, filename);
      writeFileSync(outPath, png);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`  ✓ ${filename}  (${elapsed}s, role=${slide.role})`);
      ok++;
    } catch (err) {
      console.error(`  ❌ ${filename} FAILED: ${err.message ?? err}`);
      failed++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  OK:     ${ok}/${total}`);
  console.log(`  Failed: ${failed}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
