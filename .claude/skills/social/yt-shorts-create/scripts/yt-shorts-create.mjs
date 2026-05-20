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

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

import { renderSlide } from '#lib/sns-common/slide-render.mjs';
import { synthesize } from '#lib/sns-common/tts-client.mjs';
import { applyReadingDict } from '#lib/sns-common/reading-dict.mjs';
import { SNS_CONFIG } from '#lib/sns-common/sns-config.mjs';
import { wrapTitle } from '#lib/sns-common/jp-text-wrap.mjs';
import { buildStoryboard, injectKeywordImage } from './lib/build-storyboard.mjs';
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

// 字幕 1 行あたりの最大文字数（fontSize 48px・幅 1080px の実測上限の安全側）
const SUBTITLE_MAX_CHARS_PER_LINE = 19;

function parseCliArgs(argv) {
  const { values } = parseArgs({
    args: argv.slice(2),
    options: {
      slug: { type: 'string' },
      date: { type: 'string' },
      category: { type: 'string', default: SNS_CONFIG.defaultCategory },
      speaker: { type: 'string' },
      out: { type: 'string' },
      reset: { type: 'boolean' },
      'config-only': { type: 'boolean' },
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
 * storyboard.json（SSOT）の扱い:
 *   - 既存 storyboard.json があり reset=false → それを読み込み（MDX 解析スキップ）
 *   - 無い or reset=true → MDX から生成し storyboard.json を書き出す
 *   各 slide は { type, data, script } を持ち、script が TTS・字幕の真実源。
 *   手書きで品質を上げた台本は storyboard.json に保存され、動画再生成でも保持される。
 *
 * @param {object} args
 * @param {string} args.category
 * @param {string} args.slug
 * @param {string} args.date  YYYY-MM-DD
 * @param {string} [args.speaker]  VOICEVOX speaker ID（既定: env or 1）
 * @param {string} [args.outDir]
 * @param {boolean} [args.reset]       storyboard.json を無視して MDX から再生成
 * @param {boolean} [args.configOnly] storyboard.json 生成のみ（PNG/TTS/動画をスキップ、ffmpeg 不要）
 * @returns {Promise<{ mp4Path, thumbPath, metaPath, durations }>}
 */
export async function createShorts({ category, slug, date, speaker, outDir, reset = false, configOnly = false }) {
  if (!configOnly && !ffmpegAvailable()) {
    throw new Error('ffmpeg not found in PATH. Install with: brew install ffmpeg');
  }

  // 中間ファイル（PNG/WAV/mp4/concat/ass）は .tmp に、最終成果物は docs に
  const tmpDir = join('.tmp', 'sns', date, `${slug}-shorts`);
  const docsDir = outDir ?? join('docs', 'sns', 'youtube', `${date}-${slug}`);
  mkdirSync(tmpDir, { recursive: true });
  mkdirSync(docsDir, { recursive: true });

  const sbPath = join(docsDir, 'storyboard.json');

  // [1/6] storyboard（SSOT 優先 / 無ければ MDX から生成して書き出す）
  let storyboard;
  if (existsSync(sbPath) && !reset) {
    process.stdout.write(`[1/6] Loading storyboard.json (SSOT)...\n`);
    storyboard = JSON.parse(readFileSync(sbPath, 'utf8'));
  } else {
    process.stdout.write(`[1/6] Building storyboard from MDX...\n`);
    storyboard = await buildStoryboard({ category, slug });
    const built = buildScript(storyboard);
    storyboard.slides.forEach((slide, i) => { slide.script = built[i]; });
    writeFileSync(sbPath, JSON.stringify(serializeStoryboard(storyboard), null, 2) + '\n', 'utf8');
    process.stdout.write(`     storyboard.json を生成（手動編集可能な SSOT）\n`);
  }
  process.stdout.write(`     ${storyboard.slides.length} slides: ${storyboard.slides.map(s => s.type).join(' / ')}\n`);

  // [2/6] script（storyboard.json の各 slide.script が真実源）
  process.stdout.write(`[2/6] Writing scripts...\n`);
  const scripts = storyboard.slides.map(s => s.script || '');
  const readingScripts = scripts.map(s => applyReadingDict(s));
  writeFileSync(join(docsDir, 'script.txt'), buildScriptTxt({ storyboard, scripts, date }));
  writeFileSync(join(docsDir, 'reading.txt'), buildScriptTxt({ storyboard, scripts: readingScripts, date }));

  if (configOnly) {
    process.stdout.write(`\n✓ config-only → ${sbPath}\n`);
    return { storyboardPath: sbPath, docsDir };
  }

  // 画像 base64 は SSOT に保存しないため、レンダリング直前に再注入
  await injectKeywordImage(storyboard, { category, slug, title: storyboard.title });

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
  for (let i = 0; i < readingScripts.length; i++) {
    const wav = await synthesize({
      text: readingScripts[i],
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
  // 字幕は budoux で文節改行を入れてから渡す（build-subtitle は WrapStyle 2 = 自動折り返し無効）
  const subtitleScripts = await Promise.all(scripts.map(wrapScriptForSubtitle));
  const assPath = join(tmpDir, 'subtitle.ass');
  writeFileSync(assPath, buildSubtitle({ scripts: subtitleScripts, durations, options: { width: WIDTH, height: HEIGHT } }));

  const mp4Path = join(docsDir, 'shorts.mp4');
  await composeShortsVideo({ pngPaths, wavPaths, assPath, outPath: mp4Path, options: { tmpDir } });

  // [6/6] サムネ + meta（→ docsDir）
  process.stdout.write(`[6/6] Generating thumbnail and meta.json...\n`);
  const thumbPath = join(docsDir, 'thumbnail.png');
  await generateThumbnail({ storyboard, outPath: thumbPath });

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
 * storyboard を SSOT JSON 用に整形する。
 * definition スライドの imageBase64 / credit は巨大かつ毎回再取得できるため除外する。
 */
function serializeStoryboard(sb) {
  return {
    category: sb.category,
    slug: sb.slug,
    title: sb.title,
    description: sb.description,
    tags: sb.tags,
    slides: sb.slides.map(s => {
      const data = { ...(s.data || {}) };
      delete data.imageBase64;
      delete data.credit;
      return { type: s.type, data, script: s.script ?? '' };
    }),
  };
}

/**
 * 字幕 1 スライド分のテキストを budoux で文節改行する。
 * build-subtitle.mjs は WrapStyle 2（自動折り返し無効）なので、ここで改行を確定させる。
 */
async function wrapScriptForSubtitle(text) {
  const lines = await wrapTitle(text || '', {
    budoux: { enabled: true },
    charCountFallback: SUBTITLE_MAX_CHARS_PER_LINE,
  });
  return lines.join('\n');
}

/**
 * meta.json の中身を組み立てる。YouTube Data API で必要なフィールドを揃える。
 */
export function buildMeta({ storyboard, durations }) {
  const totalSec = durations.reduce((a, b) => a + b, 0);
  const yt = SNS_CONFIG.youtube;
  const description = [
    `${storyboard.title}（${SNS_CONFIG.profession}）`,
    '',
    storyboard.description,
    '',
    yt.descriptionHeaders.site,
    `${SNS_CONFIG.domainUrl}/docs/${storyboard.category}-${storyboard.slug}?${yt.utmParams}`,
    '',
    yt.descriptionHeaders.note,
    `${SNS_CONFIG.noteUrl}?${yt.utmParams.replace('campaign=shorts', 'campaign=note')}`,
    '',
    yt.hashtags,
  ].join('\n');

  return {
    title: `${yt.titlePrefix}${storyboard.title}`,
    description,
    tags: dedupe([...yt.tags, ...(storyboard.tags || [])]),
    categoryId: yt.categoryId,
    privacyStatus: yt.privacyStatus,
    sourceSlug: storyboard.slug,
    sourceCategory: storyboard.category,
    sourceUrl: `${SNS_CONFIG.domainUrl}/docs/${storyboard.category}-${storyboard.slug}`,
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
    reset: args.reset === true,
    configOnly: args['config-only'] === true,
  });
}
