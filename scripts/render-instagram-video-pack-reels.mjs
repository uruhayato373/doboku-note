#!/usr/bin/env node
/**
 * prepare-instagram-video-pack-reels が作った派生 SoT から Instagram Reels を生成する。
 * YouTube Shorts の本文 PNG/WAV を再利用し、cover と CTA だけを IG ネイティブ表現へ差し替える。
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import { EXAM_TO_PALETTE, wrapJp } from './lib/longform-render.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IG_ROOT = join(ROOT, 'content/sns/instagram/video-packs');
const W = 1080;
const H = 1920;
const FONT_JP = "'NotoSansJP', 'Noto Sans JP'";
const CTA_NARRATION = 'フォローすると、試験対策が継続して届きます。詳しい解説はプロフィールのリンクからご覧ください。';

const { values: args } = parseArgs({
  args: process.argv.slice(2),
  options: {
    all: { type: 'boolean', default: false },
    dir: { type: 'string' },
    max: { type: 'string', default: '999' },
    concurrency: { type: 'string', default: '4' },
    force: { type: 'boolean', default: false },
    speaker: { type: 'string', default: '1' },
    software: { type: 'boolean', default: false },
  },
});
if (!args.all && !args.dir) {
  console.error('Usage: node scripts/render-instagram-video-pack-reels.mjs --all [--max N] [--force] | --dir <derived-pack>');
  process.exit(1);
}

const { resolveExam } = await import(
  pathToFileURL(resolve(ROOT, '.claude/scripts/sns/lib/exam-palette.mjs')).href
);
const { isRunning, synthesize } = await import(
  pathToFileURL(resolve(ROOT, '.claude/scripts/lib/sns-common/tts-client.mjs')).href
);
const { composeStaticSlidesVideo, ffmpegAvailable, probeDuration } = await import(
  pathToFileURL(resolve(ROOT, '.claude/skills/social/yt-shorts-create/scripts/lib/ffmpeg-compose.mjs')).href
);
if (!ffmpegAvailable()) throw new Error('ffmpeg / ffprobe が利用できません');
if (!(await isRunning())) throw new Error('VOICEVOX が起動していません（127.0.0.1:50021）');

const FONT_DIR = resolve(ROOT, '.claude/skills/conversion/ogp-create/assets/fonts');
const FONTSOURCE_DIR = resolve(ROOT, 'node_modules/@fontsource');
const fonts = [
  { name: 'Noto Sans JP', data: readFileSync(resolve(FONT_DIR, 'NotoSansJP-Bold.ttf')), weight: 700, style: 'normal' },
  ...[400, 500, 700].map((weight) => ({
    name: 'NotoSansJP',
    data: readFileSync(resolve(FONTSOURCE_DIR, `noto-sans-jp/files/noto-sans-jp-japanese-${weight}-normal.woff`)),
    weight, style: 'normal',
  })),
];
const textNode = (text, style = {}) => ({
  type: 'div', props: { style: { display: 'flex', fontFamily: FONT_JP, ...style }, children: text },
});
function fitText(text, max) {
  const chars = [...String(text ?? '')];
  return chars.length <= max ? chars.join('') : `${chars.slice(0, max - 1).join('')}…`;
}
function balanced(text, maxChars) {
  const chars = [...String(text ?? '')];
  const count = Math.max(1, Math.ceil(chars.length / maxChars));
  return wrapJp(chars.join(''), Math.ceil(chars.length / count));
}
function themeFor(exam) {
  const palette = resolveExam(EXAM_TO_PALETTE[exam]);
  return { base: palette.base, deep: palette.deep, label: palette.label };
}
function coverNode(meta, manifest, theme) {
  const topic = fitText(String(meta.title).replace(/^.*?[|｜]\s*/u, ''), 36);
  const fontSize = [...topic].length > 28 ? 70 : [...topic].length > 20 ? 80 : 92;
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex', flexDirection: 'column', width: `${W}px`, height: `${H}px`,
        padding: '150px 74px 150px', background: theme.deep, color: '#fff',
        justifyContent: 'space-between', alignItems: 'center', fontFamily: FONT_JP,
      },
      children: [
        {
          type: 'div', props: { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }, children: [
            textNode(theme.label, { fontSize: 40, fontWeight: 700, color: 'rgba(255,255,255,.72)', letterSpacing: 3 }),
            textNode('総監取得者が解説', { fontSize: 34, fontWeight: 700, color: theme.deep, background: '#fff', padding: '14px 30px', borderRadius: 999 }),
          ] },
        },
        {
          type: 'div', props: { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' }, children: [
            textNode('この動画のポイント', { fontSize: 42, fontWeight: 700, color: 'rgba(255,255,255,.75)', marginBottom: 54 }),
            textNode(balanced(topic, 12).join('\n'), { fontSize, fontWeight: 700, lineHeight: 1.45, textAlign: 'center', whiteSpace: 'pre-wrap' }),
          ] },
        },
        textNode(fitText(manifest.title, 28), { fontSize: 42, fontWeight: 500, color: 'rgba(255,255,255,.84)', textAlign: 'center' }),
      ],
    },
  };
}
function ctaNode(manifest, theme) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex', flexDirection: 'column', width: `${W}px`, height: `${H}px`,
        padding: '180px 74px', background: theme.deep, color: '#fff',
        justifyContent: 'center', alignItems: 'center', fontFamily: FONT_JP,
      },
      children: [
        textNode('技術士（総合技術監理部門）取得者が企画・監修', { fontSize: 30, fontWeight: 700, color: 'rgba(255,255,255,.72)', marginBottom: 90 }),
        textNode('フォローで\n試験対策を継続', { fontSize: 92, fontWeight: 700, lineHeight: 1.45, textAlign: 'center', whiteSpace: 'pre-wrap' }),
        textNode('詳しい解説はプロフィールのリンクから', { fontSize: 40, fontWeight: 500, color: 'rgba(255,255,255,.88)', marginTop: 80, textAlign: 'center' }),
        textNode(fitText(manifest.title, 24), { fontSize: 36, fontWeight: 500, color: 'rgba(255,255,255,.68)', marginTop: 110, textAlign: 'center' }),
        textNode('doboku-note', { fontSize: 34, fontWeight: 700, color: 'rgba(255,255,255,.60)', marginTop: 150, letterSpacing: 4 }),
      ],
    },
  };
}
async function renderPng(node, outPath) {
  const svg = await satori(node, { width: W, height: H, fonts });
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng());
}
function ffmpeg(ffArgs) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...ffArgs], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${result.stderr}`);
}
function assTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s.toFixed(2)).padStart(5, '0')}`;
}
function buildAss(segments) {
  const header = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${W}\nPlayResY: ${H}\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Noto Sans JP,54,&H00FFFFFF,&H000000FF,&H00000000,&H98000000,1,0,0,0,100,100,0,0,3,3,0,2,64,64,210,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;
  const lines = [];
  for (const segment of segments) {
    const chunks = balanced(segment.text, 19);
    const total = [...segment.text].length || 1;
    let at = segment.start;
    for (const [index, chunk] of chunks.entries()) {
      const end = index === chunks.length - 1 ? segment.start + segment.duration : at + segment.duration * ([...chunk].length / total);
      lines.push(`Dialogue: 0,${assTime(at)},${assTime(end)},Default,,0,0,0,,${chunk}`);
      at = end;
    }
  }
  return `${header}\n${lines.join('\n')}\n`;
}
function walkMeta(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walkMeta(path, out);
    else if (name === 'meta.json' && dirname(path).endsWith(`${join('', 'reels')}`)) out.push(path);
  }
  return out;
}
function selectedMeta() {
  if (args.dir) {
    const dir = resolve(ROOT, args.dir);
    const path = existsSync(join(dir, 'reels/meta.json')) ? join(dir, 'reels/meta.json') : join(dir, 'meta.json');
    if (!existsSync(path)) throw new Error(`meta.json がありません: ${dir}`);
    return [path];
  }
  return walkMeta(IG_ROOT)
    .sort((a, b) => JSON.parse(readFileSync(a, 'utf8')).publishAt.localeCompare(JSON.parse(readFileSync(b, 'utf8')).publishAt))
    .slice(0, Math.max(1, Number(args.max) || 999));
}
function sha256(path) { return createHash('sha256').update(readFileSync(path)).digest('hex'); }

