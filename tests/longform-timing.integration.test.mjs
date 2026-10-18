import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { buildLongformAss } from '../scripts/lib/longform-render.mjs';
import { composeStaticSlidesVideo, probeDuration } from '../.claude/skills/social/yt-shorts-create/scripts/lib/ffmpeg-compose.mjs';

// Opt in on hosts with ffmpeg + libass. Real encoding catches image-loop rounding
// that mocked command assertions cannot detect.
test('mixed RGB/RGBA scenes retain the first frame without accumulated subtitle drift', {
  skip: process.env.RUN_FFMPEG_INTEGRATION !== '1',
}, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'longform-timing-'));
  try {
    const durations = Array.from({ length: 40 }, () => 0.341);
    const pngPaths = [], wavPaths = [];
    for (const [i, duration] of durations.entries()) {
      const png = join(dir, `${i}.png`), wav = join(dir, `${i}.wav`);
      await sharp({ create: { width: 64, height: 64, channels: i % 2 ? 3 : 4, background: i % 2 ? '#ffffff' : '#0055aa' } }).png().toFile(png);
      const frames = Math.round(24000 * duration), data = Buffer.alloc(44 + frames * 2);
      data.write('RIFF'); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8);
      data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
      data.writeUInt32LE(24000, 24); data.writeUInt32LE(48000, 28); data.writeUInt16LE(2, 32);
      data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(frames * 2, 40);
      for (let frame = 0; frame < frames; frame++) data.writeInt16LE(Math.round(4000 * Math.sin(frame * 2 * Math.PI * 440 / 24000)), 44 + frame * 2);
      writeFileSync(wav, data); pngPaths.push(png); wavPaths.push(wav);
    }
    const assPath = join(dir, 'subtitles.ass'), outPath = join(dir, 'video.mp4');
    writeFileSync(assPath, buildLongformAss(durations.map(() => ({ narration: '確認' })), durations));
    await composeStaticSlidesVideo({ pngPaths, wavPaths, assPath, outPath });
    const actual = await probeDuration(outPath), expected = durations.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(actual - expected) < 0.15, `expected ${expected}s, got ${actual}s`);
    const full = '/opt/homebrew/opt/ffmpeg-full/bin';
    const ffprobe = process.env.FFPROBE_BIN ?? (existsSync(join(full, 'ffprobe')) ? join(full, 'ffprobe') : 'ffprobe');
    const ffmpeg = process.env.FFMPEG_BIN ?? (existsSync(join(full, 'ffmpeg')) ? join(full, 'ffmpeg') : 'ffmpeg');
    const start = Number(execFileSync(ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=start_time', '-of', 'csv=p=0', outPath], { encoding: 'utf8' }).trim());
    assert.ok(Math.abs(start) < 1 / 30, `video must begin at zero, got ${start}`);
    for (const [time, white] of [[0.1, false], [0.45, true]]) {
      const pixels = execFileSync(ffmpeg, ['-v', 'error', '-ss', String(time), '-i', outPath, '-frames:v', '1', '-vf', 'crop=8:8:0:0', '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1']);
      assert.equal(pixels.length, 8 * 8 * 3, `decoded frame at ${time}s`);
      assert.ok(white ? pixels[0] > 230 && pixels[2] > 230 : pixels[2] > pixels[0] + 100, `wrong scene at ${time}s`);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
