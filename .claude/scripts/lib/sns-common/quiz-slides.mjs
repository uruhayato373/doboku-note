/**
 * 過去問クイズカルーセル スライド要素ビルダー（AIDesigner 新意匠）。
 *
 * 真実源: .claude/knowledge/design-system/instagram-carousel-tokens.json
 * 仕様書: .claude/knowledge/design-system/instagram-carousel.md
 *
 * 1080×1350 (IG Carousel) を主、1080×1920 (Reels) はレイアウト微調整で対応。
 *
 * 5 枚構成 → 10 枚構成へ拡張:
 *   cover / problem / answer (×4) / cta（quiz-pause は互換のため残置）
 *
 * Satori 制約への対応:
 *   - fontFamily は単一名 'Manrope' / 'NotoSansJP' を使用（複合スタックは Satori で解決不可）
 *   - letter-spacing は em 単位の文字列 ('0.04em' 等)
 *   - すべての flex コンテナに display: 'flex'
 *   - 重複した position absolute / left+right による配置
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { pickTitleSize } from './fit-title.mjs';
import { examColor } from '../../sns/lib/exam-palette.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS = JSON.parse(
  readFileSync(
    resolve(__dirname, '../../../../.claude/knowledge/design-system/instagram-carousel-tokens.json'),
    'utf8',
  ),
);

// ─── Token shortcuts ──────────────────────────────────────────

const C = TOKENS.colors;
const BRAND = C.brand.presets[C.brand.active] ?? C.brand.presets.default;
const SEM = C.semantic;
const SURFACE = C.surface;
const INK = C.ink;
const CTA = C.cta;
const ONDARK = C.onDark;
const TY = TOKENS.typography;

// coverTitle の 3 階層 (auto-fit 用)
const COVER_TITLE_SIZES = {
  large:  TY.coverTitle,    // 120px, _maxLen: 7
  medium: TY.coverTitleMid, // 90px,  _maxLen: 11
  small:  TY.coverTitleSm,  // 72px,  _maxLen: 16
};

/** ty() と同等の typography 展開を fit 結果に適用 */
function tyFit(fitStyle, overrides = {}) {
  const out = {};
  if (fitStyle.fontFamily) out.fontFamily = fitStyle.fontFamily;
  if (fitStyle.weight != null) out.fontWeight = fitStyle.weight;
  if (fitStyle.size != null) out.fontSize = fitStyle.size;
  if (fitStyle.lineHeight != null) out.lineHeight = fitStyle.lineHeight;
  if (fitStyle.letterSpacing != null) out.letterSpacing = `${fitStyle.letterSpacing}em`;
  return { ...out, ...overrides };
}
const GEO = TOKENS.geometry;
const PAD = TOKENS.canvas.padding;
const SLIDES = TOKENS.slides;

// ─── vDOM helpers ─────────────────────────────────────────────

function d(style, children) {
  const ch = Array.isArray(children) ? children.filter((c) => c != null) : (children ?? '');
  return {
    type: 'div',
    props: {
      style: { display: 'flex', ...style },
      children: ch,
    },
  };
}

function ls(em) {
  if (em == null) return undefined;
  return `${em}em`;
}

/** タイポグラフィトークンを Satori style に展開 */
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

function frame(width, height, bg) {
  return {
    position: 'relative',
    display: 'flex',
    width: `${width}px`,
    height: `${height}px`,
    background: bg || SURFACE.page,
    fontFamily: 'NotoSansJP',
    color: INK.strong,
    overflow: 'hidden',
  };
}

// canvas より大きい縦長キャンバス (reels 1080×1920) で中央寄せするためのラッパー。
// 1350 以下のときは children をそのまま返し、それ以外は (height-1350)/2 の余白を上下に分配する。
function reelsWrapper(width, height, children) {
  const yOffset = (height - TOKENS.canvas.height) / 2;
  if (yOffset <= 0) return children;
  return [
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          position: 'absolute',
          top: yOffset,
          left: 0,
          width: `${TOKENS.canvas.width}px`,
          height: `${TOKENS.canvas.height}px`,
        },
        children: Array.isArray(children) ? children : [children],
      },
    },
  ];
}

// ─── 共通パーツ ───────────────────────────────────────────────

/** ページ番号 "<b>03</b> / 10" */
function pageBadge(current, total, { onDark = false } = {}) {
  const muted = onDark ? ONDARK.tertiary : INK.muted;
  const strong = onDark ? ONDARK.primary : INK.strong;
  return d(
    {
      ...ty('page', { color: muted, whiteSpace: 'nowrap' }),
    },
    [
      d({ ...ty('pageBold', { color: strong }) }, String(current).padStart(2, '0')),
      d({ marginLeft: 4, marginRight: 4 }, ' / '),
      d({}, String(total)),
    ],
  );
}

/** eyebrow "PROBLEM 1 / 4" (Manrope 800 24px brand 色 + underline 3px brand) */
function eyebrow(text, { color = BRAND.primary, onDark = false } = {}) {
  return d(
    {
      ...ty('eyebrow', { color }),
      paddingTop: GEO.eyebrow.padding[0],
      paddingBottom: GEO.eyebrow.padding[0],
      borderBottomWidth: GEO.eyebrow.borderBottomWidth,
      borderBottomStyle: 'solid',
      borderBottomColor: onDark ? ONDARK.secondary : color,
      whiteSpace: 'nowrap',
    },
    text,
  );
}

/** topbar 共通レイアウト */
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

/** brand-dot（28×28 brand 色 + 同心円白装飾） */
function brandDot({ onDark = false } = {}) {
  const outer = onDark ? '#ffffff' : BRAND.primary;
  const inner = onDark ? CTA.background : '#ffffff';
  return d(
    {
      position: 'relative',
      width: GEO.brand.dotSize,
      height: GEO.brand.dotSize,
      borderRadius: GEO.brand.dotRadius,
      background: outer,
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
        borderColor: inner,
        borderRadius: 999,
      }),
      d({
        position: 'absolute',
        top: GEO.brand.centerDotInset,
        left: GEO.brand.centerDotInset,
        right: GEO.brand.centerDotInset,
        bottom: GEO.brand.centerDotInset,
        background: inner,
        borderRadius: 999,
      }),
    ],
  );
}

