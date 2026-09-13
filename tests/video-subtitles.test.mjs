import test from 'node:test';
import assert from 'node:assert/strict';
import { subtitleChunks } from '../scripts/lib/video-subtitles.mjs';

test('calculation values, decimals, units and Latin terms stay on one subtitle screen', () => {
  const text = '配合計算は1000リットルが基準。170を0.50で割ると340です。塩化物は0.30kg/m³。JCIの案内で確認します。';
  const chunks = subtitleChunks(text);
  assert.equal(chunks.join(''), text);
  for (const token of ['1000', '170', '0.50', '340', '0.30kg/m³', 'JCI']) assert.ok(chunks.some(chunk => chunk.includes(token)), token);
  assert.ok(chunks.every(chunk => [...chunk].reduce((n, ch) => n + (/^[\x20-\x7e]$/.test(ch) ? 0.62 : 1), 0) <= 15));
});
test('Japanese punctuation does not start a new subtitle and a short tail is balanced', () => {
  const text = '「数値と条件」を一組で確認し、コンクリートの復習はプロフィールから。';
  const chunks = subtitleChunks(text);
  assert.equal(chunks.join(''), text);
  assert.ok(chunks.every(chunk => !/^[、。，．！？：；）］」』]/u.test(chunk)));
  for (const word of ['コンクリート', 'プロフィール']) assert.ok(chunks.some(chunk => chunk.includes(word)), word);
  assert.ok(chunks.at(-1).length > 3);
  assert.deepEqual(subtitleChunks(''), []);
  assert.throws(() => subtitleChunks('verylongunbreakabletechnicalterm', 5), /1行/);
});
