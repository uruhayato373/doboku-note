#!/usr/bin/env node
/**
 * 動画パックの通常動画用 storyboard と生成済み WAV から、関連 Shorts を再生成する。
 * 出力は .tmp/video-render/{packId}/shorts/{key}/。Git には入れず private R2 へ退避する。
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import { EXAM_TO_PALETTE, wrapJp } from './lib/longform-render.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const W = 1080;
const H = 1920;
const HOOK_SECONDS = 4;
const CTA_SECONDS = 8;
const FONT_JP = "'NotoSansJP', 'Noto Sans JP'";

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
const renderRoot = args['render-root'] ? resolve(args['render-root']) : join(ROOT, '.tmp', 'video-render');
const sourceRoot = join(renderRoot, manifest.packId);

const { resolveExam } = await import(
  pathToFileURL(resolve(ROOT, '.claude/scripts/sns/lib/exam-palette.mjs')).href
);
const { composeShortsVideo, ffmpegAvailable, probeDuration } = await import(
  pathToFileURL(resolve(ROOT, '.claude/skills/social/yt-shorts-create/scripts/lib/ffmpeg-compose.mjs')).href
);
if (!ffmpegAvailable()) throw new Error('ffmpeg / ffprobe が利用できません');

const palette = resolveExam(EXAM_TO_PALETTE[manifest.exam]);
const theme = { base: palette.base, deep: palette.deep, label: palette.label };
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

function coverNode(item) {
  const topic = item.title.replace(/^.*?｜/, '').replace(/\s*#Shorts$/, '');
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
            textNode(chunkJpBalanced(topic, 10).join('\n'), { fontSize: 88, fontWeight: 700, lineHeight: 1.45, textAlign: 'center', whiteSpace: 'pre-wrap' }),
          ] },
        },
        textNode('1級土木・施工経験記述', { fontSize: 44, fontWeight: 500, color: 'rgba(255,255,255,.84)' }),
      ],
    },
  };
}

function pointsNode(scene) {
  const visual = scene.visual ?? { heading: scene.caption, items: [] };
  return {
    type: 'div',
    props: {
      style: { display: 'flex', flexDirection: 'column', width: `${W}px`, height: `${H}px`, background: '#fff', fontFamily: FONT_JP },
      children: [
        {
          type: 'div', props: { style: { display: 'flex', height: 180, padding: '0 58px', alignItems: 'center', justifyContent: 'space-between', background: theme.deep }, children: [
            textNode(theme.label, { color: '#fff', fontSize: 38, fontWeight: 700 }),
            textNode('施工経験記述', { color: 'rgba(255,255,255,.74)', fontSize: 32, fontWeight: 500 }),
          ] },
        },
        {
          type: 'div', props: { style: { display: 'flex', flex: 1, flexDirection: 'column', padding: '105px 72px 390px', borderLeft: `14px solid ${theme.base}` }, children: [
            textNode(wrapJp(visual.heading ?? scene.caption ?? '', 13).join('\n'), { fontSize: 72, fontWeight: 700, lineHeight: 1.45, whiteSpace: 'pre-wrap', color: '#222', marginBottom: 70 }),
            ...(visual.items ?? []).map((item) => ({
              type: 'div', props: { style: { display: 'flex', alignItems: 'flex-start', marginBottom: 48 }, children: [
                textNode('●', { color: theme.base, fontSize: 36, marginRight: 28, marginTop: 8 }),
                textNode(chunkJpBalanced(item, 17).join('\n'), { color: '#343434', fontSize: 47, fontWeight: 500, lineHeight: 1.65, whiteSpace: 'pre-wrap', flex: 1 }),
              ] },
            })),
          ] },
        },
      ],
    },
  };
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
        textNode('工事概要7項目をまとめて確認', { fontSize: 42, fontWeight: 500, color: 'rgba(255,255,255,.84)', marginTop: 80 }),
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

function buildAss(narration, duration) {
  const header = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${W}\nPlayResY: ${H}\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Noto Sans JP,54,&H00FFFFFF,&H000000FF,&H00000000,&H98000000,1,0,0,0,100,100,0,0,3,3,0,2,64,64,210,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;
  const chunks = chunkJpBalanced(narration, 19);
  const totalChars = [...narration].length || 1;
  let at = 0;
  const lines = chunks.map((chunk, index) => {
    const end = index === chunks.length - 1 ? duration : at + duration * ([...chunk].length / totalChars);
    const line = `Dialogue: 0,${assTime(at)},${assTime(end)},Default,,0,0,0,,${chunk}`;
    at = end;
    return line;
  });
  return `${header}\n${lines.join('\n')}\n`;
}

async function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

async function main() {
  if (!Array.isArray(publish.shorts) || publish.shorts.length !== 2) throw new Error('youtube.json shorts は2件必要です');
  for (const item of publish.shorts) {
    const sceneIndex = storyboard.scenes.findIndex((scene) => scene.sceneId === item.sceneId);
    if (sceneIndex < 0) throw new Error(`sceneId がありません: ${item.sceneId}`);
    const scene = storyboard.scenes[sceneIndex];
    const sourceWav = join(sourceRoot, 'wav', `${String(sceneIndex).padStart(2, '0')}-${scene.sceneId}.wav`);
    const outDir = join(sourceRoot, 'shorts', item.key);
    const tmpDir = join(outDir, 'work');
    mkdirSync(tmpDir, { recursive: true });

    const coverPng = join(tmpDir, 'cover.png');
    const pointsPng = join(tmpDir, 'points.png');
    const ctaPng = join(tmpDir, 'cta.png');
    await renderPng(coverNode(item), coverPng);
    await renderPng(pointsNode(scene), pointsPng);
    await renderPng(ctaNode(), ctaPng);

    const sourceDuration = await probeDuration(sourceWav);
    if (sourceDuration <= HOOK_SECONDS + 1) throw new Error(`${item.key}: 音声が短すぎます`);
    const hookWav = join(tmpDir, 'hook.wav');
    const pointsWav = join(tmpDir, 'points.wav');
    const ctaWav = join(tmpDir, 'cta-silence.wav');
    ffmpeg(['-i', sourceWav, '-t', String(HOOK_SECONDS), hookWav]);
    ffmpeg(['-ss', String(HOOK_SECONDS), '-i', sourceWav, pointsWav]);
    ffmpeg(['-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', String(CTA_SECONDS), ctaWav]);

    const assPath = join(outDir, 'subtitles.ass');
    writeFileSync(assPath, buildAss(scene.narration, sourceDuration), 'utf8');
    const outPath = join(outDir, 'shorts.mp4');
    await composeShortsVideo({
      pngPaths: [coverPng, pointsPng, ctaPng],
      wavPaths: [hookWav, pointsWav, ctaWav],
      assPath,
      outPath,
      options: { tmpDir },
    });
    const durationSeconds = await probeDuration(outPath);
    if (durationSeconds < 30 || durationSeconds > 60) throw new Error(`${item.key}: 推奨尺外 ${durationSeconds.toFixed(2)}s`);
    const thumbnailPath = join(outDir, 'thumbnail.png');
    copyFileSync(coverPng, thumbnailPath);
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
    console.log(`${item.key}: ${durationSeconds.toFixed(2)}s sha256=${await sha256(outPath)} thumbnail=${await sha256(thumbnailPath)}`);
  }
}

await main();