/** brand footer。rightText が falsy なら右側を描画しない（URL 重複を避ける） */
function brandFooter(rightText, { onDark = false } = {}) {
  const nameColor = onDark ? ONDARK.primary : BRAND.primary;
  const urlColor = onDark ? ONDARK.tertiary : INK.muted;
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
        brandDot({ onDark }),
        d({ ...ty('brandName', { color: nameColor }) }, 'doboku-note'),
      ]),
      rightText
        ? d({ ...ty('brandUrl', { color: urlColor, whiteSpace: 'nowrap' }) }, rightText)
        : null,
    ],
  );
}

// ─── cover ────────────────────────────────────────────────────

/**
 * quiz-cover スライド
 *
 * data: {
 *   title: string,       // 管理名 (例: '経済性管理')
 *   subtitle?: string,   // サブ (例: 'R07 4問パック' / '品質・コスト・工程改善の頻出論点')
 *   sectionTag?: string, // セクション (例: '2 経済性管理')
 *   pageIndex?: number,
 *   totalPages?: number,
 *   chips?: string[],    // 4問のタイトル予告（任意。無ければ非表示）
 *   year?: string,       // 'R07' 等。meta テンプレ {year} ／ 4問パック の置換用
 * }
 */
// ─── summary（年度目次カルーセル） ─────────────────────────

/**
 * summary-cover: 年度目次カルーセルの 1 枚目（タイトル）
 * data: { year: 'r07', totalPacks: 9, totalQuestions: 36 }
 */
export function buildSummaryCover({ width, height, data }) {
  const year = (data.year || 'r07').toUpperCase();
  const yearJp = year.replace(/^[RH]/, (m) => m === 'R' ? '令和' : '平成').replace(/^令和0?/, '令和');
  return d(frame(width, height, SURFACE.page), reelsWrapper(width, height, [
    topbar(
      d({
        ...ty('coverTag', { color: BRAND.deep, background: BRAND.tint, borderRadius: GEO.coverTag.radius }),
        paddingTop: GEO.coverTag.padding[0], paddingBottom: GEO.coverTag.padding[0],
        paddingLeft: GEO.coverTag.padding[1], paddingRight: GEO.coverTag.padding[1],
        alignItems: 'center', gap: 10,
      }, [
        d({ width: 8, height: 8, borderRadius: 999, background: BRAND.primary }),
        d({}, '総監過去問 目次'),
      ]),
      pageBadge(data.pageIndex ?? 1, data.totalPages ?? 5),
    ),
    d({ position: 'absolute', top: 200, right: 40, ...ty('coverBigQ', { color: BRAND.tint }) }, '目'),
    d({
      position: 'absolute', top: 320, left: PAD.x, right: PAD.x,
      flexDirection: 'column', gap: 0,
    }, [
      d({ ...ty('coverMeta', { color: BRAND.primary, marginBottom: 20 }) }, `${year} 全${data.totalPacks ?? 9}パック`),
      d({ ...tyFit(pickTitleSize(yearJp + '年度', COVER_TITLE_SIZES), { color: INK.strong, marginBottom: 24 }) }, yearJp + '年度'),
      d({ ...ty('coverSub', { color: INK.body, marginBottom: 48, paddingLeft: 24 }) }, '択一式 過去問 目次'),
      d({
        ...ty('coverSwipe', { color: BRAND.deep }), marginTop: 40, alignSelf: 'flex-start',
        alignItems: 'center', background: BRAND.tint,
        borderWidth: GEO.coverSwipeChip.borderWidth, borderStyle: 'solid', borderColor: BRAND.line,
        borderRadius: GEO.coverSwipeChip.radius,
        paddingTop: GEO.coverSwipeChip.padding[0], paddingBottom: GEO.coverSwipeChip.padding[0],
        paddingLeft: GEO.coverSwipeChip.padding[1], paddingRight: GEO.coverSwipeChip.padding[1],
        gap: GEO.coverSwipeChip.gap,
      }, [
        d({}, '全パックを一覧チェック'),
        d({ ...ty('coverSwipeArrow', { color: BRAND.primary }) }, '→'),
      ]),
    ]),
    brandFooter(null),
  ]));
}

/**
 * summary-pack-list: 年度目次カルーセルの中間ページ（パック一覧）
 * data: { packs: [{ num, title, subtitle }], pageIndex, totalPages }
 */
export function buildSummaryPackList({ width, height, data }) {
  const packs = Array.isArray(data.packs) ? data.packs : [];
  const titleText = data.title || `R${(data.year || 'r07').replace(/^r0?/, '')} 過去問 パック一覧`;
  return d(frame(width, height, SURFACE.page), reelsWrapper(width, height, [
    topbar(
      eyebrow(`INDEX ${data.pageIndex ?? 2} / ${data.totalPages ?? 5}`),
      pageBadge(data.pageIndex ?? 2, data.totalPages ?? 5),
    ),
    d({
      position: 'absolute', top: PAD.y + 96, left: PAD.x, right: PAD.x, bottom: PAD.y + 80,
      flexDirection: 'column', gap: 24,
    }, [
      d({ ...ty('qText', { color: INK.strong, fontSize: 36, lineHeight: 1.3 }) }, titleText),
      d({ flexDirection: 'column', gap: 14, flexGrow: 1 }, packs.map((p) => d({
        background: SURFACE.sunken,
        borderWidth: 1.5, borderStyle: 'solid', borderColor: SURFACE.line,
        borderRadius: 14, paddingTop: 18, paddingBottom: 18, paddingLeft: 22, paddingRight: 22,
        alignItems: 'center', gap: 16,
      }, [
        d({
          width: 64, height: 64, borderRadius: 999, background: BRAND.primary,
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Manrope', fontWeight: 800, fontSize: 30, color: '#ffffff',
          flexShrink: 0,
        }, `#${p.num}`),
        d({ flexDirection: 'column', flexShrink: 1, gap: 4 }, [
          d({ ...ty('optText', { color: INK.strong, fontSize: 24, fontWeight: 700 }) }, p.title || '—'),
          p.subtitle ? d({ ...ty('exText', { color: INK.body, fontSize: 20 }) }, p.subtitle) : null,
        ]),
      ]))),
    ]),
    brandFooter(null),
  ]));
}

/**
 * summary-cta: 年度目次カルーセルの最後（フィード誘導）
 */
