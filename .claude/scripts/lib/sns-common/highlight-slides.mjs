/**
 * 教材ハイライト用 Stories スライドビルダー（v7.1）。
 *
 * 真実源: .claude/knowledge/design-system/instagram-carousel-tokens.json
 * 戦略: docs/project/03_SNS/01_SNS集客戦略.md v7.1 §2 Highlight 6 種目「教材」
 * ポリシー: .claude/knowledge/reference/ig-stories-policy.md §5 系統 C
 *
 * 6 枚構成（slide-data.json の slides[].role に対応）:
 *   1. cover     興味喚起・中立フレーミング「合格者の本棚」
 *   2. author    運営者の信頼性訴求
 *   3. essay     模範論文マガジン紹介
 *   4. readguide 精読ガイド紹介
 *   5. sample    無料記事サンプル誘導
 *   6. cta       着地点「迷ったらまず無料記事から」
 *
 * 全スライド共通レイアウト:
 *   - 1080×1920 (Stories サイズ)
 *   - topbar: 「教材紹介」chip + ページ番号 N/6
 *   - center: title + subtitle + body (role 別)
 *   - footer: brand-dot + "doboku-note"
 *
 * tokens.json を再利用するが、過去問パック用と意匠を揃えるため
 * quiz-slides.mjs と同じ helper を最小再実装している。
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS = JSON.parse(
  readFileSync(
    resolve(__dirname, '../../../../.claude/knowledge/design-system/instagram-carousel-tokens.json'),
    'utf8',
  ),
);

const C = TOKENS.colors;
const BRAND = C.brand.presets[C.brand.active] ?? C.brand.presets.default;
const SURFACE = C.surface;
const INK = C.ink;
const TY = TOKENS.typography;
const GEO = TOKENS.geometry;
const PAD = TOKENS.canvas.padding;

// ─── vDOM helpers ─────────────────────────────────────────────

function d(style, children) {
  const ch = Array.isArray(children) ? children.filter((c) => c != null) : (children ?? '');
  return { type: 'div', props: { style: { display: 'flex', ...style }, children: ch } };
}

function ls(em) {
  if (em == null) return undefined;
  return `${em}em`;
}

function ty(name, overrides = {}) {
  const t = TY[name];
  if (!t) return overrides;
  const out = {};
  if (t.fontFamily) out.fontFamily = t.fontFamily;
  if (t.weight != null) out.fontWeight = t.weight;
  if (t.size != null) out.fontSize = t.size;
  if (t.lineHeight != null) out.lineHeight = t.lineHeight;
  if (t.letterSpacing != null) out.letterSpacing = ls(t.letterSpacing);
  return { ...out, ...overrides };
}

function frame(width, height) {
  return {
    position: 'relative',
    display: 'flex',
    width: `${width}px`,
    height: `${height}px`,
    background: SURFACE.page,
    fontFamily: 'NotoSansJP',
    color: INK.strong,
    overflow: 'hidden',
  };
}

// ─── 共通パーツ（quiz-slides.mjs と同等の意匠） ───────────────

function tagChip(text) {
  return d(
    {
      ...ty('coverTag', { color: BRAND.deep, background: BRAND.tint, borderRadius: GEO.coverTag.radius }),
      paddingTop: GEO.coverTag.padding[0],
      paddingBottom: GEO.coverTag.padding[0],
      paddingLeft: GEO.coverTag.padding[1],
      paddingRight: GEO.coverTag.padding[1],
      alignItems: 'center',
      gap: 10,
    },
    [
      d({ width: 8, height: 8, borderRadius: 999, background: BRAND.primary }),
      d({}, text),
    ],
  );
}

function pageBadge(current, total) {
  return d(
    { ...ty('page', { color: INK.muted, whiteSpace: 'nowrap' }) },
    [
      d({ ...ty('pageBold', { color: INK.strong }) }, String(current).padStart(2, '0')),
      d({ marginLeft: 4, marginRight: 4 }, ' / '),
      d({}, String(total)),
    ],
  );
}

function topbar(left, right) {
  return d(
    {
      position: 'absolute',
      top: PAD.y,
      left: PAD.x,
      right: PAD.x,
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    [left, right],
  );
}

function brandDot() {
  return d(
    {
      position: 'relative',
      width: GEO.brand.dotSize,
      height: GEO.brand.dotSize,
      borderRadius: GEO.brand.dotRadius,
      background: BRAND.primary,
    },
    [
      d({
        position: 'absolute',
        top: GEO.brand.innerRingInset,
        left: GEO.brand.innerRingInset,
        right: GEO.brand.innerRingInset,
        bottom: GEO.brand.innerRingInset,
        borderWidth: GEO.brand.innerRingBorder,
        borderStyle: 'solid',
        borderColor: '#ffffff',
        borderRadius: 999,
      }),
      d({
        position: 'absolute',
        top: GEO.brand.centerDotInset,
        left: GEO.brand.centerDotInset,
        right: GEO.brand.centerDotInset,
        bottom: GEO.brand.centerDotInset,
        background: '#ffffff',
        borderRadius: 999,
      }),
    ],
  );
}

function brandFooter() {
  return d(
    {
      position: 'absolute',
      bottom: PAD.y,
      left: PAD.x,
      right: PAD.x,
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    [
      d({ alignItems: 'center', gap: 12 }, [
        brandDot(),
        d({ ...ty('brandName', { color: BRAND.primary }) }, 'doboku-note'),
      ]),
    ],
  );
}

function chipCta(text) {
  return d(
    {
      ...ty('coverSwipe', { color: BRAND.deep }),
      alignSelf: 'flex-start',
      alignItems: 'center',
      background: BRAND.tint,
      borderWidth: GEO.coverSwipeChip.borderWidth,
      borderStyle: 'solid',
      borderColor: BRAND.line,
      borderRadius: GEO.coverSwipeChip.radius,
      paddingTop: GEO.coverSwipeChip.padding[0],
      paddingBottom: GEO.coverSwipeChip.padding[0],
      paddingLeft: GEO.coverSwipeChip.padding[1],
      paddingRight: GEO.coverSwipeChip.padding[1],
      gap: GEO.coverSwipeChip.gap,
    },
    [
      d({}, text),
      d({ ...ty('coverSwipeArrow', { color: BRAND.primary }) }, '→'),
    ],
  );
}

// ─── レイアウト本体 ────────────────────────────────────────────

/**
 * 教材ハイライト用 Stories スライド（6 種統合）。
 *
 * data: {
 *   index: number,         // 1-6
 *   role: 'cover' | 'author' | 'essay' | 'readguide' | 'sample' | 'cta',
 *   title: string,
 *   subtitle?: string,
 *   body?: string[],       // 箇条書き（最大 4 行）
 *   items?: Array<{ label: string, magazineId?: string }>,  // essay でマガジン名一覧
 *   chipCta?: string,      // 下部 chip の文言（CTA 系スライド用）
 * }
 */
