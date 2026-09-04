/**
 * longform-render.mjs — 動画パック（DN-0110 Phase 1）の 16:9 通常動画レンダリング・ライブラリ。
 *
 * storyboard.json の scene 列を 1920×1080 スライド（satori ノード）と ASS 字幕へ変換する。
 * mp4 合成は既存の composeShortsVideo（解像度非依存）を再利用し、本ファイルは純粋な
 * 変換ロジックだけを持つ（unit test 対象）。
 *
 * 真実源:
 *   - キャンバス/尺: .claude/config/video-content.json（canvas.longform = 1920×1080）
 *   - 試験色: .claude/scripts/sns/lib/exam-palette.mjs（note-cover-tokens.json の exams）
 *
 * scene の視覚要素（storyboard 追加フィールド・checker には additive）:
 *   visual: { kind?: 'cover'|'points'|'figure', heading: string, items?: string[], src?: string }
 *   visual 省略時は caption を大きく1枚に出すフォールバック。
 */

export const LONGFORM_W = 1920;
export const LONGFORM_H = 1080;

/** 動画パックの exam slug → exam-palette キー */
export const EXAM_TO_PALETTE = {
  'civil-construction-1': 'civil-1',
  'civil-construction-2': 'civil-2',
  'pe-comprehensive-management': 'pe-comprehensive',
  'pe-construction': 'pe-construction',
  'pe-first-stage': 'pe-first-stage',
  'concrete-chief-engineer': 'concrete-chief',
  'concrete-diagnostician': 'concrete-diagnosis',
  'concrete-engineer': 'concrete-engineer',
};

const WHITE = '#ffffff';
const INK_STRONG = '#222222';
const INK_BODY = '#3a3a3a';
const FONT_JP = "'NotoSansJP', 'Noto Sans JP'";

/** 字幕・キャプションを maxChars で改行する（和文単純折返し） */
export function wrapJp(text, maxChars) {
  const chars = [...(text ?? '')];
  const lines = [];
  for (let i = 0; i < chars.length; i += maxChars) {
    lines.push(chars.slice(i, i + maxChars).join(''));
  }
  return lines;
}

/**
 * 字幕を1画面1行に収めつつ、末尾だけ1〜2文字になる不均衡を避ける。
 * 例: 30文字・上限28文字 → 15文字×2（28文字＋2文字にはしない）。
 */
export function chunkJpBalanced(text, maxChars) {
  const chars = [...(text ?? '')];
  if (chars.length === 0) return [];
  const chunkCount = Math.ceil(chars.length / maxChars);
  const chunkSize = Math.ceil(chars.length / chunkCount);
  return wrapJp(chars.join(''), chunkSize);
}

function assTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s.toFixed(2)).padStart(5, '0')}`;
}

/**
 * 16:9 ASS 字幕を生成する。
 * @param {Array} scenes storyboard.scenes
 * @param {number[]} [durations] 各 scene の実尺（wav 実測）。省略時は storyboard の end-start
 */
export function buildLongformAss(scenes, durations) {
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${LONGFORM_W}
PlayResY: ${LONGFORM_H}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Noto Sans JP,56,&H00FFFFFF,&H000000FF,&H00000000,&H90000000,1,0,0,0,100,100,0,0,1,3,1,2,120,120,56,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  let t = 0;
  const lines = [header];
  scenes.forEach((scene, i) => {
    const dur = durations?.[i] ?? (scene.end - scene.start);
    const chunks = chunkJpBalanced(scene.narration ?? '', 28);
    let chunkStart = t;
    chunks.forEach((text, chunkIndex) => {
      const chunkEnd = chunkIndex === chunks.length - 1
        ? t + dur
        : chunkStart + dur * ([...text].length / Math.max(1, [...(scene.narration ?? '')].length));
      lines.push(`Dialogue: 0,${assTime(chunkStart)},${assTime(chunkEnd)},Default,,0,0,0,,${text}`);
      chunkStart = chunkEnd;
    });
    t += dur;
  });
  return lines.join('\n');
}

/**
 * scene → satori ノード（1920×1080）。
 * @param {object} scene storyboard scene
 * @param {object} ctx { theme: { base, deep, accent, label }, packTitle }
 */
export function buildSceneNode(scene, ctx) {
  const { theme, packTitle, assetDataUri } = ctx;
  const visual = scene.visual ?? { kind: 'points', heading: scene.caption ?? '' };
  const kind = visual.kind ?? 'points';

  if (kind === 'cover') {
    const headingLength = [...(visual.heading ?? '')].length;
    const headingFontSize = headingLength <= 18 ? 84 : headingLength <= 26 ? 68 : 56;
    return {
      type: 'div',
      props: {
        style: {
          display: 'flex', flexDirection: 'column',
          width: `${LONGFORM_W}px`, height: `${LONGFORM_H}px`,
          background: theme.deep, fontFamily: FONT_JP,
          justifyContent: 'center', alignItems: 'center', padding: '120px',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex', fontSize: 40, fontWeight: 700, letterSpacing: 6,
                color: 'rgba(255,255,255,0.7)', marginBottom: 56, fontFamily: FONT_JP,
              },
              children: theme.label,
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
                fontSize: headingFontSize, fontWeight: 700, color: WHITE,
                lineHeight: 1.6, textAlign: 'center', fontFamily: FONT_JP,
                whiteSpace: 'nowrap',
              },
              children: visual.heading,
            },
          },
          ...(visual.items?.length ? [{
            type: 'div',
            props: {
              style: {
                display: 'flex', fontSize: 44, fontWeight: 500, marginTop: 48,
                color: 'rgba(255,255,255,0.85)', fontFamily: FONT_JP, textAlign: 'center',
              },
              children: visual.items.join('　'),
            },
          }] : []),
        ],
      },
    };
  }

  if (kind === 'figure') {
    if (!assetDataUri) throw new Error(`figure scene に画像データがありません: ${scene.sceneId}`);
    return {
      type: 'div',
      props: {
        style: {
          display: 'flex', flexDirection: 'column',
          width: `${LONGFORM_W}px`, height: `${LONGFORM_H}px`,
          background: WHITE, fontFamily: FONT_JP,
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: `${LONGFORM_W}px`, height: 96, background: theme.deep,
                padding: '0 64px', flexShrink: 0,
              },
              children: [
                { type: 'span', props: { style: { color: WHITE, fontSize: 36, fontWeight: 700, fontFamily: FONT_JP }, children: theme.label } },
                { type: 'span', props: { style: { color: 'rgba(255,255,255,0.75)', fontSize: 30, fontWeight: 500, fontFamily: FONT_JP }, children: packTitle } },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex', flex: 1, alignItems: 'center', gap: 64,
                padding: '48px 80px 160px 80px', borderLeft: `14px solid ${theme.base}`,
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex', width: 760, height: 760, alignItems: 'center', justifyContent: 'center',
                      background: '#f7f8fa', border: '2px solid #d7d7d7', borderRadius: 24, padding: 28,
                    },
                    children: [{
                      type: 'img',
                      props: {
                        src: assetDataUri,
                        width: 704,
                        height: 704,
                        style: { objectFit: 'contain' },
                      },
                    }],
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center' },
                    children: [
                      { type: 'div', props: { style: { display: 'flex', fontSize: 58, fontWeight: 700, color: INK_STRONG, lineHeight: 1.45, fontFamily: FONT_JP, marginBottom: 36 }, children: visual.heading } },
                      ...(visual.items ?? []).map((item) => ({
                        type: 'div',
                        props: {
                          style: { display: 'flex', alignItems: 'flex-start', marginBottom: 24 },
                          children: [
                            { type: 'div', props: { style: { display: 'flex', width: 16, height: 16, borderRadius: 8, background: theme.base, marginTop: 22, marginRight: 24, flexShrink: 0 }, children: '' } },
                            { type: 'div', props: { style: { display: 'flex', flexWrap: 'wrap', flex: 1, fontSize: 40, fontWeight: 500, color: INK_BODY, lineHeight: 1.6, fontFamily: FONT_JP }, children: item } },
                          ],
                        },
                      })),
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    };
  }

  // points（既定）: 上部バー + 見出し + 箇条書き。下 160px は字幕焼込み用に空ける
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex', flexDirection: 'column',
        width: `${LONGFORM_W}px`, height: `${LONGFORM_H}px`,
        background: WHITE, fontFamily: FONT_JP,
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: `${LONGFORM_W}px`, height: 96, background: theme.deep,
              padding: '0 64px', flexShrink: 0,
            },
            children: [
              {
                type: 'span',
                props: {
                  style: { color: WHITE, fontSize: 36, fontWeight: 700, fontFamily: FONT_JP },
                  children: theme.label,
                },
              },
              {
                type: 'span',
                props: {
                  style: { color: 'rgba(255,255,255,0.75)', fontSize: 30, fontWeight: 500, fontFamily: FONT_JP },
                  children: packTitle,
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex', flexDirection: 'column', flex: 1,
              padding: '72px 96px 160px 96px',
              borderLeft: `14px solid ${theme.base}`,
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex', flexWrap: 'wrap',
                    fontSize: 64, fontWeight: 700, color: INK_STRONG,
                    lineHeight: 1.5, fontFamily: FONT_JP, marginBottom: 48,
                  },
                  children: visual.heading,
                },
              },
              ...(visual.items ?? []).map((item) => ({
                type: 'div',
                props: {
                  style: { display: 'flex', alignItems: 'flex-start', marginBottom: 28 },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex', width: 18, height: 18, borderRadius: 9,
                          background: theme.base, marginTop: 24, marginRight: 28, flexShrink: 0,
                        },
                        children: '',
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex', flexWrap: 'wrap', flex: 1,
                          fontSize: 46, fontWeight: 500, color: INK_BODY,
                          lineHeight: 1.65, fontFamily: FONT_JP,
                        },
                        children: item,
                      },
                    },
                  ],
                },
              })),
            ],
          },
        },
      ],
    },
  };
}

/**
 * pack + storyboard からレンダリング計画を作る（存在検証込み・I/O なし）。
 * @returns {{ scenes: Array, theme: object, packTitle: string }}
 */
export function planLongformRender(manifest, storyboard, resolvePalette) {
  if (storyboard.format !== 'longform-16x9') {
    throw new Error(`longform renderer は format=longform-16x9 専用（受領: ${storyboard.format}）`);
  }
  const paletteKey = EXAM_TO_PALETTE[manifest.exam];
  if (!paletteKey) throw new Error(`exam→palette 未定義: ${manifest.exam}`);
  const e = resolvePalette(paletteKey);
  const theme = { base: e.base, deep: e.deep, accent: e.accent, label: e.label };
  return { scenes: storyboard.scenes, theme, packTitle: manifest.title };
}
