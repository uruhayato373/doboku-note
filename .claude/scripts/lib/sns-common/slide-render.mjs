/**
 * SNS スライド画像レンダラ。
 *
 * Satori（HTML/CSS-like → SVG）+ @resvg/resvg-js（SVG → PNG）で 1 枚の PNG Buffer を生成する。
 * フォントは OGP と共有（NotoSansJP-Bold + Inter-Bold）。
 *
 * スライド型は段階的に追加する:
 *   - Phase 1（本コミット）: cover
 *   - Phase 2（#165/#166）: definition / context / example / points / related / cta / quiz-*
 */

import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { COLORS, FONTS } from './design-tokens.mjs';
import { wrapTitle, pickFontSize } from './jp-text-wrap.mjs';
import { buildNotebookCover, buildNotebookBoard, buildNotebookCta } from './notebook-slides.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONT_DIR = resolve(__dirname, '../../../skills/conversion/ogp-create/assets/fonts');

let cachedFonts = null;
function loadFonts() {
  if (cachedFonts) return cachedFonts;
  cachedFonts = [
    {
      name: 'Noto Sans JP',
      data: readFileSync(resolve(FONT_DIR, 'NotoSansJP-Bold.ttf')),
      weight: 700,
      style: 'normal',
    },
    {
      name: 'Inter',
      data: readFileSync(resolve(FONT_DIR, 'Inter-Bold.ttf')),
      weight: 700,
      style: 'normal',
    },
  ];
  return cachedFonts;
}

export const TEXT_CONFIG_DEFAULTS = {
  ytShorts: {
    breakBefore: ['（', '：', '〜'],
    breakAt: [' ', '　'],
    charCountFallback: 12,
    fontSizeTable: [120, 96, 80, 64, 48],
    safetyWidth: 920,
    budouX: { enabled: false },
  },
  igCarousel: {
    breakBefore: ['（', '：', '〜'],
    breakAt: [' ', '　'],
    charCountFallback: 14,
    fontSizeTable: [108, 88, 72, 56, 44],
    safetyWidth: 920,
    budouX: { enabled: false },
  },
  ytStandard: {
    breakBefore: ['（', '：', '〜'],
    breakAt: [' ', '　'],
    charCountFallback: 18,
    fontSizeTable: [120, 96, 80, 64],
    safetyWidth: 1700,
    budouX: { enabled: false },
  },
};

function guessTextConfig({ width, height }) {
  if (width === 1080 && height === 1920) return TEXT_CONFIG_DEFAULTS.ytShorts;
  if (width === 1080 && height === 1350) return TEXT_CONFIG_DEFAULTS.igCarousel;
  if (width === 1920 && height === 1080) return TEXT_CONFIG_DEFAULTS.ytStandard;
  return TEXT_CONFIG_DEFAULTS.ytShorts;
}

/**
 * 1 枚のスライドを PNG Buffer として生成する。
 *
 * @param {object} args
 * @param {number} args.width
 * @param {number} args.height
 * @param {object} args.slide       - { type: 'cover' | ..., data: object }
 * @param {object} [args.textConfig] - 改行・フォントサイズ設定（省略時は width/height から推定）
 * @returns {Promise<Buffer>}
 */
export async function renderSlide({ width, height, slide, textConfig }) {
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    throw new Error('width and height must be integers');
  }
  if (!slide || typeof slide.type !== 'string') {
    throw new Error('slide.type is required');
  }
  const fonts = loadFonts();
  const config = textConfig ?? guessTextConfig({ width, height });
  const element = await buildElement({ width, height, slide, config });
  const svg = await satori(element, { width, height, fonts });
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } });
  return resvg.render().asPng();
}

async function buildElement({ width, height, slide, config }) {
  switch (slide.type) {
    case 'cover':
      return buildCoverElement({ width, height, data: slide.data || {}, config });
    case 'notebook-cover':
      return buildNotebookCover({ width, height, data: slide.data || {} });
    case 'notebook-board':
      return buildNotebookBoard({ width, height, data: slide.data || {} });
    case 'notebook-cta':
      return buildNotebookCta({ width, height, data: slide.data || {} });
    default:
      throw new Error(`Unknown slide type: ${slide.type}`);
  }
}

async function buildCoverElement({ width, height, data, config }) {
  const title = data.title || '';
  const lines = await wrapTitle(title, config);
  const fontSize = pickFontSize(lines, config);

  return {
    type: 'div',
    props: {
      style: {
        width: `${width}px`,
        height: `${height}px`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundImage: `linear-gradient(180deg, ${COLORS.brandFill} 0%, ${COLORS.white} 100%)`,
        padding: '80px',
        position: 'relative',
        fontFamily: FONTS.heading,
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: '32px',
              color: COLORS.brand,
              marginBottom: '40px',
              letterSpacing: '0.1em',
              fontWeight: 700,
            },
            children: data.label || '技術士総監',
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            },
            children: lines.map(line => ({
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  color: COLORS.brandDeep,
                  fontSize: `${fontSize}px`,
                  fontWeight: 700,
                  lineHeight: 1.2,
                },
                children: line || ' ',
              },
            })),
          },
        },
        data.subtitle
          ? {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  fontSize: '32px',
                  color: COLORS.inkBody,
                  marginTop: '48px',
                  fontWeight: 700,
                },
                children: data.subtitle,
              },
            }
          : null,
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              position: 'absolute',
              bottom: '64px',
              fontSize: '28px',
              color: COLORS.inkMuted,
              fontWeight: 700,
            },
            children: 'doboku-note.com',
          },
        },
      ].filter(Boolean),
    },
  };
}
