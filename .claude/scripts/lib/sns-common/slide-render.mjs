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
import { buildNotebookCover, buildNotebookBoard, buildNotebookCta, buildNotebookFigure, buildNotebookIntro, buildNotebookSummary, buildNotebookQuestion, buildNotebookOptions, buildNotebookThink, buildNotebookAnswer, NOTEBOOK_TOKENS, buildMarginLine } from './notebook-slides.mjs';
import { buildQuizCover, buildQuizProblem, buildQuizPause, buildQuizAnswer, buildQuizCta, buildSummaryCover, buildSummaryPackList, buildSummaryCta } from './quiz-slides.mjs';
import { buildHighlightMaterial } from './highlight-slides.mjs';
import { buildHighlightStoriesSlide } from './highlight-stories-slides.mjs';
import { SNS_CONFIG } from './sns-config.mjs';

const NT = NOTEBOOK_TOKENS;
const RULED_BG = `repeating-linear-gradient(to bottom, transparent 0, transparent 71px, ${NT.paperLine} 71px, ${NT.paperLine} 72px)`;

function notebookContainer(width, height) {
  return {
    position: 'relative',
    width: `${width}px`,
    height: `${height}px`,
    display: 'flex',
    background: NT.paper,
    backgroundImage: RULED_BG,
    fontFamily: FONTS.heading,
    color: NT.ink,
    overflow: 'hidden',
  };
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONT_DIR = resolve(__dirname, '../../../skills/conversion/ogp-create/assets/fonts');
const FONTSOURCE_DIR = resolve(__dirname, '../../../../node_modules/@fontsource');

let cachedFonts = null;
function loadFonts() {
  if (cachedFonts) return cachedFonts;
  // 互換用既存（Inter + Noto Sans JP 700）+ IG カルーセル新意匠用（Manrope 500/700/800 + NotoSansJP 500/700/800/900）
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
    // Manrope (@fontsource/manrope, latin subset, woff)
    ...[500, 700, 800].map((weight) => ({
      name: 'Manrope',
      data: readFileSync(resolve(FONTSOURCE_DIR, `manrope/files/manrope-latin-${weight}-normal.woff`)),
      weight,
      style: 'normal',
    })),
    // NotoSansJP (@fontsource/noto-sans-jp, japanese subset, woff)
    ...[500, 600, 700, 800, 900].map((weight) => ({
      name: 'NotoSansJP',
      data: readFileSync(resolve(FONTSOURCE_DIR, `noto-sans-jp/files/noto-sans-jp-japanese-${weight}-normal.woff`)),
      weight,
      style: 'normal',
    })),
  ];
  return cachedFonts;
}

export const TEXT_CONFIG_DEFAULTS = {
  ytShorts: {
    breakBefore: ['（', '：', '〜'],
    breakAt: [' ', '　'],
    charCountFallback: 12,
    fontSizeTable: [200, 160, 128, 104, 88],
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
    case 'notebook-cover':
      return buildNotebookCover({ width, height, data: slide.data || {} });
    case 'notebook-board':
      return buildNotebookBoard({ width, height, data: slide.data || {} });
    case 'notebook-cta':
      return buildNotebookCta({ width, height, data: slide.data || {} });
    case 'notebook-figure':
      return buildNotebookFigure({ width, height, data: slide.data || {} });
    case 'notebook-intro':
      return buildNotebookIntro({ width, height, data: slide.data || {} });
    case 'notebook-summary':
      return buildNotebookSummary({ width, height, data: slide.data || {} });
    case 'notebook-question':
      return buildNotebookQuestion({ width, height, data: slide.data || {} });
    case 'notebook-options':
      return buildNotebookOptions({ width, height, data: slide.data || {} });
    case 'notebook-think':
      return buildNotebookThink({ width, height, data: slide.data || {} });
    case 'notebook-answer':
      return buildNotebookAnswer({ width, height, data: slide.data || {} });
    case 'quiz-cover':
      return buildQuizCover({ width, height, data: slide.data || {} });
    case 'quiz-problem':
      return buildQuizProblem({ width, height, data: slide.data || {} });
    case 'quiz-pause':
      return buildQuizPause({ width, height, data: slide.data || {} });
    case 'quiz-answer':
      return buildQuizAnswer({ width, height, data: slide.data || {} });
    case 'quiz-cta':
      return buildQuizCta({ width, height, data: slide.data || {} });
    case 'highlight-material':
      return buildHighlightMaterial({ width, height, data: slide.data || {} });
    case 'highlight-stories':
      return buildHighlightStoriesSlide({ width, height, data: slide.data || {} });
    case 'summary-cover':
      return buildSummaryCover({ width, height, data: slide.data || {} });
    case 'summary-pack-list':
      return buildSummaryPackList({ width, height, data: slide.data || {} });
    case 'summary-cta':
      return buildSummaryCta({ width, height, data: slide.data || {} });
    case 'image':
      return buildImageElement({ width, height, data: slide.data || {} });
    default:
      throw new Error(`Unknown slide type: ${slide.type}`);
  }
}

