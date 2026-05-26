/**
 * 過去問クイズカルーセル スライド要素ビルダー（type3 デザイン）。
 *
 * type3-1〜5.svg を Satori vDOM 形式で再現する。
 * 5 枚構成: cover / problem / pause / answer / cta
 *
 * 1080×1350 (IG Carousel) を主、1080×1920 (Reels) はレイアウト微調整で対応。
 *
 * Satori 制約への対応:
 *   - 絵文字 ⏱ 🔍 はフォント未搭載 → 代替記号 (▷ / SEARCH ラベル) で再現
 *   - fontWeight 900/800 → 700 にフォールバック
 *   - letter-spacing は em 単位 ('0.06em' 等)
 *   - すべての flex コンテナに display: 'flex'
 */

const QUIZ_TOKENS = {
  brand:       '#2e6da4',
  brandDeep:   '#1a3a5c',
  brandLight:  '#e8f0fe',
  brandPaler:  '#a8c4dc',
  brandPale:   '#cfdef0',
  ink:         '#222222',
  inkSoft:     '#555555',
  inkMuted:    '#8a8a8a',
  paper:       '#ffffff',
  paperGray:   '#f5f5f5',
  cardBg:      '#f5f5f5',
  cardBorder:  '#d7d7d7',
  correctBg:   '#d0e8d0',
  correctMark: '#3a7d44',
  pageIndex:   '#8a8a8a',
};

/** 5 管理別の主題色（cover/CTA で使用） */
const MGMT_THEME = {
  economic: { primary: '#2e6da4', deep: '#1a3a5c', light: '#e8f0fe', paler: '#a8c4dc', label: '経済性管理' },
  human:    { primary: '#a36b2c', deep: '#5e3d18', light: '#fce8d0', paler: '#d8b08a', label: '人的資源管理' },
  info:     { primary: '#5a3aa3', deep: '#321f5e', light: '#ede4fa', paler: '#b8a4dc', label: '情報管理' },
  safety:   { primary: '#b22234', deep: '#6b1320', light: '#fce0e3', paler: '#dca5ad', label: '安全管理' },
  social:   { primary: '#3a7d44', deep: '#1f4824', light: '#d8eddc', paler: '#a4cab0', label: '社会環境管理' },
};

function getTheme(mgmt) {
  return MGMT_THEME[mgmt] || MGMT_THEME.safety;
}

/** Satori vDOM ヘルパー（div） */
function d(style, children) {
  const ch = Array.isArray(children)
    ? children.filter((c) => c != null)
    : (children ?? '');
  return {
    type: 'div',
    props: {
      style: { display: 'flex', ...style },
      children: ch,
    },
  };
}

function pageBadge(currentIdx, totalSlides, colorOverride) {
  return d({
    position: 'absolute',
    top: 32, right: 80,
    fontSize: 22,
    fontWeight: 500,
    color: colorOverride || QUIZ_TOKENS.pageIndex,
  }, `${currentIdx} / ${totalSlides}`);
}

function frame(width, height, bg) {
  return {
    position: 'relative',
    display: 'flex',
    width: `${width}px`,
    height: `${height}px`,
    background: bg || QUIZ_TOKENS.paper,
    fontFamily: '"Noto Sans JP", system-ui, sans-serif',
    color: QUIZ_TOKENS.ink,
    overflow: 'hidden',
  };
}

/**
 * quiz-cover スライド (4 問パック版)
 *
 * data: {
 *   title: string,         // 管理名 (例: '経済性管理')
 *   subtitle: string,      // パック情報 (例: 'R07 4問パック')
 *   sectionTag: string,    // 5管理ラベル (例: '2 経済性管理')
 *   management: string,    // 管理 slug (economic/human/info/safety/social)
 *   pageIndex?: number,    // デフォルト 1
 *   totalPages?: number,   // デフォルト 10
 * }
 */
