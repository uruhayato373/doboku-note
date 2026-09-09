import { test } from 'node:test';
import assert from 'node:assert/strict';
import { narrationInput, reusableNarration, sha256 } from '../scripts/lib/video-narration-cache.mjs';
test('要はかなめ、熟語の必要・要点・要否は維持する', () => {
  assert.equal(narrationInput('概要の要は整合。必要な要点と許可の要否。', 13).text, '概要のかなめは整合。必要な要点と許可の要否。');
});
test('長い略語を先に変換しICTをITで分断しない', () => {
  assert.equal(narrationInput('ICTとIT', 13).text, 'あいしーてぃーとあいてぃー');
});
test('読み修正・話者変更・WAV破損のいずれも古い音声を再利用しない', () => {
  const bytes = Buffer.from('wav');
  const original = { inputSha256: sha256(JSON.stringify({ text: '概要の要は整合。', speaker: 13 })), sha256: sha256(bytes) };
  const input = narrationInput('概要の要は整合。', 13);
  assert.equal(reusableNarration(original, input, bytes), false);
  const updated = { inputSha256: input.inputSha256, sha256: sha256(bytes) };
  assert.equal(reusableNarration(updated, input, bytes), true);
  assert.equal(reusableNarration(updated, narrationInput('概要の要は整合。', 1), bytes), false);
  assert.equal(reusableNarration(updated, input, Buffer.from('broken')), false);
  assert.equal(reusableNarration(undefined, input, bytes), false);
});
