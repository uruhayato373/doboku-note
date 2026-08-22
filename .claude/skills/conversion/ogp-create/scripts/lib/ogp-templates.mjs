/**
 * OGP テンプレートレンダラ（T06 Mono Tag 統一版）。
 *
 * 各テンプレは (props, sizeOpts) を受け取って satori element を返す純関数。
 * テンプレ追加時は 1) renderers に関数追加 2) .claude/config/ogp/templates.json に定義追加 3) .claude/knowledge/reference/ogp-prompts.md に出典記録 の3点セット。
 *
 * レイアウト方針（2026-06-16〜）:
 *   - mono-tag（サイト OGP / cover 無し note カバー）は全幅レイアウト。左右 72px パディング内に
 *     ワードマーク・カテゴリチップ・タイトル（縦中央寄せ・最大76px）を置き、資格別テーマ色の 16px 外枠を描く。
 *   - magazine-banner / note-cover-g2 は中央 630×630 セーフティゾーン（1:1 クロップ耐性）を厳守する別系統。
 *   装飾要素（グリッド・アクセントバー）は全幅 OK。
 *   デザイン真実源: .claude/knowledge/reference/ogp-prompts.md。
 *
 * サイズパラメータ: renderTemplate(id, props, { width, height }) で OGP=1200×630 と
 *   note カバー=1280×670 の両方をサポート。SAFETY_ZONE_WIDTH=630 は g2/banner 系のセーフ幅算出に使う。
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
// 背景画像（AI 生成）を敷くときの可読性スクリム。半透明オフホワイトで質感を残しつつ
// タイトル・チップを読みやすく保つ。背景は生成側で淡く正規化済みなので 0.7 で質感を活かす。
// alpha を上げるほど文字優先・背景は控えめになる（読みにくければ上げる）。
const C_SCRIM = 'rgba(253, 252, 248, 0.7)';

// --- helpers ---

function gridDataUrl(stepPx, color, strokeWidth) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${stepPx}' height='${stepPx}'><path d='M ${stepPx} 0 L 0 0 0 ${stepPx}' fill='none' stroke='${color}' stroke-width='${strokeWidth}'/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// hex を amount(0..1) だけ白へブレンドして明るくする。ダーク地で資格色（紺/藍など
// 暗い色）にコントラストを与えるためのアクセント生成に使う。
function lightenHex(hex, amount) {
  const h = String(hex).replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c) => Math.round(c + (255 - c) * amount);
  const to2 = (n) => n.toString(16).padStart(2, '0');
  return `#${to2(mix(r))}${to2(mix(g))}${to2(mix(b))}`;
}

// 資格別テーマ色（base）から OGP ダーク背景グラデを生成する。
// 白文字の可読性を確保するため輝度を 40%/20% まで落とす（黒寄りだが色味は残る）。
function darkBgGradient(hex) {
  const h = String(hex).replace('#', '');
  if (h.length !== 6) return 'radial-gradient(120% 120% at 18% 8%, #161d33 0%, #0a0e1a 70%)';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const from = `rgb(${Math.round(r * 0.40)},${Math.round(g * 0.40)},${Math.round(b * 0.40)})`;
  const to   = `rgb(${Math.round(r * 0.20)},${Math.round(g * 0.20)},${Math.round(b * 0.20)})`;
  // radial（左上寄り）。satori は linear-gradient の原点コーナーをブロック状に塗る
  // アーティファクト（左上の四角）を出すため radial にして回避（2026-06-29）。
  return `radial-gradient(120% 120% at 18% 8%, ${from} 0%, ${to} 70%)`;
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

// ---- テンプレート: mono-tag ダーク（2026-06-29 リデザイン。--dark 指定時のみ・2026-07-02 に非既定化）----
//
// 深紺グラデ地。ワードマークは置かず、資格名を大きな kicker（accentLight）に。
// タイトルは「資格名を除いた主題（大・白）＋サブタイトル（小・淡色）」の階層で、
// kicker との重複を避ける（資格名除去・主題/サブ分割は ogp-create 側 deriveTitleParts）。
// 出所表示は左下の控えめなドメインのみ。資格識別は accentLight（資格色を白へ寄せた明色）で
// kicker・バッジ・外枠に効かせ、紺/藍の資格でも沈ませない。
function renderMonoTagDark({ examLabel, mainLines, subLines, mainFont, contentType, accentColor }, { width, height }) {
  const safeL = 72;
  const contentTop = 92;
  const contentBottom = 78;
  const innerW = width - safeL * 2;
  const contentH = height - contentTop - contentBottom;
  const accent = accentColor || C_INK_NAVY;
  const accentLight = lightenHex(accent, 0.5);
  const titleWhite = '#f5f7fc';
  const subColor = 'rgba(245, 247, 252, 0.6)';
  const domainColor = 'rgba(255, 255, 255, 0.52)';

  const LH = 1.3;
  const lines = mainLines && mainLines.length ? mainLines : [''];
  const subs = subLines || [];
  let mFont = mainFont || 72;
  const subFont = Math.max(26, Math.round(mFont * 0.46));
  const KICKER = 64; // kicker 行（フォント 46 + marginBottom 18）の概算高さ
  const subBlockH = subs.length ? 12 + subs.length * subFont * 1.3 : 0;
  const fitsV = (mf) => KICKER + lines.length * mf * LH + subBlockH;
  while (mFont > 40 && fitsV(mFont) > contentH) mFont -= 2;
  // 最小でも収まらない長文は行クランプ＋省略記号（重なり防止）
  let mLines = lines;
  const avail = contentH - KICKER - subBlockH;
  const maxLines = Math.max(1, Math.floor(avail / (mFont * LH)));
  if (mLines.length > maxLines) {
    mLines = mLines.slice(0, maxLines);
    mLines[maxLines - 1] = mLines[maxLines - 1].replace(/[\s、。・　]+$/u, '') + '…';
  }

  const kicker = {
    type: 'div',
    props: {
      style: { display: 'flex', fontSize: '46px', fontWeight: 800, letterSpacing: '0.5px', color: accentLight, fontFamily: '"Noto Sans JP", Inter, sans-serif' },
      children: examLabel || '',
    },
  };
  const badge = contentType
    ? {
        type: 'div',
        props: {
          style: { display: 'flex', alignItems: 'center', padding: '10px 22px 10px 16px', borderRadius: '999px', border: `2px solid ${accentLight}`, background: 'rgba(255,255,255,0.08)', fontFamily: '"Noto Sans JP", Inter, sans-serif' },
          children: [
            g2IconImg(contentType.icon, accentLight, 26, 2.4),
            { type: 'div', props: { style: { display: 'flex', marginLeft: '10px', fontSize: '26px', fontWeight: 700, letterSpacing: '0.5px', color: accentLight }, children: contentType.label } },
          ],
        },
      }
    : null;
  const topRow = {
    type: 'div',
    props: { style: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }, children: [kicker, badge].filter(Boolean) },
  };
  const mainEl = {
    type: 'div',
    props: {
      style: { display: 'flex', flexDirection: 'column', fontFamily: '"Noto Sans JP", Inter, sans-serif' },
      children: mLines.map((l) => ({ type: 'div', props: { style: { display: 'flex', fontSize: `${mFont}px`, fontWeight: 800, lineHeight: LH, color: titleWhite, letterSpacing: '-0.5px' }, children: l } })),
    },
  };
  const subEl = subs.length
    ? {
        type: 'div',
        props: {
          style: { display: 'flex', flexDirection: 'column', marginTop: '12px', fontFamily: '"Noto Sans JP", Inter, sans-serif' },
          children: subs.map((l) => ({ type: 'div', props: { style: { display: 'flex', fontSize: `${subFont}px`, fontWeight: 700, lineHeight: 1.3, color: subColor }, children: l } })),
        },
      }
    : null;
  const centerBlock = {
    type: 'div',
    props: { style: { display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }, children: [mainEl, subEl].filter(Boolean) },
  };

  return {
    type: 'div',
    props: {
      style: { width: `${width}px`, height: `${height}px`, display: 'flex', position: 'relative', background: accentColor ? darkBgGradient(accentColor) : 'radial-gradient(120% 120% at 18% 8%, #161d33 0%, #0a0e1a 70%)', fontFamily: '"Noto Sans JP", Inter, sans-serif' },
      children: [
        { type: 'div', props: { style: { position: 'absolute', left: `${safeL}px`, top: `${contentTop}px`, width: `${innerW}px`, height: `${contentH}px`, display: 'flex', flexDirection: 'column' }, children: [topRow, centerBlock] } },
        { type: 'div', props: { style: { position: 'absolute', left: `${safeL}px`, bottom: '38px', display: 'flex', fontSize: '21px', fontWeight: 700, letterSpacing: '1px', color: domainColor, fontFamily: 'Inter, "Noto Sans JP", sans-serif' }, children: SITE_DOMAIN } },
      ],
    },
  };
}

// ---- 執筆者資格クレジット（全画像共通・時事非依存） ----
// E-E-A-T 用の資格クレジット。真実源は src/config/author.ts の qualifications（要約表記）。
// 「R8的中」等の時事文言はテンプレに入れない（画像は陳腐化する。的中訴求は per-article の
// cover.chips / 投稿面で行う。2026-07-20 信頼性資産化 P2 で導入）。
// 抑止: frontmatter `ogp.credential: false`（OGP）/ `cover.credential: false`（G2）。
export const AUTHOR_CREDENTIAL_OGP = '技術士（総監・建設）×1級土木｜元発注者';
export const AUTHOR_CREDENTIAL_G2 = '執筆: 技術士（総監・建設）・1級土木 元発注者';

// ---- テンプレート: mono-tag (T06) ----

function renderMonoTag({ lines, categoryLabel: cat, fontSize, accentColor, backgroundImage, contentType, dark, examLabel, mainLines, subLines, mainFont, credential: credentialProp }, { width, height }) {
  // ダーク（--dark 指定時のみ・旧既定〜2026-07-02。2026-06-29 リデザイン）は資格名 kicker ＋ 主題/サブ階層へ委譲。
  // ライト（既定＝写真前面 2026-07-02〜 / note カバー mono-tag フォールバック）は全幅レイアウト＋資格別背景写真＋subtitle（以下）。
  if (dark) {
    return renderMonoTagDark({ examLabel, mainLines, subLines, mainFont, contentType, accentColor }, { width, height });
  }
  // 2026-06-16: セーフゾーン(中央630)制約を撤廃し全幅レイアウトへ。左右 72px パディング。
  const safeL = 72;
  const innerWidth = width - safeL * 2;
  const themeColor = accentColor || C_INK_NAVY;

  const pal = {
    bg: C_BG,
    title: C_INK_DEEP,
    wordmarkInk: C_INK_NAVY,
    dash: C_CYAN,
    chipBg: C_INK_NAVY,
    chipText: '#ffffff',
    chipArrow: C_CYAN_ACCENT,
    gridFine: 'rgba(15,30,63,0.04)',
    gridMajor: 'rgba(15,30,63,0.09)',
    barTL: C_CYAN,
    barBR: C_NAVY_ACCENT,
    frame: themeColor,
    badgeBg: 'rgba(255, 255, 255, 0.86)',
    badgeBorder: themeColor,
    badgeInk: themeColor,
    scrim: C_SCRIM,
  };

  // AI 生成背景（資格ごとに共有）。指定があれば最背面に cover 配置し、上に可読性スクリムを敷く。
  // 未指定なら従来どおりオフホワイト + グリッドのみ（出力は完全後方互換）。
  const backgroundLayers = backgroundImage
    ? [
        {
          type: 'img',
          props: {
            width,
            height,
            src: backgroundImage,
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            },
          },
        },
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
              background: pal.scrim,
            },
            children: [],
          },
        },
      ]
    : [];

  const fineGridUrl = gridDataUrl(30, pal.gridFine, 1);
  const majorGridUrl = gridDataUrl(120, pal.gridMajor, 1.25);

  // 上下パディング: 72px top / 80px bottom（2026-07-07 メタ帯の余白圧縮。旧 110px top）
  const contentTop = 72;
  const contentBottom = 80;
  const contentHeight = height - contentTop - contentBottom;

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
              color: pal.wordmarkInk,
              marginRight: '18px',
            },
            children: [
              { type: 'span', props: { style: { display: 'flex' }, children: 'doboku' } },
              { type: 'span', props: { style: { display: 'flex', color: pal.dash }, children: '-' } },
              { type: 'span', props: { style: { display: 'flex' }, children: 'note' } },
            ],
          },
        },
      ],
    },
  };

  // コンテンツ種別バッジ（資格＝外枠色 と直交する第2軸）。テーマ色の輪郭ピル＋短ラベル
  // （ガイド/過去問/テキスト/キーワード）。2026-07-07: 装飾アイコンを撤去しテキストのみへ
  // （text-forward トレンド準拠・ラベルで種別は一意・ガイドアイコンの字化け解消）。
  // contentType 未指定（未マッピング group）なら描かない＝後方互換。
  const typeBadge = contentType
    ? {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            alignItems: 'center',
            padding: '8px 20px',
            borderRadius: '999px',
            border: `2px solid ${pal.badgeBorder}`,
            background: pal.badgeBg,
            fontFamily: '"Noto Sans JP", Inter, sans-serif',
          },
          children: [
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  fontSize: '23px',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  color: pal.badgeInk,
                },
                children: contentType.label,
              },
            },
          ],
        },
      }
    : null;

  // 資格名を主役 kicker として左上に（2026-07-07: 旧ワードマーク位置を資格名へ譲り拡大。
  // ▶ 装飾マーカーは撤去＝塗りチップ自体がラベルとして機能・text-forward トレンド準拠）。
  const categoryChip = cat
    ? {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            alignItems: 'center',
            padding: '10px 20px',
            background: pal.chipBg,
            color: pal.chipText,
            fontFamily: '"Noto Sans JP", Inter, sans-serif',
            fontSize: '30px',
            fontWeight: 700,
            letterSpacing: '0.5px',
          },
          children: [
            {
              type: 'div',
              props: { style: { display: 'flex' }, children: cat },
            },
          ],
        },
      }
    : null;

  // 資格名（左）＋種別バッジ（右）の 1 行メタ。ワードマークは右下へ退避（wordmarkCorner）。
  const topRow = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
      },
      children: [categoryChip, typeBadge].filter(Boolean),
    },
  };

  // ワードマーク（右下・従属表記）。装飾ラインを撤去した分、隅で控えめにブランドを担保。
  const wordmarkCorner = {
    type: 'div',
    props: {
      style: {
        position: 'absolute',
        right: `${safeL}px`,
        bottom: '52px',
        display: 'flex',
      },
      children: [wordmark],
    },
  };

  // 執筆者資格クレジット（左下・flow外の絶対配置＝縦フィット計算に無干渉。wordmarkCorner と対）。
  // 幅≈440px・ワードマーク≈180px で内寛1056px(OGP)でも衝突しない。credential:false で非表示。
  const credential = credentialProp === false ? null : (typeof credentialProp === 'string' ? credentialProp : AUTHOR_CREDENTIAL_OGP);
  const credentialCorner = credential
    ? {
        type: 'div',
        props: {
          style: {
            position: 'absolute',
            left: `${safeL}px`,
            bottom: '52px',
            display: 'flex',
            fontFamily: '"Noto Sans JP", Inter, sans-serif',
            fontSize: '21px',
            fontWeight: 700,
            letterSpacing: '0.5px',
            color: 'rgba(10,20,40,0.72)',
          },
          children: credential,
        },
      }
    : null;

  // タイトルの縦フィット: pickFontSize は横幅のみ合わせるため、行数が多いと固定の
  // 縦スペースを溢れて行が重なっていた（2026-06-28 修正）。縦スペースに収まるよう font を
  // 縮小し、最小サイズでも収まらない病的な長文だけ行数をクランプして省略記号を付す。
  // 縮小は横幅制約を緩めない方向（小さくするだけ）なので pickFontSize の横フィットを壊さない。
  const TITLE_LINE_HEIGHT = 1.35;
  const FONT_FLOOR = 34; // table 最小(42)より下げ、7 行までの長見出しを切らずに縮小で吸収する
  // メタは資格名(≈52)＋種別バッジの 1 行のみ（+gap16）。ワードマークは右下絶対配置で flow 外。
  // （2026-07-07 メタ1行統合＋装飾ライン撤去に合わせて更新）
  const usedAboveTitle = (cat ? 52 : 42) + 16;
  const titleMaxHeight = contentHeight - usedAboveTitle;
  const fitsHeight = (size, n) => n * size * TITLE_LINE_HEIGHT <= titleMaxHeight;
  let fitFont = fontSize;
  while (fitFont > FONT_FLOOR && !fitsHeight(fitFont, lines.length)) fitFont -= 2;
  let titleLines = lines;
  const maxFitLines = Math.max(1, Math.floor(titleMaxHeight / (fitFont * TITLE_LINE_HEIGHT)));
  if (titleLines.length > maxFitLines) {
    titleLines = titleLines.slice(0, maxFitLines);
    const lastIdx = maxFitLines - 1;
    titleLines[lastIdx] = titleLines[lastIdx].replace(/[\s、。・　]+$/u, '') + '…';
  }

  const titleBlock = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        justifyContent: 'center',
        fontFamily: '"Noto Sans JP", Inter, sans-serif',
      },
      children: [
        ...titleLines.map((line) => ({
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: `${fitFont}px`,
              fontWeight: 800,
              lineHeight: TITLE_LINE_HEIGHT,
              color: pal.title,
              letterSpacing: '-0.4px',
            },
            children: line,
          },
        })),
        // サブタイトル（subLines）: dark 側と同様に主題の下へ。明色写真上でも読めるよう濃色・中太。
        ...(subLines && subLines.length
          ? [
              {
                type: 'div',
                props: {
                  style: { display: 'flex', flexDirection: 'column', marginTop: '16px' },
                  children: subLines.map((l) => ({
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        fontSize: '25px',
                        fontWeight: 600,
                        lineHeight: 1.45,
                        color: pal.title,
                      },
                      children: l,
                    },
                  })),
                },
              },
            ]
          : []),
      ],
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
      ],
    },
  };

  const innerStack = [topRow, titleBlock].filter(Boolean);

  const children = [
    // AI 生成背景 + 可読性スクリム（backgroundImage 指定時のみ。最背面）
    ...backgroundLayers,
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
    // ワードマーク（右下・従属表記。2026-07-07 装飾ライン撤去に伴い設置）
    wordmarkCorner,
    // 執筆者資格クレジット（左下。2026-07-20 信頼性資産化）
    ...(credentialCorner ? [credentialCorner] : []),
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
    // テーマ色の外枠（資格ごとのテーマカラー。余白感の解消＋分野の一目識別）
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
          borderStyle: 'solid',
          borderColor: pal.frame,
          borderWidth: '16px',
        },
        children: [],
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
        background: pal.bg,
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

function renderMagazineBanner({ lines, categoryLabel: cat, fontSize, accentColor, fillBg }, { width, height }) {
  // fillBg 指定時は背景全体を試験色で塗り、文字を白系へ反転（棚での一目識別を強化）。
  // accentColor のみ指定時は淡色背景＋色バッジ/アクセント線。両方なし時は既定ネイビー/シアン。
  const filled = !!fillBg;
  const pal = filled
    ? {
        bg: fillBg,
        ink: '#ffffff',
        title: '#ffffff',
        muted: 'rgba(255,255,255,0.72)',
        badgeBg: 'rgba(255,255,255,0.16)',
        arrow: 'rgba(255,255,255,0.9)',
        bar: '#ffffff',
        dash: '#ffffff',
        gridFine: 'rgba(255,255,255,0.06)',
        gridMajor: 'rgba(255,255,255,0.12)',
      }
    : {
        bg: C_BG,
        ink: C_INK_NAVY,
        title: C_INK_DEEP,
        muted: C_INK_MUTED,
        badgeBg: accentColor || C_INK_NAVY,
        arrow: C_CYAN_ACCENT,
        bar: accentColor || C_CYAN,
        dash: C_CYAN,
        gridFine: 'rgba(15,30,63,0.04)',
        gridMajor: 'rgba(15,30,63,0.09)',
      };
  const fineGridUrl = gridDataUrl(30, pal.gridFine, 1);
  const majorGridUrl = gridDataUrl(120, pal.gridMajor, 1.25);

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
              color: pal.ink,
              marginRight: '16px',
            },
            children: [
              { type: 'span', props: { style: { display: 'flex' }, children: 'doboku' } },
              { type: 'span', props: { style: { display: 'flex', color: pal.dash }, children: '-' } },
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
              color: pal.muted,
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
            background: pal.badgeBg,
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
                  color: pal.arrow,
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
        color: pal.title,
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
        background: pal.bar,
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
        color: pal.muted,
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
        background: pal.bg,
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
// .claude/knowledge/design-system/note-cover-tokens.json（呼び出し側 generate-note-covers.mjs が
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
  award: '<circle cx="12" cy="9" r="5"/><path d="M9 13.5 7.5 21l4.5-2.5L16.5 21 15 13.5"/>',
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

function renderNoteCoverG2(props, { width, height }) {
  const { cover, palette } = props;
  const c0 = cover || {};
  // ---- Crop-safe V4 opt-in 分岐（variant なしの既存 G2 は一切変更しない）----
  if (c0.variant === 'crop-safe-v4') {
    return renderNoteCoverCropSafeV4(props, { width, height });
  }
  if (c0.variant) {
    // 未知 variant は黙って G2 へフォールバックせず生成エラーにする（clarity V3 方針を継承）
    throw new Error(`未知の cover.variant "${c0.variant}"（対応: crop-safe-v4）`);
  }
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

  // ロゴ直下: 執筆者資格クレジット（全カバー一律・frontmatter編集ゼロ。logo=top34+30px、
  // upper=top122px 開始の空き帯 72-95px に収まる 15px。cover.credential:false で非表示。
  // chips 拡張（横溢れ）・meta 行拡張（character variant で折返し崩れ）は不採用＝2026-07-20 設計判断）
  const g2Credential = c.credential === false ? null : AUTHOR_CREDENTIAL_G2;
  const credentialRow = g2Credential
    ? {
        type: 'div',
        props: {
          style: {
            position: 'absolute',
            top: '72px',
            left: '56px',
            display: 'flex',
            fontFamily: '"Noto Sans JP", Inter, sans-serif',
            fontSize: '15px',
            fontWeight: 800,
            letterSpacing: '0.04em',
            color: 'rgba(27,36,48,0.66)',
          },
          children: g2Credential,
        },
      }
    : null;

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

  // ---- キャラクター variant（cover.character 指定時・無料/ガイド/入口系の opt-in）----
  // 右にキャラ（先生）立ち絵、左カラムに左寄せでコピー。右上メタはキャラと重なるため
  // 左カラム上部の kicker へ移す。バナー帯は全幅のまま左寄せにする。
  if (c.characterSrc) {
    const dispH = 648;
    const dispW = c.characterW && c.characterH ? Math.round((c.characterW * dispH) / c.characterH) : 280;
    const cx = width - dispW - 28;
    const colPadX = 64;
    const colW = Math.max(360, cx - colPadX - 24);
    const characterImg = {
      type: 'img',
      props: { src: c.characterSrc, width: dispW, height: dispH, style: { position: 'absolute', left: `${cx}px`, top: `${height - dispH + 8}px`, display: 'flex' } },
    };
    const metaKicker = {
      type: 'div',
      props: { style: { display: 'flex', fontWeight: 800, fontSize: '16px', letterSpacing: '0.1em', color: band, marginBottom: '12px' }, children: c.meta ? `${examLabel}　${c.meta}` : examLabel },
    };
    const upperL = {
      type: 'div',
      props: {
        style: { position: 'absolute', left: `${colPadX}px`, top: '132px', width: `${colW}px`, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', fontFamily: '"Noto Sans JP", Inter, sans-serif' },
        children: [
          metaKicker,
          { type: 'div', props: { style: { display: 'flex', fontSize: '34px', fontWeight: 800, color: G2_INK }, children: c.leadIn || '' } },
          { type: 'div', props: { style: { display: 'flex', alignItems: 'center', marginTop: '14px' }, children: [hiBox, { type: 'div', props: { style: { display: 'flex', fontSize: '52px', fontWeight: 900, color: G2_INK }, children: c.hiSuffix || '' } }] } },
        ],
      },
    };
    const bannerL = {
      type: 'div',
      props: {
        style: { position: 'absolute', left: 0, top: '392px', width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', background: band, color: '#fff', padding: '18px 0 18px 64px', boxShadow: '0 8px 24px rgba(14,38,69,0.25)', fontFamily: '"Noto Sans JP", Inter, sans-serif' },
        children: [{ type: 'div', props: { style: { display: 'flex', fontWeight: 900, fontSize: `${bannerFontSize(c.banner)}px`, lineHeight: 1, letterSpacing: '0.03em' }, children: c.banner || '' } }],
      },
    };
    const chipRowL = {
      type: 'div',
      props: { style: { position: 'absolute', left: `${colPadX}px`, bottom: '40px', display: 'flex', alignItems: 'center' }, children: chipEls },
    };
    const vchildren = [background, logo, ...(credentialRow ? [credentialRow] : []), characterImg, upperL, bannerL];
    if (chipEls.length > 0) vchildren.push(chipRowL);
    return {
      type: 'div',
      props: { style: { width: `${width}px`, height: `${height}px`, display: 'flex', position: 'relative', background: G2_PAPER_FROM, color: G2_INK, fontFamily: '"Noto Sans JP", Inter, sans-serif' }, children: vchildren },
    };
  }

  const children = [background, logo, ...(credentialRow ? [credentialRow] : []), meta, upper, banner];
  if (chipEls.length > 0) children.push(chipRow);

  return {
    type: 'div',
    props: {
      style: { width: `${width}px`, height: `${height}px`, display: 'flex', position: 'relative', background: G2_PAPER_FROM, color: G2_INK, fontFamily: '"Noto Sans JP", Inter, sans-serif' },
      children,
    },
  };
}

// ---- テンプレート: note-cover Crop-safe V4 (cover.variant: crop-safe-v4 の opt-in) ----
//
// 仕様 SSOT: .claude/knowledge/design-system/note-cover-crop-safe-v4.md / 値: note-cover-tokens.json layout.cropSafeV4。
// note の表示面はフル 1280×670 / 正方形(中央630×630) / 一覧(中央1280×454) / 狭ヘッダー(中央1280×216) /
// リンクカード / 関連記事 とトリミングが異なる。V4 は三重安全領域（square/list/core-safe）に情報階層を
// 固定配置し、主要文字（headline / hi+hiSuffix / benefit / magazineName）を中央 590px 一行に必ず収める。
// G2 の「長文 banner は正方形で両端切れ許容」を V4 では採用しない＝最小フォントでも入らない文字列は
// 切り詰めず生成エラーにする。chips は使用しない（呼び出し側が警告）。
// AI 背景素材（visualSrc）は満载時のみ敷き、中央帯スクリムで text-safe の可読性を決定論的に守る。
// 素材が無ければ G2 と同じ決定論的背景へフォールバック（素材無しを公開ブロッカーにしない）。

// V4 三重安全領域（1280×670 基準・tokens.json layout.cropSafeV4.safeAreas と一致）
export const V4_SAFE = {
  square: { x: [325, 955], y: [20, 650] },
  list: { x: [325, 955], y: [108, 562] },
  core: { x: [325, 955], y: [227, 443] },
  textWidth: 590, // text-safe: x=345..935
};
// V4 レイアウト座標（tokens.json layout.cropSafeV4.{article,magazine} と一致）
const V4_POS = {
  leadIn: { top: 112, height: 44 },
  headline: { top: 227, height: 216 }, // = core-safe。flex center なので必ず内側
  hiRow: { top: 450, height: 48 },
  benefit: { top: 510, height: 52 }, // 下端 562 = list-safe 下端
};
const V4_SLACK = 1.04; // 日本語フォント誤差の余裕（clarity V3 仕様 §6 を継承）
// V4 フォントは全件固定＝カバー間でタイトルサイズを統一する（2026-07-24 ユーザーFB反映）。
// 固定サイズで中央590px（benefit は帯内560px）に入る実効字数上限:
//   headline/magazineName 8.1字 / leadIn・qualifier 18.9字 / proof 17.7字 / benefit 19.2字。
// 入らない文言は縮小せず生成エラー（コピー側を短くする）。
export const V4_FONT = {
  headline: 70, // 記事 headline / マガジン magazineName（コピー目安 4〜8字）
  leadIn: 30, // 記事 leadIn / マガジン qualifier（8〜18字）
  hi: 44, // HiBox 文字（枠48px内・上下余白を確保）
  hiSuffix: 34,
  proof: 32,
  benefit: 28, // 帯52px内・上下余白12px
};

/**
 * V4 の一行フィット純関数。text が maxWidth(既定590)px に収まるフォントサイズを
 * [min..max] から返す。min でも入らなければ null（呼び出し側がエラー/issue 化）。
 */
