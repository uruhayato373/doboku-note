/**
 * OGP テンプレートレンダラ（T06 Mono Tag 統一版）。
 *
 * 各テンプレは (props, sizeOpts) を受け取って satori element を返す純関数。
 * テンプレ追加時は 1) renderers に関数追加 2) .claude/config/ogp/templates.json に定義追加 3) docs/reference/ogp-prompts.md に出典記録 の3点セット。
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

// ---- テンプレート: magazine-banner (note マガジン/クリエイターページ ヘッダー対応) ----
//
// note のマガジン/クリエイターページのヘッダーは、画像中央の 1280×216 帯が
// クロップ表示される。主要素（マガジン名）をこの帯の縦中央・横中央に配置し、
// ワードマーク・カテゴリチップ・装飾は帯の上下ゾーンに置く（全体表示時のみ可視）。
// mono-tag（OGP・記事カバー用、中央 630×630 正方形クロップ前提）とは別系統。

const HEADER_BAND_HEIGHT = 216;

function renderMagazineBanner({ lines, categoryLabel: cat, fontSize, accentColor }, { width, height }) {
  // accentColor 指定時はカテゴリバッジ背景・下部アクセント線を試験別色にする（既定はネイビー/シアン）
  const badgeBg = accentColor || C_INK_NAVY;
  const barColor = accentColor || C_CYAN;
  const fineGridUrl = gridDataUrl(30, 'rgba(15,30,63,0.04)', 1);
  const majorGridUrl = gridDataUrl(120, 'rgba(15,30,63,0.09)', 1.25);

  const bandTop = Math.round((height - HEADER_BAND_HEIGHT) / 2);
  const bottomTop = bandTop + HEADER_BAND_HEIGHT;

  const wordmark = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        fontFamily: 'Inter, "Noto Sans JP", sans-serif',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: '24px',
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
              fontSize: '15px',
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
            marginTop: '22px',
            padding: '7px 16px',
            background: badgeBg,
            color: '#ffffff',
            fontFamily: '"Noto Sans JP", Inter, sans-serif',
            fontSize: '18px',
            fontWeight: 600,
            letterSpacing: '0.5px',
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
            { type: 'div', props: { style: { display: 'flex' }, children: cat } },
          ],
        },
      }
    : null;

  const titleLines = lines.map((line) => ({
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
  }));

  const accentBar = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        width: '72px',
        height: '4px',
        background: barColor,
        marginBottom: '18px',
      },
      children: [],
    },
  };

  const domainText = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        fontSize: '15px',
        color: C_INK_MUTED,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        fontFamily: 'Inter, "Noto Sans JP", sans-serif',
      },
      children: SITE_DOMAIN,
    },
  };

  const zone = (top, zoneHeight, items) => ({
    type: 'div',
    props: {
      style: {
        position: 'absolute',
        top: `${top}px`,
        left: 0,
        width: `${width}px`,
        height: `${zoneHeight}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
      children: items,
    },
  });

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
          backgroundImage: `url(${majorGridUrl}), url(${fineGridUrl})`,
          backgroundRepeat: 'repeat, repeat',
        },
        children: [],
      },
    },
    // 上ゾーン（ヘッダー帯の外・全体表示時のみ可視）: ワードマーク＋カテゴリチップ
    zone(0, bandTop, [wordmark, categoryChip].filter(Boolean)),
    // 中央ヘッダー帯（note ヘッダーでクロップ表示される 1280×216）: マガジン名
    zone(bandTop, HEADER_BAND_HEIGHT, titleLines),
    // 下ゾーン（ヘッダー帯の外・全体表示時のみ可視）: アクセント＋ドメイン
    zone(bottomTop, height - bottomTop, [accentBar, domainText]),
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

// ---- テンプレート: note-cover-g2 (note 記事/マガジンカバー・全幅バナー帯) ----
//
// 出典: handoff covers-g2-all.jsx（claude.ai/design「G2 案」）を satori へ移植。
// 試験区分=ベース色 / 系列(notePricing)=濃淡 の二軸。値の SSoT は
// docs/design-system/note-cover-tokens.json（呼び出し側 generate-note-covers.mjs が
// exam→パレット解決し props.palette として渡す）。mono-tag（OGP・正方形クロップ前提）
// とは別系統で、1280×670 フル活用しつつ中央 630×630 に最重要テキストを収める。

// G2 ニュートラル色（試験非依存。tokens.json neutral と同値を埋め込み）
const G2_PAPER_FROM = '#F4F6F9';
const G2_PAPER_TO = '#E4E9F0';
const G2_INK = '#1B2430';
const G2_WORDMARK_INK = '#16365C';
const G2_WORDMARK_ACCENT = '#1E73C8';

// チップ/ロゴ用 24×24 lucide 風アイコン（stroke パスの内側マークアップ）
const G2_ICON_PATHS = {
  pen: '<path d="M4 20l4-1L19 8a2 2 0 0 0-3-3L5 16l-1 4Z"/><path d="M14 7l3 3"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  doc: '<path d="M7 3h7l4 4v14H7Z"/><path d="M14 3v4h4"/><path d="M10 12h5M10 16h5"/>',
  edit: '<path d="M5 19h14"/><path d="M6 15l9-9 3 3-9 9H6Z"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 9h16M8 3v4M16 3v4"/>',
  chart: '<path d="M5 19V5"/><path d="M5 19h14"/><path d="M9 16v-4M13 16V8M17 16v-6"/>',
  check: '<circle cx="12" cy="12" r="8"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>',
  book: '<path d="M5 4h9a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H5Z"/><path d="M5 4v14"/>',
  layers: '<path d="M12 4l8 4-8 4-8-4 8-4Z"/><path d="M4 12l8 4 8-4M4 16l8 4 8-4"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10c1 1 1 2 1 3h6c0-1 0-2 1-3a6 6 0 0 0-4-10Z"/>',
  flag: '<path d="M6 21V4"/><path d="M6 4h11l-2 4 2 4H6"/>',
  yen: '<path d="M12 13v6M8 7l4 6 4-6M8 13h8M9 16h6"/>',
  map: '<path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z"/><path d="M9 4v14M15 6v14"/>',
};

function g2IconDataUrl(name, color, size = 18, stroke = 2.2) {
  const inner = G2_ICON_PATHS[name] || G2_ICON_PATHS.doc;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='${size}' height='${size}' fill='none' stroke='${color}' stroke-width='${stroke}' stroke-linecap='round' stroke-linejoin='round'>${inner}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function g2IconImg(name, color, size, stroke) {
  return {
    type: 'img',
    props: { src: g2IconDataUrl(name, color, size, stroke), width: size, height: size, style: { display: 'flex' } },
  };
}

function g2DecorDataUrl(width, height) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}' width='${width}' height='${height}'>` +
    `<g stroke='rgba(22,54,92,0.10)' stroke-width='1.4' fill='none'>` +
    `<circle cx='${width - 160}' cy='125' r='110'/><circle cx='${width - 160}' cy='125' r='78'/>` +
    `<circle cx='${width - 160}' cy='125' r='46' stroke-dasharray='4 5'/>` +
    `<line x1='${width - 290}' y1='125' x2='${width + 20}' y2='125'/>` +
    `<line x1='${width - 160}' y1='5' x2='${width - 160}' y2='245'/></g></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// 実効文字数（全角=1.0 / 半角英数記号=0.55）。日本語混在の見かけ幅を近似。
function effectiveCharCount(text) {
  let w = 0;
  for (const ch of String(text || '')) {
    w += /[\x00-\x7F]/.test(ch) ? 0.55 : 1.0;
  }
  return w;
}

// バナー帯フォントサイズ。デザイン上限 110px。ただし中央 630×630 の
// セーフ幅(590px)にテキストが収まることを最優先（note リンクカード/サムネは
// 正方形クロップされるため、最重要のバナー文言が両端で切れてはいけない）。
function bannerFontSize(text) {
  const ec = effectiveCharCount(text) || 1;
  const LS = 1.03; // letterSpacing 0.03em 分の余裕
  const fit = Math.floor((SAFETY_WIDTH - 8) / (ec * LS));
  return Math.max(48, Math.min(110, fit));
}

// HiBox フォントサイズ。短い強調語なら大きく、長ければ縮小。
function hiFontSize(text) {
  const ec = effectiveCharCount(text) || 1;
  if (ec <= 3) return 112;
  if (ec <= 5) return 92;
  return 76;
}

function renderNoteCoverG2({ cover, palette }, { width, height }) {
  const band = palette.band; // 系列トーン解決済みの試験色
  const accent = palette.accent || band;
  const examLabel = palette.label || '';
  const c = cover || {};
  const chips = Array.isArray(c.chips) ? c.chips.slice(0, 3) : [];

  const fineGridUrl = gridDataUrl(8, 'rgba(22,54,92,0.04)', 1);
  const majorGridUrl = gridDataUrl(32, 'rgba(22,54,92,0.06)', 1);

  // 背景: グラデ + 2層グリッド + 同心円装飾
  const background = {
    type: 'div',
    props: {
      style: {
        position: 'absolute', inset: 0, display: 'flex',
        backgroundImage: `url(${g2DecorDataUrl(width, height)}), url(${fineGridUrl}), url(${majorGridUrl}), linear-gradient(135deg, ${G2_PAPER_FROM} 0%, ${G2_PAPER_TO} 100%)`,
        backgroundRepeat: 'no-repeat, repeat, repeat, no-repeat',
      },
      children: [],
    },
  };

  // 左上: ロゴバッジ
  const logo = {
    type: 'div',
    props: {
      style: { position: 'absolute', top: '34px', left: '56px', display: 'flex', alignItems: 'center', fontFamily: 'Inter, "Noto Sans JP", sans-serif' },
      children: [
        {
          type: 'div',
          props: {
            style: { display: 'flex', width: '30px', height: '30px', borderRadius: '7px', background: G2_WORDMARK_INK, alignItems: 'center', justifyContent: 'center', marginRight: '9px' },
            children: [g2IconImg('book', '#fff', 18, 2.2)],
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', fontSize: '21px', fontWeight: 800, letterSpacing: '-0.4px', color: G2_WORDMARK_INK },
            children: [
              { type: 'span', props: { style: { display: 'flex' }, children: 'doboku' } },
              { type: 'span', props: { style: { display: 'flex', color: G2_WORDMARK_ACCENT }, children: '-' } },
              { type: 'span', props: { style: { display: 'flex' }, children: 'note' } },
            ],
          },
        },
      ],
    },
  };

  // 右上: メタ（試験ラベル + 任意の meta 文）
  const metaText = c.meta ? `${examLabel}　${c.meta}` : examLabel;
  const meta = {
    type: 'div',
    props: {
      style: { position: 'absolute', top: '42px', right: '56px', display: 'flex', fontWeight: 800, fontSize: '16px', letterSpacing: '0.1em', color: band, fontFamily: '"Noto Sans JP", Inter, sans-serif' },
      children: metaText,
    },
  };

  // 上部: リード文 + HiBox + hiSuffix
  const hiBox = {
    type: 'div',
    props: {
      style: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', background: band, color: '#fff',
        borderRadius: '10px', fontWeight: 900, fontSize: `${hiFontSize(c.hi)}px`, lineHeight: 1,
        padding: '0 16px', height: `${Math.round(hiFontSize(c.hi) * 1.06)}px`,
        boxShadow: '0 6px 18px rgba(14,38,69,0.28)', marginRight: '14px',
        fontFamily: '"Noto Sans JP", Inter, sans-serif',
      },
      children: c.hi || '',
    },
  };
  const upper = {
    type: 'div',
    props: {
      style: { position: 'absolute', left: 0, top: '122px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 60px', fontFamily: '"Noto Sans JP", Inter, sans-serif' },
      children: [
        { type: 'div', props: { style: { display: 'flex', fontSize: '37px', fontWeight: 800, color: G2_INK, textAlign: 'center' }, children: c.leadIn || '' } },
        {
          type: 'div',
          props: {
            style: { display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '12px' },
            children: [
              hiBox,
              { type: 'div', props: { style: { display: 'flex', fontSize: '58px', fontWeight: 900, color: G2_INK }, children: c.hiSuffix || '' } },
            ],
          },
        },
      ],
    },
  };

  // 全幅バナー帯
  const banner = {
    type: 'div',
    props: {
      style: {
        position: 'absolute', left: 0, top: '392px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center',
        background: band, color: '#fff', padding: '18px 0', boxShadow: '0 8px 24px rgba(14,38,69,0.25)',
        fontFamily: '"Noto Sans JP", Inter, sans-serif',
      },
      children: [
        { type: 'div', props: { style: { display: 'flex', fontWeight: 900, fontSize: `${bannerFontSize(c.banner)}px`, lineHeight: 1, letterSpacing: '0.03em' }, children: c.banner || '' } },
      ],
    },
  };

  // 下部: アイコンチップ 3 個
  const chipEls = chips.map((chip, i) => ({
    type: 'div',
    props: {
      style: {
        display: 'flex', alignItems: 'center', background: '#fff', border: `2px solid ${band}`, borderRadius: '999px',
        padding: '8px 18px 8px 8px', boxShadow: '0 3px 10px rgba(22,54,92,0.12)', marginLeft: i === 0 ? '0' : '14px',
      },
      children: [
        {
          type: 'div',
          props: {
            style: { display: 'flex', width: '34px', height: '34px', borderRadius: '999px', background: band, alignItems: 'center', justifyContent: 'center', marginRight: '10px' },
            children: [g2IconImg(chip.icon || 'doc', '#fff', 18, 2.2)],
          },
        },
        { type: 'div', props: { style: { display: 'flex', fontWeight: 800, fontSize: '19px', color: G2_INK, fontFamily: '"Noto Sans JP", Inter, sans-serif' }, children: chip.text || '' } },
      ],
    },
  }));
  const chipRow = {
    type: 'div',
    props: {
      style: { position: 'absolute', left: 0, bottom: '36px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 40px' },
      children: chipEls,
    },
  };

  const children = [background, logo, meta, upper, banner];
  if (chipEls.length > 0) children.push(chipRow);

  return {
    type: 'div',
    props: {
      style: { width: `${width}px`, height: `${height}px`, display: 'flex', position: 'relative', background: G2_PAPER_FROM, color: G2_INK, fontFamily: '"Noto Sans JP", Inter, sans-serif' },
      children,
    },
  };
}

// ---- ディスパッチ ----

const renderers = {
  'mono-tag': renderMonoTag,
  'magazine-banner': renderMagazineBanner,
  'note-cover-g2': renderNoteCoverG2,
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
