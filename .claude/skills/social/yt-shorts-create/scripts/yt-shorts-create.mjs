#!/usr/bin/env node
/**
 * YouTube Shorts 自動生成 CLI（VOICEVOX → 字幕付き mp4 まで）。
 *
 * Usage:
 *   node yt-shorts-create.mjs --slug followership --date 2026-05-02
 *
 * 全工程:
 *   1. MDX → storyboard（5 枚構成）
 *   2. 各スライドの台本（TTS 入力）
 *   3. スライド PNG レンダリング（Satori + @resvg）
 *   4. VOICEVOX で TTS wav 生成
 *   5. wav の duration 計測 → .ass 字幕生成
 *   6. ffmpeg で mp4 合成 + 字幕焼き込み
 *   7. サムネ生成 + meta.json 出力
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

import { renderSlide } from '#lib/sns-common/slide-render.mjs';
import { synthesize } from '#lib/sns-common/tts-client.mjs';
import { buildStoryboard } from './lib/build-storyboard.mjs';
import { buildScript } from './lib/build-script.mjs';
import { buildSubtitle } from './lib/build-subtitle.mjs';
import {
  composeShortsVideo,
  generateThumbnail,
  probeDuration,
  ffmpegAvailable,
} from './lib/ffmpeg-compose.mjs';

const WIDTH = 1080;
const HEIGHT = 1920;

function parseCliArgs(argv) {
  const { values } = parseArgs({
    args: argv.slice(2),
    options: {
      slug: { type: 'string' },
      date: { type: 'string' },
      category: { type: 'string', default: 'pe-comprehensive-management' },
      speaker: { type: 'string' },
      out: { type: 'string' },
    },
  });
  if (!values.slug) throw new Error('--slug is required');
  if (!values.date) throw new Error('--date is required (YYYY-MM-DD)');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date)) {
    throw new Error(`--date must be YYYY-MM-DD format, got: ${values.date}`);
  }
  return values;
}

/**
 * Shorts 生成のメイン処理。
 *
 * @param {object} args
 * @param {string} args.category
 * @param {string} args.slug
 * @param {string} args.date  YYYY-MM-DD
 * @param {string} [args.speaker]  VOICEVOX speaker ID（既定: env or 1）
 * @param {string} [args.outDir]
 * @returns {Promise<{ mp4Path, thumbPath, metaPath, durations }>}
 */
