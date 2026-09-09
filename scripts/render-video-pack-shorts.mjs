#!/usr/bin/env node
/**
 * 動画パックの通常動画用 storyboard と生成済み WAV から、関連 Shorts を再生成する。
 * 出力は .tmp/video-render/{packId}/shorts/{key}/。Git には入れず Google Drive vault へ保存する。
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import { buildExplanationNode } from './lib/video-explanation.mjs';
import { EXAM_TO_PALETTE, wrapJp } from './lib/longform-render.mjs';
import { renderYoutubeCover, validateCoverDesign } from './lib/youtube-cover.mjs';
import { readVideoCta } from './lib/video-cta.mjs';
import { narrationInput, reusableNarration, sha256 as bytesSha256 } from './lib/video-narration-cache.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const W = 1080;
const H = 1920;
const HOOK_SECONDS = 4;
const CTA_SECONDS = 8;
const FONT_JP = "'NotoSansJP', 'Noto Sans JP'";
const EXAM_PROFILE = {
  'civil-construction-1': { short: '1級土木', series: '1級土木施工管理技士' },
  'civil-construction-2': { short: '2級土木', series: '2級土木施工管理技士' },
  'concrete-engineer': { short: 'コンクリート技士', series: 'コンクリート技士試験' },
  'concrete-chief-engineer': { short: 'コンクリート主任技士', series: 'コンクリート主任技士試験' },
};

function chunkJpBalanced(text, maxChars) {
  const chars = [...(text ?? '')];
  if (chars.length === 0) return [];
  const chunkCount = Math.ceil(chars.length / maxChars);
  const chunkSize = Math.ceil(chars.length / chunkCount);
  return wrapJp(chars.join(''), chunkSize);
}

const { values: args } = parseArgs({
  args: process.argv.slice(2),
  options: {
    'pack-dir': { type: 'string' },
    'render-root': { type: 'string' },
    force: { type: 'boolean', default: false },
    key: { type: 'string' },
    'preview-only': { type: 'boolean', default: false },
  },
});
if (!args['pack-dir']) {
  console.error('Usage: node scripts/render-video-pack-shorts.mjs --pack-dir content/sns/video-packs/{exam}/{packId} [--render-root PATH]');
  process.exit(1);
}

const packDir = resolve(ROOT, args['pack-dir']);
const manifest = JSON.parse(readFileSync(join(packDir, 'video-pack.json'), 'utf8'));
const storyboard = JSON.parse(readFileSync(join(packDir, 'storyboard.json'), 'utf8'));
const publish = JSON.parse(readFileSync(join(packDir, 'youtube.json'), 'utf8'));
const coverDesignPath = join(packDir, 'cover-design.json');
const coverDesign = existsSync(coverDesignPath)
  ? validateCoverDesign(JSON.parse(readFileSync(coverDesignPath, 'utf8')), { exam: EXAM_TO_PALETTE[manifest.exam] }) : null;
const renderRoot = args['render-root'] ? resolve(args['render-root']) : join(ROOT, '.tmp', 'video-render');
const sourceRoot = join(renderRoot, manifest.packId);
const cta = await readVideoCta(ROOT, packDir, 'shorts');

const { resolveExam } = await import(
  pathToFileURL(resolve(ROOT, '.claude/scripts/sns/lib/exam-palette.mjs')).href
);
const { composeStaticSlidesVideo, ffmpegAvailable, probeDuration } = await import(
  pathToFileURL(resolve(ROOT, '.claude/skills/social/yt-shorts-create/scripts/lib/ffmpeg-compose.mjs')).href
);
if (!args['preview-only'] && !ffmpegAvailable()) throw new Error('ffmpeg / ffprobe が利用できません');

const palette = resolveExam(EXAM_TO_PALETTE[manifest.exam]);
const theme = { base: palette.base, deep: palette.deep, label: palette.label };
const examProfile = EXAM_PROFILE[manifest.exam];
if (!examProfile) throw new Error(`未対応の試験: ${manifest.exam}`);
const FONT_DIR = resolve(ROOT, '.claude/skills/conversion/ogp-create/assets/fonts');
const FONTSOURCE_DIR = resolve(ROOT, 'node_modules/@fontsource');
const fonts = [
  { name: 'Noto Sans JP', data: readFileSync(resolve(FONT_DIR, 'NotoSansJP-Bold.ttf')), weight: 700, style: 'normal' },
  ...[400, 500, 700].map((weight) => ({
    name: 'NotoSansJP',
    data: readFileSync(resolve(FONTSOURCE_DIR, `noto-sans-jp/files/noto-sans-jp-japanese-${weight}-normal.woff`)),
    weight,
    style: 'normal',
  })),
];

const textNode = (text, style = {}) => ({
  type: 'div',
  props: { style: { display: 'flex', fontFamily: FONT_JP, ...style }, children: text },
});

function coverNode(item, scene) {
  const topic = String(scene.visual?.heading || scene.caption || item.title)
    .replace(/^(?:STEP\s*\d+|原因\s*\d+|ポイント\s*\d+|\d+)[\s　.:：、．-]*/iu, '')
    .trim();
  const topicChars = [...topic].length;
  const topicFontSize = topicChars > 34 ? 66 : topicChars > 26 ? 74 : topicChars > 20 ? 82 : 90;
  const topicLineLength = topicChars > 30 ? 12 : 10;
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex', flexDirection: 'column', width: `${W}px`, height: `${H}px`,
        padding: '170px 74px 160px', background: theme.deep, color: '#fff',
        justifyContent: 'space-between', alignItems: 'center', fontFamily: FONT_JP,
      },
      children: [
        textNode(theme.label, { fontSize: 42, fontWeight: 700, color: 'rgba(255,255,255,.72)', letterSpacing: 3 }),
        {
          type: 'div', props: { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' }, children: [
            textNode('この動画のポイント', { fontSize: 42, fontWeight: 700, color: 'rgba(255,255,255,.75)', marginBottom: 58 }),
            textNode(chunkJpBalanced(topic, topicLineLength).join('\n'), { fontSize: topicFontSize, fontWeight: 700, lineHeight: 1.45, textAlign: 'center', whiteSpace: 'pre-wrap' }),
          ] },
        },
        textNode(fitText(manifest.title, 28), { fontSize: 44, fontWeight: 500, color: 'rgba(255,255,255,.84)' }),
      ],
    },
  };
}