export function buildSummaryCta({ width, height, data }) {
  const year = (data.year || 'r07').toUpperCase();
  return d(frame(width, height, CTA.background), reelsWrapper(width, height, [
    d({ position: 'absolute', top: GEO.ctaDecor.topRight.offset[0], right: GEO.ctaDecor.topRight.offset[1], width: GEO.ctaDecor.topRight.size, height: GEO.ctaDecor.topRight.size, borderRadius: 999, background: CTA.decor }),
    d({ position: 'absolute', bottom: GEO.ctaDecor.bottomLeft.offset[0], left: GEO.ctaDecor.bottomLeft.offset[1], width: GEO.ctaDecor.bottomLeft.size, height: GEO.ctaDecor.bottomLeft.size, borderRadius: 999, background: CTA.decor }),
    topbar(
      d({ ...ty('ctaEyebrow', { color: ONDARK.secondary }), whiteSpace: 'nowrap' }, 'CHECK ALL'),
      pageBadge(data.pageIndex ?? 5, data.totalPages ?? 5, { onDark: true }),
    ),
    d({
      position: 'absolute', top: PAD.y + 96, left: PAD.x, right: PAD.x, bottom: PAD.y + 80,
      flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 24, textAlign: 'center',
    }, [
      d({ ...ty('ctaHello', { color: ONDARK.secondary }) }, '気になるパックは'),
      d({ flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }, [
        d({ ...ty('ctaHeadline', { color: ONDARK.primary }), alignItems: 'center' }, [
          d({ color: CTA.accent }, year),
          d({}, ' の'),
        ]),
        d({ ...ty('ctaHeadline', { color: ONDARK.primary }) }, '個別投稿を見る'),
      ]),
      d({
        background: SURFACE.page, borderRadius: GEO.ctaAction.radius,
        paddingTop: GEO.ctaAction.padding[0], paddingBottom: GEO.ctaAction.padding[0],
        paddingLeft: GEO.ctaAction.padding[1], paddingRight: GEO.ctaAction.padding[1],
        minWidth: GEO.ctaAction.minWidth, alignItems: 'center', justifyContent: 'center', gap: GEO.ctaAction.gap,
        marginTop: 36,
      }, [
        d({
          width: GEO.ctaAction.iconSize, height: GEO.ctaAction.iconSize,
          borderRadius: GEO.ctaAction.iconRadius, background: BRAND.primary,
          alignItems: 'center', justifyContent: 'center',
          fontSize: 40, fontWeight: 800, color: '#ffffff', fontFamily: 'Manrope',
        }, '→'),
        d({ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }, [
          d({ ...ty('ctaActionTitle', { color: BRAND.primary }) }, 'プロフィールから'),
          d({ ...ty('ctaActionSub', { color: INK.strong }) }, '各パックをチェック'),
        ]),
      ]),
    ]),
    brandFooter(null, { onDark: true }),
  ]));
}

export function buildQuizCover({ width, height, data }) {
  // 管理混在問題を回避するため、cover-title は固定 2 行文言（tokens 駆動）。
  // slide-data.json の cover.title / subtitle は無視。pack 番号は titleLine2 の末尾に
  // 80px で大きく表示（ユーザーが一目で「過去問 #N」と認識できる位置）。
  const year = data.year ?? data._meta?.year ?? 'r07';
  const packNum = data.packNum ?? data._meta?.packNum ?? '01';
  const packNumLabel = String(packNum).replace(/^0+/, '') || packNum;
  // year は "r07" / "h28" 等。先頭の r/R/h/H と 0 を剥がして年番号だけ取り出す
  const yearN = String(year).replace(/^[rRhH]0?/, '') || '7';
  const titleLine1 = (SLIDES.cover.titleLine1Template || SLIDES.cover.titleLine1 || '令和{yearN}年度')
    .replace('{yearN}', yearN);
  const titleLine2 = (SLIDES.cover.titleLine2Template || '択一式 過去問 #{packNum}')
    .replace('{packNum}', packNumLabel);
  const metaText = (SLIDES.cover.metaTemplate || '{year} 4問パック')
    .replace('{year}', year.toUpperCase())
    .replace('{packNum}', packNumLabel);
  const chips = Array.isArray(data.chips) ? data.chips.slice(0, 4) : [];

  // 3 フォーマット別に swipeText 分岐
  // - Stories: data.mode === 'stories' を最優先（Reels と同サイズなため mode 明示が必要）
  //            1 問抜粋試食なので「まずは1問やってみる」相当
  // - Reels:   height >= 1920 で自動判定。スワイプではなく自動再生のため「答えは動画内で発表」
  // - Carousel: 既定。4 問スワイプ前提なので「スワイプで4問にチャレンジ」
  const isStories = data.mode === 'stories';
  const isReels = !isStories && height >= 1920;
  const swipeText = isStories
    ? (SLIDES.cover.swipeTextStories ?? SLIDES.cover.swipeText)
    : isReels
      ? (SLIDES.cover.swipeTextReels ?? SLIDES.cover.swipeText)
      : SLIDES.cover.swipeText;

  return d(frame(width, height, SURFACE.page), reelsWrapper(width, height, [
    // topbar
    topbar(
      d(
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
          d({}, SLIDES.cover.tagText),
        ],
      ),
      pageBadge(data.pageIndex ?? 1, data.totalPages ?? 10),
    ),

    // cover-big-q（装飾、画面内に 40px 余白を確保して切れて見えないように）
    d(
      {
        position: 'absolute',
        top: 200,
        right: 40,
        ...ty('coverBigQ', { color: BRAND.tint }),
      },
      SLIDES.cover.bigQText,
    ),

    // cover-body（中央配置）
    d(
      {
        position: 'absolute',
        top: 320,
        left: PAD.x,
        right: PAD.x,
        flexDirection: 'column',
        gap: 0,
      },
      [
        d({ ...ty('coverMeta', { color: BRAND.primary, marginBottom: 20 }) }, metaText),
        // 2 行構成（管理名混在を避けるための統一タイトル）
        // 1 行目「令和7年度」120px 900、2 行目「択一式 過去問」80px 700 を左インデント 24px で階層感
        // auto-fit: titleLine1 の visualLength で coverTitle/Mid/Sm を自動分岐（fit-title.mjs）
        d({ ...tyFit(pickTitleSize(titleLine1, COVER_TITLE_SIZES), { color: INK.strong, marginBottom: 24 }) }, titleLine1),
        d({ ...ty('coverSub', { color: INK.body, marginBottom: 48, paddingLeft: 24 }) }, titleLine2),
        chips.length
          ? d(
              {
                flexDirection: 'column',
                gap: 14,
              },
              // 2x2 グリッド: 2 行 × 2 列。flex で row 2 つ。
              [0, 2].map((rowStart) =>
                d({ gap: 14 }, chips.slice(rowStart, rowStart + 2).map((chip, i) => {
                  const num = String(rowStart + i + 1).padStart(2, '0');
                  return d(
                    {
                      flex: '1 1 0',
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
                      gap: 12,
                    },
                    [
                      d({ ...ty('coverChipNum', { color: BRAND.primary }) }, num),
                      d({ flexShrink: 1 }, chip),
                    ],
                  );
                })),
              ),
            )
          : null,
        // cover-swipe を chip 化（pill 形状 + brand-tint 背景 + 大きめ矢印）
        d(
          {
            ...ty('coverSwipe', { color: BRAND.deep }),
            marginTop: 56,
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
            d({}, swipeText),
            d({ ...ty('coverSwipeArrow', { color: BRAND.primary }) }, '→'),
          ],
        ),
      ],
    ),

    // cover の右下は空白（左下のウォーターマークと URL が重複するため）
    brandFooter(null),
  ]));
}

