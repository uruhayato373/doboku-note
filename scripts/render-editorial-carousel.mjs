#!/usr/bin/env node
/**
 * Editorial カルーセル PNG レンダラー
 *
 * 対象: content/sns/instagram/{category}/{pack-dir}/slide-data.json (series: "A", editorial)
 * 出力: content/sns/instagram/{category}/{pack-dir}/carousel/img/00-cover.png ...
 *
 * Usage:
 *   node scripts/render-editorial-carousel.mjs \
 *     --pack-dir content/sns/instagram/技術士建設部門/2026-06-10-r08-prediction
 */

import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const { values: args } = parseArgs({
  args: process.argv.slice(2),
  options: {
    'pack-dir': { type: 'string' },
  },
});

if (!args['pack-dir']) {
  console.error('Usage: node scripts/render-editorial-carousel.mjs --pack-dir <path>');
  process.exit(1);
}

const packDir = resolve(ROOT, args['pack-dir']);
const slideData = JSON.parse(readFileSync(join(packDir, 'slide-data.json'), 'utf8'));

// ─── フォント ─────────────────────────────────────────────────

const FONT_DIR = resolve(ROOT, '.claude/skills/conversion/ogp-create/assets/fonts');
const FONTSOURCE_DIR = resolve(ROOT, 'node_modules/@fontsource');

const fonts = [
  { name: 'Noto Sans JP', data: readFileSync(resolve(FONT_DIR, 'NotoSansJP-Bold.ttf')), weight: 700, style: 'normal' },
  ...[500, 700, 800].map((w) => ({
    name: 'Manrope',
    data: readFileSync(resolve(FONTSOURCE_DIR, `manrope/files/manrope-latin-${w}-normal.woff`)),
    weight: w,
    style: 'normal',
  })),
  ...[400, 500, 700].map((w) => ({
    name: 'NotoSansJP',
    data: readFileSync(resolve(FONTSOURCE_DIR, `noto-sans-jp/files/noto-sans-jp-japanese-${w}-normal.woff`)),
    weight: w,
    style: 'normal',
  })),
];

// ─── デザイントークン ─────────────────────────────────────────

const W = 1080;
const H = 1350;
const BRAND = '#2e6da4';
const BRAND_FILL = '#e8f0fe';
const INK_STRONG = '#222222';
const INK_BODY = '#444444';
const INK_MUTED = '#888888';
const WHITE = '#ffffff';
const BAR_H = 64;
const FONT_JP = "'NotoSansJP', 'Noto Sans JP'";
const FONT_EN = "'Manrope'";

// ─── スライドビルダー ─────────────────────────────────────────

function topBar(label) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex', alignItems: 'center',
        width: `${W}px`, height: `${BAR_H}px`,
        background: BRAND, padding: '0 40px',
        flexShrink: 0,
      },
      children: [{
        type: 'span',
        props: {
          style: { color: WHITE, fontSize: 22, fontFamily: FONT_JP, fontWeight: 700, letterSpacing: 1 },
          children: label,
        },
      }],
    },
  };
}

function buildCover(cover) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex', flexDirection: 'column',
        width: `${W}px`, height: `${H}px`,
        background: WHITE, fontFamily: FONT_JP,
      },
      children: [
        topBar(`${slideData.category} · ${cover.subtitle ?? ''}`),
        {
          type: 'div',
          props: {
            style: {
              display: 'flex', flexDirection: 'column',
              flex: 1, justifyContent: 'center', alignItems: 'center',
              padding: '60px 80px', gap: 40,
            },
            children: [
              // 資格タグ
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex', background: BRAND_FILL,
                    borderRadius: 8, padding: '8px 20px',
                  },
                  children: [{
                    type: 'span',
                    props: {
                      style: { color: BRAND, fontSize: 24, fontWeight: 700, fontFamily: FONT_JP },
                      children: cover.title,
                    },
                  }],
                },
              },
              // メインタイトル
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex', textAlign: 'center',
                    fontSize: 64, fontWeight: 700,
                    color: INK_STRONG, lineHeight: 1.3,
                    fontFamily: FONT_JP,
                  },
                  children: cover.subtitle,
                },
              },
              // フック
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex', textAlign: 'center',
                    fontSize: 32, color: INK_MUTED,
                    fontFamily: FONT_JP, lineHeight: 1.6,
                  },
                  children: cover.hook ?? '',
                },
              },
            ],
          },
        },
        // スワイプ誘導
        {
          type: 'div',
          props: {
            style: {
              display: 'flex', justifyContent: 'flex-end',
              padding: '0 48px 36px', color: INK_MUTED, fontSize: 22, fontFamily: FONT_JP,
            },
            children: 'スワイプで確認 →',
          },
        },
      ],
    },
  };
}

