/**
 * Study Notebook（案C）スライド要素ビルダー。
 *
 * slide-C.jsx の JSX を Satori vDOM 形式（{ type, props: { style, children } }）に変換。
 * 1080×1920（IG Reels/YT Shorts）と 1080×1350（IG Carousel）の両サイズに対応。
 *
 * Satori 制約:
 *   - すべての flex コンテナに display: 'flex' 必須
 *   - position: 'absolute' は親の position: 'relative' が前提
 *   - linear-gradient(transparent 60%, color 60%) のインライン span は非対応
 *     → borderBottom でハイライター代替
 *   - 絵文字: NotoSansJP に含まれないため '▶' '▷' で代替
 *   - fontWeight 800 → 700 にフォールバック（搭載フォントは Bold 700 のみ）
 */

import { SNS_CONFIG } from './sns-config.mjs';

export const NOTEBOOK_TOKENS = {
  paper:       '#f7f3ea',
  paperLine:   '#cfd6df',
  ink:         '#1a1a1a',
  inkBody:     '#2d2d30',
  brand:       '#2e6da4',
  brandDeep:   '#1a3a5c',
  marker:      '#fff7a8',
  markerPink:  '#ffd6e1',
  sticky:      '#fde58a',
  stickyBlue:  '#bfdcef',
  red:         '#b22234',
};

/** 5管理タブ定義 */
export const MANAGEMENT_MAP = {
  economic: { index: 0, stickyColor: '#bfdcef', label: '経済性管理' },
  human:    { index: 1, stickyColor: '#d0e8d0', label: '人的資源管理' },
  info:     { index: 2, stickyColor: '#e0d4f7', label: '情報管理' },
  safety:   { index: 3, stickyColor: '#fde58a', label: '安全管理' },
  social:   { index: 4, stickyColor: '#f5d4d4', label: '社会環境管理' },
};

const MGMT_LABELS = ['経済性', '人的', '情報', '安全', '社会'];

const RULED_BG = `repeating-linear-gradient(to bottom, transparent 0, transparent 71px, ${NOTEBOOK_TOKENS.paperLine} 71px, ${NOTEBOOK_TOKENS.paperLine} 72px)`;

/** canvas 高さに応じたレイアウト定数を返す */
function getLayout(height) {
  const sm = height <= 1400; // carousel (1350) vs reels (1920)
  return {
    contentTop:      sm ? 155 : 175,
    captionHeight:   sm ? 190 : 240,
    contentBottom:   sm ? 96  : 120,
    figureMaxH:      sm ? 720 : 1150,
    captionFontSize: sm ? 42  : 52,
    tabPaddingV:     sm ? 36  : 50,
    tabFontSize:     sm ? 22  : 26,
    dateStampTop:    sm ? 44  : 50,
    labelFontSize:   sm ? 28  : 32,
    keywordFontSize: sm ? 84  : 100,
    subtitleFontSize:sm ? 44  : 52,
    headingFontSize: sm ? 54  : 60,
    bodyFontSize:    sm ? 36  : 40,
    numberFontSize:  sm ? 72  : 96,
    coverStickyTop:  sm ? 230 : 460, // cover 付箋: キーワード見出しの上端付近
  };
}

/** Satori vDOM ヘルパー（div のみ） */
function d(style, children) {
  const ch = Array.isArray(children)
    ? children.filter(c => c != null)
    : (children ?? '');
  return {
    type: 'div',
    props: {
      style: { display: 'flex', ...style },
      children: ch,
    },
  };
}

/**
 * キーワードを表示行に分割する。
 * 7文字以下はそのまま、8文字以上は中間の助詞（の・と・に等）で折る。
 * 見つからない場合は前半/後半で強制分割。
 */
function splitKeyword(text) {
  if (!text || text.length <= 7) return [text];
  const particles = ['の', 'と', 'に', 'が', 'を', 'は', 'で', 'や'];
  const mid = Math.ceil(text.length / 2);
  // 後半から前方に助詞を探す
  for (let i = text.length - 2; i >= mid; i--) {
    if (particles.includes(text[i])) {
      return [text.slice(0, i + 1), text.slice(i + 1)];
    }
  }
  // 前半から後方に助詞を探す
  for (let i = mid - 1; i >= 2; i--) {
    if (particles.includes(text[i])) {
      return [text.slice(0, i + 1), text.slice(i + 1)];
    }
  }
  return [text.slice(0, mid), text.slice(mid)];
}

