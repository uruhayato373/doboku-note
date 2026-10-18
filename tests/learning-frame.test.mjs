import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { normalizeLearningFrame, verifyLearningFrame } from '../scripts/lib/learning-frame.mjs';

const sha = b => createHash('sha256').update(b).digest('hex');
test('全面の比率を保ち、旧来の左右・下余白を実画素で拒否する', async t => {
  const root = mkdtempSync(join(tmpdir(), 'learning-frame-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const raw = await sharp({ create: { width: 1672, height: 941, channels: 3, background: '#eeeeee' } }).png().toBuffer();
  writeFileSync(join(root, 'source.png'), raw);
  const source = { path: 'source.png', sha256: sha(raw) };
  const image = { path: 'out.png', width: 1920, height: 1080, source, normalization: { mode: 'full-frame-v1', sourceSha256: source.sha256 } };
  writeFileSync(join(root, image.path), await normalizeLearningFrame(raw));
  await verifyLearningFrame(root, image);
  const padded = await sharp(raw).resize(1536, 864).extend({ left: 192, right: 192, top: 0, bottom: 216, background: '#006650' }).png().toBuffer();
  writeFileSync(join(root, image.path), padded);
  await assert.rejects(verifyLearningFrame(root, image), /追加余白/);
});
test('異なる縦横比を大きな余白で埋めない', async () => {
  const raw = await sharp({ create: { width: 1024, height: 1536, channels: 3, background: '#ffffff' } }).png().toBuffer();
  await assert.rejects(normalizeLearningFrame(raw), /縦横比/);
});
