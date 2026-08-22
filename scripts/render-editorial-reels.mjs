#!/usr/bin/env node
/**
 * Editorial Reels レンダラー（TTS + PNG → mp4）
 *
 * 対象: script.json (mode: "editorial") 形式の Reels 台本
 * 出力: reels/video.mp4 + reels/img/*.png + reels/wav/*.wav
 *
 * 前提: VOICEVOX エンジン起動中、ffmpeg が PATH に存在
 *
 * Usage:
 *   node scripts/render-editorial-reels.mjs \
 *     --pack-dir content/sns/instagram/技術士建設部門/2026-06-10-hissu-kata
 */

import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const { values: args } = parseArgs({
  args: process.argv.slice(2),
  options: {
    'pack-dir': { type: 'string' },
    speaker:    { type: 'string', default: '1' },
    'skip-png': { type: 'boolean' },
    'skip-tts': { type: 'boolean' },
  },
});

if (!args['pack-dir']) {
  console.error('Usage: node scripts/render-editorial-reels.mjs --pack-dir <path>');
  process.exit(1);
}

const packDir = resolve(ROOT, args['pack-dir']);
const scriptJson = JSON.parse(readFileSync(join(packDir, 'reels', 'script.json'), 'utf8'));
const slides = scriptJson.slides;

// ─── 依存モジュール ────────────────────────────────────────────

const { isRunning, synthesize } = await import(
  pathToFileURL(resolve(ROOT, '.claude/scripts/lib/sns-common/tts-client.mjs')).href
);
const { composeShortsVideo, ffmpegAvailable } = await import(
  pathToFileURL(resolve(ROOT, '.claude/skills/social/yt-shorts-create/scripts/lib/ffmpeg-compose.mjs')).href
);

if (!args['skip-tts']) {
  if (!ffmpegAvailable()) { console.error('ffmpeg が PATH にありません'); process.exit(1); }
  if (!(await isRunning())) { console.error('VOICEVOX が起動していません'); process.exit(1); }
}

// ─── フォント ─────────────────────────────────────────────────

const FONT_DIR = resolve(ROOT, '.claude/skills/conversion/ogp-create/assets/fonts');
const FONTSOURCE_DIR = resolve(ROOT, 'node_modules/@fontsource');

const fonts = [
  { name: 'Noto Sans JP', data: readFileSync(resolve(FONT_DIR, 'NotoSansJP-Bold.ttf')), weight: 700, style: 'normal' },
  ...[500, 700, 800].map((w) => ({
    name: 'Manrope',
    data: readFileSync(resolve(FONTSOURCE_DIR, `manrope/files/manrope-latin-${w}-normal.woff`)),
    weight: w, style: 'normal',
  })),
  ...[400, 500, 700].map((w) => ({
    name: 'NotoSansJP',
    data: readFileSync(resolve(FONTSOURCE_DIR, `noto-sans-jp/files/noto-sans-jp-japanese-${w}-normal.woff`)),
    weight: w, style: 'normal',
  })),
];

// ─── デザイントークン ─────────────────────────────────────────

const W = 1080;
const H = 1920;
const BRAND = '#2e6da4';
const BRAND_FILL = '#e8f0fe';
const INK_STRONG = '#222222';
const INK_BODY = '#444444';
const WHITE = '#ffffff';
const FONT_JP = "'NotoSansJP', 'Noto Sans JP'";

const TYPE_LABELS = {
  cover:   '技術士建設部門',
  hook:    '導入',
  step:    'STEP',
  summary: 'まとめ',
  cta:     'check',
};
const TYPE_BG = {
  cover:   BRAND,
  hook:    '#1a3a5c',
  step:    WHITE,
  summary: '#1a3a5c',
  cta:     BRAND,
};

// ─── スライドビルダー ─────────────────────────────────────────