/** 左端の朱色マージン縦線 */
export function buildMarginLine() {
  return d({
    position: 'absolute',
    left: 110, top: 0, bottom: 0,
    width: 2,
    background: NOTEBOOK_TOKENS.red,
    opacity: 0.6,
  });
}

/** 右端の 5管理タブ */
export function buildTabIndex(activeIdx, layout) {
  const L = layout;
  return d({
    position: 'absolute',
    top: 0, right: 0,
    flexDirection: 'column',
    gap: 12,
    paddingTop: L.tabPaddingV,
    paddingBottom: L.tabPaddingV,
  }, MGMT_LABELS.map((label, i) =>
    d({
      paddingTop: 12, paddingBottom: 12,
      paddingLeft: 26, paddingRight: 20,
      background: i === activeIdx ? NOTEBOOK_TOKENS.brandDeep : '#ffffff',
      color: i === activeIdx ? '#ffffff' : NOTEBOOK_TOKENS.inkBody,
      fontSize: L.tabFontSize,
      fontWeight: 700,
      borderTop: `1px solid ${NOTEBOOK_TOKENS.paperLine}`,
      borderBottom: `1px solid ${NOTEBOOK_TOKENS.paperLine}`,
      borderLeft: `6px solid ${i === activeIdx ? NOTEBOOK_TOKENS.red : NOTEBOOK_TOKENS.paperLine}`,
      letterSpacing: '0.08em',
    }, label)
  ));
}

/** 上部の日付・ページスタンプ */
export function buildDateStamp(date, pageLabel, layout) {
  const formatted = (date || '2026-05-09').replace(/-/g, ' / ');
  return d({
    position: 'absolute',
    top: layout.dateStampTop, left: 160, right: 200,
    fontFamily: '"Courier New", monospace',
    fontSize: 28,
    color: NOTEBOOK_TOKENS.inkBody,
    justifyContent: 'space-between',
    borderBottom: `1px solid ${NOTEBOOK_TOKENS.paperLine}`,
    paddingBottom: 12,
  }, [
    d({}, formatted),
    d({}, pageLabel || ''),
  ]);
}

/** 下部字幕エリア（破線罫で区切る） */
export function buildCaptionArea(text, layout) {
  const lines = (text || '').split('\n');
  return d({
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: layout.captionHeight,
    background: 'rgba(255,255,255,0.92)',
    borderTop: `2px dashed ${NOTEBOOK_TOKENS.paperLine}`,
    paddingLeft: 80, paddingRight: 80,
    paddingTop: 28, paddingBottom: 28,
    alignItems: 'center',
  }, d({
    flexDirection: 'column',
    fontSize: layout.captionFontSize,
    fontWeight: 700,
    color: NOTEBOOK_TOKENS.ink,
    lineHeight: 1.35,
  }, lines.map(line => d({ display: 'flex' }, line || ' '))));
}

/** ノートフレームの共通スタイル */
function frameStyle(width, height) {
  return {
    position: 'relative',
    display: 'flex',
    width: `${width}px`,
    height: `${height}px`,
    background: NOTEBOOK_TOKENS.paper,
    backgroundImage: RULED_BG,
    fontFamily: '"Noto Sans JP", system-ui, sans-serif',
    color: NOTEBOOK_TOKENS.ink,
    overflow: 'hidden',
  };
}

/**
 * notebook-cover スライド
 *
 * data: {
 *   keyword: string,        // キーワード名（大見出し）
 *   subtitle: string,       // 副題（例: '1 : 29 : 300'）
 *   numbers?: Array<{n, label}>,  // 数値リスト（ピラミッド構造の各段）
 *   stickyText: string,     // 付箋テキスト（'\n' で改行）
 *   management: string,     // 'economic'|'human'|'info'|'safety'|'social'
 *   date: string,           // 'YYYY-MM-DD'
 *   caption: string,        // 下部字幕テキスト（'\n' で改行）
 * }
 */