export function buildHighlightMaterial({ width, height, data }) {
  const total = data._totalSlides || 6;
  const index = data.index || 1;

  // 中央エリアの body 構築
  const centerChildren = [];

  // title（必須）
  if (data.title) {
    centerChildren.push(
      d({ ...ty('coverTitle', { color: INK.strong, marginBottom: 24 }) }, data.title),
    );
  }

  // subtitle（任意）
  if (data.subtitle) {
    centerChildren.push(
      d({ ...ty('coverSub', { color: INK.body, marginBottom: 40, paddingLeft: 0 }) }, data.subtitle),
    );
  }

  // body（任意・箇条書き）
  if (Array.isArray(data.body) && data.body.length > 0) {
    centerChildren.push(
      d(
        { flexDirection: 'column', gap: 18, marginBottom: 40 },
        data.body.map((line) =>
          d(
            { alignItems: 'flex-start', gap: 14 },
            [
              d({
                width: 12,
                height: 12,
                borderRadius: 999,
                background: BRAND.primary,
                marginTop: 16,
                flexShrink: 0,
              }),
              d({ ...ty('coverChip', { color: INK.body }) }, line),
            ],
          ),
        ),
      ),
    );
  }

  // items（任意・マガジン一覧）
  if (Array.isArray(data.items) && data.items.length > 0) {
    centerChildren.push(
      d(
        { flexDirection: 'column', gap: 14, marginBottom: 40 },
        data.items.map((item, i) => {
          const num = String(i + 1).padStart(2, '0');
          return d(
            {
              ...ty('coverChip', { color: INK.strong }),
              background: SURFACE.sunken,
              borderWidth: GEO.coverChip.borderWidth,
              borderStyle: 'solid',
              borderColor: SURFACE.line,
              borderRadius: GEO.coverChip.radius,
              paddingTop: GEO.coverChip.padding[0],
              paddingBottom: GEO.coverChip.padding[0],
              paddingLeft: GEO.coverChip.padding[1],
              paddingRight: GEO.coverChip.padding[1],
              alignItems: 'center',
              gap: 14,
            },
            [
              d({ ...ty('coverChipNum', { color: BRAND.primary }) }, num),
              d({ flexShrink: 1 }, item.label || ''),
            ],
          );
        }),
      ),
    );
  }

  // chipCta（任意・下部 CTA chip）
  if (data.chipCta) {
    centerChildren.push(chipCta(data.chipCta));
  }

  return d(frame(width, height), [
    // topbar: 教材紹介 chip + page badge
    topbar(tagChip(data.tagText || '教材紹介'), pageBadge(index, total)),

    // 大きな装飾文字（cover-big-q の代わりに本のアイコン的なギリシャ文字 "Β" を薄く配置）
    d(
      {
        position: 'absolute',
        top: 200,
        right: 40,
        ...ty('coverBigQ', { color: BRAND.tint }),
      },
      '¶',  // ¶ pilcrow（教材・読み物の象徴として）
    ),

    // center body
    d(
      {
        position: 'absolute',
        top: 360,
        left: PAD.x,
        right: PAD.x,
        flexDirection: 'column',
      },
      centerChildren,
    ),

    // footer
    brandFooter(),
  ]);
}
