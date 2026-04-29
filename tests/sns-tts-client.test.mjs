// tests/sns-tts-client.test.mjs
//
// VOICEVOX HTTP クライアントの境界ケース（入力検証・到達不能時の挙動）。
// VOICEVOX エンジンが起動していない CI 環境でも動作するテストのみを置く。
// 実 VOICEVOX を使う統合テストは別途 npm test 実行時に手動起動した上で動かす（skip フラグ）。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { synthesize, isRunning, listSpeakers } from '#lib/sns-common/tts-client.mjs';

test('synthesize: text が空文字なら throw', async () => {
  await assert.rejects(() => synthesize({ text: '' }), /non-empty text/);
});

test('synthesize: text が undefined なら throw', async () => {
  await assert.rejects(() => synthesize({}), /non-empty text/);
});

test('synthesize: text が non-string（数値）なら throw', async () => {
  await assert.rejects(() => synthesize({ text: 123 }), /non-empty text/);
});

test('isRunning: 到達不能な URL では false を返す（throw しない）', async () => {
  const running = await isRunning('http://127.0.0.1:1');
  assert.equal(running, false);
});

test('isRunning: 不正な URL では false を返す', async () => {
  const running = await isRunning('http://invalid.localhost.example:50021');
  assert.equal(running, false);
});

test('synthesize: 実 VOICEVOX で wav バイナリを返す（VOICEVOX 起動時のみ）', async (t) => {
  const running = await isRunning();
  if (!running) {
    t.skip('VOICEVOX engine not running on http://localhost:50021');
    return;
  }
  const wav = await synthesize({ text: 'テスト' });
  assert.ok(Buffer.isBuffer(wav));
  assert.ok(wav.length > 100);
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
});

test('listSpeakers: 実 VOICEVOX で配列を返す（VOICEVOX 起動時のみ）', async (t) => {
  const running = await isRunning();
  if (!running) {
    t.skip('VOICEVOX engine not running');
    return;
  }
  const speakers = await listSpeakers();
  assert.ok(Array.isArray(speakers));
  assert.ok(speakers.length > 0);
});