function pointsNode(scene) {
  return buildExplanationNode(scene, { theme, packTitle: manifest.title, portrait: true });
}

function fitText(text, maxChars) {
  const chars = [...String(text ?? '')];
  return chars.length <= maxChars ? chars.join('') : `${chars.slice(0, maxChars - 1).join('')}…`;
}

function ctaNode() {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex', flexDirection: 'column', width: `${W}px`, height: `${H}px`,
        padding: '190px 74px', background: theme.deep, color: '#fff',
        justifyContent: 'center', alignItems: 'center', fontFamily: FONT_JP,
      },
      children: [
        textNode(theme.label, { fontSize: 40, fontWeight: 700, color: 'rgba(255,255,255,.72)', marginBottom: 90 }),
        textNode('詳しい解説は\n関連動画へ', { fontSize: 96, fontWeight: 700, lineHeight: 1.45, textAlign: 'center', whiteSpace: 'pre-wrap' }),
        textNode(`${fitText(manifest.title, 24)}を確認`, { fontSize: 42, fontWeight: 500, color: 'rgba(255,255,255,.84)', marginTop: 80 }),
        textNode('doboku-note', { fontSize: 34, fontWeight: 700, color: 'rgba(255,255,255,.60)', marginTop: 190, letterSpacing: 4 }),
      ],
    },
  };
}

async function renderPng(node, outPath) {
  const svg = await satori(node, { width: W, height: H, fonts });
  writeFileSync(outPath, new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng());
}

function ffmpeg(args) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
}

function assTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s.toFixed(2)).padStart(5, '0')}`;
}

function buildAss(segments) {
  const header = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${W}\nPlayResY: ${H}\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Noto Sans JP,54,&H00FFFFFF,&H000000FF,&H00000000,&H98000000,1,0,0,0,100,100,0,0,3,3,0,2,64,64,420,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;
  const lines = [];
  for (const segment of segments) {
    const chunks = chunkJpBalanced(segment.text, 19);
    const totalChars = [...segment.text].length || 1;
    let at = segment.start;
    for (const [index, chunk] of chunks.entries()) {
      const end = index === chunks.length - 1
        ? segment.start + segment.duration
        : at + segment.duration * ([...chunk].length / totalChars);
      lines.push(`Dialogue: 0,${assTime(at)},${assTime(end)},Default,,0,0,0,,${chunk}`);
      at = end;
    }
  }
  return `${header}\n${lines.join('\n')}\n`;
}

async function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

async function customCtaWav() {
  const render = JSON.parse(readFileSync(join(sourceRoot, 'render-manifest.json'), 'utf8'));
  if (!render.tts || !Number.isInteger(render.speaker)) throw new Error('CTA音声の話者を確定するため通常動画を先に再生成してください');
  const path = join(sourceRoot, 'wav', 'shorts-cta.wav');
  const recordPath = join(sourceRoot, 'shorts-cta-input.json');
  const record = existsSync(recordPath) ? JSON.parse(readFileSync(recordPath, 'utf8')) : null;
  const input = narrationInput(cta.narration, render.speaker);
  if (existsSync(path) && reusableNarration(record, input, readFileSync(path))) return path;
  const { isRunning, synthesize } = await import('../.claude/scripts/lib/sns-common/tts-client.mjs');
  if (!(await isRunning())) throw new Error('Shorts CTA音声の合成にはVOICEVOXが必要です');
  const bytes = Buffer.from(await synthesize({ text: input.text, speaker: render.speaker }));
  writeFileSync(path, bytes);
  writeFileSync(recordPath, JSON.stringify({ inputSha256: input.inputSha256, sha256: bytesSha256(bytes) }, null, 2) + '\n');
  return path;
}

async function main() {
  if (!Array.isArray(publish.shorts) || publish.shorts.length !== manifest.outputs?.shorts) {
    throw new Error(`youtube.json shorts は${manifest.outputs?.shorts}件必要です`);
  }
  let changed = false;
  const targets = publish.shorts.filter(item => !args.key || item.key === args.key);
  if (!targets.length) throw new Error('Shorts 対象0件');
  const authoredCtaWav = cta && !args['preview-only'] ? await customCtaWav() : null;
  for (const item of targets) {
    const coverSpec = coverDesign?.covers?.[item.key];
    if (coverSpec && coverSpec.format !== 'shorts') throw new Error(`${item.key}: cover format が不一致`);
    const sceneIndex = storyboard.scenes.findIndex((scene) => scene.sceneId === item.sceneId);
    if (sceneIndex < 0) throw new Error(`sceneId がありません: ${item.sceneId}`);
    const scene = storyboard.scenes[sceneIndex];
    const ctaIndex = storyboard.scenes.findIndex((candidate) => candidate.sceneId === 'cta');
    if (ctaIndex < 0) throw new Error(`${item.key}: cta scene がありません`);
    const ctaScene = storyboard.scenes[ctaIndex];
    const sourceWav = join(sourceRoot, 'wav', `${String(sceneIndex).padStart(2, '0')}-${scene.sceneId}.wav`);
    const ctaSourceWav = authoredCtaWav ?? join(sourceRoot, 'wav', `${String(ctaIndex).padStart(2, '0')}-${ctaScene.sceneId}.wav`);
    const outDir = join(sourceRoot, 'shorts', item.key);
    const tmpDir = join(outDir, 'work');
    mkdirSync(tmpDir, { recursive: true });

    const existingVideo = join(outDir, 'shorts.mp4');
    const existingThumbnail = join(outDir, 'thumbnail.png');
    if (!args['preview-only'] && !coverSpec && !cta && !args.force && existsSync(existingVideo) && existsSync(existingThumbnail)) {
      const videoSha = await sha256(existingVideo);
      const thumbnailSha = await sha256(existingThumbnail);
      if (item.sha256 === videoSha && item.thumbnailSha256 === thumbnailSha) {
        console.log(`${item.key}: existing sha256=${videoSha} thumbnail=${thumbnailSha}`);
        continue;
      }
    }

    const coverPng = join(tmpDir, 'cover.png');
    const pointsPng = join(tmpDir, 'points.png');
    const ctaPng = join(tmpDir, 'cta.png');
    if (coverSpec) {
      const cover = await renderYoutubeCover(ROOT, coverSpec);
      writeFileSync(coverPng, cover.buffer);
      writeFileSync(join(tmpDir, 'cover-provenance.json'), JSON.stringify(cover.provenance, null, 2) + '\n');
    } else await renderPng(coverNode(item, scene), coverPng);
    await renderPng(pointsNode(scene), pointsPng);
    if (cta) {
      writeFileSync(ctaPng, cta.buffer);
      writeFileSync(join(tmpDir, 'cta-provenance.json'), JSON.stringify(cta.provenance, null, 2) + '\n');
    } else await renderPng(ctaNode(), ctaPng);

    // Preview never replaces the upload thumbnail, video hash, or publication input.
    if (args['preview-only']) {
      console.log(`${item.key}: PNG 3枚を ${tmpDir} に生成。動画/投稿サムネ/台帳は未変更`);
      continue;
    }

    const sourceDuration = await probeDuration(sourceWav);
    if (sourceDuration <= HOOK_SECONDS + 1) throw new Error(`${item.key}: 音声が短すぎます`);
    let narrationWav = sourceWav;
    let narrationDuration = sourceDuration;
    if (sourceDuration > 51.5) {
      narrationWav = join(tmpDir, 'narration-compressed.wav');
      ffmpeg(['-i', sourceWav, '-filter:a', `atempo=${(sourceDuration / 51.5).toFixed(6)}`, narrationWav]);
      narrationDuration = await probeDuration(narrationWav);
    }
    const hookWav = join(tmpDir, 'hook.wav');
    const pointsWav = join(tmpDir, 'points.wav');
    const ctaWav = join(tmpDir, 'cta.wav');
    ffmpeg(['-i', narrationWav, '-t', String(HOOK_SECONDS), hookWav]);
    ffmpeg(['-ss', String(HOOK_SECONDS), '-i', narrationWav, pointsWav]);
    const ctaSeconds = Math.max(CTA_SECONDS, 30.2 - narrationDuration);
    const ctaSourceDuration = await probeDuration(ctaSourceWav);
    if (ctaSourceDuration > ctaSeconds) {
      ffmpeg(['-i', ctaSourceWav, '-filter:a', `atempo=${(ctaSourceDuration / ctaSeconds).toFixed(6)}`, ctaWav]);
    } else {
      ffmpeg(['-i', ctaSourceWav, '-af', 'apad', '-t', String(ctaSeconds), ctaWav]);
    }

    const assPath = join(outDir, 'subtitles.ass');
    writeFileSync(assPath, buildAss([
      { text: scene.narration, start: 0, duration: narrationDuration },
      { text: cta?.narration ?? ctaScene.narration, start: narrationDuration, duration: Math.min(ctaSourceDuration, ctaSeconds) },
    ]), 'utf8');
    const outPath = join(outDir, 'shorts.mp4');
    await composeStaticSlidesVideo({
      pngPaths: [coverPng, pointsPng, ctaPng],
      wavPaths: [hookWav, pointsWav, ctaWav],
      assPath,
      outPath,
    });
    // The single-pass compositor no longer needs the previous intermediate MP4s.
    for (const name of ['slide-00.mp4', 'slide-01.mp4', 'slide-02.mp4', '_combined.mp4', 'concat.txt']) {
      rmSync(join(tmpDir, name), { force: true });
    }
    const durationSeconds = await probeDuration(outPath);
    if (durationSeconds < 30 || durationSeconds > 60) throw new Error(`${item.key}: 推奨尺外 ${durationSeconds.toFixed(2)}s`);
    const thumbnailPath = join(outDir, 'thumbnail.png');
    copyFileSync(coverPng, thumbnailPath);
    const videoSha = await sha256(outPath);
    const thumbnailSha = await sha256(thumbnailPath);
    writeFileSync(join(outDir, 'meta.json'), JSON.stringify({
      title: item.title,
      description: item.description,
      tags: item.tags,
      categoryId: item.categoryId,
      privacyStatus: 'private',
      publishAt: item.publishAt,
      sourcePackId: manifest.packId,
      sourceUrl: null,
      durationSeconds,
      derivedFrom: 'video-pack',
      relatedVideoKey: 'longform',
    }, null, 2) + '\n');
    item.sha256 = videoSha;
    item.thumbnailSha256 = thumbnailSha;
    changed = true;
    console.log(`${item.key}: ${durationSeconds.toFixed(2)}s sha256=${videoSha} thumbnail=${thumbnailSha}`);
  }
  if (changed) writeFileSync(join(packDir, 'youtube.json'), `${JSON.stringify(publish, null, 2)}\n`);
}

await main();
