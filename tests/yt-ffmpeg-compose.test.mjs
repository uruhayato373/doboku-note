// tests/yt-ffmpeg-compose.test.mjs
//
// ffmpeg-compose の入力検証テスト。実 ffmpeg を必要とする統合テストは
// VOICEVOX 試聴済みかつ ffmpeg 起動可能な環境のみで実行（skip 可能）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  composeShortsVideo,
  composeStaticSlidesVideo,
  probeDuration,
  ffmpegAvailable,
} from '../.claude/skills/social/yt-shorts-create/scripts/lib/ffmpeg-compose.mjs';

test('composeStaticSlidesVideo: 入力が空なら throw', async () => {
  await assert.rejects(
    () => composeStaticSlidesVideo({ pngPaths: [], wavPaths: [], assPath: 'a.ass', outPath: 'out.mp4' }),
    /non-empty arrays/
  );
});

test('composeStaticSlidesVideo: PNG と WAV の本数不一致なら throw', async () => {
  await assert.rejects(
    () => composeStaticSlidesVideo({ pngPaths: ['a.png'], wavPaths: [], assPath: 'a.ass', outPath: 'out.mp4' }),
    /length mismatch/
  );
});

test('composeStaticSlidesVideo: 出力先が無ければ throw', async () => {
  await assert.rejects(
    () => composeStaticSlidesVideo({ pngPaths: ['a.png'], wavPaths: ['a.wav'], assPath: 'a.ass', outPath: '' }),
    /assPath and outPath are required/
  );
});

test('composeShortsVideo: pngPaths が array でないと throw', async () => {
  await assert.rejects(
    () =>
      composeShortsVideo({
        pngPaths: 'foo',
        wavPaths: ['a.wav'],
        assPath: 'a.ass',
        outPath: 'out.mp4',
      }),
    /must be arrays/
  );
});

test('composeShortsVideo: pngPaths が空で throw', async () => {
  await assert.rejects(
    () =>
      composeShortsVideo({
        pngPaths: [],
        wavPaths: [],
        assPath: 'a.ass',
        outPath: 'out.mp4',
      }),
    /must not be empty/
  );
});

test('composeShortsVideo: pngPaths と wavPaths の長さ不一致で throw', async () => {
  await assert.rejects(
    () =>
      composeShortsVideo({
        pngPaths: ['a.png', 'b.png'],
        wavPaths: ['a.wav'],
        assPath: 'a.ass',
        outPath: 'out.mp4',
      }),
    /length mismatch/
  );
});

test('composeShortsVideo: assPath が無いと throw', async () => {
  await assert.rejects(
    () =>
      composeShortsVideo({
        pngPaths: ['a.png'],
        wavPaths: ['a.wav'],
        assPath: '',
        outPath: 'out.mp4',
      }),
    /assPath is required/
  );
});

test('composeShortsVideo: outPath が無いと throw', async () => {
  await assert.rejects(
    () =>
      composeShortsVideo({
        pngPaths: ['a.png'],
        wavPaths: ['a.wav'],
        assPath: 'a.ass',
        outPath: '',
      }),
    /outPath is required/
  );
});

test('ffmpegAvailable: boolean を返す', () => {
  const v = ffmpegAvailable();
  assert.equal(typeof v, 'boolean');
});

test('probeDuration: ffmpeg が無い環境では throw（明確なメッセージ）', async (t) => {
  if (ffmpegAvailable()) {
    t.skip('ffmpeg is available, skipping');
    return;
  }
  await assert.rejects(
    () => probeDuration('/dev/null'),
    /not found in PATH|Library not loaded|exited with code/
  );
});

test('probeDuration: 存在しないファイルなら throw（ffmpeg 起動時のみ）', async (t) => {
  if (!ffmpegAvailable()) {
    t.skip('ffmpeg not available');
    return;
  }
  const tmp = mkdtempSync(join(tmpdir(), 'yt-shorts-test-'));
  try {
    await assert.rejects(() => probeDuration(join(tmp, '__nonexistent__.wav')));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
