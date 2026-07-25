/**
 * IG Stories ハイライト用モダンシック意匠 ビルダー (v7.1)。
 *
 * 真実源: .claude/knowledge/design-system/instagram-carousel-tokens.json の highlightStories
 * ポリシー: .claude/knowledge/reference/ig-highlight-design-policy.md
 * 戦略: docs/project/03_SNS/01_SNS集客戦略.md v7.1 §2 Highlight 6 種
 *
 * 設計意図:
 *   過去問パック (quiz-slides.mjs) と意匠を切り分け、ハイライトの
 *   サムネ識別性とジャンル別カラーで 3 秒判断通過を狙うモダンシック
 *   デザイン。色面背景 + 大型タイポ + ミニマル幾何アイコンで構成。
 *
 * レイアウト (1080×1920):
 *   ┌────────────────────────────┐
 *   │ HIGHLIGHT 01/05    01_intro│  overline (top: 96, Manrope 800 28px)
 *   │ ─                          │  accent bar
 *   │                            │
 *   │      これを書いた人        │  hero (top: 280, NotoSansJP 900 132px)
 *   │      自治体土木職 退職者    │  lead (NotoSansJP 700 56px)
 *   │                            │
 *   │  • 技術士 (総合技術監理)   │  body (top: 720, NotoSansJP 500 38px)
 *   │  • 技術士 (建設部門)       │
 *   │  • 1 級土木施工管理技士    │
 *   │  ...                       │
 *   │                            │
 *   │  [chipCta →]               │  chip (NotoSansJP 700 34px)
 *   │                            │
 *   │  ☆ アイコン背景 (薄)       │  large icon at right, opacity 0.12
 *   │                            │  (sticker area: y >= 1280, blank)
 *   │                            │
 *   │  doboku-note               │  credit (Manrope 700 26px)
 *   └────────────────────────────┘
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { pickTitleSize } from './fit-title.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS = JSON.parse(
  readFileSync(
    resolve(__dirname, '../../../../.claude/knowledge/design-system/instagram-carousel-tokens.json'),
    'utf8',
  ),
);

const HS = TOKENS.highlightStories;
const INK = TOKENS.colors.ink;

// hero の 3 階層 (auto-fit 用)
const HERO_SIZES = {
  large:  HS.typography.hero,    // 132px, _maxLen: 7
  medium: HS.typography.heroMid, // 100px, _maxLen: 11
  small:  HS.typography.heroSm,  // 80px,  _maxLen: 16
};

// ─── helpers ──────────────────────────────────────────────────

function d(style, children) {
  const ch = Array.isArray(children) ? children.filter((c) => c != null) : (children ?? '');
  return { type: 'div', props: { style: { display: 'flex', ...style }, children: ch } };
}

function ty(name, overrides = {}) {
  const t = HS.typography[name];
  if (!t) return overrides;
  const out = {};
  if (t.fontFamily) out.fontFamily = t.fontFamily;
  if (t.weight != null) out.fontWeight = t.weight;
  if (t.size != null) out.fontSize = t.size;
  if (t.lineHeight != null) out.lineHeight = t.lineHeight;
  if (t.letterSpacing != null) out.letterSpacing = `${t.letterSpacing}em`;
  return { ...out, ...overrides };
}

function palette(slug) {
  return HS.palettes[slug] || HS.palettes['01_intro'];
}

function getIcon(slug) {
  return HS.icons[slug] || HS.icons['01_intro'];
}

// ─── レイアウト本体 ────────────────────────────────────────────

/**
 * 教材ハイライト + 5 種ハイライト用 Stories スライド。
 *
 * data: {
 *   highlightSlug: '01_intro' | '02_carousel-index' | ...,  // パレット選択キー
 *   index: number,           // 1-based
 *   _totalSlides: number,
 *   role: 'cover' | 'author' | ...,
 *   title?: string,
 *   subtitle?: string,
 *   body?: string[],
 *   items?: { label: string }[],
 *   chipCta?: string,
 *   tagText?: string,        // overline 行に表示 (例: 'まず読む')
 * }
 */