export function buildQuizCover({ width, height, data }) {
  const theme = getTheme(data.management);

  return d(frame(width, height, QUIZ_TOKENS.paper), [
    pageBadge(data.pageIndex ?? 1, data.totalPages ?? 10),

    // 上部 QUIZ ラベル（中央配置）
    d({
      position: 'absolute',
      top: 130, left: 0, right: 0,
      justifyContent: 'center',
      fontSize: 30,
      fontWeight: 700,
      color: theme.primary,
      letterSpacing: '0.16em',
    }, '総監択一クイズ'),

    // 中央巨大 Q
    d({
      position: 'absolute',
      top: 200, left: 0, right: 0,
      justifyContent: 'center',
      fontSize: 380,
      fontWeight: 700,
      color: theme.light,
      lineHeight: 1,
    }, 'Q'),

    // 管理名 (大)
    d({
      position: 'absolute',
      top: 680, left: 0, right: 0,
      justifyContent: 'center',
      fontSize: 88,
      fontWeight: 700,
      color: QUIZ_TOKENS.ink,
      letterSpacing: '0.04em',
    }, data.title || ''),

    // パック情報 (中)
    d({
      position: 'absolute',
      top: 810, left: 0, right: 0,
      justifyContent: 'center',
      fontSize: 40,
      fontWeight: 500,
      color: QUIZ_TOKENS.inkSoft,
      letterSpacing: '0.06em',
    }, data.subtitle || ''),

    // セクションタグ (中央寄せ)
    d({
      position: 'absolute',
      top: 950, left: 0, right: 0,
      justifyContent: 'center',
    }, d({
      paddingTop: 14, paddingBottom: 14,
      paddingLeft: 32, paddingRight: 32,
      background: theme.light,
      borderRadius: 8,
      fontSize: 28,
      fontWeight: 700,
      color: theme.deep,
      letterSpacing: '0.04em',
    }, data.sectionTag || '')),

    // doboku-note フッター
    d({
      position: 'absolute',
      bottom: 88, left: 80,
      fontSize: 34,
      fontWeight: 700,
      color: theme.primary,
      letterSpacing: '0.04em',
    }, 'doboku-note'),
    d({
      position: 'absolute',
      bottom: 52, left: 80,
      fontSize: 22,
      fontWeight: 400,
      color: QUIZ_TOKENS.inkMuted,
    }, 'doboku-note.com'),
  ]);
}

/** 選択肢テキストの行数を文字数から推定（フォント 28px、横幅 752px の前提） */
function estimateOptionLines(text, charsPerLine = 24) {
  const len = [...(text || '')].length;
  if (len === 0) return 1;
  return Math.min(3, Math.ceil(len / charsPerLine));
}

/** 行数に応じた選択肢カード高さ（5 択を縦に並べて画面下まで埋める） */
function optionCardHeight(lineCount) {
  if (lineCount === 1) return 116;
  if (lineCount === 2) return 156;
  return 196;
}

/** 問題文の文字数に応じたフォントサイズ（選択肢 5 つを下に並べる余地を確保） */
function problemFontSizeFromLength(charCount) {
  if (charCount <= 40) return 42;
  if (charCount <= 80) return 36;
  if (charCount <= 130) return 32;
  if (charCount <= 180) return 28;
  return 26;
}

/**
 * quiz-problem スライド (4 問パック版・動的レイアウト)
 *
 * data: {
 *   bodyLines: string[],
 *   options: [{ num: number, text: string }],
 *   qNum: number,
 *   totalQ: number,
 *   management: string,
 *   pageIndex?: number,
 *   totalPages?: number,
 * }
 */
export function buildQuizProblem({ width, height, data }) {
  const theme = getTheme(data.management);
  // 問題本文: 行配列を join して句点で段落分け、各段落を単一 div で自動 wrap
  const fullBody = Array.isArray(data.bodyLines)
    ? data.bodyLines.join('')
    : (data.body || '');
  const paragraphs = fullBody
    .split('。')
    .map((p) => p.trim())
    .filter((p) => p)
    .map((p, i, arr) => (i < arr.length - 1 || fullBody.endsWith('。') ? p + '。' : p));
  const options = data.options || [];

  // 問題本文のフォントサイズを「全文字数」で動的調整
  const bodyFontSize = problemFontSizeFromLength([...fullBody].length);

  // 各選択肢の行数を推定 → 高さを動的計算
  const optionsWithMeta = options.slice(0, 5).map((opt) => {
    const lines = estimateOptionLines(opt.text);
    return { ...opt, lineCount: lines, cardHeight: optionCardHeight(lines) };
  });

  return d(frame(width, height, QUIZ_TOKENS.paper), [
    pageBadge(data.pageIndex ?? 2, data.totalPages ?? 10),

    // 全体: flex column で画面いっぱいに（余白圧縮）
    d(
      {
        position: 'absolute',
        top: 60, left: 60, right: 60, bottom: 40,
        flexDirection: 'column',
        gap: 16,
      },
      [
        // PROBLEM ラベル + 下線
        d({ flexDirection: 'column', gap: 4 }, [
          d({
            fontSize: 28,
            fontWeight: 700,
            color: theme.primary,
            letterSpacing: '0.08em',
          }, `PROBLEM ${data.qNum ?? ''}${data.totalQ ? ` / ${data.totalQ}` : ''}`),
          d({ width: 100, height: 3, background: theme.primary }),
        ]),

        // 問題本文（句点で段落分け、各段落は単一 div で Satori 自動 wrap）
        d(
          {
            flexDirection: 'column',
            gap: 8,
            fontSize: bodyFontSize,
            fontWeight: 700,
            color: QUIZ_TOKENS.ink,
            lineHeight: 1.5,
          },
          paragraphs.map((p) => d({ display: 'flex' }, p)),
        ),

        // 選択肢カード群（動的高さ + 画面下まで広げる）
        d(
          { flexDirection: 'column', gap: 14, flexGrow: 1, justifyContent: 'flex-end' },
          optionsWithMeta.map((opt) =>
            d(
              {
                height: opt.cardHeight,
                background: QUIZ_TOKENS.cardBg,
                border: `1px solid ${QUIZ_TOKENS.cardBorder}`,
                borderRadius: 14,
                paddingLeft: 24, paddingRight: 24,
                paddingTop: 14, paddingBottom: 14,
                alignItems: 'center',
                gap: 20,
                flexShrink: 0,
              },
              [
                d(
                  {
                    width: 60, height: 60,
                    borderRadius: 30,
                    background: theme.primary,
                    color: '#ffffff',
                    fontSize: 32,
                    fontWeight: 700,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  },
                  String(opt.num),
                ),
                d(
                  {
                    fontSize: opt.lineCount === 1 ? 32 : opt.lineCount === 2 ? 28 : 24,
                    fontWeight: 600,
                    color: QUIZ_TOKENS.ink,
                    lineHeight: 1.45,
                    flexShrink: 1,
                  },
                  opt.text || '',
                ),
              ],
            ),
          ),
        ),
      ],
    ),
  ]);
}