export function buildNotebookCover({ width, height, data }) {
  const L = getLayout(height);
  const mgmt = MANAGEMENT_MAP[data.management] || MANAGEMENT_MAP.safety;
  const stickyLines = (data.stickyText || '').split('\n');
  const kwLines = data.keywordLines || splitKeyword(data.keyword || '');
  const numbers = data.numbers || [];

  return d(frameStyle(width, height), [
    buildMarginLine(),
    buildTabIndex(mgmt.index, L),

    // メインコンテンツ（縦中央揃え）
    d({
      position: 'absolute',
      top: L.contentTop, bottom: L.contentBottom, left: 160, right: 160,
      flexDirection: 'column',
      justifyContent: 'center',
    }, [
      // 管理区分バッジ
      d({
        fontSize: L.labelFontSize,
        fontWeight: 700,
        color: NOTEBOOK_TOKENS.inkBody,
        background: mgmt.stickyColor,
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 20,
        paddingRight: 20,
        alignSelf: 'flex-start',
        marginBottom: 16,
        letterSpacing: '0.06em',
      }, `▌ ${mgmt.label}`),

      // キーワード見出し（複数行）
      d({
        flexDirection: 'column',
        marginBottom: 36,
      }, kwLines.map(line =>
        d({
          fontSize: L.keywordFontSize,
          fontWeight: 700,
          lineHeight: 1.15,
          color: NOTEBOOK_TOKENS.ink,
        }, line)
      )),

      // 副題（ハイライター代替: borderBottom）
      d({
        flexDirection: 'column',
        gap: 12,
        marginBottom: 40,
      }, [
        d({
          fontSize: L.subtitleFontSize,
          fontWeight: 700,
          color: NOTEBOOK_TOKENS.inkBody,
          borderBottom: `8px solid ${NOTEBOOK_TOKENS.marker}`,
          paddingBottom: 4,
          alignSelf: 'flex-start',
        }, data.subtitle || ''),
        d({
          fontSize: L.labelFontSize + 4,
          color: NOTEBOOK_TOKENS.inkBody,
        }, 'ーー この比率、覚えてる？'),
      ]),

      // 数値ピラミッド（numbers 配列が渡された場合）
      numbers.length > 0
        ? d({
            flexDirection: 'column',
            gap: 12,
            paddingLeft: 8,
            borderLeft: `6px solid ${NOTEBOOK_TOKENS.paperLine}`,
          }, numbers.map(({ n, label, color }) =>
            d({
              alignItems: 'baseline',
              gap: 16,
            }, [
              d({
                fontSize: L.numberFontSize,
                fontWeight: 700,
                color: color || NOTEBOOK_TOKENS.brandDeep,
                lineHeight: 1.1,
                minWidth: L.numberFontSize * 1.6,
                flexShrink: 0,
              }, String(n)),
              d({
                fontSize: L.bodyFontSize - 4,
                fontWeight: 600,
                color: NOTEBOOK_TOKENS.inkBody,
                flexShrink: 1,
              }, label),
            ])
          ))
        : null,
    ]),

    // 付箋（タブと重ならない位置に絶対配置）
    d({
      position: 'absolute',
      top: L.coverStickyTop, right: 170,
      width: 220, height: 220,
      background: mgmt.stickyColor,
      transform: 'rotate(6deg)',
      boxShadow: '4px 6px 12px rgba(0,0,0,0.12)',
      paddingTop: 20, paddingBottom: 20,
      paddingLeft: 16, paddingRight: 16,
      flexDirection: 'column',
      fontSize: 24,
      fontWeight: 700,
      color: NOTEBOOK_TOKENS.ink,
      lineHeight: 1.5,
    }, [
      d({ fontSize: 26, marginBottom: 8, fontWeight: 700 }, '▶ 暗記'),
      ...stickyLines.map(line => d({ display: 'flex' }, line || ' ')),
    ]),

  ]);
}

/**
 * notebook-board スライド
 *
 * data: {
 *   heading: string,     // 板書見出し
 *   body: string,        // 本文（'\n' で改行）
 *   noteText: string,    // 破線ボックスのメモ（'\n' で改行）
 *   management: string,
 *   date: string,
 *   caption: string,
 * }
 */
