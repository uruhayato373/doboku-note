/**
 * OGP テンプレートレンダラ。
 * 各テンプレは (title, categoryLabel, backgroundImage) を受け取って satori element を返す純関数。
 * テンプレ追加時は 1) renderers に関数追加 2) src/config/ogp-templates.json に定義追加 3) .claude/reference/ogp-prompts.md に出典記録 の3点セット。
 */

const WIDTH = 1200;
const HEIGHT = 630;
const SITE_NAME = 'doboku-note';

// タイトル長に応じたフォントサイズ（全テンプレ共通の基準）
function titleFontSize(title) {
  const len = title.length;
  if (len <= 20) return 84;
  if (len <= 30) return 72;
  if (len <= 40) return 64;
  if (len <= 55) return 52;
  if (len <= 75) return 44;
  return 36;
}

// ---- 共通要素 ----

function siteBadge({ color = '#94a3b8' } = {}) {
  return {
    type: 'div',
    props: {
      style: {
        position: 'absolute',
        bottom: '36px',
        right: '56px',
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
        fontSize: '26px',
        color,
        fontWeight: 700,
        letterSpacing: '0.08em',
        marginBottom: '32px',
      },
      children: text,
    },
  };
}

function titleBlock(title, { color = '#ffffff', maxWidth = 1040 } = {}) {
  return {
    type: 'div',
    props: {
      style: {
        fontSize: `${titleFontSize(title)}px`,
        fontWeight: 700,
        color,
        textAlign: 'center',
        lineHeight: 1.35,
        maxWidth: `${maxWidth}px`,
        wordBreak: 'break-word',
        fontFamily: '"Noto Sans JP", Inter, sans-serif',
      },
      children: title,
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

// ---- テンプレート 1: navy-white ----
// 深ネイビー×白タイトル。汎用・既定。

function renderNavyWhite({ title, categoryLabel: cat }) {
  const children = [
    // 上部アクセントライン
    {
      type: 'div',
      props: {
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '6px',
          background: 'linear-gradient(90deg, #60a5fa 0%, #a78bfa 100%)',
        },
      },
    },
    categoryLabel(cat, { color: '#93c5fd' }),
    titleBlock(title, { color: '#ffffff', maxWidth: 1040 }),
    siteBadge({ color: '#64748b' }),
  ].filter(Boolean);
  return baseContainer(children, {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
  });
}

// ---- テンプレート 2: dark-wood ----
// ダークウッド×白タイトル。信頼性系。背景画像が無い場合はダーク茶グラデにフォールバック。

function renderDarkWood({ title, categoryLabel: cat, backgroundImage }) {
  const children = [];
  if (backgroundImage) {
    children.push(backgroundImageLayer(backgroundImage));
    children.push(overlay('rgba(20, 12, 6, 0.55)'));
  }
  children.push(
    categoryLabel(cat, { color: '#fcd34d' }),
    titleBlock(title, { color: '#ffffff', maxWidth: 1040 }),
    siteBadge({ color: '#d6bd9a' }),
  );
  return baseContainer(children.filter(Boolean), {
    background: backgroundImage
      ? 'transparent'
      : 'linear-gradient(135deg, #3e2f1f 0%, #1c140b 100%)',
  });
}

// ---- テンプレート 3: red-line ----
// ダークグレー×赤い一本線×白タイトル。体系・構造系。

function renderRedLine({ title, categoryLabel: cat }) {
  const children = [
    // 中央の赤い水平バー
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
          background: '#dc2626',
        },
      },
    },
    categoryLabel(cat, { color: '#fca5a5' }),
    titleBlock(title, { color: '#ffffff', maxWidth: 1000 }),
    siteBadge({ color: '#9ca3af' }),
  ].filter(Boolean);
  return baseContainer(children, { background: '#1f2937' });
}

// ---- テンプレート 4: blackboard ----
// 黒板×白チョーク。教育・解説系。背景画像が無い場合はダーク緑にフォールバック。

function renderBlackboard({ title, categoryLabel: cat, backgroundImage }) {
  const children = [];
  if (backgroundImage) {
    children.push(backgroundImageLayer(backgroundImage));
    children.push(overlay('rgba(10, 25, 15, 0.40)'));
  }
  children.push(
    categoryLabel(cat, { color: '#fde68a' }),
    titleBlock(title, { color: '#f8fafc', maxWidth: 1040 }),
    siteBadge({ color: '#d1d5db' }),
  );
  return baseContainer(children.filter(Boolean), {
    background: backgroundImage
      ? 'transparent'
      : 'linear-gradient(135deg, #1a2e1f 0%, #0a1811 100%)',
  });
}

// ---- テンプレート 5: dark-grid ----
// ダーク×グリッド線×白タイトル。分析・データ系。

function renderDarkGrid({ title, categoryLabel: cat }) {
  // グリッドは SVG パターンで実装。satori は background-image に data URL SVG を許容する。
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
    titleBlock(title, { color: '#ffffff', maxWidth: 1040 }),
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

export function renderTemplate(templateId, props) {
  const fn = renderers[templateId];
  if (!fn) {
    throw new Error(`未知のテンプレ ID: ${templateId}`);
  }
  return fn(props);
}

export function availableTemplates() {
  return Object.keys(renderers);
}
