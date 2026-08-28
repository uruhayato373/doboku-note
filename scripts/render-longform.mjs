#!/usr/bin/env node
/**
 * render-longform.mjs — 動画パック（DN-0110 Phase 1）の 16:9 通常動画レンダラー。
 *
 * 経路: storyboard.json → 1920×1080 PNG（satori）＋ VOICEVOX TTS wav ＋ ASS 字幕 → ffmpeg mp4
 *
 * 出力は .tmp/video-render/{packId}/（パックディレクトリには書かない＝mp4/wav の Git 混入防止。
 * 完成 mp4/wav は R2 へ、状態は .claude/state/video-content-status.json へ）。
 *
 * 会社PC（VOICEVOX/ffmpeg なし）では --skip-tts で PNG + ASS + render-manifest.json まで生成し、
 * mp4 合成は Mac または GitHub Actions で同コマンドを完走させる（戦略 06 §5.3）。
 *
 * Usage:
 *   node scripts/render-longform.mjs --pack-dir content/sns/video-packs/{exam}/{slug} [--skip-tts] [--speaker 1]
 *
 * 前提（mp4 まで作る場合）: VOICEVOX エンジン起動中、ffmpeg が PATH に存在
 */

import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import {
  LONGFORM_W, LONGFORM_H, buildLongformAss, buildSceneNode, planLongformRender,
} from './lib/longform-render.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const { values: args } = parseArgs({
  args: process.argv.slice(2),
  options: {
    'pack-dir': { type: 'string' },
    speaker: { type: 'string', default: '1' },
    'skip-tts': { type: 'boolean' },
    'skip-png': { type: 'boolean' },
  },
});

if (!args['pack-dir']) {
  console.error('Usage: node scripts/render-longform.mjs --pack-dir content/sns/video-packs/{exam}/{slug} [--skip-tts]');
  process.exit(1);
}

const packDir = resolve(ROOT, args['pack-dir']);
const manifest = JSON.parse(readFileSync(join(packDir, 'video-pack.json'), 'utf8'));
const storyboard = JSON.parse(readFileSync(join(packDir, 'storyboard.json'), 'utf8'));

const { resolveExam } = await import(
  pathToFileURL(resolve(ROOT, '.claude/scripts/sns/lib/exam-palette.mjs')).href
);
const { scenes, theme, packTitle } = planLongformRender(manifest, storyboard, resolveExam);

// ─── 依存（TTS/ffmpeg は mp4 を作るときだけ要求） ─────────────
const { isRunning, synthesize } = await import(
  pathToFileURL(resolve(ROOT, '.claude/scripts/lib/sns-common/tts-client.mjs')).href
);
const { composeShortsVideo, ffmpegAvailable, probeDuration } = await import(
  pathToFileURL(resolve(ROOT, '.claude/skills/social/yt-shorts-create/scripts/lib/ffmpeg-compose.mjs')).href
);

if (!args['skip-tts']) {
  if (!ffmpegAvailable()) { console.error('ffmpeg が PATH にありません（PNG/ASS のみ生成するなら --skip-tts）'); process.exit(1); }
  if (!(await isRunning())) { console.error('VOICEVOX が起動していません（PNG/ASS のみ生成するなら --skip-tts）'); process.exit(1); }
}

// ─── フォント（render-editorial-reels と同一資産） ─────────────
const FONT_DIR = resolve(ROOT, '.claude/skills/conversion/ogp-create/assets/fonts');
const FONTSOURCE_DIR = resolve(ROOT, 'node_modules/@fontsource');
const fonts = [
  { name: 'Noto Sans JP', data: readFileSync(resolve(FONT_DIR, 'NotoSansJP-Bold.ttf')), weight: 700, style: 'normal' },
  ...[400, 500, 700].map((w) => ({
    name: 'NotoSansJP',
    data: readFileSync(resolve(FONTSOURCE_DIR, `noto-sans-jp/files/noto-sans-jp-japanese-${w}-normal.woff`)),
    weight: w, style: 'normal',
  })),
];

// ─── メイン ───────────────────────────────────────────────────
async function main() {
  const outDir = join(ROOT, '.tmp', 'video-render', manifest.packId);
  const imgDir = join(outDir, 'img');
  const wavDir = join(outDir, 'wav');
  mkdirSync(imgDir, { recursive: true });
  mkdirSync(wavDir, { recursive: true });

  const pngPaths = [];
  const wavPaths = [];

  for (const [i, scene] of scenes.entries()) {
    const pad = String(i).padStart(2, '0');
    const pngPath = join(imgDir, `${pad}-${scene.sceneId}.png`);
    const wavPath = join(wavDir, `${pad}-${scene.sceneId}.wav`);

    if (!args['skip-png']) {
      process.stdout.write(`  [PNG ${i + 1}/${scenes.length}] ${scene.sceneId}... `);
      const node = buildSceneNode(scene, { theme, packTitle });
      const svg = await satori(node, { width: LONGFORM_W, height: LONGFORM_H, fonts });
      writeFileSync(pngPath, new Resvg(svg, { fitTo: { mode: 'width', value: LONGFORM_W } }).render().asPng());
      console.log('✓');
    }

    if (!args['skip-tts']) {
      process.stdout.write(`  [TTS ${i + 1}/${scenes.length}] ${scene.narration.slice(0, 20)}... `);
      const wavBuf = await synthesize({ text: scene.narration, speaker: Number(args.speaker) });
      writeFileSync(wavPath, Buffer.from(wavBuf));
      console.log('✓');
    }

    pngPaths.push(pngPath);
    wavPaths.push(wavPath);
  }

  // 実尺: TTS 済みなら wav 実測、skip 時は storyboard の設計尺
  let durations = null;
  if (!args['skip-tts']) {
    durations = [];
    for (const wav of wavPaths) durations.push(await probeDuration(wav));
  }

  const assPath = join(outDir, 'subtitles.ass');
  writeFileSync(assPath, buildLongformAss(scenes, durations ?? undefined), 'utf8');

  let mp4Path = null;
  let totalSec = null;
  if (!args['skip-tts']) {
    mp4Path = join(outDir, 'video.mp4');
    console.log('\n[ffmpeg] 動画合成中...');
    await composeShortsVideo({ pngPaths, wavPaths, assPath, outPath: mp4Path, options: { tmpDir: wavDir } });
    totalSec = await probeDuration(mp4Path);
    console.log(`  実尺 ${totalSec.toFixed(1)}s（設計尺 ${scenes.at(-1).end}s）`);
  }

  // 後続（R2 upload / status 更新 / QA）が読む機械可読サマリ
  const renderManifest = {
    packId: manifest.packId,
    exam: manifest.exam,
    format: storyboard.format,
    render: [LONGFORM_W, LONGFORM_H],
    renderedAt: new Date().toISOString(),
    tts: !args['skip-tts'],
    scenes: scenes.map((s, i) => ({
      sceneId: s.sceneId,
      png: basename(pngPaths[i]),
      wav: args['skip-tts'] ? null : basename(wavPaths[i]),
      designSec: s.end - s.start,
      actualSec: durations?.[i] ?? null,
    })),
    mp4: mp4Path ? basename(mp4Path) : null,
    totalSec,
  };
  writeFileSync(join(outDir, 'render-manifest.json'), JSON.stringify(renderManifest, null, 2) + '\n', 'utf8');

  console.log(`\n✓ 出力: ${outDir}`);
  if (args['skip-tts']) {
    console.log('  （--skip-tts: PNG + ASS + render-manifest のみ。mp4 は VOICEVOX + ffmpeg のある環境で同コマンドを再実行）');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
