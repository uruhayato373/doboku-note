#!/usr/bin/env node
/**
 * build-highlight-materials.mjs
 *
 * ハイライト系統 A 用 Stories PNG を一括生成する汎用スクリプト。
 *
 * 戦略: docs/project/03_SNS/01_SNS集客戦略.md v7.1 §2 Highlight 6 種
 * ポリシー: docs/reference/ig-stories-policy.md §5 系統 A / C
 *
 * 対応ハイライト:
 *   - docs/sns/instagram/highlight-materials/         教材 (系統 C)
 *   - docs/sns/instagram/highlight-intro/             まず読む
 *   - docs/sns/instagram/highlight-faq/               FAQ
 *   - docs/sns/instagram/highlight-carousel-index/    カルーセル目次
 *   - docs/sns/instagram/highlight-reels-roundup/     Reels まとめ
 *   - docs/sns/instagram/highlight-announcement/      お知らせ（テンプレ）
 *
 * Usage:
 *   # 単一ハイライト
 *   node .claude/scripts/instagram/build-highlight-materials.mjs --dir docs/sns/instagram/highlight-faq
 *   # 全 highlight-* を一括生成
 *   node .claude/scripts/instagram/build-highlight-materials.mjs --all
 *   # 既定（後方互換: highlight-materials のみ）
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
  const tag = packDir.replace(`${IG_BASE}\\`, '').replace(`${IG_BASE}/`, '');
  console.log(`\n[${tag}] ${total} 枚生成 → ${outDir}`);

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
            _totalSlides: total,
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
    // highlight-* を自動列挙
    targets = readdirSync(IG_BASE)
      .filter((d) => d.startsWith('highlight-'))
      .map((d) => join(IG_BASE, d))
      .filter((p) => existsSync(join(p, 'slide-data.json')));
  } else if (args.dir) {
    targets = [resolve(args.dir)];
  } else {
    // 後方互換: 引数なしは highlight-materials のみ
    targets = [join(IG_BASE, 'highlight-materials')];
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