// ─── problem ──────────────────────────────────────────────────

/**
 * 表ビルダー（汎用）
 * table: { headers: string[], rows: string[][] }
 * Satori vDOM の flex grid で罫線付きの表を描画する。
 */
function buildTable(table, scale = 1) {
  const headers = Array.isArray(table?.headers) ? table.headers : [];
  const rows = Array.isArray(table?.rows) ? table.rows : [];
  const colCount = headers.length;
  if (!colCount) return null;

  // scale < 1 は問題スライドが ultra でも収まらない場合の表圧縮（フォント/余白/行高）。
  const r = (v) => Math.round(v * scale);
  const headerMinH = r(GEO.table.headerMinHeight);
  const rowMinH = r(GEO.table.rowMinHeight);
  const headerPadV = r(GEO.table.headerPadding[0]);
  const headerPadH = r(GEO.table.headerPadding[1]);
  const cellPadV = r(GEO.table.cellPadding[0]);
  const cellPadH = r(GEO.table.cellPadding[1]);
  const headerFont = r(TY.tableHeader.size);
  const cellFont = r(TY.tableCell.size);

  const cellBorderRight = (idx) =>
    idx === colCount - 1
      ? {}
      : {
          borderRightWidth: GEO.table.borderWidth,
          borderRightStyle: 'solid',
          borderRightColor: SURFACE.line,
        };

  const headerRow = d(
    {
      background: SURFACE.sunken,
      minHeight: headerMinH,
    },
    headers.map((h, i) =>
      d(
        {
          flex: 1,
          paddingTop: headerPadV,
          paddingBottom: headerPadV,
          paddingLeft: headerPadH,
          paddingRight: headerPadH,
          alignItems: 'center',
          justifyContent: 'center',
          ...cellBorderRight(i),
          ...ty('tableHeader', { color: INK.body, fontSize: headerFont }),
        },
        String(h),
      ),
    ),
  );

  const dataRows = rows.map((row) =>
    d(
      {
        borderTopWidth: GEO.table.borderWidth,
        borderTopStyle: 'solid',
        borderTopColor: SURFACE.line,
        minHeight: rowMinH,
      },
      row.map((cell, ci) =>
        d(
          {
            flex: 1,
            paddingTop: cellPadV,
            paddingBottom: cellPadV,
            paddingLeft: cellPadH,
            paddingRight: cellPadH,
            alignItems: 'center',
            justifyContent: 'center',
            ...cellBorderRight(ci),
            ...ty('tableCell', { color: INK.strong, fontSize: cellFont }),
          },
          String(cell ?? ''),
        ),
      ),
    ),
  );

  return d(
    {
      flexDirection: 'column',
      background: SURFACE.page,
      borderWidth: GEO.table.borderWidth,
      borderStyle: 'solid',
      borderColor: SURFACE.line,
      borderRadius: GEO.table.radius,
      overflow: 'hidden',
      flexShrink: 0,
    },
    [headerRow, ...dataRows],
  );
}

/**
 * 箇条書きリスト群ビルダー（汎用）
 * lists: [{ items: string[] }] — 複数リスト並列対応（例: 用語リスト + 事例リスト）
 * 各リストは sunken 背景のカードとして描画される。
 */
function buildLists(lists) {
  if (!Array.isArray(lists) || lists.length === 0) return null;
  return d(
    {
      flexDirection: 'column',
      gap: GEO.lists.groupGap,
    },
    lists.map((list) => {
      const items = Array.isArray(list?.items) ? list.items : [];
      if (!items.length) return null;
      return d(
        {
          flexDirection: 'column',
          gap: GEO.lists.itemGap,
          background: SURFACE.sunken,
          borderWidth: GEO.lists.borderWidth,
          borderStyle: 'solid',
          borderColor: SURFACE.line,
          borderRadius: GEO.lists.radius,
          paddingTop: GEO.lists.padding[0],
          paddingBottom: GEO.lists.padding[0],
          paddingLeft: GEO.lists.padding[1],
          paddingRight: GEO.lists.padding[1],
        },
        items.map((item) =>
          d({ ...ty('listItem', { color: INK.strong }) }, String(item)),
        ),
      );
    }).filter(Boolean),
  );
}

/** 行数推定（HTML プロトの opt は wrap 2 行までを前提） */
function isDenseOptions(options) {
  const long = options.some((o) => [...(o.text || '')].length > 60);
  const total = options.reduce((s, o) => s + [...(o.text || '')].length, 0);
  return long || total > 250;
}

// ── problem スライドの推定高さ（圧縮モード自動エスカレーション用） ──────────
// 文字数の単純閾値では「本文 + 表 + 折返し選択肢」の合算高さを捉えきれず、
// 選択肢が極短い長文（normal すり抜け）や 表+長い5択（compact 超過）がはみ出す。
// 各モードの本文/表/リスト/選択肢の折返しを概算し、コンテンツ領域に収まる
// 最大モードを選ぶ。表/リストは圧縮モードに依らず固定サイズ（tableCell/listItem）。
const PROBLEM_AVAIL_H = TOKENS.canvas.height - (PAD.y + 96) - (PAD.y + 80); // = 1014
const PROBLEM_SAFE_H = PROBLEM_AVAIL_H - 34;                                // 安全マージン
const PROBLEM_INNER_W = TOKENS.canvas.width - PAD.x * 2;                    // = 936
const PROBLEM_MODE_ORDER = ['normal', 'dense', 'compact', 'ultra'];
const PROBLEM_MODE_PARAMS = {
  normal:  { qSize: 44, qLh: 1.45, optSize: 26, optLh: 1.5, optMinH: 96, optPadV: 22, optPadH: 26, optGap: 14, blockGap: 36 },
  dense:   { qSize: 36, qLh: 1.40, optSize: 24, optLh: 1.5, optMinH: 84, optPadV: 14, optPadH: 22, optGap: 12, blockGap: 26 },
  compact: { qSize: 30, qLh: 1.35, optSize: 24, optLh: 1.5, optMinH: 76, optPadV: 12, optPadH: 22, optGap: 10, blockGap: 18 },
  ultra:   { qSize: 26, qLh: 1.30, optSize: 22, optLh: 1.4, optMinH: 68, optPadV: 10, optPadH: 20, optGap: 8,  blockGap: 14 },
};

