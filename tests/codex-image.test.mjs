import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { codexArgs, generateWithCodex } from '../scripts/lib/codex-image.mjs';

test('codexArgs: 作業フォルダ・モデル・指示文を渡す', () => {
  const a = codexArgs('/d', 'PROMPT', 'm1');
  assert.deepEqual(a.slice(0, 7), ['exec', '--skip-git-repo-check', '--sandbox', 'workspace-write', '-C', '/d', '-m']);
  assert.ok(a.at(-1).includes('PROMPT') && a.at(-1).includes('out.png'));
  assert.ok(!codexArgs('/d', 'P', null).includes('-m'));
});

test('generateWithCodex: 偽の実行で画像ができた/できなかった', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'codex-image-test-'));
  try {
    let seen;
    const ok = generateWithCodex('p', 'm', { tmp, run: (args, dir) => { seen = args; writeFileSync(join(dir, 'out.png'), 'x'); } });
    assert.ok(ok.endsWith('out.png') && existsSync(ok));
    assert.ok(seen.includes('m'));
    assert.equal(generateWithCodex('p', null, { tmp, run: () => {} }), null);
    const other = generateWithCodex('p', null, { tmp, run: (a, dir) => writeFileSync(join(dir, 'note.txt'), 'x') });
    assert.equal(other, null);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
