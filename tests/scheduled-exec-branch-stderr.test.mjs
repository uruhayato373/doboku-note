// check-scheduled-exec-branch が git の失敗（origin/HEAD 未設定など）を stderr に漏らさない回帰ゲート。
// 2026-09-01 まで pre-commit / CI の全実行で `fatal: ref refs/remotes/origin/HEAD is not a symbolic ref`
// が出続けていた（実害なしだが本物の fatal を埋もれさせる）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('--file 実行で exit 0 かつ stderr に git の fatal が出ない', () => {
  const r = spawnSync(process.execPath, ['scripts/check-scheduled-exec-branch.mjs', '--file', 'package.json'], {
    cwd: ROOT, encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stderr, /fatal:/);
});