export function buildHighlightStoriesSlide({ width, height, data }) {
  const slug = data.highlightSlug || '01_intro';
  const pal = palette(slug);
  const icon = getIcon(slug);
  const total = data._totalSlides || 5;
  const index = data.index || 1;
  const overlineText = `HIGHLIGHT ${String(index).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  const tagText = data.tagText || '';
  const pad = HS.geometry.padding;
  const geo = HS.geometry;

  const centerChildren = [];

  // hero title (auto-fit: title の visualLength に応じて hero / heroMid / heroSm を自動選択)
  // 8 字以上の不適切改行を構造的に防ぐ。詳細: .claude/knowledge/reference/ig-highlight-design-policy.md §4
  let heroStyle = null;
  if (data.title) {
    heroStyle = pickTitleSize(data.title, HERO_SIZES);
    const heroTypography = {
      fontFamily: heroStyle.fontFamily,
      fontWeight: heroStyle.weight,
      fontSize: heroStyle.size,
      lineHeight: heroStyle.lineHeight,
      letterSpacing: heroStyle.letterSpacing != null ? `${heroStyle.letterSpacing}em` : undefined,
    };
    centerChildren.push(
      d({ ...heroTypography, color: INK.strong, marginBottom: 32 }, data.title),
    );
  }

  // lead subtitle
  if (data.subtitle) {
    centerChildren.push(
      d({ ...ty('lead', { color: INK.body, marginBottom: 56 }) }, data.subtitle),
    );
  }

  // body (箇条書き with accent dot)
  if (Array.isArray(data.body) && data.body.length > 0) {
    centerChildren.push(
      d(
        { flexDirection: 'column', gap: 20, marginBottom: 48 },
        data.body.map((line) =>
          d(
            { alignItems: 'flex-start', gap: 18 },
            [
              d({
                width: 14,
                height: 14,
                borderRadius: 999,
                background: pal.accent,
                marginTop: 24,
                flexShrink: 0,
              }),
              d({ ...ty('body', { color: INK.body, flex: 1 }) }, line),
            ],
          ),
        ),
      ),
    );
  }

  // items (chip カード)
  if (Array.isArray(data.items) && data.items.length > 0) {
    centerChildren.push(
      d(
        { flexDirection: 'column', gap: 14, marginBottom: 48 },
        data.items.map((item, i) => {
          const num = String(i + 1).padStart(2, '0');
          return d(
            {
              ...ty('body', { color: INK.strong }),
              background: '#FFFFFF',
              borderWidth: 1.5,
              borderStyle: 'solid',
              borderColor: pal.accentLight,
              borderRadius: 18,
              paddingTop: 20,
              paddingBottom: 20,
              paddingLeft: 26,
              paddingRight: 26,
              alignItems: 'center',
              gap: 18,
            },
            [
              d({ fontFamily: 'Manrope', fontWeight: 800, fontSize: 30, color: pal.accent }, num),
              d({ flexShrink: 1 }, item.label || ''),
            ],
          );
        }),
      ),
    );
  }

  // chipCta (pill)
  if (data.chipCta) {
    centerChildren.push(
      d(
        {
          ...ty('chip', { color: '#FFFFFF' }),
          alignSelf: 'flex-start',
          alignItems: 'center',
          background: pal.accent,
          borderRadius: geo.chipRadius,
          paddingTop: geo.chipPadding[0],
          paddingBottom: geo.chipPadding[0],
          paddingLeft: geo.chipPadding[1],
          paddingRight: geo.chipPadding[1],
          gap: 12,
        },
        [
          d({}, data.chipCta),
          d({ fontFamily: 'Manrope', fontWeight: 800, fontSize: 32 }, '→'),
        ],
      ),
    );
  }

  return d(
    {
      position: 'relative',
      display: 'flex',
      width: `${width}px`,
      height: `${height}px`,
      background: pal.bg,
      fontFamily: 'NotoSansJP',
      color: INK.strong,
      overflow: 'hidden',
    },
    [
      // 大型アイコン (背景装飾、薄く右上に)
      d(
        {
          position: 'absolute',
          top: 200,
          right: -40,
          fontFamily: 'Manrope',
          fontWeight: 800,
          fontSize: 480,
          lineHeight: 1,
          color: pal.accent,
          opacity: 0.08,
        },
        icon,
      ),

      // overline (top): HIGHLIGHT NN/MM + tagText
      d(
        {
          position: 'absolute',
          top: geo.overlineTop,
          left: pad.x,
          right: pad.x,
          flexDirection: 'column',
          gap: 18,
        },
        [
          d(
            { alignItems: 'center', justifyContent: 'space-between' },
            [
              d({ ...ty('overline', { color: pal.accent }) }, overlineText),
              tagText
                ? d(
                    {
                      ...ty('chip', { color: pal.accent }),
                      background: pal.accentLight,
                      borderRadius: 999,
                      paddingTop: 10,
                      paddingBottom: 10,
                      paddingLeft: 22,
                      paddingRight: 22,
                    },
                    tagText,
                  )
                : null,
            ],
          ),
          // accent bar
          d({
            width: geo.accentBarWidth,
            height: geo.accentBarHeight,
            background: pal.accent,
            borderRadius: geo.accentBarHeight / 2,
          }),
        ],
      ),

      // center hero + subtitle + body / items / chipCta
      d(
        {
          position: 'absolute',
          top: geo.heroTop,
          left: pad.x,
          right: pad.x,
          flexDirection: 'column',
        },
        centerChildren,
      ),

      // credit (右下)
      d(
        {
          position: 'absolute',
          bottom: pad.y,
          left: pad.x,
          right: pad.x,
          justifyContent: 'flex-end',
          alignItems: 'center',
        },
        [
          d(
            { ...ty('credit', { color: INK.muted }), alignItems: 'center', gap: 12 },
            [
              d({
                width: 22,
                height: 22,
                borderRadius: 999,
                background: pal.accent,
              }),
              d({}, 'doboku-note'),
            ],
          ),
        ],
      ),
    ],
  );
}
