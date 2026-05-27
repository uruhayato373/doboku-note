/**
 * 過去問クイズカルーセル スライド要素ビルダー（AIDesigner 新意匠）。
 *
 * 真実源: docs/design-system/instagram-carousel-tokens.json
 * 仕様書: docs/design-system/instagram-carousel.md
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS = JSON.parse(
  readFileSync(
    resolve(__dirname, '../../../../docs/design-system/instagram-carousel-tokens.json'),
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
export function buildQuizCover({ width, height, data }) {
  const title = data.title || '';
  // subtitle が 'R07 4問パック' 形式なら meta に、それ以外は sub に。
  const year = data.year ?? (data.subtitle?.match(/^([HRhr]\d+)/)?.[1] || null);
  const metaText = year ? `${year.toUpperCase()} ／ 4問パック` : (data.subtitle || SLIDES.cover.tagText);
  const subText = (data.subtitle && !year) ? null : (data.subtext || '');
  const chips = Array.isArray(data.chips) ? data.chips.slice(0, 4) : [];

  return d(frame(width, height, SURFACE.page), [
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
        d({ ...ty('coverTitle', { color: INK.strong, marginBottom: 28 }) }, title),
        subText
          ? d({ ...ty('coverSub', { color: INK.body, marginBottom: 48 }) }, subText)
          : null,
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
            d({}, SLIDES.cover.swipeText),
            d({ ...ty('coverSwipeArrow', { color: BRAND.primary }) }, '→'),
          ],
        ),
      ],
    ),

    // cover の右下は空白（左下のウォーターマークと URL が重複するため）
    brandFooter(null),
  ]);
}

// ─── problem ──────────────────────────────────────────────────

/**
 * 表ビルダー（汎用）
 * table: { headers: string[], rows: string[][] }
 * Satori vDOM の flex grid で罫線付きの表を描画する。
 */
