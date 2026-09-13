#!/usr/bin/env node
/** One-time legacy migration: preserve original quiz bodies; re-render keyword slides from authored copy. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { coverFonts } from './lib/youtube-cover.mjs';
import { loadVideoBrand } from './lib/video-brand.mjs';
import { MIGRATION, sha256 } from './lib/youtube-migration.mjs';
import { synthesize } from '../.claude/scripts/lib/sns-common/tts-client.mjs';
import { narrationInput } from './lib/video-narration-cache.mjs';

const root = process.cwd(), input = JSON.parse(fs.readFileSync('content/sns/youtube/legacy-refresh.json'));
const covers = JSON.parse(fs.readFileSync('content/sns/youtube/cover-design.json')).covers;
const brand = await loadVideoBrand(root), out = '.tmp/video-render/legacy-brand-a';
fs.mkdirSync(out, { recursive: true });
const exec = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }); if (r.status !== 0) throw new Error(`${cmd}: ${r.stderr?.slice(-1600)}`); return r.stdout; };
const probe = p => JSON.parse(exec('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', p]));
const box = (children, style = {}) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children } });
const label = (children, style = {}) => box(children, { fontFamily: 'NotoSansJP', fontWeight: 900, color: '#0F2742', ...style });
const img = (bytes, style) => ({ type: 'img', props: { src: `data:image/png;base64,${bytes.toString('base64')}`, style } });
const base = children => box(children, { position: 'relative', width: 1080, height: 1920, background: '#FFFFFF' });
const render = async (node, p) => {
  const svg = await satori(node, { width: 1080, height: 1920, fonts: coverFonts(root) });
  fs.writeFileSync(p, await sharp(new Resvg(svg).render().asPng()).png({ palette: true, colours: 256 }).toBuffer());
};
const ctaPath = `${out}/cta.png`, ctaWav = `${out}/cta.wav`;
await render(base([
  img(brand.logo, { position: 'absolute', left: 45, top: 100, width: 950, height: 950 / 3 }),
  label('土木の試験対策を', { position: 'absolute', left: 70, top: 485, fontSize: 96, color: '#1858B5' }),
  label('毎日の習慣に', { position: 'absolute', left: 70, top: 625, fontSize: 108 }),
  box(label('チャンネル登録', { fontSize: 76 }), { position: 'absolute', left: 70, top: 825, width: 870, height: 135, background: '#FFC53D', alignItems: 'center', justifyContent: 'center', borderRadius: 22 }),
  box(img(brand.background, { position: 'absolute', right: -70, bottom: 0, width: 1660, height: 1660 * 1080 / 1920 }), { position: 'absolute', left: 0, top: 1000, width: 1080, height: 920, overflow: 'hidden' }),
]), ctaPath);
const ctaNarration = '土木の試験対策を、毎日の習慣に。チャンネル登録で、次の解説もご覧ください。';
if (!fs.existsSync(ctaWav)) fs.writeFileSync(ctaWav, await synthesize({ text: narrationInput(ctaNarration, 13).text, speaker: 13 }));
const ctaDuration = Number(probe(ctaWav).format.duration);
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
if (only && !input.entries.some(e => e.key === only)) throw new Error('Unknown legacy source');
const results = fs.existsSync(`${out}/verification.json`) ? JSON.parse(fs.readFileSync(`${out}/verification.json`)) : {};
for (const entry of input.entries.filter(e => !only || e.key === only)) {
  const dir = `${out}/${entry.key}`; fs.mkdirSync(dir, { recursive: true });
  const cover = covers[entry.key].approvedImage, bytes = fs.readFileSync(cover.path);
  if (sha256(bytes) !== cover.sha256) throw new Error('Cover digest mismatch');
  fs.writeFileSync(`${dir}/thumbnail.png`, bytes);
  const video = `${dir}/shorts.mp4`;
  if (entry.original) {
    if (sha256(fs.readFileSync(entry.original)) !== entry.originalSha256 || entry.cuts.length !== 3) throw new Error('Original/cut provenance mismatch');
    const [coverEnd, , bodyEnd] = entry.cuts;
    const filter = `[0:v]fps=30,trim=duration=${bodyEnd},setpts=PTS-STARTPTS[b];[b][1:v]overlay=enable='lt(t,${coverEnd})':shortest=1[v0];[0:a]atrim=duration=${bodyEnd},asetpts=PTS-STARTPTS[a0];[2:v]fps=30,trim=duration=${ctaDuration},setpts=PTS-STARTPTS,format=yuv420p[v1];[3:a]asetpts=PTS-STARTPTS[a1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]`;
    exec('ffmpeg', ['-y', '-v', 'error', '-i', entry.original, '-loop', '1', '-framerate', '1', '-i', `${dir}/thumbnail.png`, '-loop', '1', '-framerate', '1', '-i', ctaPath, '-i', ctaWav,
      '-filter_complex_threads', '2', '-filter_complex', filter, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '21', '-threads', '2', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', video]);
  } else {
    const segments = [{ heading: '', narration: entry.intro, image: `${dir}/thumbnail.png` }, ...entry.scenes, { narration: ctaNarration, image: ctaPath, audio: ctaWav }];
    const inputs = [], filters = [], concat = [];
    for (const [i, scene] of segments.entries()) {
      const png = scene.image ?? `${dir}/${i}.png`, wav = scene.audio ?? `${dir}/${i}.wav`;
      if (!scene.image) await render(base([
        label(`POINT 0${i}`, { position: 'absolute', left: 65, top: 160, fontSize: 46, color: '#1858B5' }),
        label(scene.heading, { position: 'absolute', left: 65, top: 250, width: 880, fontSize: 88, lineHeight: 1.35 }),
        box(scene.items.map((item, j) => box([
          label(String(j + 1).padStart(2, '0'), { fontSize: 48, color: '#1858B5', width: 100, flexShrink: 0 }),
          label(item, { fontSize: 59, fontWeight: 700, lineHeight: 1.6, flex: 1 }),
        ], { padding: 35, background: '#F1F6FC', borderRadius: 24, marginBottom: 32 })), { position: 'absolute', left: 60, top: 620, width: 890, flexDirection: 'column' }),
        img(brand.logo, { position: 'absolute', left: 65, bottom: 160, width: 450, height: 150 }),
      ]), png);
      if (!scene.audio) fs.writeFileSync(wav, await synthesize({ text: narrationInput(scene.narration, 13).text, speaker: 13 }));
      const duration = Number(probe(wav).format.duration);
      inputs.push('-loop', '1', '-framerate', '1', '-i', png, '-i', wav);
      filters.push(`[${i * 2}:v]fps=30,trim=duration=${duration},setpts=PTS-STARTPTS,format=yuv420p[v${i}]`, `[${i * 2 + 1}:a]asetpts=PTS-STARTPTS[a${i}]`);
      concat.push(`[v${i}][a${i}]`);
    }
    filters.push(`${concat.join('')}concat=n=${segments.length}:v=1:a=1[v][a]`);
    exec('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex_threads', '2', '-filter_complex', filters.join(';'), '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '21', '-threads', '2', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', video]);
  }
  const p = probe(video), v = p.streams.find(s => s.codec_type === 'video'), duration = Number(p.format.duration);
  if (v.width !== 1080 || v.height !== 1920 || !p.streams.some(s => s.codec_type === 'audio') || duration < 30 || duration > 60) throw new Error('Legacy output media guard failed: ' + entry.key);
  exec('ffmpeg', ['-v', 'error', '-i', video, '-f', 'null', '-']);
  const mediaBytes = fs.readFileSync(video);
  results[entry.key] = { sourceKey: `legacy/${entry.key}`, status: 'rendered', revision: MIGRATION, mediaPath: video, thumbnailPath: `${dir}/thumbnail.png`, sha256: sha256(mediaBytes), thumbnailSha256: sha256(bytes), bytes: mediaBytes.length, duration, width: 1080, height: 1920, ctaSha256: sha256(fs.readFileSync(ctaPath)), originalBodyPreserved: Boolean(entry.original), checks: ['full-video-decode', 'audio-stream', 'cover-sha256', 'dimensions-duration'], visualVerification: 'pending' };
  fs.writeFileSync(`${out}/verification.json`, JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify({ rendered: Object.keys(results).length, total: input.entries.length, source: entry.key, duration }));
}