export function v4FitFontSize(text, { min, max, maxWidth = V4_SAFE.textWidth } = {}) {
  const ecw = effectiveCharCount(text) || 1;
  const fit = Math.floor(maxWidth / (ecw * V4_SLACK));
  if (fit < min) return null;
  return Math.min(max, fit);
}

/**
 * V4 の主要要素フィット検査（check-note-cover-fit / renderer 共用の純関数）。
 * kind: 'article' | 'magazine'。errors（=生成エラー相当）と warnings を返す。
 */
export function v4FitIssues(cover, kind = 'article') {
  const c = cover || {};
  const errors = [];
  const warnings = [];
  const need = (k) => {
    if (!c[k] || !String(c[k]).trim()) errors.push(`${k} が空（V4 必須）`);
  };
  const fitOrError = (label, text, range) => {
    if (!text) return;
    if (v4FitFontSize(text, range) === null) {
      errors.push(`${label} "${text}" が最小 ${range.min}px でも中央 ${range.maxWidth || V4_SAFE.textWidth}px に収まらない（切り詰めず短縮する）`);
    }
  };
  if (kind === 'magazine') {
    need('magazineName');
    need('qualifier');
    need('benefit');
    fitOrError('magazineName', c.magazineName, { min: V4_FONT.headline, max: V4_FONT.headline });
    fitOrError('qualifier', c.qualifier, { min: V4_FONT.leadIn, max: V4_FONT.leadIn });
    fitOrError('proof', c.proof, { min: V4_FONT.proof, max: V4_FONT.proof });
    fitOrError('benefit', c.benefit, { min: V4_FONT.benefit, max: V4_FONT.benefit, maxWidth: 560 });
    if (/[¥￥]|円/.test(String(c.proof || '') + String(c.benefit || '') + String(c.magazineName || ''))) {
      warnings.push('価格らしき表記（¥/円）が含まれる。価格は画像へ固定しない（V4 §6.1）');
    }
  } else {
    need('leadIn');
    need('headline');
    need('hi');
    need('hiSuffix');
    need('benefit');
    fitOrError('headline', c.headline, { min: V4_FONT.headline, max: V4_FONT.headline });
    fitOrError('leadIn', c.leadIn, { min: V4_FONT.leadIn, max: V4_FONT.leadIn });
    fitOrError('benefit', c.benefit, { min: V4_FONT.benefit, max: V4_FONT.benefit, maxWidth: 560 });
    if (c.hi || c.hiSuffix) {
      // hi(HiBox: padding 0 16×2) + gap12 + hiSuffix(34px) の合計幅が 590 に収まるか
      const hiW = c.hi ? effectiveCharCount(c.hi) * V4_FONT.hi * V4_SLACK + 32 : 0;
      const sufW = c.hiSuffix ? effectiveCharCount(c.hiSuffix) * V4_FONT.hiSuffix * V4_SLACK : 0;
      const total = hiW + (c.hi && c.hiSuffix ? 12 : 0) + sufW;
      if (total > V4_SAFE.textWidth) {
        errors.push(`hi+hiSuffix 推定 ${Math.round(total)}px > ${V4_SAFE.textWidth}px（合計 2〜7 字に短縮する）`);
      }
    }
    if (Array.isArray(c.chips) && c.chips.length) {
      warnings.push('V4 では chips を使用しない（描画されない・cover から削除を推奨）');
    }
  }
  return { errors, warnings };
}

