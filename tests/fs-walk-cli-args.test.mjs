/**
 * 共通部品 scripts/lib/fs-walk.mjs（再帰の走査）と scripts/lib/cli-args.mjs（引数の読み方）の挙動。
 * 各スクリプトの手書き実装をこの 2 つへ寄せたので、手書きと同じ読み方であることをここで固定する。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { listFiles, skipHiddenAndNodeModules } from '../scripts/lib/fs-walk.mjs';
import { parseCliArgs } from '../scripts/lib/cli-args.mjs';

function tree() {
  const root = mkdtempSync(join(tmpdir(), 'fs-walk-'));
  for (const f of ['a.mdx', 'b.md', 'sub/c.mdx', 'sub/deep/d.mdx', '.hidden/e.mdx', 'node_modules/f.mdx', 'sub/g.txt']) {
    mkdirSync(join(root, f, '..'), { recursive: true });
    writeFileSync(join(root, f), f);
  }
  return root;
}
const rel = (root, files) => files.map((f) => relative(root, f).split('\\').join('/')).sort();

test('listFiles: 拡張子・条件・飛ばすディレクトリ・深さ', () => {
  const root = tree();
  try {
    assert.deepEqual(rel(root, listFiles(root, { ext: '.mdx' })), ['.hidden/e.mdx', 'a.mdx', 'node_modules/f.mdx', 'sub/c.mdx', 'sub/deep/d.mdx']);
    assert.deepEqual(rel(root, listFiles(root, { ext: ['.md', '.mdx'], skipDir: skipHiddenAndNodeModules })), ['a.mdx', 'b.md', 'sub/c.mdx', 'sub/deep/d.mdx']);
    assert.deepEqual(rel(root, listFiles(root, { match: (_p, name) => name.startsWith('c') })), ['sub/c.mdx']);
    assert.deepEqual(rel(root, listFiles(root, { ext: '.mdx', match: (p) => p.includes('deep') })), ['sub/deep/d.mdx']);
    assert.deepEqual(rel(root, listFiles(root, { ext: '.mdx', maxDepth: 0 })), ['a.mdx']);
    assert.deepEqual(rel(root, listFiles(root, { ext: '.mdx', maxDepth: 1, skipDir: skipHiddenAndNodeModules })), ['a.mdx', 'sub/c.mdx']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('listFiles: 無いディレクトリは既定で投げ、allowMissing なら []（「無い」と「0 件」を混ぜない）', () => {
  const missing = join(tmpdir(), 'fs-walk-missing-does-not-exist');
  assert.throws(() => listFiles(missing), /ENOENT/);
  assert.deepEqual(listFiles(missing, { allowMissing: true }), []);
});

test('listFiles: リンクは既定で辿らず、followLinks で辿る', () => {
  const root = tree();
  try {
    symlinkSync(join(root, 'sub'), join(root, 'link'));
    assert.deepEqual(rel(root, listFiles(root, { ext: '.mdx', skipDir: skipHiddenAndNodeModules })), ['a.mdx', 'sub/c.mdx', 'sub/deep/d.mdx']);
    assert.deepEqual(
      rel(root, listFiles(root, { ext: '.mdx', skipDir: skipHiddenAndNodeModules, followLinks: true })),
      ['a.mdx', 'link/c.mdx', 'link/deep/d.mdx', 'sub/c.mdx', 'sub/deep/d.mdx'],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('parseCliArgs: 宣言したフラグだけを拾い、既定値と camelCase のキーを返す', () => {
  const spec = { 'dry-run': { type: 'boolean' }, slug: { type: 'string' }, top: { type: 'integer', default: 10 }, ratio: { type: 'number' } };
  assert.deepEqual(parseCliArgs(spec, []), { _: [], dryRun: false, slug: null, top: 10, ratio: null });
  assert.deepEqual(
    parseCliArgs(spec, ['--dry-run', '--slug', 'a-b', '--top', '5', '--ratio=0.5', 'file.md', '--unknown', 'x']),
    { _: ['file.md', 'x'], dryRun: true, slug: 'a-b', top: 5, ratio: 0.5 },
  );
});

test('parseCliArgs: --name=value・後勝ち・値の欠け・次の引数をそのまま値にする（手書きの args[++i] と同じ）', () => {
  const spec = { slug: { type: 'string' }, json: { type: 'boolean' } };
  assert.equal(parseCliArgs(spec, ['--slug=a=b']).slug, 'a=b');
  assert.equal(parseCliArgs(spec, ['--slug', 'a', '--slug', 'b']).slug, 'b');
  assert.equal(parseCliArgs(spec, ['--slug']).slug, undefined);
  assert.deepEqual(parseCliArgs(spec, ['--slug', '--json']), { _: [], slug: '--json', json: false });
});

test('parseCliArgs: multiple・alias・key', () => {
  const spec = { tag: { type: 'string', multiple: true }, verbose: { type: 'boolean', alias: '-v' }, out: { type: 'string', key: 'outFile' } };
  assert.deepEqual(parseCliArgs(spec, ['--tag', 'a', '--tag=b', '-v', '--out', 'x.json']), { _: [], tag: ['a', 'b'], verbose: true, outFile: 'x.json' });
  assert.deepEqual(parseCliArgs({ tag: { type: 'string', multiple: true, default: ['z'] } }, []).tag, ['z']);
  assert.deepEqual(parseCliArgs({ tag: { type: 'string', multiple: true, default: ['z'] } }, ['--tag', 'a']).tag, ['a']);
});
