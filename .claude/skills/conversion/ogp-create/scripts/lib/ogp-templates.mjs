/**
 * OGP テンプレートレンダラ。
 * 各テンプレは (props) を受け取って satori element を返す純関数。
 * テンプレ追加時は 1) renderers に関数追加 2) .claude/config/ogp/templates.json に定義追加 3) .claude/reference/ogp-prompts.md に出典記録 の3点セット。
 *
 * セーフティゾーン: 中央 630×630 が 1:1 クロップ時にも残る領域。タイトル・カテゴリラベル・サイト名は
 * この内側（幅 SAFETY_WIDTH / 高さ SAFETY_HEIGHT 相当）に収まるよう描画する。
 * 装飾要素（グラデーション・グリッド・バー）は全幅 OK。クロップされても問題ない前提。
 */

const WIDTH = 1200;
const HEIGHT = 630;
const SAFETY_WIDTH = 560;
const SITE_NAME = 'doboku-note';

// ---- 共通要素 ----

function siteBadge({ color = '#94a3b8' } = {}) {
  // セーフティゾーン内に収めるため中央下に配置（従来は右下コーナー）。
  return {
    type: 'div',
    props: {
      style: {
        position: 'absolute',
        bottom: '32px',
        left: '0',
        right: '0',
        display: 'flex',
        justifyContent: 'center',
        fontSize: '22px',
        color,
        fontWeight: 700,
        letterSpacing: '0.04em',
        fontFamily: 'Inter, "Noto Sans JP", sans-serif',
      },
      children: SITE_NAME,
    },
  };
}

function categoryLabel(text, { color = '#60a5fa' } = {}) {
  if (!text) return null;
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        fontSize: '26px',
        color,
        fontWeight: 700,
        letterSpacing: '0.08em',
        marginBottom: '24px',
      },
      children: text,
    },
  };
}

/**
 * タイトルブロック。行配列を受け取り、1 行ずつ div で描画する。
 * フォントサイズは呼び出し側で `scripts/lib/ogp-text.mjs` の pickFontSize() で決定済みの前提。
 */
function titleBlock(lines, { color = '#ffffff', fontSize = 64 } = {}) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: `${SAFETY_WIDTH}px`,
        fontFamily: '"Noto Sans JP", Inter, sans-serif',
      },
      children: lines.map(line => ({
        type: 'div',
        props: {
          style: {
            display: 'flex',
            fontSize: `${fontSize}px`,
            fontWeight: 700,
            color,
            lineHeight: 1.3,
            textAlign: 'center',
          },
          children: line,
        },
      })),
    },
  };
}

function baseContainer(children, { background }) {
  return {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px 80px',
        position: 'relative',
        background,
        fontFamily: '"Noto Sans JP", Inter, sans-serif',
      },
      children,
    },
  };
}

