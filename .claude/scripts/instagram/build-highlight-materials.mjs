#!/usr/bin/env node
/**
 * build-highlight-materials.mjs
 *
 * ハイライト系統 A 用 Stories PNG を一括生成する汎用スクリプト。
 *
 * 戦略: docs/project/03_SNS/01_SNS集客戦略.md v7.1 §2 Highlight 6 種
 * ポリシー: .claude/knowledge/reference/ig-stories-policy.md §5 系統 A / C
 *
 * 対応ハイライト (戦略 v7.1 §2 のハイライト 1〜6 種の順序):
 *   - docs/sns/instagram/highlights/01_intro/             まず読む
 *   - docs/sns/instagram/highlights/02_carousel-index/    カルーセル目次
 *   - docs/sns/instagram/highlights/03_reels-roundup/     Reels まとめ
 *   - docs/sns/instagram/highlights/04_faq/               FAQ
 *   - docs/sns/instagram/highlights/05_announcement/      お知らせ（テンプレ）
 *   - docs/sns/instagram/highlights/06_materials/         教材 (系統 C)
 *
 * Usage:
 *   # 単一ハイライト
 *   node .claude/scripts/instagram/build-highlight-materials.mjs --dir docs/sns/instagram/highlights/04_faq
 *   # 全ハイライト (highlights/<NN_name>/slide-data.json) を一括生成
 *   node .claude/scripts/instagram/build-highlight-materials.mjs --all
 *   # 既定（後方互換: highlights/06_materials のみ）
 *   node .claude/scripts/instagram/build-highlight-materials.mjs
 *
 * 構造:
 *   slide-data.json の slides[] を読み、各スライドの role / title / subtitle /
 *   body / items / chipCta を highlight-slides.mjs の buildHighlightMaterial に
 *   渡して PNG を生成する（1080×1920 Stories サイズ）。
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderSlide } from '#lib/sns-common/slide-render.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const IG_BASE = join(ROOT, 'docs', 'sns', 'instagram');
const HIGHLIGHTS_BASE = join(IG_BASE, 'highlights');

const WIDTH = 1080;
const HEIGHT = 1920;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    }
  }
  return out;
}

async function generateOne(packDir) {
  const slideDataPath = join(packDir, 'slide-data.json');
  const outDir = join(packDir, 'img');
  if (!existsSync(slideDataPath)) {
    console.error(`Not found: ${slideDataPath}`);
    return { ok: 0, failed: 1 };
  }

  const slideData = JSON.parse(readFileSync(slideDataPath, 'utf8'));
  if (!Array.isArray(slideData.slides) || slideData.slides.length === 0) {
    console.error(`slides が無いか空: ${slideDataPath}`);
    return { ok: 0, failed: 1 };
  }

  mkdirSync(outDir, { recursive: true });

  const total = slideData.slides.length;
  const tag = packDir
    .replace(`${HIGHLIGHTS_BASE}\\`, 'highlights/')
    .replace(`${HIGHLIGHTS_BASE}/`, 'highlights/')
    .replace(`${IG_BASE}\\`, '')
    .replace(`${IG_BASE}/`, '');
  // ディレクトリ名 (例: highlights/01_intro → 01_intro) を highlightSlug として渡す
  // → tokens.json highlightStories.palettes のキーと一致させる
  const highlightSlug = tag.replace(/^highlights[\\/]/, '');
  console.log(`\n[${tag}] ${total} 枚生成 → ${outDir} (slug: ${highlightSlug})`);

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
          // v7.1: highlight-material → highlight-stories に切替（モダンシック意匠）
          type: 'highlight-stories',
          data: {
            ...slide,
            _totalSlides: total,
            highlightSlug,
          },
        },
      });
      writeFileSync(join(outDir, filename), png);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`  ✓ ${filename}  (${elapsed}s, role=${slide.role})`);
      ok++;
    } catch (err) {
      console.error(`  ❌ ${filename} FAILED: ${err.message ?? err}`);
      failed++;
    }
  }
  return { ok, failed };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let targets = [];
  if (args.all) {
    // highlights/*/slide-data.json を自動列挙
    if (!existsSync(HIGHLIGHTS_BASE)) {
      console.error(`Not found: ${HIGHLIGHTS_BASE}`);
      process.exit(1);
    }
    targets = readdirSync(HIGHLIGHTS_BASE)
      .map((d) => join(HIGHLIGHTS_BASE, d))
      .filter((p) => existsSync(join(p, 'slide-data.json')));
  } else if (args.dir) {
    targets = [resolve(args.dir)];
  } else {
    // 後方互換: 引数なしは highlights/06_materials のみ
    targets = [join(HIGHLIGHTS_BASE, '06_materials')];
  }

  if (targets.length === 0) {
    console.error('対象ディレクトリが見つかりません');
    process.exit(1);
  }

  console.log(`[build-highlight-materials] 対象 ${targets.length} ハイライト`);

  let totalOk = 0;
  let totalFailed = 0;
  for (const dir of targets) {
    const { ok, failed } = await generateOne(dir);
    totalOk += ok;
    totalFailed += failed;
  }

  console.log(`\n=== Grand Summary ===`);
  console.log(`  Highlights: ${targets.length}`);
  console.log(`  PNG OK:     ${totalOk}`);
  console.log(`  PNG Failed: ${totalFailed}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
