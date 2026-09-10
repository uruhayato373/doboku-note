#!/usr/bin/env node
/**
 * prepare-instagram-video-pack-reels が作った派生 SoT から Instagram Reels を生成する。
 * 校正済みの Instagram 原稿から本文画像・音声・字幕と専用 CTA を生成する。
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
import { buildExplanationNode } from './lib/video-explanation.mjs';
import { IG_DESIGN, IG_CTA_NARRATION, instagramLogo, instagramCtaNode, instagramReelCover, renderInstagramNode, instagramRendererDigest } from './lib/instagram-video-design.mjs';
import { narrationInput } from './lib/video-narration-cache.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IG_ROOT = join(ROOT, 'content/sns/instagram/video-packs');
const W = 1080;
const H = 1920;
const CTA_NARRATION = IG_CTA_NARRATION;

const { values: args } = parseArgs({
  args: process.argv.slice(2),
  options: {
    all: { type: 'boolean', default: false },
    dir: { type: 'string' },
    max: { type: 'string', default: '999' },
    concurrency: { type: 'string', default: '4' },
    force: { type: 'boolean', default: false },
    speaker: { type: 'string', default: '13' },
    'preview-only': { type: 'boolean', default: false },
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
if (!args['preview-only'] && !(await isRunning())) throw new Error('VOICEVOX が起動していません（127.0.0.1:50021）');

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
function balanced(text, maxChars) {
  const chars = [...String(text ?? '')];
  const count = Math.max(1, Math.ceil(chars.length / maxChars));
  return wrapJp(chars.join(''), Math.ceil(chars.length / count));
}
function themeFor(exam) {
  const palette = resolveExam(EXAM_TO_PALETTE[exam]);
  return { base: palette.base, deep: palette.deep, label: palette.label };
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
const logo = await instagramLogo(ROOT);
const rendererSha256 = instagramRendererDigest(ROOT, 'reel');
const ctaKey = createHash('sha256').update(`${CTA_NARRATION}:${args.speaker}`).digest('hex').slice(0, 16);
const sharedCta = join(sharedDir, `cta-${ctaKey}.wav`);
if (!args['preview-only'] && !existsSync(sharedCta)) writeFileSync(sharedCta, Buffer.from(await synthesize({ text: CTA_NARRATION, speaker: Number(args.speaker) })));

async function renderOne(metaPath, index, total) {
  const reelsDir = dirname(metaPath);
  const parentDir = dirname(reelsDir);
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  const outPath = join(reelsDir, 'video.mp4');
  const coverPath = join(reelsDir, 'cover.png');
  const sourcePack = join(ROOT, 'content/sns/video-packs', meta.exam, meta.sourcePackId);
  const storyboard = JSON.parse(readFileSync(join(sourcePack, 'storyboard.json'), 'utf8'));
  const originalScene = storyboard.scenes?.find((candidate) => candidate.sceneId === meta.sceneId);
  const scriptPath = join(reelsDir, 'script.json');
  const script = JSON.parse(readFileSync(scriptPath));
  if (script.sourcePackId !== meta.sourcePackId || script.key !== meta.key || script.sceneId !== meta.sceneId || script.exam !== meta.exam || !script.narration) throw new Error('Reel原稿と対象が不一致');
  const scene = originalScene && { ...originalScene,
    narration: script.narration, visual: script.visual };
  if (!scene) throw new Error(`${meta.sourcePackId}/${meta.key}: scene がありません`);
  const coverSpec = JSON.parse(readFileSync(join(sourcePack, 'cover-design.json'))).covers[meta.key];
  const inputDigest = createHash('sha256').update(JSON.stringify({ scene, coverSpec, speaker: args.speaker, cta: CTA_NARRATION,
    scriptHash: sha256(scriptPath),
    code: rendererSha256 })).digest('hex');
  const existingIsVerified = meta.design === IG_DESIGN && meta.inputDigest === inputDigest && existsSync(outPath) && existsSync(coverPath)
    && Number(meta.durationSeconds) >= 30 && Number(meta.durationSeconds) <= 60
    && meta.sha256 === sha256(outPath)
    && meta.coverSha256 === sha256(coverPath);
  if (!args.force && existingIsVerified) {
    console.log(`[${index + 1}/${total}] existing ${relative(ROOT, parentDir)}`);
    return;
  }

  const workDir = join(sharedDir, meta.sourcePackId, meta.key);
  mkdirSync(workDir, { recursive: true });
  const ctaPng = join(workDir, 'cta.png');
  const pointsPng = join(workDir, 'points.png');
  const ctaWav = join(workDir, 'cta.wav');
  const assPath = join(workDir, 'subtitles.ass');
  const theme = themeFor(meta.exam);
  mkdirSync(reelsDir, { recursive: true });
  writeFileSync(coverPath, await instagramReelCover(ROOT, coverSpec, logo, script.coverHeadline));
  await renderPng(buildExplanationNode(scene, { theme, portrait: true, rightMargin: 180 }), pointsPng);
  writeFileSync(ctaPng, (await renderInstagramNode(ROOT, instagramCtaNode(logo, { reel: true }), 1920)).buffer);
  if (args['preview-only']) { console.log(`[preview] ${meta.sourcePackId}/${meta.key}`); return; }
  const speech = narrationInput(scene.narration, Number(args.speaker));
  const narrationWav = join(workDir, `narration-${speech.inputSha256.slice(0, 16)}.wav`);
  if (!existsSync(narrationWav)) writeFileSync(narrationWav, Buffer.from(await synthesize({ text: speech.text, speaker: Number(args.speaker) })));
  const hookWav = join(workDir, 'hook.wav'), pointsWav = join(workDir, 'points.wav');
  ffmpeg(['-i', narrationWav, '-t', '4', hookWav]);
  ffmpeg(['-ss', '4', '-i', narrationWav, pointsWav]);
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
  ffmpeg(['-v', 'error', '-xerror', '-i', outPath, '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', '-']);
  meta.durationSeconds = Number(duration.toFixed(2));
  meta.sha256 = sha256(outPath);
  meta.coverSha256 = sha256(coverPath);
  meta.renderedAt = new Date().toISOString();
  meta.design = IG_DESIGN;
  meta.inputDigest = inputDigest;
  meta.rendererSha256 = rendererSha256;
  meta.scriptSha256 = sha256(scriptPath);
  meta.speaker = Number(args.speaker);
  meta.narration = scene.narration;
  meta.ctaNarration = CTA_NARRATION;
  meta.mediaInputs = { hook: sha256(hookWav), points: sha256(pointsWav), pointsImage: sha256(pointsPng), ctaImage: sha256(ctaPng) };
  meta.validation = { dimensions: '1080x1920', audio: true, duration: true, fullDecode: true, checkedAt: meta.renderedAt };
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
