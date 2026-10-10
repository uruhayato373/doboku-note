/**
 * scripts/lib/inconclusive-gate.mjs — 「取得失敗が支配的なら検査不成立」の上限と判定を 1 か所に集めた。
 * 以前は `MAX_FETCH_FAIL_RATE = 0.2` を 7 本が同名同値で定義し、8 本が 0.2 を直書きしていた。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAX_FETCH_FAIL_RATE, fetchFailDominant } from '../scripts/lib/inconclusive-gate.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

test('fetchFailDominant: 上限を「超えたら」不成立（ちょうど 20% は成立）', () => {
  assert.equal(MAX_FETCH_FAIL_RATE, 0.2);
  assert.equal(fetchFailDominant(0, 10), false);
  assert.equal(fetchFailDominant(2, 10), false, '2/10＝ちょうど 20%');
  assert.equal(fetchFailDominant(3, 10), true);
  assert.equal(fetchFailDominant(1, 5), false);
  assert.equal(fetchFailDominant(2, 5), true);
  assert.equal(fetchFailDominant(10, 10), true);
});

test('fetchFailDominant: 対象 0 件は取得失敗ではない（「検査ゼロ」は呼び出し側が別に扱う）。上限は渡せる', () => {
  assert.equal(fetchFailDominant(0, 0), false);
  assert.equal(fetchFailDominant(3, 0), false);
  assert.equal(fetchFailDominant(5, 10, 0.5), false, '上限 50% ならちょうどは成立');
  assert.equal(fetchFailDominant(6, 10, 0.5), true);
});

test('取得失敗の上限を各スクリプトが定義し直していない（lib/inconclusive-gate.mjs から import する）', () => {
  const files = execFileSync('git', ['ls-files', '-z', '--', 'scripts', '.claude', 'tools'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 })
    .split('\0')
    .filter((f) => /\.(mjs|cjs|js|mts|ts|tsx)$/.test(f) && !f.includes('node_modules') && f !== 'scripts/lib/inconclusive-gate.mjs');
  assert.ok(files.length > 500, `走査したコード ${files.length} ファイル（検査不成立）`);
  const DEFINES = /\b(?:const|let|var)\s+MAX_\w*FETCH_FAIL_RATE\s*=\s*[0-9.]+/;
  const redefined = files.filter((f) => DEFINES.test(readFileSync(join(ROOT, f), 'utf8')));
  assert.deepEqual(redefined, [], '取得失敗の上限を別に定義している（lib/inconclusive-gate.mjs の MAX_FETCH_FAIL_RATE を import する）');
});
