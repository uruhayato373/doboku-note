/**
 * OGP テンプレートレンダラ（T06 Mono Tag 統一版）。
 *
 * 各テンプレは (props, sizeOpts) を受け取って satori element を返す純関数。
 * テンプレ追加時は 1) renderers に関数追加 2) .claude/config/ogp/templates.json に定義追加 3) .claude/reference/ogp-prompts.md に出典記録 の3点セット。
 *
 * セーフティゾーン: 中央 630×630 が 1:1 クロップ時にも残る領域。
 *   タイトル・カテゴリチップ・ワードマーク・メタはこの内側に収まるよう描画する。
 *   装飾要素（グリッド・アクセントバー）は全幅 OK。クロップされても問題ない前提。
 *
 * サイズパラメータ: renderTemplate(id, props, { width, height }) で OGP=1200×630 と
 *   note カバー=1280×670 の両方をサポート。SAFE_L = (W - 630) / 2 で求める。
 */

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 630;
const SAFETY_ZONE_WIDTH = 630; // 中央正方形の幅（両サイズ共通）
const SAFETY_WIDTH = 590; // タイトルが収まる横幅の上限（pickFontSize が消費する）

const SITE_NAME = 'doboku-note';
const SITE_TAGLINE = '土木系資格試験ノート';
const SITE_DOMAIN = 'doboku-note.com';

// --- T06 Mono Tag color tokens ---
const C_BG = '#fdfcf8';
const C_INK_DEEP = '#0a1428';
const C_INK_NAVY = '#0f1e3f';
const C_INK_MUTED = 'rgba(15, 30, 63, 0.5)';
const C_INK_RULE = 'rgba(15, 30, 63, 0.12)';
const C_CYAN = '#06b6d4';
const C_CYAN_ACCENT = '#22d3ee';
const C_NAVY_ACCENT = '#1e3a8a';

// --- helpers ---

function gridDataUrl(stepPx, color, strokeWidth) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${stepPx}' height='${stepPx}'><path d='M ${stepPx} 0 L 0 0 0 ${stepPx}' fill='none' stroke='${color}' stroke-width='${strokeWidth}'/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function debugSafetyOverlay(width) {
  const safeL = Math.round((width - SAFETY_ZONE_WIDTH) / 2);
  return {
    type: 'div',
    props: {
      style: {
        position: 'absolute',
        top: 0,
        left: `${safeL}px`,
        width: `${SAFETY_ZONE_WIDTH}px`,
        height: `${SAFETY_ZONE_WIDTH}px`,
        display: 'flex',
        border: '3px solid #ff0000',
        boxSizing: 'border-box',
      },
      children: [],
    },
  };
}

// ---- テンプレート: mono-tag (T06) ----