export async function createShorts({ category, slug, date, speaker, outDir }) {
  if (!ffmpegAvailable()) {
    throw new Error('ffmpeg not found in PATH. Install with: brew install ffmpeg');
  }

  // 中間ファイル（PNG/WAV/mp4/concat/ass）は .tmp に、最終成果物は docs に
  const tmpDir = join('.tmp', 'sns', date, `${slug}-shorts`);
  const docsDir = outDir ?? join('docs', 'sns', 'youtube', `${date}-${slug}`);
  mkdirSync(tmpDir, { recursive: true });
  mkdirSync(docsDir, { recursive: true });

  // [1/6] MDX → storyboard
  process.stdout.write(`[1/6] Loading MDX and building storyboard...\n`);
  const storyboard = await buildStoryboard({ category, slug });
  process.stdout.write(`     ${storyboard.slides.length} slides: ${storyboard.slides.map(s => s.type).join(' / ')}\n`);

  // [2/6] script
  process.stdout.write(`[2/6] Building scripts...\n`);
  const scripts = buildScript(storyboard);
  writeFileSync(join(docsDir, 'script.txt'), buildScriptTxt({ storyboard, scripts, date }));

  // [3/6] スライド PNG（中間ファイル → tmpDir）
  process.stdout.write(`[3/6] Rendering ${storyboard.slides.length} slide PNGs (Satori)...\n`);
  const pngPaths = [];
  for (let i = 0; i < storyboard.slides.length; i++) {
    const png = await renderSlide({
      width: WIDTH,
      height: HEIGHT,
      slide: storyboard.slides[i],
    });
    const p = join(tmpDir, `slide-${String(i).padStart(2, '0')}.png`);
    writeFileSync(p, png);
    pngPaths.push(p);
  }

  // [4/6] TTS wav（中間ファイル → tmpDir）
  process.stdout.write(`[4/6] Synthesizing TTS (VOICEVOX speaker=${speaker ?? '<default>'})...\n`);
  const wavPaths = [];
  for (let i = 0; i < scripts.length; i++) {
    const wav = await synthesize({
      text: scripts[i],
      speaker: speaker !== undefined ? Number(speaker) : undefined,
    });
    const p = join(tmpDir, `slide-${String(i).padStart(2, '0')}.wav`);
    writeFileSync(p, wav);
    wavPaths.push(p);
  }

  // [5/6] 字幕 .ass + ffmpeg 合成（中間 → tmpDir、最終 mp4 → docsDir）
  process.stdout.write(`[5/6] Composing video with ffmpeg + subtitles...\n`);
  const durations = [];
  for (const w of wavPaths) durations.push(await probeDuration(w));
  const assPath = join(tmpDir, 'subtitle.ass');
  writeFileSync(assPath, buildSubtitle({ scripts, durations, options: { width: WIDTH, height: HEIGHT } }));

  const mp4Path = join(docsDir, 'shorts.mp4');
  await composeShortsVideo({ pngPaths, wavPaths, assPath, outPath: mp4Path, options: { tmpDir } });

  // [6/6] サムネ + meta（→ docsDir）
  process.stdout.write(`[6/6] Generating thumbnail and meta.json...\n`);
  const thumbPath = join(docsDir, 'thumbnail.png');
  await generateThumbnail({ coverPngPath: pngPaths[0], outPath: thumbPath });

  const meta = buildMeta({ storyboard, durations });
  const metaPath = join(docsDir, 'meta.json');
  writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  const totalSec = durations.reduce((a, b) => a + b, 0).toFixed(1);
  process.stdout.write(`\n✓ Generated: ${mp4Path}\n`);
  process.stdout.write(`  Thumbnail: ${thumbPath}\n`);
  process.stdout.write(`  Meta:      ${metaPath}\n`);
  process.stdout.write(`  Total:     ${totalSec}s (${storyboard.slides.length} slides)\n`);

  return { mp4Path, thumbPath, metaPath, durations };
}

/**
 * meta.json の中身を組み立てる。YouTube Data API で必要なフィールドを揃える。
 */
export function buildMeta({ storyboard, durations }) {
  const totalSec = durations.reduce((a, b) => a + b, 0);
  const description = [
    `${storyboard.title}（技術士総合技術監理部門）`,
    '',
    storyboard.description,
    '',
    '▼ 詳しい解説（doboku-note）',
    `https://doboku-note.com/docs/${storyboard.category}-${storyboard.slug}?utm_source=youtube&utm_medium=description&utm_campaign=shorts`,
    '',
    '▼ 受験記・解答再現（note）',
    'https://note.com/uruhayato/?utm_source=youtube&utm_medium=description',
    '',
    '#技術士 #技術士総監 #総合技術監理 #技術士試験 #技術士受験 #エンジニア学習 #土木 #dobokunote',
  ].join('\n');

  return {
    title: `【総監キーワード】${storyboard.title}`,
    description,
    tags: dedupe([
      '技術士', '技術士総監', '総合技術監理', '技術士試験', '技術士受験',
      'エンジニア学習', '土木', 'dobokunote',
      ...(storyboard.tags || []),
    ]),
    categoryId: '27', // Education
    privacyStatus: 'private', // 初期は private、確認後 unlisted/public へ
    sourceSlug: storyboard.slug,
    sourceCategory: storyboard.category,
    sourceUrl: `https://doboku-note.com/docs/${storyboard.category}-${storyboard.slug}`,
    durationSeconds: Number(totalSec.toFixed(2)),
    slidesCount: storyboard.slides.length,
  };
}

function dedupe(arr) {
  return [...new Set(arr)];
}

function buildScriptTxt({ storyboard, scripts, date }) {
  const header = `# yt-shorts-script: ${storyboard.title} (${date})\n\n`;
  const sections = storyboard.slides.map((slide, i) => {
    const label = String(i + 1).padStart(2, '0');
    return `[${label} ${slide.type}]\n${scripts[i]}`;
  });
  return header + sections.join('\n\n') + '\n';
}

// CLI 起動判定（argv[1] が無い動的 import では false）
const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  const args = parseCliArgs(process.argv);
  await createShorts({
    category: args.category,
    slug: args.slug,
    date: args.date,
    speaker: args.speaker,
    outDir: args.out,
  });
}
