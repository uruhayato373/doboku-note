import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

// UI-008: MDX の <Callout type> の typo は Callout.tsx が黙って note へ落とすため、
// content lint（check-callout-types）が fixture の typo を実際に検出できることを固定する。
const SCRIPT = join(ROOT, 'scripts/check-callout-types.mjs');
const FIXTURES = 'tests/fixtures/callout-types';

function run(target) {
  return spawnSync(process.execPath, [SCRIPT, target], { cwd: ROOT, encoding: 'utf-8' });
}

test('正式 type・legacy alias・type 省略は通る', () => {
  const r = run(`${FIXTURES}/valid.mdx`);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /<Callout> 3 件検出/);
});

test('未知 type（typo）を file:line 付きで検出して exit 1', () => {
  const r = run(`${FIXTURES}/typo.mdx`);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /typo\.mdx:3 {2}type="notee"/);
});

test('対象 0 件は検査不成立として exit 1', () => {
  const r = run(`${FIXTURES}/does-not-exist.mdx`);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /検査不成立/);
});