export function buildNotebookBoard({ width, height, data }) {
  const L = getLayout(height);
  const mgmt = MANAGEMENT_MAP[data.management] || MANAGEMENT_MAP.safety;
  const bodyLines = (data.body || '').split('\n');
  const noteLines = (data.noteText || '').split('\n');

  return d(frameStyle(width, height), [
    buildMarginLine(),
    buildTabIndex(mgmt.index, L),

    d({
      position: 'absolute',
      top: L.contentTop, bottom: L.contentBottom, left: 160, right: 160,
      flexDirection: 'column',
      justifyContent: 'center',
    }, [
      // 板書見出し
      d({
        fontSize: L.headingFontSize,
        fontWeight: 700,
        color: NOTEBOOK_TOKENS.brandDeep,
        borderBottom: `4px solid ${NOTEBOOK_TOKENS.brandDeep}`,
        paddingBottom: 12,
        marginBottom: 32,
      }, data.heading || '板書 ｜ 定義'),

      // 本文
      d({
        flexDirection: 'column',
        fontSize: L.bodyFontSize,
        fontWeight: 600,
        color: NOTEBOOK_TOKENS.inkBody,
        lineHeight: 1.7,
        marginBottom: 44,
      }, bodyLines.map(line => d({ display: 'flex' }, line || ' '))),

      // 破線メモボックス
      d({
        paddingTop: 22, paddingBottom: 22,
        paddingLeft: 30, paddingRight: 30,
        background: '#ffffff',
        border: `3px dashed ${NOTEBOOK_TOKENS.ink}`,
        flexDirection: 'column',
      }, [
        d({
          fontSize: 30,
          fontWeight: 700,
          color: NOTEBOOK_TOKENS.red,
          marginBottom: 8,
        }, '→ ここが本質'),
        d({
          flexDirection: 'column',
          fontSize: L.bodyFontSize - 4,
          fontWeight: 700,
          color: NOTEBOOK_TOKENS.ink,
          lineHeight: 1.5,
        }, noteLines.map(line => d({ display: 'flex' }, line || ' '))),
      ]),
    ]),

  ]);
}

/**
 * notebook-cta スライド
 *
 * data: {
 *   related: string[],   // 関連キーワードリスト
 *   management: string,
 *   date: string,
 *   caption: string,
 * }
 */
export function buildNotebookCta({ width, height, data }) {
  const L = getLayout(height);
  const mgmt = MANAGEMENT_MAP[data.management] || MANAGEMENT_MAP.safety;
  const related = data.related || [];

  return d(frameStyle(width, height), [
    buildMarginLine(),
    buildTabIndex(mgmt.index, L),

    // コンテンツ全体を space-evenly で縦分散配置
    d({
      position: 'absolute',
      top: L.contentTop, bottom: L.contentBottom, left: 160, right: 160,
      flexDirection: 'column',
      justifyContent: 'space-around',
    }, [
      // 見出し
      d({
        fontSize: L.headingFontSize - 4,
        fontWeight: 700,
        color: NOTEBOOK_TOKENS.brandDeep,
        flexDirection: 'column',
      }, SNS_CONFIG.cta.heading.map(line => d({ display: 'flex' }, line))),

      // 関連カード（ホッチキス付き）
      d({
        background: '#ffffff',
        border: `2px solid ${NOTEBOOK_TOKENS.ink}`,
        paddingTop: 44, paddingBottom: 32,
        paddingLeft: 32, paddingRight: 32,
        flexDirection: 'column',
        position: 'relative',
      }, [
        // ホッチキス
        d({
          position: 'absolute',
          top: -12, left: 32,
          width: 60, height: 22,
          background: NOTEBOOK_TOKENS.ink,
          transform: 'rotate(-5deg)',
          borderRadius: 2,
        }),

        d({
          fontSize: 28,
          color: NOTEBOOK_TOKENS.brand,
          fontWeight: 700,
          letterSpacing: '0.1em',
          marginBottom: 12,
        }, 'RELATED'),

        d({
          flexDirection: 'column',
          gap: 6,
          marginBottom: 20,
        }, related.map(kw => d({
          fontSize: L.headingFontSize - 10,
          fontWeight: 700,
          color: NOTEBOOK_TOKENS.ink,
        }, `▷ ${kw}`))),

        d({
          borderTop: `1px solid ${NOTEBOOK_TOKENS.paperLine}`,
          paddingTop: 18,
          flexDirection: 'column',
          gap: 4,
        }, [
          d({ fontSize: 30, fontWeight: 700, color: NOTEBOOK_TOKENS.inkBody }, [
            d({}, '続きは '),
            d({
              borderBottom: `6px solid ${NOTEBOOK_TOKENS.marker}`,
              paddingBottom: 2,
              fontWeight: 700,
              color: NOTEBOOK_TOKENS.ink,
            }, 'doboku-note'),
            d({}, ' で。'),
          ]),
        ]),
      ]),

      // 青付箋（flex child として右寄せ配置）
      d({
        alignSelf: 'flex-end',
        width: 320,
        background: NOTEBOOK_TOKENS.stickyBlue,
        paddingTop: 24, paddingBottom: 24,
        paddingLeft: 22, paddingRight: 22,
        flexDirection: 'column',
        fontSize: 26,
        fontWeight: 700,
        color: NOTEBOOK_TOKENS.ink,
        lineHeight: 1.55,
        boxShadow: '4px 6px 12px rgba(0,0,0,0.12)',
        transform: 'rotate(-3deg)',
      }, [
        d({ fontSize: 26, fontWeight: 700, marginBottom: 10 }, '▷ 概要欄'),
        d({ display: 'flex' }, '過去問 H21〜R7'),
        d({ display: 'flex' }, '5管理 横断辞書'),
        d({ display: 'flex' }, '1問1答 全694'),
      ]),
    ]),

  ]);
}

