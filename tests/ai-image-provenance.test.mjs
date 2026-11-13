// AI 画像の来歴と台帳の書き手を 1 か所にした（DN-1013）。2 種類のハッシュの違いと、一時フォルダの後片付けを止める。
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { aiProvenance, promptSha, recordAiImage } from '../scripts/lib/image-origin.mjs';
import { discardGenerated } from '../scripts/lib/codex-image.mjs';

test('aiProvenance: 公開の台帳の来歴は指示文の全文の sha256（trim しない・64 桁）', () => {
  const prompt = ' 指示 ';
  const p = aiProvenance({ prompt, generatedAt: '2026-11-13T00:00:00Z', model: 'm1' });
  assert.deepEqual(Object.keys(p), ['kind', 'tool', 'model', 'prompt', 'promptSha256', 'generatedAt']);
  assert.equal(p.promptSha256, createHash('sha256').update(prompt).digest('hex'));
  assert.ok(!('model' in aiProvenance({ prompt, generatedAt: 'x' })), 'model が無ければ書かない');
});

test('recordAiImage: AI 台帳は画像 sha の先頭 16 桁と promptSha（trim）で持ち、鍵の順に並べる', () => {
  const ledger = { figures: { 'z:1': { sha: 'old' } } };
  recordAiImage(ledger, 'a:1', { sha: 'f'.repeat(64), prompt: ' p ', generatedAt: 't', styleVersion: 3 });
  assert.deepEqual(Object.keys(ledger.figures), ['a:1', 'z:1']);
  assert.deepEqual(ledger.figures['a:1'], { sha: 'f'.repeat(16), promptSha: promptSha('p'), tool: 'codex', generatedAt: 't', styleVersion: 3 });
});

test('discardGenerated: 生成の一時フォルダだけを消し、それ以外には触らない', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'discard-test-'));
  try {
    const gen = join(tmp, 'gen-article-photo-abc');
    const other = join(tmp, 'keep');
    mkdirSync(gen); mkdirSync(other);
    writeFileSync(join(gen, 'out.png'), 'x'); writeFileSync(join(other, 'out.png'), 'x');
    assert.equal(discardGenerated(join(other, 'out.png'), tmp), false);
    assert.ok(existsSync(other));
    assert.equal(discardGenerated(join(gen, 'out.png'), tmp), true);
    assert.ok(!existsSync(gen));
    assert.equal(discardGenerated(null, tmp), false);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