function estimateProblemHeight(mode, { bodyChars, options, table, lists, hasTopic, tableScale = 1 }) {
  const m = PROBLEM_MODE_PARAMS[mode];
  const bodyCpl = Math.max(1, Math.floor(PROBLEM_INNER_W / m.qSize));
  const bodyH = Math.ceil(bodyChars / bodyCpl) * m.qSize * m.qLh;
  const rows = table && Array.isArray(table.rows) ? table.rows.length : 0;
  // 行高は minHeight ではなく実セル高（フォント×行間 + 上下余白）で見積もる。
  // tableScale でフォント/余白/行高が一括縮小される（buildTable と整合）。
  const rowH = Math.max(GEO.table.rowMinHeight * tableScale,
    TY.tableCell.size * tableScale * 1.25 + GEO.table.cellPadding[0] * tableScale * 2) + GEO.table.borderWidth;
  const headH = Math.max(GEO.table.headerMinHeight * tableScale,
    TY.tableHeader.size * tableScale * 1.25 + GEO.table.headerPadding[0] * tableScale * 2);
  const tableH = rows > 0 ? (headH + rows * rowH + 6) : 0;
  let listsH = 0, groups = 0;
  if (Array.isArray(lists)) {
    for (const g of lists) {
      const items = Array.isArray(g?.items) ? g.items.length : 0;
      if (!items) continue;
      groups++;
      const lh = TY.listItem.lineHeight || 1.45;
      listsH += GEO.lists.padding[0] * 2 + items * TY.listItem.size * lh + (items - 1) * GEO.lists.itemGap;
    }
    if (groups > 1) listsH += (groups - 1) * GEO.lists.groupGap;
  }
  const opts = (options || []).slice(0, 5);
  const optTextW = PROBLEM_INNER_W - GEO.opt.numColWidth - m.optPadH * 2;
  const optCpl = Math.max(1, Math.floor(optTextW / m.optSize));
  let optionsH = 0;
  for (const o of opts) {
    const lines = Math.max(1, Math.ceil([...(o.text || '')].length / optCpl));
    optionsH += Math.max(m.optMinH, lines * m.optSize * m.optLh + m.optPadV * 2);
  }
  if (opts.length > 1) optionsH += (opts.length - 1) * m.optGap;
  const qGaps = (1 + (hasTopic ? 1 : 0) + (listsH > 0 ? 1 : 0) + (tableH > 0 ? 1 : 0) - 1) * 14;
  const topicH = hasTopic ? 40 : 0;
  return bodyH + qGaps + tableH + listsH + topicH + (opts.length > 0 ? m.blockGap : 0) + optionsH;
}

/**
 * quiz-problem スライド
 *
 * data: {
 *   bodyLines: string[],
 *   options: [{ num: number, text: string }],
 *   qNum: number,
 *   totalQ: number,
 *   topic?: string,    // q-label の主題（任意）
 *   pageIndex?: number,
 *   totalPages?: number,
 * }
 */
// problem スライドの本文を抽出（bodyLines を結合し markdown 表残骸/区切り行を除外）。
// 旧データ互換 — 新規データは表は data.table、列挙は data.lists に構造化する。
export function parseProblemBody(data) {
  const rawLines = Array.isArray(data.bodyLines) ? data.bodyLines : [String(data.body || '')];
  return rawLines
    .flatMap((l) => l.split(/\r?\n/))
    .filter((l) => {
      const t = l.trim();
      if (!t) return false;
      if (t.includes('|')) return false;      // markdown 表残骸
      if (/^[-:]+$/.test(t)) return false;     // 区切り行（--- :--- など）
      return true;
    })
    .join('');
}

// 圧縮モード + 表スケールを決定する単一真実源。レンダラー(buildQuizProblem)と
// lint(lint-exam-pack-structure.mjs E3)が共有し、生成物と検査を一致させる。
//   ① 文字数で「上限モード」(最大フォント)を決める（成長させない）
//   ② 推定高さがコンテンツ領域(1014px)を超える間テキストを ultra まで縮小
//   ③ ultra でもなお超える場合のみ表を段階圧縮（×0.85/0.72/0.62）
// fits=false は「最大圧縮でも収まらない＝本文/表行数を削るべき」を意味する。
export function chooseProblemLayout(data) {
  const fullBody = parseProblemBody(data);
  const bodyChars = [...fullBody].length;
  const options = (data.options || []).slice(0, 5);
  const optChars = options.reduce((s, o) => s + [...(o.text || '')].length, 0);
  const optMax = Math.max(0, ...options.map((o) => [...(o.text || '')].length));
  const totalContent = bodyChars + optChars;
  const hasLists = Array.isArray(data.lists) && data.lists.some((g) => (g?.items || []).length);
  const ceilUltra = totalContent > 700 || bodyChars > 430;
  const ceilCompact = !ceilUltra && (!!data.table || hasLists || totalContent > 550 || bodyChars > 255 || optMax > 100);
  const ceilDense = !ceilUltra && !ceilCompact && (isDenseOptions(options) || totalContent > 320 || bodyChars > 140 || optMax > 60);
  let modeIdx = ceilUltra ? 3 : ceilCompact ? 2 : ceilDense ? 1 : 0;
  let tableScale = 1;
  const ctx = { bodyChars, options, table: data.table, lists: data.lists, hasTopic: !!data.topic };
  while (modeIdx < 3 && estimateProblemHeight(PROBLEM_MODE_ORDER[modeIdx], { ...ctx, tableScale }) > PROBLEM_SAFE_H) modeIdx++;
  const TABLE_SCALE_STEPS = [0.85, 0.72, 0.62];
  for (let i = 0; i < TABLE_SCALE_STEPS.length
    && estimateProblemHeight(PROBLEM_MODE_ORDER[modeIdx], { ...ctx, tableScale }) > PROBLEM_SAFE_H; i++) {
    tableScale = TABLE_SCALE_STEPS[i];
  }
  const estHeight = Math.round(estimateProblemHeight(PROBLEM_MODE_ORDER[modeIdx], { ...ctx, tableScale }));
  return {
    mode: PROBLEM_MODE_ORDER[modeIdx], modeIdx, tableScale, fullBody,
    estHeight, avail: PROBLEM_AVAIL_H, fits: estHeight <= PROBLEM_AVAIL_H,
  };
}

