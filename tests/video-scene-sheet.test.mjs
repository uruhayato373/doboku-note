import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

test('scene sheet includes a short cover and excludes stale PNG files', async () => {
  const packId = `scene-sheet-test-${process.pid}`;
  const renderDir = join(REPO_ROOT, '.tmp/video-render', packId);
  try {
    mkdirSync(join(renderDir, 'img'), { recursive: true });
    const images = [
      ['cover', '00-cover.png', '#e42222'],
      ['body', '01-body.png', '#2164e8'],
      ['stale', '99-stale.png', '#18ac30'],
    ];
    const scenes = [];
    for (const [sceneId, png, color] of images) {
      const bytes = await sharp({ create: { width: 80, height: 45, channels: 3, background: color } }).png().toBuffer();
      writeFileSync(join(renderDir, 'img', png), bytes);
      if (sceneId !== 'stale') scenes.push({ sceneId, png, pngSha256: createHash('sha256').update(bytes).digest('hex'), actualSec: sceneId === 'cover' ? 2 : 10 });
    }
    writeFileSync(join(renderDir, 'render-manifest.json'), JSON.stringify({ scenes }));
    const output = execFileSync(process.execPath, ['scripts/video-scene-sheet.mjs', packId], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.match(output, /場面 2\/2 件/);
    const image = output.trim().split(': ').at(-1);
    assert.equal(relative(renderDir, image).startsWith('preview/scene-sheet-'), true);
    const { data, info } = await sharp(readFileSync(image)).raw().toBuffer({ resolveWithObject: true });
    const rgb = (x, y) => [...data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3)];
    assert.ok(rgb(320, 180)[0] > 150); // cover, even though it lasts under ten seconds
    assert.ok(rgb(960, 180)[2] > 130); // second scene
    assert.ok(rgb(1600, 180).every((channel) => channel > 200)); // no stale third image
  } finally {
    rmSync(renderDir, { recursive: true, force: true });
  }
});
