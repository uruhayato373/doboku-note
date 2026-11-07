import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { codexArgs, generateWithCodex, generateWithCodexAsync } from '../scripts/lib/codex-image.mjs';

test('codexArgs: 作業フォルダ・モデル・指示文を渡す', () => {
  const a = codexArgs('/d', 'PROMPT', 'm1');
  assert.deepEqual(a.slice(0, 8), ['exec', '--json', '--skip-git-repo-check', '--sandbox', 'workspace-write', '-C', '/d', '-m']);
  assert.ok(a.at(-1).includes('PROMPT'));
  assert.ok(!codexArgs('/d', 'P', null).includes('-m'));
});

const thread = (id) => `{"type":"thread.started","thread_id":"${id}"}\n`;

test('generateWithCodex: 自分の thread の画像だけを返す', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'codex-image-test-'));
  try {
    const imagesRoot = join(tmp, 'generated');
    mkdirSync(join(imagesRoot, 't1'), { recursive: true });
    writeFileSync(join(imagesRoot, 't1', 'a.png'), 'x');
    let seen;
    const ok = generateWithCodex('p', 'm', { tmp, imagesRoot, run: (args) => { seen = args; return thread('t1'); } });
    assert.ok(ok.endsWith('out.png') && existsSync(ok));
    assert.ok(seen.includes('m'));
    assert.equal(generateWithCodex('p', null, { tmp, imagesRoot, run: () => '' }), null, 'thread_id が無い');
    assert.equal(generateWithCodex('p', null, { tmp, imagesRoot, run: () => thread('none') }), null, '自分の画像が無い');
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('generateWithCodexAsync: 並列でも別の実行の画像を取らない（DN-1036）', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'codex-image-test-'));
  try {
    const imagesRoot = join(tmp, 'generated');
    for (const id of ['t1', 't2', 't3']) {
      mkdirSync(join(imagesRoot, id), { recursive: true });
      writeFileSync(join(imagesRoot, id, `${id}.png`), id);
    }
    const outs = await Promise.all(['t1', 't2', 't3'].map((id) => generateWithCodexAsync('p', null, { tmp, imagesRoot, run: async () => thread(id) })));
    assert.deepEqual(outs.map((f) => readFileSync(f, 'utf8')), ['t1', 't2', 't3']);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('codexArgs: 添付の画像は -i で渡し、直後にフラグを置いて指示文を画像として読ませない', () => {
  const a = codexArgs('/d', 'PROMPT', null, ['/x/crop.png']);
  const i = a.indexOf('-i');
  assert.equal(a[i + 1], '/x/crop.png');
  assert.ok(a[i + 2].startsWith('--'), '-i の画像の直後はフラグ');
  assert.ok(a.at(-1).includes('PROMPT'), '指示文は最後');
  assert.ok(!codexArgs('/d', 'P', null).includes('-i'), '画像が無ければ -i を付けない');
});