function buildTable(table) {
  const headers = Array.isArray(table?.headers) ? table.headers : [];
  const rows = Array.isArray(table?.rows) ? table.rows : [];
  const colCount = headers.length;
  if (!colCount) return null;

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
      minHeight: GEO.table.headerMinHeight,
    },
    headers.map((h, i) =>
      d(
        {
          flex: 1,
          paddingTop: GEO.table.headerPadding[0],
          paddingBottom: GEO.table.headerPadding[0],
          paddingLeft: GEO.table.headerPadding[1],
          paddingRight: GEO.table.headerPadding[1],
          alignItems: 'center',
          justifyContent: 'center',
          ...cellBorderRight(i),
          ...ty('tableHeader', { color: INK.body }),
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
        minHeight: GEO.table.rowMinHeight,
      },
      row.map((cell, ci) =>
        d(
          {
            flex: 1,
            paddingTop: GEO.table.cellPadding[0],
            paddingBottom: GEO.table.cellPadding[0],
            paddingLeft: GEO.table.cellPadding[1],
            paddingRight: GEO.table.cellPadding[1],
            alignItems: 'center',
            justifyContent: 'center',
            ...cellBorderRight(ci),
            ...ty('tableCell', { color: INK.strong }),
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
export function buildQuizProblem({ width, height, data }) {
  // bodyLines に markdown 表行 (|...|) が含まれている場合は除外（旧データ互換、
  // 新規データは data.table フィールドで構造化する）。
  // 各要素の内部に \r\n が混在しているケースもあるので flatMap で分割してから判定。
  const rawLines = Array.isArray(data.bodyLines) ? data.bodyLines : [String(data.body || '')];
  const bodyTextOnly = rawLines
    .flatMap((l) => l.split(/\r?\n/))
    .filter((l) => {
      const t = l.trim();
      if (!t) return false;
      // パイプ記号 | を含む行は markdown 表残骸として除外
      // （IG カルーセル本文に | を使う正規ケースは想定しない。必要なら data.table へ）
      if (t.includes('|')) return false;
      // 区切り行（--- :--- など）
      if (/^[-:]+$/.test(t)) return false;
      return true;
    });
  const fullBody = bodyTextOnly.join('');
  const tableEl = data.table ? buildTable(data.table) : null;
  const listsEl = data.lists ? buildLists(data.lists) : null;
  const options = (data.options || []).slice(0, 5);

  // 4 段階の圧縮モード判定（総文字数で動的に発動）
  //   ultra:   超長文 > 700字 → q-text 26 / opt 68 / gap 14
  //   compact: table/lists あり、または 550字超 or 選択肢最長 > 100字 → q-text 30 / opt 76
  //   dense:   320字超 or 選択肢長い → q-text 36 / opt 84
  //   normal:  通常 → q-text 44 / opt 96（HTML プロト基準）
  //
  // 注：optMax 単独で ultra 格上げしない（選択肢 1 つが長いだけで全体縮小は過剰）。
  //     優先するのは「総文字量」で、ultra は本当に長文 (>700字) のみに限定。
  const bodyChars = [...fullBody].length;
  const optChars = options.reduce((s, o) => s + [...(o.text || '')].length, 0);
  const optMax = Math.max(0, ...options.map((o) => [...(o.text || '')].length));
  const totalContent = bodyChars + optChars;
  const isUltra = totalContent > 700;
  const isCompact = !isUltra && (!!tableEl || !!listsEl || totalContent > 550 || optMax > 100);
  const isDense = !isUltra && !isCompact && (isDenseOptions(options) || totalContent > 320 || optMax > 60);

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

  return d(frame(width, height, SURFACE.page), [
    topbar(
      eyebrow(`PROBLEM ${data.qNum ?? 1} / ${data.totalQ ?? 4}`),
      pageBadge(data.pageIndex ?? 2, data.totalPages ?? 10),
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

    // problem だけ右下に「次ページで解答 →」を出す（誘導テキスト）
    brandFooter(SLIDES.problem.nextText),
  ]);
}

// ─── pause（互換維持、新意匠では使われない） ─────────────────

export function buildQuizPause({ width, height, data }) {
  return d(frame(width, height, SURFACE.sunken), [
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
  ]);
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

  return d(frame(width, height, SURFACE.page), [
    topbar(
      eyebrow(`ANSWER ${data.qNum ?? 1} / ${data.totalQ ?? 4}`),
      pageBadge(data.pageIndex ?? 3, data.totalPages ?? 10),
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
  ]);
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
export function buildQuizCta({ width, height }) {
  const cfg = SLIDES.cta;
  return d(frame(width, height, CTA.background), [
    // 装飾円（右上）
    d({
      position: 'absolute',
      top: GEO.ctaDecor.topRight.offset[0],
      right: GEO.ctaDecor.topRight.offset[1],
      width: GEO.ctaDecor.topRight.size,
      height: GEO.ctaDecor.topRight.size,
      borderRadius: 999,
      background: CTA.decor,
    }),
    // 装飾円（左下）
    d({
      position: 'absolute',
      bottom: GEO.ctaDecor.bottomLeft.offset[0],
      left: GEO.ctaDecor.bottomLeft.offset[1],
      width: GEO.ctaDecor.bottomLeft.size,
      height: GEO.ctaDecor.bottomLeft.size,
      borderRadius: 999,
      background: CTA.decor,
    }),

    // topbar
    topbar(
      d({ ...ty('ctaEyebrow', { color: ONDARK.secondary }), whiteSpace: 'nowrap' }, cfg.eyebrowText),
      pageBadge(10, 10, { onDark: true }),
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
            d({ color: CTA.accent }, cfg.headlineAccent),
            d({}, cfg.headlineConnector),
          ]),
          d({ ...ty('ctaHeadline', { color: ONDARK.primary }) }, cfg.headlineLine2),
        ]),

        // cta-stats
        d({ gap: GEO.ctaStat.gap, marginTop: 12, marginBottom: 36 }, cfg.stats.map((s) =>
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
                background: BRAND.primary,
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
                fontWeight: 800,
                color: '#ffffff',
                fontFamily: 'Manrope',
              },
              '★',
            ),
            d({ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }, [
              d({ ...ty('ctaActionTitle', { color: BRAND.primary }) }, cfg.actionTitle),
              d({ ...ty('ctaActionSub', { color: INK.strong }) }, cfg.actionSubtitle),
            ]),
          ],
        ),
      ],
    ),

    // cta の右下は空白（左下の白反転ウォーターマークで充足）
    brandFooter(null, { onDark: true }),
  ]);
}
