/**
 * SNS スライド画像レンダラ。
 *
 * Satori（HTML/CSS-like → SVG）+ @resvg/resvg-js（SVG → PNG）で 1 枚の PNG Buffer を生成する。
 * フォントは OGP と共有（NotoSansJP-Bold + Inter-Bold）。
 *
 * スライド型は段階的に追加する:
 *   - Phase 1: cover
 *   - Phase 2: definition / examPoint / cta（YouTube Shorts MVP 用）
 *   - 将来: context / example / points / related / quiz-*（IG カルーセル拡張時）
 */

import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { COLORS, FONTS } from './design-tokens.mjs';
import { wrapTitle, pickFontSize } from './jp-text-wrap.mjs';

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
    case 'definition':
      return buildDefinitionElement({ width, height, data: slide.data || {}, config });
    case 'examPoint':
      return buildExamPointElement({ width, height, data: slide.data || {}, config });
    case 'cta':
      return buildCtaElement({ width, height, data: slide.data || {}, config });
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

const DEFINITION_BODY_CONFIG = {
  breakBefore: ['（', '：', '〜', '。', '、'],
  breakAt: [],
  charCountFallback: 18,
  fontSizeTable: [56, 48, 40, 36, 32],
  safetyWidth: 920,
  budouX: { enabled: false },
};

async function buildDefinitionElement({ width, height, data, config }) {
  const term = data.title || data.term || '';
  const body = data.body || data.definition || '';
  const titleLines = await wrapTitle(term, config);
  const titleSize = pickFontSize(titleLines, config);
  const bodyLines = await wrapTitle(body, DEFINITION_BODY_CONFIG);
  const bodySize = pickFontSize(bodyLines, DEFINITION_BODY_CONFIG);

  return {
    type: 'div',
    props: {
      style: {
        width: `${width}px`,
        height: `${height}px`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: '120px 80px 80px',
        position: 'relative',
        fontFamily: FONTS.heading,
      },
      children: [
        // 上部ラベル
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              backgroundColor: COLORS.brand,
              color: COLORS.white,
              fontSize: '28px',
              padding: '12px 32px',
              borderRadius: '999px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              marginBottom: '60px',
            },
            children: '定義',
          },
        },
        // 用語（タイトル）
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '60px',
            },
            children: titleLines.map(line => ({
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  color: COLORS.brandDeep,
                  fontSize: `${titleSize}px`,
                  fontWeight: 700,
                  lineHeight: 1.2,
                },
                children: line || ' ',
              },
            })),
          },
        },
        // 本文
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '12px',
              maxWidth: '900px',
              padding: '40px',
              borderLeft: `8px solid ${COLORS.brand}`,
              backgroundColor: COLORS.brandFill,
            },
            children: bodyLines.map(line => ({
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  color: COLORS.inkStrong,
                  fontSize: `${bodySize}px`,
                  fontWeight: 700,
                  lineHeight: 1.4,
                },
                children: line || ' ',
              },
            })),
          },
        },
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
      ],
    },
  };
}

const EXAM_POINT_BODY_CONFIG = {
  breakBefore: ['（', '：', '〜', '、'],
  breakAt: [],
  charCountFallback: 16,
  fontSizeTable: [64, 56, 48, 40, 36],
  safetyWidth: 920,
  budouX: { enabled: false },
};

async function buildExamPointElement({ width, height, data, config: _config }) {
  const index = Number.isInteger(data.index) ? data.index : 1;
  const body = data.body || data.point || '';
  const lines = await wrapTitle(body, EXAM_POINT_BODY_CONFIG);
  const fontSize = pickFontSize(lines, EXAM_POINT_BODY_CONFIG);

  return {
    type: 'div',
    props: {
      style: {
        width: `${width}px`,
        height: `${height}px`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: '120px 80px 80px',
        position: 'relative',
        fontFamily: FONTS.heading,
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              backgroundColor: COLORS.warn,
              color: COLORS.white,
              fontSize: '32px',
              padding: '12px 32px',
              borderRadius: '999px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              marginBottom: '40px',
            },
            children: `試験ポイント ${index}`,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'center',
              flexGrow: 1,
              maxWidth: '900px',
              padding: '40px',
              gap: '16px',
            },
            children: lines.map(line => ({
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  color: COLORS.inkStrong,
                  fontSize: `${fontSize}px`,
                  fontWeight: 700,
                  lineHeight: 1.4,
                },
                children: line || ' ',
              },
            })),
          },
        },
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
      ],
    },
  };
}

async function buildCtaElement({ width, height, data, config: _config }) {
  const headline = data.headline || 'もっと詳しく';
  const subline = data.subline || 'doboku-note で全文を読む';
  const url = data.url || 'doboku-note.com';

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
        backgroundImage: `linear-gradient(180deg, ${COLORS.brandDeep} 0%, ${COLORS.brand} 100%)`,
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
              fontSize: '64px',
              color: COLORS.white,
              fontWeight: 700,
              marginBottom: '32px',
            },
            children: headline,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: '40px',
              color: COLORS.brandFill,
              fontWeight: 700,
              marginBottom: '64px',
            },
            children: subline,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              backgroundColor: COLORS.white,
              color: COLORS.brandDeep,
              fontSize: '36px',
              padding: '24px 48px',
              borderRadius: '16px',
              fontWeight: 700,
            },
            children: url,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              position: 'absolute',
              bottom: '64px',
              fontSize: '28px',
              color: COLORS.brandFill,
              fontWeight: 700,
            },
            children: '概要欄のリンクから',
          },
        },
      ],
    },
  };
}