/**
 * quiz-pause スライド
 *
 * data: {
 *   headline?: string,    // '考えてみよう' 等
 *   subhead?: string,     // 'スワイプで答え合わせ →' 等
 *   pageIndex?: number,
 *   totalPages?: number,
 * }
 */
export function buildQuizPause({ width, height, data }) {
  return d(frame(width, height, QUIZ_TOKENS.paperGray), [
    pageBadge(data.pageIndex ?? 3, data.totalPages ?? 5),

    // 中央コンテンツ
    d({
      position: 'absolute',
      top: 0, bottom: 0, left: 0, right: 0,
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 40,
    }, [
      // 大きな ▷
      d({
        fontSize: 180,
        fontWeight: 700,
        color: QUIZ_TOKENS.brand,
        lineHeight: 1,
      }, '▷'),

      // 「考えてみよう」
      d({
        fontSize: 64,
        fontWeight: 700,
        color: QUIZ_TOKENS.ink,
      }, data.headline || '考えてみよう'),

      // サブ
      d({
        fontSize: 36,
        fontWeight: 500,
        color: QUIZ_TOKENS.inkSoft,
      }, data.subhead || 'スワイプで答え合わせ →'),
    ]),
  ]);
}

/**
 * quiz-answer スライド
 *
 * data: {
 *   correctNum: number,             // 正答番号 (1-5)
 *   correctText: string,            // 正答の主題 (例: '委託先・調達先・供給先も BCM 対象')
 *   correctSub?: string,            // 正答の補足 (例: '内閣府ガイドライン 令和5年3月')
 *   explanationLines: string[],     // 解説の各行 (折り返し済)
 *   pageIndex?: number,
 *   totalPages?: number,
 * }
 */