/** markdown記号（**など）を除去 */
function stripMarkdown(text) {
  return String(text).replace(/\*\*/g, '').replace(/\*/g, '').trim();
}

/** definition スライド: Study Notebook スタイルで定義を表示 */
async function buildDefinitionElement({ width, height, data }) {
  const title = data.title || '';
  const body = stripMarkdown(data.body || '');
  const hasImage = Boolean(data.imageBase64);

  if (hasImage) {
    const SPLIT = Math.round(height * 0.5); // 960px
    const LEFT = 160;
    const RIGHT = 80;

    return {
      type: 'div',
      props: {
        style: notebookContainer(width, height),
        children: [
          buildMarginLine(),
          // 上部: タイトル見出し + 定義テキスト
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                position: 'absolute',
                top: '140px',
                bottom: `${height - SPLIT + 60}px`,
                left: `${LEFT}px`,
                right: `${RIGHT}px`,
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '32px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      fontSize: '48px',
                      fontWeight: 700,
                      color: NT.brandDeep,
                      borderBottom: `4px solid ${NT.brandDeep}`,
                      paddingBottom: '10px',
                    },
                    children: `${SNS_CONFIG.labels.definition}｜${title}`,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      fontSize: '52px',
                      fontWeight: 700,
                      color: NT.inkBody,
                      lineHeight: 1.6,
                    },
                    children: body,
                  },
                },
              ],
            },
          },
          // セパレーター
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                position: 'absolute',
                top: `${SPLIT - 20}px`,
                left: `${LEFT}px`,
                right: `${RIGHT}px`,
                height: '4px',
                background: NT.paperLine,
              },
              children: [],
            },
          },
          // 下部: 画像
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                position: 'absolute',
                top: `${SPLIT + 20}px`,
                bottom: '140px',
                left: `${LEFT}px`,
                right: `${RIGHT}px`,
                alignItems: 'center',
                justifyContent: 'center',
              },
              children: [
                {
                  type: 'img',
                  props: {
                    src: data.imageBase64,
                    style: {
                      maxWidth: `${width - LEFT - RIGHT}px`,
                      maxHeight: `${SPLIT - 160}px`,
                      objectFit: 'contain',
                      borderRadius: '12px',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
                    },
                  },
                },
              ],
            },
          },
          // credit
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                position: 'absolute',
                bottom: '100px',
                right: `${RIGHT}px`,
                fontSize: '24px',
                color: NT.inkMuted ?? NT.inkBody,
              },
              children: data.credit || '',
            },
          },
          // フッター
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                position: 'absolute',
                bottom: '50px',
                left: `${LEFT}px`,
                fontSize: '36px',
                color: NT.inkBody,
                fontWeight: 700,
              },
              children: SNS_CONFIG.domain,
            },
          },
        ],
      },
    };
  }

  // 画像なし: 既存レイアウト
  return {
    type: 'div',
    props: {
      style: notebookContainer(width, height),
      children: [
        buildMarginLine(),
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              position: 'absolute',
              top: '160px',
              bottom: '180px',
              left: '160px',
              right: '80px',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '48px',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontSize: '52px',
                    fontWeight: 700,
                    color: NT.brandDeep,
                    borderBottom: `4px solid ${NT.brandDeep}`,
                    paddingBottom: '12px',
                  },
                  children: `${SNS_CONFIG.labels.definition}｜${title}`,
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontSize: '64px',
                    fontWeight: 700,
                    color: NT.inkBody,
                    lineHeight: 1.7,
                  },
                  children: body,
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              position: 'absolute',
              bottom: '80px',
              left: '160px',
              fontSize: '36px',
              color: NT.inkBody,
              fontWeight: 700,
            },
            children: SNS_CONFIG.domain,
          },
        },
      ],
    },
  };
}