export function buildQuizProblem({ width, height, data }) {
  const layout = chooseProblemLayout(data);
  const { fullBody, tableScale } = layout;
  const isUltra = layout.modeIdx === 3;
  const isCompact = layout.modeIdx === 2;
  const isDense = layout.modeIdx === 1;
  if (!layout.fits) {
    console.warn(`[quiz-slides] problem overflow risk: Q${data.qNum ?? '?'} est=${layout.estHeight}px > ${layout.avail}px (mode=${layout.mode}, tableScale=${tableScale}) — 本文/表行数を削減してください`);
  }
  const listsEl = data.lists ? buildLists(data.lists) : null;
  const options = (data.options || []).slice(0, 5);
  const tableEl = data.table ? buildTable(data.table, tableScale) : null;

  const optTextStyle = isUltra
    ? ty('optTextDense', { fontSize: 22, lineHeight: 1.4 })
    : (isCompact || isDense ? ty('optTextDense') : ty('optText'));
  const optMinHeight = isUltra ? 68 : (isCompact ? 76 : (isDense ? 84 : GEO.opt.minHeight));
  const optTextPadding = isUltra ? [10, 20] : (isCompact ? [12, 22] : (isDense ? [14, 22] : GEO.opt.textPadding));
  const optionsGap = isUltra ? 8 : (isCompact ? 10 : (isDense ? 12 : 14));
  const blockGap = isUltra ? 14 : (isCompact ? 18 : (isDense ? 26 : 36));
  const qTextStyle = isUltra
    ? ty('qText', { color: INK.strong, fontSize: 26, lineHeight: 1.3 })
    : isCompact
    ? ty('qText', { color: INK.strong, fontSize: 30, lineHeight: 1.35 })
    : isDense
    ? ty('qText', { color: INK.strong, fontSize: 36, lineHeight: 1.4 })
    : ty('qText', { color: INK.strong });

  return d(frame(width, height, SURFACE.page), reelsWrapper(width, height, [
    topbar(
      // YT（単発1問動画）は「1 / 4」が誤誘導になるため番号を出さない。IG カルーセル/リールのみ通し番号。
      eyebrow(data.ytMode ? 'PROBLEM' : `PROBLEM ${data.qNum ?? 1} / ${data.totalQ ?? 4}`),
      // YT はパック内ページ概念がないため「N / 10」を出さない（IG 専用チャーム）。
      data.ytMode ? null : pageBadge(data.pageIndex ?? 2, data.totalPages ?? 10),
    ),

    d(
      {
        position: 'absolute',
        top: PAD.y + 96,
        left: PAD.x,
        right: PAD.x,
        bottom: PAD.y + 80,
        flexDirection: 'column',
        gap: blockGap,
      },
      [
        // q-block (+ table があれば挿入)
        d({ flexDirection: 'column', gap: 14 }, [
          data.topic
            ? d({ ...ty('qLabel', { color: INK.body }), alignItems: 'center', gap: 12 }, [
                d(
                  {
                    ...ty('qTag', { color: '#ffffff', background: BRAND.primary }),
                    borderRadius: GEO.qTag.radius,
                    paddingTop: GEO.qTag.padding[0],
                    paddingBottom: GEO.qTag.padding[0],
                    paddingLeft: GEO.qTag.padding[1],
                    paddingRight: GEO.qTag.padding[1],
                  },
                  SLIDES.problem.qTagText,
                ),
                d({}, data.topic),
              ])
            : null,
          d(qTextStyle, fullBody),
          listsEl,
          tableEl,
        ]),

        // options
        d({ flexDirection: 'column', gap: optionsGap }, options.map((opt) =>
          d(
            {
              minHeight: optMinHeight,
              background: SURFACE.page,
              borderWidth: GEO.opt.borderWidth,
              borderStyle: 'solid',
              borderColor: SURFACE.line,
              borderRadius: GEO.opt.radius,
              overflow: 'hidden',
            },
            [
              d(
                {
                  width: GEO.opt.numColWidth,
                  background: SURFACE.sunken,
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...ty('optNum', { color: BRAND.primary }),
                  borderRightWidth: GEO.opt.borderWidth,
                  borderRightStyle: 'solid',
                  borderRightColor: SURFACE.line,
                },
                String(opt.num),
              ),
              d(
                {
                  flex: 1,
                  ...optTextStyle,
                  color: INK.strong,
                  paddingTop: optTextPadding[0],
                  paddingBottom: optTextPadding[0],
                  paddingLeft: optTextPadding[1],
                  paddingRight: optTextPadding[1],
                  alignItems: 'center',
                },
                opt.text || '',
              ),
            ],
          ),
        )),
      ],
    ),

    // problem だけ右下に「次ページで解答 →」を出す（誘導テキスト）。YT は単発動画でスワイプ概念がないため出さない。
    brandFooter(data.ytMode ? null : SLIDES.problem.nextText),
  ]));
}

// ─── pause（互換維持、新意匠では使われない） ─────────────────

export function buildQuizPause({ width, height, data }) {
  return d(frame(width, height, SURFACE.sunken), reelsWrapper(width, height, [
    pageBadge(data.pageIndex ?? 3, data.totalPages ?? 10),
    d(
      {
        position: 'absolute',
        top: 0, bottom: 0, left: 0, right: 0,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 40,
      },
      [
        d({ fontSize: 180, fontWeight: 800, color: BRAND.primary, fontFamily: 'Manrope' }, '▷'),
        d({ ...ty('qText', { color: INK.strong }) }, data.headline || '考えてみよう'),
        d({ ...ty('optText', { color: INK.body }) }, data.subhead || 'スワイプで答え合わせ →'),
      ],
    ),
  ]));
}

// ─── answer ───────────────────────────────────────────────────

/**
 * quiz-answer スライド
 *
 * data: {
 *   correctNum: number,                       // 正答番号 (1-5)
 *   correctText: string,                      // 正答の主題（a-hero title）例: '品質管理の統計的手法'
 *   optionExplanations: [{ num, correct, text }], // 5 択それぞれの正誤と理由
 *   pointText: string,                        // a-point 本文（ここがポイント）
 *   qNum: number,
 *   totalQ: number,
 *   pageIndex?: number,
 *   totalPages?: number,
 * }
 */