function buildSlide(slide) {
  const bg = TYPE_BG[slide.type] ?? WHITE;
  const isDark = bg !== WHITE;
  const textColor = isDark ? WHITE : INK_STRONG;
  const mutedColor = isDark ? 'rgba(255,255,255,0.65)' : '#888888';

  const label = slide.type === 'step' && slide.stepLabel
    ? `${TYPE_LABELS.step}  ${slide.stepLabel}`
    : TYPE_LABELS[slide.type] ?? slide.type.toUpperCase();

  if (isDark) {
    // 暗背景: フルブランドカラー、中央配置
    return {
      type: 'div',
      props: {
        style: {
          display: 'flex', flexDirection: 'column',
          width: `${W}px`, height: `${H}px`,
          background: bg, fontFamily: FONT_JP,
          justifyContent: 'center', alignItems: 'center',
          padding: '80px',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex', fontSize: 28, fontWeight: 700,
                color: 'rgba(255,255,255,0.6)', letterSpacing: 3,
                marginBottom: 60, fontFamily: FONT_JP,
              },
              children: label.toUpperCase(),
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex', flexWrap: 'wrap',
                fontSize: slide.type === 'cover' ? 52 : 44,
                fontWeight: 700, color: WHITE, lineHeight: 1.9,
                fontFamily: FONT_JP, textAlign: 'center',
              },
              children: slide.narration,
            },
          },
        ],
      },
    };
  }

  // 明背景（step）: 上部バー + 本文
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex', flexDirection: 'column',
        width: `${W}px`, height: `${H}px`,
        background: WHITE, fontFamily: FONT_JP,
      },
      children: [
        // 上部バー
        {
          type: 'div',
          props: {
            style: {
              display: 'flex', alignItems: 'center',
              width: `${W}px`, height: 100,
              background: BRAND, padding: '0 48px', flexShrink: 0,
            },
            children: [{
              type: 'span',
              props: {
                style: { color: WHITE, fontSize: 36, fontWeight: 700, fontFamily: FONT_JP },
                children: label,
              },
            }],
          },
        },
        // 本文エリア
        {
          type: 'div',
          props: {
            style: {
              display: 'flex', flexDirection: 'column',
              flex: 1, padding: '80px 64px',
              borderLeft: `10px solid ${BRAND}`,
              justifyContent: 'center',
            },
            children: [{
              type: 'div',
              props: {
                style: {
                  display: 'flex', flexWrap: 'wrap',
                  fontSize: 42, fontWeight: 700,
                  color: INK_STRONG, lineHeight: 2.0, fontFamily: FONT_JP,
                },
                children: slide.narration,
              },
            }],
          },
        },
      ],
    },
  };
}

// ─── ASS 字幕生成 ─────────────────────────────────────────────

function formatAssTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s.toFixed(2)).padStart(5, '0')}`;
}

function buildAss(slides) {
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Noto Sans JP,42,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,2,1,2,80,80,80,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  let t = 0;
  const lines = [header];
  for (const slide of slides) {
    const start = formatAssTime(t);
    const end = formatAssTime(t + (slide.durationSec ?? 10));
    // 字幕: 25字で改行
    const text = (slide.narration ?? '').replace(/(.{25})/g, '$1\\N');
    lines.push(`Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`);
    t += slide.durationSec ?? 10;
  }
  return lines.join('\n');
}

// ─── メイン ───────────────────────────────────────────────────

async function main() {
  const reelsDir = join(packDir, 'reels');
  const imgDir = join(reelsDir, 'img');
  const wavDir = join(reelsDir, 'wav');
  mkdirSync(imgDir, { recursive: true });
  mkdirSync(wavDir, { recursive: true });

  const pngPaths = [];
  const wavPaths = [];

  for (const [i, slide] of slides.entries()) {
    const pad = String(i).padStart(2, '0');
    const pngPath = join(imgDir, `${pad}-${slide.type}.png`);
    const wavPath = join(wavDir, `${pad}-${slide.type}.wav`);

    // PNG
    if (!args['skip-png']) {
      process.stdout.write(`  [PNG ${i + 1}/${slides.length}] ${slide.type}${slide.stepLabel ? ' ' + slide.stepLabel : ''}... `);
      const node = buildSlide(slide);
      const svg = await satori(node, { width: W, height: H, fonts });
      writeFileSync(pngPath, new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng());
      console.log('✓');
    }

    // TTS
    if (!args['skip-tts']) {
      process.stdout.write(`  [TTS ${i + 1}/${slides.length}] ${slide.narration.slice(0, 20)}... `);
      const wavBuf = await synthesize({ text: slide.narration, speaker: Number(args.speaker) });
      writeFileSync(wavPath, Buffer.from(wavBuf));
      console.log('✓');
    }

    pngPaths.push(pngPath);
    wavPaths.push(wavPath);
  }

  // ASS 字幕
  const assPath = join(reelsDir, 'subtitles.ass');
  writeFileSync(assPath, buildAss(slides), 'utf8');

  // mp4 合成
  if (!args['skip-tts']) {
    const outPath = join(reelsDir, 'video.mp4');
    console.log('\n[ffmpeg] 動画合成中...');
    await composeShortsVideo({ pngPaths, wavPaths, assPath, outPath, options: { tmpDir: wavDir } });
    console.log(`\n✓ ${outPath} に出力`);
  } else {
    console.log(`\n✓ PNG: ${imgDir} に出力（TTS/mp4 はスキップ）`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