function backgroundImageLayer(src) {
  return {
    type: 'div',
    props: {
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        backgroundImage: `url(${src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      },
      children: [],
    },
  };
}

function overlay(color) {
  return {
    type: 'div',
    props: {
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        background: color,
      },
      children: [],
    },
  };
}

/**
 * デバッグ用の中央 630×630 セーフティゾーン赤枠。
 * --debug-safety フラグ時のみ overlay として追加される。
 */
function debugSafetyOverlay() {
  return {
    type: 'div',
    props: {
      style: {
        position: 'absolute',
        top: 0,
        left: '285px',
        width: '630px',
        height: '630px',
        display: 'flex',
        border: '3px solid #ff0000',
        boxSizing: 'border-box',
      },
      children: [],
    },
  };
}

// ---- テンプレート 1: navy-white ----

function renderNavyWhite({ lines, categoryLabel: cat, fontSize }) {
  const children = [
    {
      type: 'div',
      props: {
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '6px',
          display: 'flex',
          background: 'linear-gradient(90deg, #60a5fa 0%, #a78bfa 100%)',
        },
      },
    },
    categoryLabel(cat, { color: '#93c5fd' }),
    titleBlock(lines, { color: '#ffffff', fontSize }),
    siteBadge({ color: '#64748b' }),
  ].filter(Boolean);
  return baseContainer(children, {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
  });
}

// ---- テンプレート 2: dark-wood ----

function renderDarkWood({ lines, categoryLabel: cat, fontSize, backgroundImage }) {
  const children = [];
  if (backgroundImage) {
    children.push(backgroundImageLayer(backgroundImage));
    children.push(overlay('rgba(20, 12, 6, 0.55)'));
  }
  children.push(
    categoryLabel(cat, { color: '#fcd34d' }),
    titleBlock(lines, { color: '#ffffff', fontSize }),
    siteBadge({ color: '#d6bd9a' }),
  );
  return baseContainer(children.filter(Boolean), {
    background: backgroundImage
      ? 'transparent'
      : 'linear-gradient(135deg, #3e2f1f 0%, #1c140b 100%)',
  });
}

// ---- テンプレート 3: red-line ----

function renderRedLine({ lines, categoryLabel: cat, fontSize }) {
  const children = [
    {
      type: 'div',
      props: {
        style: {
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: '8px',
          marginTop: '-4px',
          display: 'flex',
          background: '#dc2626',
        },
      },
    },
    categoryLabel(cat, { color: '#fca5a5' }),
    titleBlock(lines, { color: '#ffffff', fontSize }),
    siteBadge({ color: '#9ca3af' }),
  ].filter(Boolean);
  return baseContainer(children, { background: '#1f2937' });
}

// ---- テンプレート 4: blackboard ----

function renderBlackboard({ lines, categoryLabel: cat, fontSize, backgroundImage }) {
  const children = [];
  if (backgroundImage) {
    children.push(backgroundImageLayer(backgroundImage));
    children.push(overlay('rgba(10, 25, 15, 0.40)'));
  }
  children.push(
    categoryLabel(cat, { color: '#fde68a' }),
    titleBlock(lines, { color: '#f8fafc', fontSize }),
    siteBadge({ color: '#d1d5db' }),
  );
  return baseContainer(children.filter(Boolean), {
    background: backgroundImage
      ? 'transparent'
      : 'linear-gradient(135deg, #1a2e1f 0%, #0a1811 100%)',
  });
}

// ---- テンプレート 5: dark-grid ----

function renderDarkGrid({ lines, categoryLabel: cat, fontSize }) {
  const gridSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'><path d='M 60 0 L 0 0 0 60' fill='none' stroke='rgba(148,163,184,0.18)' stroke-width='1'/></svg>`;
  const gridUrl = `data:image/svg+xml;base64,${Buffer.from(gridSvg).toString('base64')}`;

  const children = [
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
          backgroundImage: `url(${gridUrl})`,
          backgroundRepeat: 'repeat',
        },
        children: [],
      },
    },
    categoryLabel(cat, { color: '#67e8f9' }),
    titleBlock(lines, { color: '#ffffff', fontSize }),
    siteBadge({ color: '#64748b' }),
  ].filter(Boolean);

  return baseContainer(children, { background: '#0f172a' });
}

// ---- ディスパッチ ----

const renderers = {
  'navy-white': renderNavyWhite,
  'dark-wood': renderDarkWood,
  'red-line': renderRedLine,
  blackboard: renderBlackboard,
  'dark-grid': renderDarkGrid,
};

/**
 * テンプレート描画のエントリポイント。
 * @param {string} templateId
 * @param {object} props - { lines, categoryLabel, fontSize, backgroundImage?, debugSafety? }
 */
export function renderTemplate(templateId, props) {
  const fn = renderers[templateId];
  if (!fn) {
    throw new Error(`未知のテンプレ ID: ${templateId}`);
  }
  const element = fn(props);
  if (props.debugSafety) {
    element.props.children = [...element.props.children, debugSafetyOverlay()];
  }
  return element;
}

export function availableTemplates() {
  return Object.keys(renderers);
}

export const LAYOUT_CONSTANTS = { WIDTH, HEIGHT, SAFETY_WIDTH };