export function buildQuizAnswer({ width, height, data }) {
  const theme = getTheme(data.management);
  const explanationLines = Array.isArray(data.explanationLines)
    ? data.explanationLines
    : (data.explanation || '').split('\n').filter((l) => l.trim());
  // 解説の行数でフォント動的調整（少ない場合は大きく、多い場合は小さく）
  const explFontSize = explanationLines.length <= 4
    ? 44
    : explanationLines.length <= 6
      ? 38
      : explanationLines.length <= 8
        ? 32
        : explanationLines.length <= 10
          ? 28
          : 24;

  return d(frame(width, height, QUIZ_TOKENS.paper), [
    pageBadge(data.pageIndex ?? 4, data.totalPages ?? 10),

    // 全体を flex column で画面いっぱいに
    d(
      {
        position: 'absolute',
        top: 60, left: 60, right: 60, bottom: 40,
        flexDirection: 'column',
        gap: 16,
      },
      [
        // ANSWER ラベル + 下線
        d({ flexDirection: 'column', gap: 4 }, [
          d({
            fontSize: 28,
            fontWeight: 700,
            color: theme.primary,
            letterSpacing: '0.08em',
          }, `ANSWER ${data.qNum ?? ''}${data.totalQ ? ` / ${data.totalQ}` : ''}`),
          d({ width: 100, height: 3, background: theme.primary }),
        ]),

        // 緑カード（正答番号 + 主題）
        d({
          background: QUIZ_TOKENS.correctBg,
          border: `3px solid ${QUIZ_TOKENS.correctMark}`,
          borderRadius: 16,
          paddingTop: 28, paddingBottom: 28,
          paddingLeft: 28, paddingRight: 28,
          alignItems: 'center',
          gap: 28,
          flexShrink: 0,
        }, [
          d({
            width: 110, height: 110,
            borderRadius: 55,
            background: QUIZ_TOKENS.correctMark,
            color: '#ffffff',
            fontSize: 60,
            fontWeight: 700,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }, String(data.correctNum || '?')),
          d({
            flexDirection: 'column',
            gap: 8,
            flexShrink: 1,
          }, [
            d({
              fontSize: ([...(data.correctText || '')].length > 20) ? 32 : 38,
              fontWeight: 700,
              color: QUIZ_TOKENS.ink,
              lineHeight: 1.35,
            }, data.correctText || ''),
            data.correctSub
              ? d({
                  fontSize: 26,
                  fontWeight: 500,
                  color: QUIZ_TOKENS.inkSoft,
                  lineHeight: 1.4,
                }, data.correctSub)
              : null,
          ]),
        ]),

        // EXPLANATION ラベル + 下線
        d({ flexDirection: 'column', gap: 4 }, [
          d({
            fontSize: 28,
            fontWeight: 700,
            color: theme.primary,
            letterSpacing: '0.08em',
          }, 'EXPLANATION'),
          d({ width: 180, height: 3, background: theme.primary }),
        ]),

        // 解説本文（動的フォントサイズ・画面下まで広げる）
        d(
          {
            flexDirection: 'column',
            gap: 8,
            fontSize: explFontSize,
            fontWeight: 600,
            color: QUIZ_TOKENS.ink,
            lineHeight: 1.55,
            flexGrow: 1,
            justifyContent: 'flex-start',
          },
          explanationLines.slice(0, 14).map((line) =>
            d({ display: 'flex' }, line || ' '),
          ),
        ),
      ],
    ),
  ]);
}

/**
 * quiz-cta スライド
 *
 * data: {
 *   pageIndex?: number,
 *   totalPages?: number,
 * }
 */
export function buildQuizCta({ width, height, data }) {
  const theme = getTheme(data.management);

  return d(frame(width, height, theme.deep), [
    pageBadge(data.pageIndex ?? 10, data.totalPages ?? 10, theme.paler),

    // 装飾円 (左下)
    d({
      position: 'absolute',
      top: 930, left: -20,
      width: 440, height: 440,
      borderRadius: 220,
      background: theme.primary,
      opacity: 0.2,
    }),
    // 装飾円 (右上)
    d({
      position: 'absolute',
      top: -80, right: -80,
      width: 560, height: 560,
      borderRadius: 280,
      background: theme.primary,
      opacity: 0.3,
    }),

    // タイトル群
    d({
      position: 'absolute',
      top: 380, left: 0, right: 0,
      flexDirection: 'column',
      alignItems: 'center',
      gap: 18,
    }, [
      d({
        fontSize: 40,
        fontWeight: 600,
        color: theme.paler,
        letterSpacing: '0.12em',
      }, 'もっと解きたい人は'),
      d({
        fontSize: 88,
        fontWeight: 700,
        color: '#ffffff',
        letterSpacing: '0.04em',
      }, 'doboku-note で'),
      d({
        fontSize: 56,
        fontWeight: 700,
        color: '#ffffff',
        letterSpacing: '0.04em',
        marginTop: 8,
      }, '全 640 問・全章解説'),
    ]),

    // 「保存して見返す」カード
    d({
      position: 'absolute',
      top: 800, left: 140, right: 140,
      paddingTop: 22, paddingBottom: 22,
      paddingLeft: 32, paddingRight: 32,
      borderRadius: 18,
      background: '#ffffff',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
    }, [
      d({
        fontSize: 30,
        fontWeight: 700,
        color: theme.primary,
        letterSpacing: '0.08em',
      }, '保存ボタンを押して'),
      d({
        fontSize: 30,
        fontWeight: 700,
        color: QUIZ_TOKENS.ink,
      }, '試験前日に見返そう'),
    ]),

    // フッター
    d({
      position: 'absolute',
      bottom: 88, left: 80,
      fontSize: 34,
      fontWeight: 700,
      color: '#ffffff',
      letterSpacing: '0.04em',
    }, 'doboku-note'),
    d({
      position: 'absolute',
      bottom: 52, left: 80,
      fontSize: 22,
      fontWeight: 400,
      color: theme.paler,
    }, 'doboku-note.com'),
  ]);
}