function buildEditorial(slide, idx, total) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex', flexDirection: 'column',
        width: `${W}px`, height: `${H}px`,
        background: WHITE, fontFamily: FONT_JP,
      },
      children: [
        topBar(`${slideData.category} · ${idx + 1}/${total}`),
        {
          type: 'div',
          props: {
            style: {
              display: 'flex', flexDirection: 'column',
              flex: 1, padding: '56px 64px 48px',
              borderLeft: `8px solid ${BRAND}`, gap: 32,
            },
            children: [
              // 見出し
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex', fontSize: 44, fontWeight: 700,
                    color: INK_STRONG, lineHeight: 1.4, fontFamily: FONT_JP,
                  },
                  children: slide.heading,
                },
              },
              // 本文
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex', flexWrap: 'wrap',
                    fontSize: 30, color: INK_BODY,
                    lineHeight: 1.9, fontFamily: FONT_JP,
                  },
                  children: slide.body,
                },
              },
              // noteText タグ
              ...(slide.noteText ? [{
                type: 'div',
                props: {
                  style: {
                    display: 'flex', marginTop: 'auto',
                    background: BRAND_FILL, borderRadius: 8,
                    padding: '14px 22px',
                  },
                  children: [{
                    type: 'span',
                    props: {
                      style: { color: BRAND, fontSize: 24, fontWeight: 700, fontFamily: FONT_JP },
                      children: `📌 ${slide.noteText}`,
                    },
                  }],
                },
              }] : []),
            ],
          },
        },
      ],
    },
  };
}

function buildCta(cta) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex', flexDirection: 'column',
        width: `${W}px`, height: `${H}px`,
        background: BRAND, fontFamily: FONT_JP,
        justifyContent: 'center', alignItems: 'center',
        padding: '0 80px', gap: 40, textAlign: 'center',
      },
      children: [
        {
          type: 'div',
          props: {
            style: { display: 'flex', fontSize: 52, fontWeight: 700, color: WHITE, lineHeight: 1.5 },
            children: cta.body,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              background: 'rgba(255,255,255,0.15)', borderRadius: 12,
              padding: '16px 32px',
            },
            children: [{
              type: 'span',
              props: {
                style: { color: WHITE, fontSize: 22, fontFamily: FONT_EN, fontWeight: 500 },
                children: cta.url,
              },
            }],
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', color: 'rgba(255,255,255,0.75)', fontSize: 24, fontFamily: FONT_JP },
            children: '▲ 保存して後で見返す',
          },
        },
      ],
    },
  };
}

// ─── レンダリング ─────────────────────────────────────────────

async function renderNode(node) {
  const svg = await satori(node, { width: W, height: H, fonts });
  return new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
}

async function main() {
  const outDir = join(packDir, 'carousel', 'img');
  mkdirSync(outDir, { recursive: true });

  const editorialSlides = slideData.slides.filter(s => s.type === 'editorial');
  const total = editorialSlides.length;
  let idx = 0;

  // 00: cover
  console.log('[1] cover');
  writeFileSync(join(outDir, '00-cover.png'), await renderNode(buildCover(slideData.cover)));

  // 01..N: editorial slides
  for (const [i, slide] of editorialSlides.entries()) {
    idx = i + 1;
    console.log(`[${idx + 1}] editorial: ${slide.heading}`);
    const fname = `${String(idx).padStart(2, '0')}-${slide.type}-${i + 1}.png`;
    writeFileSync(join(outDir, fname), await renderNode(buildEditorial(slide, i, total)));
  }

  // last: cta
  const ctaIdx = idx + 1;
  console.log(`[${ctaIdx + 1}] cta`);
  writeFileSync(join(outDir, `${String(ctaIdx).padStart(2, '0')}-cta.png`), await renderNode(buildCta(slideData.cta)));

  console.log(`\n✓ ${outDir} に ${ctaIdx + 1} 枚出力`);
}

main().catch(e => { console.error(e); process.exit(1); });