export function buildQuizAnswer({ width, height, data }) {
  const exRows = Array.isArray(data.optionExplanations)
    ? data.optionExplanations.slice(0, 5)
    : [];

  return d(frame(width, height, SURFACE.page), reelsWrapper(width, height, [
    topbar(
      eyebrow(data.ytMode ? 'ANSWER' : `ANSWER ${data.qNum ?? 1} / ${data.totalQ ?? 4}`),
      data.ytMode ? null : pageBadge(data.pageIndex ?? 3, data.totalPages ?? 10),
    ),

    d(
      {
        position: 'absolute',
        top: PAD.y + 96,
        left: PAD.x,
        right: PAD.x,
        bottom: PAD.y + 80,
        flexDirection: 'column',
        gap: 22,
      },
      [
        // a-hero
        d(
          {
            background: SEM.correct.tint,
            borderWidth: GEO.aHero.borderWidth,
            borderStyle: 'solid',
            borderColor: SEM.correct.line,
            borderRadius: GEO.aHero.radius,
            paddingTop: GEO.aHero.padding[0],
            paddingBottom: GEO.aHero.padding[0],
            paddingLeft: GEO.aHero.padding[1],
            paddingRight: GEO.aHero.padding[1],
            alignItems: 'center',
            gap: GEO.aHero.gap,
          },
          [
            d(
              {
                width: GEO.aHero.badgeSize,
                height: GEO.aHero.badgeSize,
                borderRadius: GEO.aHero.badgeRadius,
                background: SEM.correct.primary,
                alignItems: 'center',
                justifyContent: 'center',
                ...ty('aHeroBadge', { color: '#ffffff' }),
              },
              String(data.correctNum || '?'),
            ),
            d({ flexDirection: 'column', flexShrink: 1, gap: 6 }, [
              d({ ...ty('aHeroLabel', { color: SEM.correct.deep }) }, SLIDES.answer.heroLabel),
              d({ ...ty('aHeroTitle', { color: INK.strong }) }, data.correctText || ''),
            ]),
          ],
        ),

        // a-explain（5 行：選択肢番号バッジ + ○/X + 本文。border-bottom 線なし）
        d(
          {
            flexDirection: 'column',
            gap: GEO.aExplain.rowGap,
            paddingLeft: 16,
            paddingRight: 16,
            flexShrink: 1,
          },
          exRows.map((row) => {
            const incorrect = row.correct === false;
            // 解説エリアでは色で正誤を強調しない（○/X の形状だけで識別）。
            // 正答強調は a-hero（緑）、論点強調は a-point（青枠）に集中させる。
            return d(
              {
                paddingTop: GEO.aExplain.rowPaddingY,
                paddingBottom: GEO.aExplain.rowPaddingY,
                alignItems: 'center',
                gap: GEO.aExplain.columnGap,
              },
              [
                // ex-num（選択肢番号バッジ、正誤に関わらず sunken 背景 + ink-body）
                d(
                  {
                    width: GEO.exNum.size,
                    height: GEO.exNum.size,
                    borderRadius: GEO.exNum.radius,
                    background: SURFACE.sunken,
                    borderWidth: GEO.exNum.borderWidth,
                    borderStyle: 'solid',
                    borderColor: SURFACE.line,
                    alignItems: 'center',
                    justifyContent: 'center',
                    ...ty('exNum', { color: INK.body }),
                    flexShrink: 0,
                  },
                  String(row.num ?? ''),
                ),
                // ex-mark ○ / X（どちらも ink-muted、形状だけで識別）
                d(
                  {
                    width: 44,
                    height: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    ...ty('exMark', {
                      color: INK.muted,
                      fontFamily: incorrect ? 'Manrope' : 'NotoSansJP',
                    }),
                    flexShrink: 0,
                  },
                  incorrect ? 'X' : '○',
                ),
                // ex-text 解説本文
                d(
                  {
                    flex: 1,
                    ...ty('exText', { color: INK.strong }),
                  },
                  row.text || '',
                ),
              ],
            );
          }),
        ),

        // a-point
        data.pointText
          ? d(
              {
                position: 'relative',
                background: SURFACE.page,
                borderWidth: GEO.aPoint.borderWidth,
                borderStyle: 'solid',
                borderColor: BRAND.primary,
                borderRadius: GEO.aPoint.radius,
                paddingTop: GEO.aPoint.padding[0],
                paddingBottom: GEO.aPoint.padding[0],
                paddingLeft: GEO.aPoint.padding[1],
                paddingRight: GEO.aPoint.padding[1],
                marginTop: GEO.aPoint.marginTop,
                alignItems: 'center',
                gap: GEO.aPoint.gap,
              },
              [
                // 浮きラベル
                d(
                  {
                    position: 'absolute',
                    top: GEO.aPoint.labelOffsetY,
                    left: GEO.aPoint.labelOffsetX,
                    paddingTop: GEO.aPoint.labelPadding[0],
                    paddingBottom: GEO.aPoint.labelPadding[0],
                    paddingLeft: GEO.aPoint.labelPadding[1],
                    paddingRight: GEO.aPoint.labelPadding[1],
                    background: BRAND.primary,
                    borderRadius: GEO.aPoint.labelRadius,
                    ...ty('aPointLabel', { color: '#ffffff' }),
                  },
                  SLIDES.answer.pointLabel,
                ),
                d(
                  {
                    width: GEO.aPoint.iconSize,
                    height: GEO.aPoint.iconSize,
                    borderRadius: GEO.aPoint.iconRadius,
                    background: BRAND.tint,
                    alignItems: 'center',
                    justifyContent: 'center',
                    ...ty('aPointIcon', { color: BRAND.primary }),
                    flexShrink: 0,
                  },
                  SLIDES.answer.pointIconChar,
                ),
                d(
                  {
                    ...ty('aPointText', { color: INK.strong }),
                    flexShrink: 1,
                  },
                  data.pointText,
                ),
              ],
            )
          : null,
      ],
    ),

    // answer の右下は空白（URL 重複を避ける）
    brandFooter(null),
  ]));
}

// ─── cta ──────────────────────────────────────────────────────

/**
 * quiz-cta スライド
 *
 * data: {
 *   pageIndex?: number,
 *   totalPages?: number,
 * }
 */