/**
 * notebook-figure スライド
 *
 * 図版（SVG/PNG）を主役にするスライド。図がまだ無い場合は figureSpec を
 * 破線ボックスにプレースホルダ表示する（実図版は別工程で制作）。
 *
 * data: {
 *   heading: string,        // 見出し
 *   imageBase64?: string,   // data URI（ig-post-create が imagePath から解決）
 *   figureSpec?: string,    // 図がまだ無いときの仕様記述（'\n' で改行）
 *   note?: string,          // 図の下に置く一言（'\n' で改行）
 *   management: string,
 * }
 */
export function buildNotebookFigure({ width, height, data }) {
  const L = getLayout(height);
  const mgmt = MANAGEMENT_MAP[data.management] || MANAGEMENT_MAP.safety;
  const hasImage = Boolean(data.imageBase64);
  const specLines = (data.figureSpec || '図版スペック未記入').split('\n');
  const noteLines = (data.note || '').split('\n');

  const figureArea = hasImage
    ? d({
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        border: `2px solid ${NOTEBOOK_TOKENS.paperLine}`,
        padding: 24,
      }, {
        type: 'img',
        props: {
          src: data.imageBase64,
          style: {
            maxWidth: `${width - 420}px`,
            maxHeight: `${L.figureMaxH}px`,
            objectFit: 'contain',
          },
        },
      })
    : d({
        flexGrow: 1,
        flexDirection: 'column',
        gap: 14,
        justifyContent: 'center',
        background: '#ffffff',
        border: `3px dashed ${NOTEBOOK_TOKENS.brand}`,
        paddingTop: 28, paddingBottom: 28,
        paddingLeft: 32, paddingRight: 32,
      }, [
        d({
          fontSize: 28,
          fontWeight: 700,
          color: NOTEBOOK_TOKENS.brand,
          marginBottom: 4,
        }, '▶ 図版スペック（制作予定）'),
        ...specLines.map(line => d({
          display: 'flex',
          fontSize: L.bodyFontSize - 4,
          fontWeight: 600,
          color: NOTEBOOK_TOKENS.inkBody,
          lineHeight: 1.5,
        }, line || ' ')),
      ]);

  return d(frameStyle(width, height), [
    buildMarginLine(),
    buildTabIndex(mgmt.index, L),

    d({
      position: 'absolute',
      top: L.contentTop, bottom: L.contentBottom, left: 160, right: 160,
      flexDirection: 'column',
    }, [
      d({
        fontSize: L.headingFontSize,
        fontWeight: 700,
        color: NOTEBOOK_TOKENS.brandDeep,
        borderBottom: `4px solid ${NOTEBOOK_TOKENS.brandDeep}`,
        paddingBottom: 12,
        marginBottom: 28,
      }, data.heading || '図解'),

      figureArea,

      data.note
        ? d({
            marginTop: 24,
            flexDirection: 'column',
            fontSize: L.bodyFontSize - 6,
            fontWeight: 700,
            color: NOTEBOOK_TOKENS.red,
            lineHeight: 1.5,
          }, noteLines.map(line => d({ display: 'flex' }, line || ' ')))
        : null,
    ]),
  ]);
}