// V4 debug 用の三重安全領域オーバーレイ（square=赤 / list=橙 / core=緑 / text-safe=青破線）
function v4DebugOverlay() {
  const rect = (area, color, dashed = false) => ({
    type: 'div',
    props: {
      style: {
        position: 'absolute',
        left: `${area.x[0]}px`,
        top: `${area.y[0]}px`,
        width: `${area.x[1] - area.x[0]}px`,
        height: `${area.y[1] - area.y[0]}px`,
        display: 'flex',
        border: `3px ${dashed ? 'dashed' : 'solid'} ${color}`,
        boxSizing: 'border-box',
      },
      children: [],
    },
  });
  return [
    rect(V4_SAFE.square, '#ff0000'),
    rect(V4_SAFE.list, '#ff9900'),
    rect(V4_SAFE.core, '#00aa00'),
    rect({ x: [345, 935], y: [20, 650] }, '#3388ff', true),
  ];
}

function renderNoteCoverCropSafeV4({ cover, palette, magazine, visualSrc, debugSafetyV4 }, { width, height }) {
  const c = cover || {};
  const kind = magazine ? 'magazine' : 'article';
  const { errors } = v4FitIssues(c, kind);
  if (errors.length) {
    throw new Error(`crop-safe-v4 フィット検証失敗: ${errors.join(' / ')}`);
  }
  const band = palette.band;
  const examLabel = palette.label || '';

  // 中央帯コンテナ（left 325 / width 630）に flex center で置く＝x 方向は常に square/list/core-safe 内
  const centerBand = (top, h, children, extraStyle = {}) => ({
    type: 'div',
    props: {
      style: {
        position: 'absolute',
        left: `${V4_SAFE.square.x[0]}px`,
        top: `${top}px`,
        width: `${V4_SAFE.square.x[1] - V4_SAFE.square.x[0]}px`,
        height: `${h}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Noto Sans JP", Inter, sans-serif',
        ...extraStyle,
      },
      children,
    },
  });

  // ---- 背景（full 領域）----
  let backgroundEls;
  if (visualSrc) {
    // AI 背景素材（文字なし・中央低情報量前提）＋中央帯スクリム＝text-safe の可読性を決定論的に確保
    const scrim = magazine
      ? { background: `linear-gradient(90deg, rgba(0,0,0,0) 0%, ${band}D9 7%, ${band}D9 93%, rgba(0,0,0,0) 100%)` }
      : { background: 'linear-gradient(90deg, rgba(244,246,249,0) 0%, rgba(244,246,249,0.84) 7%, rgba(244,246,249,0.84) 93%, rgba(244,246,249,0) 100%)' };
    backgroundEls = [
      {
        type: 'img',
        props: { src: visualSrc, width, height, style: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' } },
      },
      {
        type: 'div',
        props: { style: { position: 'absolute', top: 0, left: `${V4_SAFE.square.x[0] - 40}px`, width: `${V4_SAFE.square.x[1] - V4_SAFE.square.x[0] + 80}px`, height: '100%', display: 'flex', ...scrim }, children: [] },
      },
    ];
  } else if (magazine) {
    // マガジン・素材なし: fillBg（band）単色＋白グリッド（magazine-banner filled と同系の決定論的背景）
    const fineGridUrl = gridDataUrl(30, 'rgba(255,255,255,0.06)', 1);
    const majorGridUrl = gridDataUrl(120, 'rgba(255,255,255,0.12)', 1.25);
    backgroundEls = [
      {
        type: 'div',
        props: {
          style: { position: 'absolute', inset: 0, display: 'flex', background: band, backgroundImage: `url(${majorGridUrl}), url(${fineGridUrl})`, backgroundRepeat: 'repeat, repeat' },
          children: [],
        },
      },
    ];
  } else {
    // 記事・素材なし: G2 と同じ紙面グラデ＋2層グリッド＋同心円装飾（決定論的フォールバック）
    const fineGridUrl = gridDataUrl(8, 'rgba(22,54,92,0.04)', 1);
    const majorGridUrl = gridDataUrl(32, 'rgba(22,54,92,0.06)', 1);
    backgroundEls = [
      {
        type: 'div',
        props: {
          style: {
            position: 'absolute', inset: 0, display: 'flex',
            backgroundImage: `url(${g2DecorDataUrl(width, height)}), url(${fineGridUrl}), url(${majorGridUrl}), linear-gradient(135deg, ${G2_PAPER_FROM} 0%, ${G2_PAPER_TO} 100%)`,
            backgroundRepeat: 'no-repeat, repeat, repeat, no-repeat',
          },
          children: [],
        },
      },
    ];
  }

  const inkMain = magazine ? '#ffffff' : G2_INK;
  const inkSub = magazine ? 'rgba(255,255,255,0.85)' : 'rgba(27,36,48,0.82)';

  // ---- full 領域: ロゴ / 資格クレジット / メタ（正方形クロップで切れて良い補助情報）----
  const logo = {
    type: 'div',
    props: {
      style: { position: 'absolute', top: '34px', left: '56px', display: 'flex', alignItems: 'center', fontFamily: 'Inter, "Noto Sans JP", sans-serif' },
      children: [
        {
          type: 'div',
          props: {
            style: { display: 'flex', width: '30px', height: '30px', borderRadius: '7px', background: magazine ? '#ffffff' : G2_WORDMARK_INK, alignItems: 'center', justifyContent: 'center', marginRight: '9px' },
            children: [g2IconImg('book', magazine ? band : '#fff', 18, 2.2)],
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', fontSize: '21px', fontWeight: 800, letterSpacing: '-0.4px', color: magazine ? '#ffffff' : G2_WORDMARK_INK },
            children: [
              { type: 'span', props: { style: { display: 'flex' }, children: 'doboku' } },
              { type: 'span', props: { style: { display: 'flex', color: magazine ? 'rgba(255,255,255,0.7)' : G2_WORDMARK_ACCENT }, children: '-' } },
              { type: 'span', props: { style: { display: 'flex' }, children: 'note' } },
            ],
          },
        },
      ],
    },
  };
  // V4 では資格クレジット（執筆:…）と右上メタ（examLabel／無料記事等）を描画しない
  // （2026-07-24 ユーザーFB: 補助テキストがノイズ。資格情報は leadIn/qualifier が担う）。
  // cover.meta は frontmatter 互換のため受け付けるが V4 では未使用。
  const credentialRow = null;
  const meta = null;

  // ---- キャラクター（full 領域・右端。text-safe(x≤935)を侵食しない位置に制限）----
  let characterImg = null;
  if (c.characterSrc && !magazine) {
    const dispH = 560;
    const dispW = c.characterW && c.characterH ? Math.round((c.characterW * dispH) / c.characterH) : 240;
    const cx = Math.max(990, width - dispW - 16); // x>=990 = square-safe 外・装飾扱い
    characterImg = {
      type: 'img',
      props: { src: c.characterSrc, width: dispW, height: dispH, style: { position: 'absolute', left: `${cx}px`, top: `${height - dispH + 6}px`, display: 'flex' } },
    };
  }

  // ---- 中央帯の情報階層 ----
  const leadInText = magazine ? c.qualifier : c.leadIn;
  const leadInEl = centerBand(V4_POS.leadIn.top, V4_POS.leadIn.height, [
    {
      type: 'div',
      props: {
        style: { display: 'flex', fontSize: `${V4_FONT.leadIn}px`, fontWeight: 800, color: inkSub, letterSpacing: '0.02em' },
        children: leadInText || '',
      },
    },
  ]);

  const headlineText = magazine ? c.magazineName : c.headline;
  const headlineEl = centerBand(V4_POS.headline.top, V4_POS.headline.height, [
    {
      type: 'div',
      props: {
        style: { display: 'flex', fontSize: `${V4_FONT.headline}px`, fontWeight: 900, lineHeight: 1.04, color: inkMain, letterSpacing: '-0.5px', textAlign: 'center' },
        children: headlineText || '',
      },
    },
  ]);

  // 記事: hi(HiBox)+hiSuffix ／ マガジン: proof（純テキスト行）
  let midRowEl = null;
  if (magazine) {
    if (c.proof) {
      midRowEl = centerBand(V4_POS.hiRow.top, V4_POS.hiRow.height, [
        {
          type: 'div',
          props: {
            style: { display: 'flex', fontSize: `${V4_FONT.proof}px`, fontWeight: 800, color: 'rgba(255,255,255,0.94)', letterSpacing: '0.03em' },
            children: c.proof,
          },
        },
      ]);
    }
  } else {
    midRowEl = centerBand(V4_POS.hiRow.top, V4_POS.hiRow.height, [
      {
        type: 'div',
        props: {
          style: {
            display: 'flex', alignItems: 'center', justifyContent: 'center', background: band, color: '#fff', borderRadius: '9px',
            fontWeight: 900, fontSize: `${V4_FONT.hi}px`, lineHeight: 1, padding: '0 16px', height: `${V4_POS.hiRow.height}px`,
            boxShadow: '0 5px 14px rgba(14,38,69,0.28)', marginRight: '12px',
          },
          children: c.hi || '',
        },
      },
      { type: 'div', props: { style: { display: 'flex', fontSize: `${V4_FONT.hiSuffix}px`, fontWeight: 900, color: inkMain }, children: c.hiSuffix || '' } },
    ]);
  }

  // benefit 帯（中央630幅＝正方形クロップでも欠けない）。記事=試験色地＋白文字 / マガジン=白地＋試験色文字
  const benefitEl = centerBand(
    V4_POS.benefit.top,
    V4_POS.benefit.height,
    [
      {
        type: 'div',
        props: {
          style: { display: 'flex', fontSize: `${V4_FONT.benefit}px`, fontWeight: 900, color: magazine ? band : '#ffffff', letterSpacing: '0.02em' },
          children: c.benefit || '',
        },
      },
    ],
    { background: magazine ? '#ffffff' : band, borderRadius: '10px', boxShadow: '0 6px 18px rgba(14,38,69,0.22)' },
  );

  const children = [
    ...backgroundEls,
    logo,
    ...(credentialRow ? [credentialRow] : []),
    ...(meta ? [meta] : []),
    ...(characterImg ? [characterImg] : []),
    leadInEl,
    headlineEl,
    ...(midRowEl ? [midRowEl] : []),
    benefitEl,
    ...(debugSafetyV4 ? v4DebugOverlay() : []),
  ];

  return {
    type: 'div',
    props: {
      style: { width: `${width}px`, height: `${height}px`, display: 'flex', position: 'relative', background: magazine ? band : G2_PAPER_FROM, color: inkMain, fontFamily: '"Noto Sans JP", Inter, sans-serif' },
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