/** examPoint スライド: Study Notebook スタイルで試験ポイントを表示 */
async function buildExamPointElement({ width, height, data, config }) {
  const index = Number.isInteger(data.index) ? data.index : 1;
  const body = stripMarkdown(data.body || '');
  const parts = body.split('：');
  const isListBody = parts.length >= 3;

  // 単行テキストは事前に折り返し計算（IIFE内でawaitできないため）
  const bodyLines = isListBody ? null : await wrapTitle(body, config);
  const bodySize = isListBody ? null : pickFontSize(bodyLines, {
    ...config,
    fontSizeTable: [76, 64, 56, 48],
  });

  return {
    type: 'div',
    props: {
      style: notebookContainer(width, height),
      children: [
        buildMarginLine(),
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              position: 'absolute',
              top: '160px',
              bottom: '180px',
              left: '160px',
              right: '80px',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '60px',
            },
            children: [
              // 付箋スタイルバッジ
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    alignSelf: 'flex-start',
                    background: NT.sticky,
                    paddingTop: '20px',
                    paddingBottom: '20px',
                    paddingLeft: '28px',
                    paddingRight: '36px',
                    gap: '24px',
                    alignItems: 'center',
                    boxShadow: '4px 6px 12px rgba(0,0,0,0.12)',
                    transform: 'rotate(-1.5deg)',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          width: '88px',
                          height: '88px',
                          borderRadius: '50%',
                          backgroundColor: NT.brand,
                          justifyContent: 'center',
                          alignItems: 'center',
                          fontSize: '60px',
                          color: '#ffffff',
                          fontWeight: 700,
                        },
                        children: String(index),
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          fontSize: '60px',
                          fontWeight: 700,
                          color: NT.ink,
                        },
                        children: SNS_CONFIG.labels.examPoint,
                      },
                    },
                  ],
                },
              },
              // 区切り線
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    height: '4px',
                    background: NT.paperLine,
                    borderRadius: '2px',
                    alignSelf: 'stretch',
                  },
                  children: '',
                },
              },
              // 本文（「：」が2つ以上あれば行分割、それ以外はwrapTitleで折り返し）
              (() => {
                if (isListBody) {
                  return {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px',
                      },
                      children: parts.map((part, i) => ({
                        type: 'div',
                        props: {
                          style: {
                            display: 'flex',
                            fontSize: '64px',
                            fontWeight: 700,
                            color: NT.ink,
                            lineHeight: 1.4,
                          },
                          children: i === 0 ? part : `・${part}`,
                        },
                      })),
                    },
                  };
                }
                return {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    },
                    children: bodyLines.map(line => ({
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          fontSize: `${bodySize}px`,
                          fontWeight: 700,
                          color: NT.ink,
                          lineHeight: 1.5,
                        },
                        children: line || ' ',
                      },
                    })),
                  },
                };
              })(),
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              position: 'absolute',
              bottom: '80px',
              left: '160px',
              fontSize: '36px',
              color: NT.inkBody,
              fontWeight: 700,
            },
            children: SNS_CONFIG.domain,
          },
        },
      ],
    },
  };
}

/** cta スライド: Study Notebook スタイルで doboku-note への誘導 */
async function buildCtaElement({ width, height }) {

  return {
    type: 'div',
    props: {
      style: notebookContainer(width, height),
      children: [
        buildMarginLine(),
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              position: 'absolute',
              top: '160px',
              bottom: '180px',
              left: '160px',
              right: '80px',
              flexDirection: 'column',
              justifyContent: 'space-around',
            },
            children: [
              // 見出し
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    fontSize: '68px',
                    fontWeight: 700,
                    color: NT.brandDeep,
                  },
                  children: [
                    { type: 'div', props: { style: { display: 'flex' }, children: SNS_CONFIG.cta.heading[0] } },
                    { type: 'div', props: { style: { display: 'flex' }, children: SNS_CONFIG.cta.heading[1] } },
                  ],
                },
              },
              // 白カード
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#ffffff',
                    border: `3px solid ${NT.ink}`,
                    paddingTop: '48px',
                    paddingBottom: '48px',
                    paddingLeft: '48px',
                    paddingRight: '48px',
                    gap: '24px',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          fontSize: '56px',
                          fontWeight: 700,
                          color: NT.ink,
                          borderBottom: `8px solid ${NT.marker}`,
                          paddingBottom: '4px',
                          alignSelf: 'flex-start',
                        },
                        children: SNS_CONFIG.domain,
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          fontSize: '44px',
                          color: NT.brand,
                          fontWeight: 700,
                        },
                        children: SNS_CONFIG.cta.cardAction,
                      },
                    },
                  ],
                },
              },
              // 青付箋
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    alignSelf: 'flex-end',
                    width: '340px',
                    background: NT.stickyBlue,
                    paddingTop: '24px',
                    paddingBottom: '24px',
                    paddingLeft: '24px',
                    paddingRight: '24px',
                    flexDirection: 'column',
                    fontSize: '36px',
                    fontWeight: 700,
                    color: NT.ink,
                    lineHeight: 1.55,
                    boxShadow: '4px 6px 12px rgba(0,0,0,0.12)',
                    transform: 'rotate(-3deg)',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: { display: 'flex', fontSize: '36px', fontWeight: 700, marginBottom: '8px' },
                        children: SNS_CONFIG.cta.stickyLabel,
                      },
                    },
                    ...SNS_CONFIG.cta.stickyItems.map(item => ({
                      type: 'div',
                      props: { style: { display: 'flex' }, children: item },
                    })),
                  ],
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              position: 'absolute',
              bottom: '80px',
              left: '160px',
              fontSize: '36px',
              color: NT.inkBody,
              fontWeight: 700,
            },
            children: SNS_CONFIG.domain,
          },
        },
      ],
    },
  };
}