// CTA の色・統計を試験別に出し分け（多資格）。総監は既存 tokens 値＝差分ゼロ維持。
const PE_FIRST_STAGE = examColor('pe-first-stage', 'deep');
const CTA_THEME = {
  'pe-comprehensive': { bg: CTA.background, decor: CTA.decor, accent: CTA.accent, brand: BRAND.primary },
  'pe-first-stage': {
    bg: PE_FIRST_STAGE.use,
    decor: PE_FIRST_STAGE.soft,
    accent: PE_FIRST_STAGE.accent,
    brand: PE_FIRST_STAGE.accent,
  },
  'civil-1': { bg: '#10355F', decor: '#1B527E', accent: '#7FB8F5', brand: '#1E73C8' },
  'civil-2': { bg: '#11402C', decor: '#1C5B40', accent: '#6FCF9A', brand: '#2A7050' },
};
const CTA_STATS = {
  'pe-comprehensive': SLIDES.cta.stats, // 640問 / 5管理（総監固有）
  'pe-first-stage': [{ num: '560', unit: '問', label: 'PRACTICE' }, { num: '3', unit: '科目', label: 'SUBJECTS' }],
  'civil-1': [{ num: '1162', unit: '問', label: 'PRACTICE' }, { num: '12', unit: '年度', label: 'YEARS' }],
  'civil-2': [{ num: '630', unit: '問', label: 'PRACTICE' }, { num: '10', unit: '回', label: 'EXAMS' }],
};

export function buildQuizCta({ width, height, data = {} }) {
  const cfg = SLIDES.cta;
  const exam = data.exam || 'pe-comprehensive';
  const theme = CTA_THEME[exam] || CTA_THEME['pe-comprehensive'];
  const stats = CTA_STATS[exam] || CTA_STATS['pe-comprehensive'];
  // Reels(height>=1920) は action カードを保存→フォロー誘導に分岐。Carousel は保存維持。
  // 理由: Reels はリーチ獲得器のためリーチ→フォロワー転換を主にする（ig-reels-policy.md）。
  const isReels = height >= 1920;
  const actionTitle = isReels ? (cfg.actionTitleReels ?? cfg.actionTitle) : cfg.actionTitle;
  const actionSubtitle = isReels ? (cfg.actionSubtitleReels ?? cfg.actionSubtitle) : cfg.actionSubtitle;
  const actionIcon = isReels ? (cfg.actionIconReels ?? cfg.actionIcon ?? '★') : (cfg.actionIcon ?? '★');
  return d(frame(width, height, theme.bg), reelsWrapper(width, height, [
    // 装飾円（右上）
    d({
      position: 'absolute',
      top: GEO.ctaDecor.topRight.offset[0],
      right: GEO.ctaDecor.topRight.offset[1],
      width: GEO.ctaDecor.topRight.size,
      height: GEO.ctaDecor.topRight.size,
      borderRadius: 999,
      background: theme.decor,
    }),
    // 装飾円（左下）
    d({
      position: 'absolute',
      bottom: GEO.ctaDecor.bottomLeft.offset[0],
      left: GEO.ctaDecor.bottomLeft.offset[1],
      width: GEO.ctaDecor.bottomLeft.size,
      height: GEO.ctaDecor.bottomLeft.size,
      borderRadius: 999,
      background: theme.decor,
    }),

    // topbar
    topbar(
      d({ ...ty('ctaEyebrow', { color: ONDARK.secondary }), whiteSpace: 'nowrap' }, cfg.eyebrowText),
      data.ytMode ? null : pageBadge(10, 10, { onDark: true }),
    ),

    // cta-body
    d(
      {
        position: 'absolute',
        top: PAD.y + 96,
        left: PAD.x,
        right: PAD.x,
        bottom: PAD.y + 80,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 24,
        textAlign: 'center',
      },
      [
        d({ ...ty('ctaHello', { color: ONDARK.secondary }) }, cfg.helloText),

        // headline（HTML プロト: <span>doboku-note</span> で<br>全問解説をチェック を 2 行で配置）
        d({ flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }, [
          d({ ...ty('ctaHeadline', { color: ONDARK.primary }), alignItems: 'center' }, [
            d({ color: theme.accent }, cfg.headlineAccent),
            d({}, cfg.headlineConnector),
          ]),
          d({ ...ty('ctaHeadline', { color: ONDARK.primary }) }, cfg.headlineLine2),
        ]),

        // cta-stats
        d({ gap: GEO.ctaStat.gap, marginTop: 12, marginBottom: 36 }, stats.map((s) =>
          d(
            {
              background: ONDARK.subtleBg,
              borderWidth: GEO.ctaStat.borderWidth,
              borderStyle: 'solid',
              borderColor: ONDARK.subtleLine,
              borderRadius: GEO.ctaStat.radius,
              paddingTop: GEO.ctaStat.padding[0],
              paddingBottom: GEO.ctaStat.padding[0],
              paddingLeft: GEO.ctaStat.padding[1],
              paddingRight: GEO.ctaStat.padding[1],
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            },
            [
              d({ ...ty('ctaStatNum', { color: ONDARK.primary, whiteSpace: 'nowrap' }) }, [
                d({}, s.num),
                d({ ...ty('ctaStatNumSm', { color: ONDARK.secondary }), marginLeft: 6 }, s.unit),
              ]),
              d({ ...ty('ctaStatLabel', { color: ONDARK.quaternary }) }, s.label),
            ],
          ),
        )),

        // cta-action
        d(
          {
            background: SURFACE.page,
            borderRadius: GEO.ctaAction.radius,
            paddingTop: GEO.ctaAction.padding[0],
            paddingBottom: GEO.ctaAction.padding[0],
            paddingLeft: GEO.ctaAction.padding[1],
            paddingRight: GEO.ctaAction.padding[1],
            minWidth: GEO.ctaAction.minWidth,
            alignItems: 'center',
            justifyContent: 'center',
            gap: GEO.ctaAction.gap,
          },
          [
            // 保存アイコン: brand 塗りつぶし + 白アイコンに色反転（白カード内の視覚アンカー）
            d(
              {
                width: GEO.ctaAction.iconSize,
                height: GEO.ctaAction.iconSize,
                borderRadius: GEO.ctaAction.iconRadius,
                background: theme.brand,
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
                fontWeight: 800,
                color: '#ffffff',
                fontFamily: 'Manrope',
              },
              actionIcon,
            ),
            d({ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }, [
              d({ ...ty('ctaActionTitle', { color: theme.brand }) }, actionTitle),
              d({ ...ty('ctaActionSub', { color: INK.strong }) }, actionSubtitle),
            ]),
          ],
        ),
      ],
    ),

    // cta の右下は空白（左下の白反転ウォーターマークで充足）
    brandFooter(null, { onDark: true }),
  ]));
}