const sharedDir = join(ROOT, '.tmp/instagram-video-pack-reels');
mkdirSync(sharedDir, { recursive: true });
const sharedCta = join(sharedDir, `cta-speaker-${args.speaker}.wav`);
if (!existsSync(sharedCta)) writeFileSync(sharedCta, Buffer.from(await synthesize({ text: CTA_NARRATION, speaker: Number(args.speaker) })));

async function renderOne(metaPath, index, total) {
  const reelsDir = dirname(metaPath);
  const parentDir = dirname(reelsDir);
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  const outPath = join(reelsDir, 'video.mp4');
  const coverPath = join(reelsDir, 'cover.png');
  const existingIsVerified = existsSync(outPath) && existsSync(coverPath)
    && Number(meta.durationSeconds) >= 30 && Number(meta.durationSeconds) <= 60
    && meta.sha256 === sha256(outPath)
    && meta.coverSha256 === sha256(coverPath);
  if (!args.force && existingIsVerified) {
    console.log(`[${index + 1}/${total}] existing ${relative(ROOT, parentDir)}`);
    return;
  }
  const sourcePack = join(ROOT, 'content/sns/video-packs', meta.exam, meta.sourcePackId);
  const manifest = JSON.parse(readFileSync(join(sourcePack, 'video-pack.json'), 'utf8'));
  const storyboard = JSON.parse(readFileSync(join(sourcePack, 'storyboard.json'), 'utf8'));
  const scene = storyboard.scenes?.find((candidate) => candidate.sceneId === meta.sceneId);
  if (!scene) throw new Error(`${meta.sourcePackId}/${meta.key}: scene がありません`);
  const sourceWork = join(ROOT, '.tmp/video-render', meta.sourcePackId, 'shorts', meta.key, 'work');
  const pointsPng = join(sourceWork, 'points.png');
  const hookWav = join(sourceWork, 'hook.wav');
  const pointsWav = join(sourceWork, 'points.wav');
  for (const file of [pointsPng, hookWav, pointsWav]) if (!existsSync(file)) throw new Error(`source render がありません: ${file}`);

  const workDir = join(sharedDir, meta.sourcePackId, meta.key);
  mkdirSync(workDir, { recursive: true });
  const ctaPng = join(workDir, 'cta.png');
  const ctaWav = join(workDir, 'cta.wav');
  const assPath = join(workDir, 'subtitles.ass');
  const theme = themeFor(meta.exam);
  await renderPng(coverNode(meta, manifest, theme), coverPath);
  await renderPng(ctaNode(manifest, theme), ctaPng);
  const hookSeconds = await probeDuration(hookWav);
  const pointsSeconds = await probeDuration(pointsWav);
  const narrationSeconds = hookSeconds + pointsSeconds;
  const baseCtaSeconds = await probeDuration(sharedCta);
  const ctaSeconds = Math.max(baseCtaSeconds, 8, 30.2 - narrationSeconds);
  ffmpeg(['-i', sharedCta, '-af', 'apad', '-t', String(ctaSeconds), ctaWav]);
  writeFileSync(assPath, buildAss([
    { text: scene.narration, start: 0, duration: narrationSeconds },
    { text: CTA_NARRATION, start: narrationSeconds, duration: baseCtaSeconds },
  ]));
  await composeStaticSlidesVideo({
    pngPaths: [coverPath, pointsPng, ctaPng],
    wavPaths: [hookWav, pointsWav, ctaWav],
    assPath,
    outPath,
    options: process.platform === 'darwin' && !args.software
      ? { videoEncoder: 'h264_videotoolbox', videoBitrate: '1200k', videoMaxrate: '2400k' }
      : {},
  });
  const duration = await probeDuration(outPath);
  if (duration < 30 || duration > 60) throw new Error(`${meta.sourcePackId}/${meta.key}: 尺外 ${duration.toFixed(2)}s`);
  meta.durationSeconds = Number(duration.toFixed(2));
  meta.sha256 = sha256(outPath);
  meta.coverSha256 = sha256(coverPath);
  meta.renderedAt = new Date().toISOString();
  writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`[${index + 1}/${total}] ${relative(ROOT, parentDir)} ${duration.toFixed(2)}s`);
}

const metaPaths = selectedMeta();
const concurrency = Math.max(1, Math.min(8, Number(args.concurrency) || 4));
let cursor = 0;
async function worker() {
  while (cursor < metaPaths.length) {
    const index = cursor++;
    await renderOne(metaPaths[index], index, metaPaths.length);
  }
}
await Promise.all(Array.from({ length: Math.min(concurrency, metaPaths.length) }, () => worker()));
console.log(`Instagram Reels render complete: ${metaPaths.length}本`);
