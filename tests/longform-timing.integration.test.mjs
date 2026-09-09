import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { buildLongformAss } from '../scripts/lib/longform-render.mjs';
import { composeStaticSlidesVideo, probeDuration } from '../.claude/skills/social/yt-shorts-create/scripts/lib/ffmpeg-compose.mjs';

// Opt in on hosts with ffmpeg + libass. Real encoding catches image-loop rounding
// that mocked command assertions cannot detect.
test('fractional scene durations do not accumulate into subtitle drift', {
  skip: process.env.RUN_FFMPEG_INTEGRATION !== '1',
}, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'longform-timing-'));
  try {
    const durations = [1.9, 1.9, 1.9, 1.9];
    const pngPaths = [], wavPaths = [];
    for (const [i, duration] of durations.entries()) {
      const png = join(dir, `${i}.png`), wav = join(dir, `${i}.wav`);
      await sharp({ create: { width: 64, height: 64, channels: 3, background: i % 2 ? '#ffffff' : '#0055aa' } }).png().toFile(png);
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
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