async function buildCoverElement({ width, height, data, config }) {
  const title = data.title || '';
  const lines = await wrapTitle(title, config);
  const fontSize = pickFontSize(lines, config);
  const mgmtInfo = data.management ? SNS_CONFIG.managementMap[data.management] : null;

  return {
    type: 'div',
    props: {
      style: notebookContainer(width, height),
      children: [
        buildMarginLine(),
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              position: 'absolute',
              top: '160px',
              bottom: '180px',
              left: '160px',
              right: '80px',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '40px',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontSize: '44px',
                    color: NT.brand,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                  },
                  children: data.label || SNS_CONFIG.labels.cover,
                },
              },
              mgmtInfo
                ? {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        alignSelf: 'flex-start',
                        background: mgmtInfo.color,
                        paddingTop: '8px',
                        paddingBottom: '8px',
                        paddingLeft: '20px',
                        paddingRight: '20px',
                        fontSize: '44px',
                        fontWeight: 700,
                        color: NT.inkBody,
                        letterSpacing: '0.04em',
                      },
                      children: `▌ ${mgmtInfo.label}`,
                    },
                  }
                : null,
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  },
                  children: lines.map(line => ({
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        fontSize: `${fontSize}px`,
                        fontWeight: 700,
                        lineHeight: 1.2,
                        color: NT.ink,
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
                        alignSelf: 'flex-start',
                        fontSize: '52px',
                        fontWeight: 700,
                        color: NT.inkBody,
                        borderBottom: `8px solid ${NT.marker}`,
                        paddingBottom: '4px',
                      },
                      children: data.subtitle,
                    },
                  }
                : null,
            ].filter(Boolean),
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              position: 'absolute',
              bottom: '80px',
              left: '160px',
              fontSize: '36px',
              color: NT.inkBody,
              fontWeight: 700,
            },
            children: SNS_CONFIG.domain,
          },
        },
      ],
    },
  };
}

/** image スライド: 画像を中央に大きく表示（Study Notebook スタイル） */
function buildImageElement({ width, height, data }) {
  const { imageBase64, title, credit } = data;
  const PAD = 80;
  const LEFT = 160;

  return {
    type: 'div',
    props: {
      style: notebookContainer(width, height),
      children: [
        buildMarginLine(),
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              position: 'absolute',
              top: `${PAD}px`,
              left: `${LEFT}px`,
              right: `${PAD}px`,
              fontSize: '52px',
              fontWeight: 700,
              color: NT.brand,
            },
            children: title,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              position: 'absolute',
              top: '200px',
              bottom: '140px',
              left: `${LEFT}px`,
              right: `${PAD}px`,
              alignItems: 'center',
              justifyContent: 'center',
            },
            children: [
              {
                type: 'img',
                props: {
                  src: imageBase64,
                  style: {
                    maxWidth: `${width - LEFT - PAD}px`,
                    maxHeight: `${height - 360}px`,
                    objectFit: 'contain',
                    borderRadius: '12px',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                  },
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              position: 'absolute',
              bottom: '48px',
              right: `${PAD}px`,
              fontSize: '28px',
              color: NT.inkMuted ?? NT.inkBody,
            },
            children: credit || '',
          },
        },
      ],
    },
  };
}