function renderMonoTag({ lines, categoryLabel: cat, fontSize }, { width, height }) {
  const safeL = Math.round((width - SAFETY_ZONE_WIDTH) / 2);
  const innerWidth = SAFETY_ZONE_WIDTH;

  const fineGridUrl = gridDataUrl(30, 'rgba(15,30,63,0.04)', 1);
  const majorGridUrl = gridDataUrl(120, 'rgba(15,30,63,0.09)', 1.25);

  // 上下パディング: 110px top / 80px bottom（handoff 仕様 L455-456）
  const contentTop = 110;
  const contentBottom = 80;
  const contentHeight = height - contentTop - contentBottom;

  const wordmark = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        marginBottom: '28px',
        fontFamily: 'Inter, "Noto Sans JP", sans-serif',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: '22px',
              fontWeight: 800,
              letterSpacing: '-0.6px',
              color: C_INK_NAVY,
              marginRight: '16px',
            },
            children: [
              { type: 'span', props: { style: { display: 'flex' }, children: 'doboku' } },
              { type: 'span', props: { style: { display: 'flex', color: C_CYAN }, children: '-' } },
              { type: 'span', props: { style: { display: 'flex' }, children: 'note' } },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: '14px',
              color: C_INK_MUTED,
              letterSpacing: '1.5px',
              fontFamily: '"Noto Sans JP", Inter, sans-serif',
            },
            children: SITE_TAGLINE,
          },
        },
      ],
    },
  };

  const categoryChip = cat
    ? {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            alignItems: 'center',
            alignSelf: 'flex-start',
            padding: '6px 14px',
            background: C_INK_NAVY,
            color: '#ffffff',
            fontFamily: '"Noto Sans JP", Inter, sans-serif',
            fontSize: '17px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            marginBottom: '28px',
          },
          children: [
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  color: C_CYAN_ACCENT,
                  fontSize: '14px',
                  marginRight: '10px',
                  fontFamily: 'Inter, "Noto Sans JP", sans-serif',
                },
                children: '▶',
              },
            },
            {
              type: 'div',
              props: { style: { display: 'flex' }, children: cat },
            },
          ],
        },
      }
    : null;

  const titleBlock = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        fontFamily: '"Noto Sans JP", Inter, sans-serif',
      },
      children: lines.map((line) => ({
        type: 'div',
        props: {
          style: {
            display: 'flex',
            fontSize: `${fontSize}px`,
            fontWeight: 800,
            lineHeight: 1.35,
            color: C_INK_DEEP,
            letterSpacing: '-0.4px',
          },
          children: line,
        },
      })),
    },
  };

  const metaRow = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: `1px solid ${C_INK_RULE}`,
        paddingTop: '14px',
        fontFamily: 'Inter, "Noto Sans JP", sans-serif',
        fontSize: '12px',
        color: C_INK_MUTED,
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
      },
      children: [
        {
          type: 'div',
          props: { style: { display: 'flex' }, children: `READ ON ${SITE_DOMAIN}` },
        },
        {
          type: 'div',
          props: { style: { display: 'flex' }, children: `${width} × ${height} · OG` },
        },
      ],
    },
  };

  const innerStack = [wordmark, categoryChip, titleBlock, metaRow].filter(Boolean);

  const children = [
    // 背景グリッド（major + fine 重ね）
    {
      type: 'div',
      props: {
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundImage: `url(${majorGridUrl}), url(${fineGridUrl})`,
          backgroundRepeat: 'repeat, repeat',
        },
        children: [],
      },
    },
    // 左上シアンバー（装飾、安全領域外 OK）
    {
      type: 'div',
      props: {
        style: {
          position: 'absolute',
          top: '80px',
          left: 0,
          width: '80px',
          height: '4px',
          display: 'flex',
          background: C_CYAN,
        },
        children: [],
      },
    },
    // 右下紺バー
    {
      type: 'div',
      props: {
        style: {
          position: 'absolute',
          bottom: '80px',
          right: 0,
          width: '80px',
          height: '4px',
          display: 'flex',
          background: C_NAVY_ACCENT,
        },
        children: [],
      },
    },
    // セーフティゾーン内主コンテンツ
    {
      type: 'div',
      props: {
        style: {
          position: 'absolute',
          left: `${safeL}px`,
          top: `${contentTop}px`,
          width: `${innerWidth}px`,
          height: `${contentHeight}px`,
          display: 'flex',
          flexDirection: 'column',
        },
        children: innerStack,
      },
    },
  ];

  return {
    type: 'div',
    props: {
      style: {
        width: `${width}px`,
        height: `${height}px`,
        display: 'flex',
        position: 'relative',
        background: C_BG,
        fontFamily: '"Noto Sans JP", Inter, sans-serif',
      },
      children,
    },
  };
}

// ---- ディスパッチ ----

const renderers = {
  'mono-tag': renderMonoTag,
};

/**
 * テンプレート描画のエントリポイント。
 * @param {string} templateId - テンプレ ID（現状 'mono-tag' のみ）
 * @param {object} props - { lines, categoryLabel, fontSize }
 * @param {object} [sizeOpts] - { width, height } 省略時は 1200×630
 */
export function renderTemplate(templateId, props, sizeOpts = {}) {
  const fn = renderers[templateId];
  if (!fn) {
    throw new Error(`未知のテンプレ ID: ${templateId}`);
  }
  const width = sizeOpts.width || DEFAULT_WIDTH;
  const height = sizeOpts.height || DEFAULT_HEIGHT;
  const element = fn(props, { width, height });
  if (props.debugSafety) {
    element.props.children = [...element.props.children, debugSafetyOverlay(width)];
  }
  return element;
}

export function availableTemplates() {
  return Object.keys(renderers);
}

export const LAYOUT_CONSTANTS = {
  WIDTH: DEFAULT_WIDTH,
  HEIGHT: DEFAULT_HEIGHT,
  SAFETY_WIDTH,
  SAFETY_ZONE_WIDTH,
};
