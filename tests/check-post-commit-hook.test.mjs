// check-post-commit-hook（DN-0554）: post-commit が無い・古い版なら止め、install-pre-commit を入れた後は通る
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { postCommitViolations } from '../scripts/check-post-commit-hook.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const runCheck = (hooksDir) =>
  spawnSync(process.execPath, [join(REPO_ROOT, 'scripts/check-post-commit-hook.mjs')], {
    encoding: 'utf8',
    env: { ...process.env, DOBOKU_HOOKS_DIR: hooksDir },
  });

test('postCommitViolations: 無い・古い版を違反にし、sync-index-after-commit を呼ぶ版は通す', () => {
  assert.equal(postCommitViolations(null).length, 1);
  assert.equal(postCommitViolations('#!/bin/sh\nexit 0\n').length, 1);
  assert.deepEqual(postCommitViolations('#!/bin/sh\nnode scripts/sync-index-after-commit.mjs || true\n'), []);
});

test('post-commit が無い・古いと exit 1、install-pre-commit の後は exit 0', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pch-'));
  try {
    const missing = runCheck(dir);
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /pre-commit:install/);

    writeFileSync(join(dir, 'post-commit'), '#!/bin/sh\nexit 0\n');
    assert.equal(runCheck(dir).status, 1);

    const install = spawnSync(process.execPath, [join(REPO_ROOT, 'scripts/install-pre-commit.mjs')], {
      encoding: 'utf8',
      cwd: REPO_ROOT,
      env: { ...process.env, DOBOKU_HOOKS_DIR: dir },
    });
    assert.equal(install.status, 0, install.stderr);
    assert.equal(runCheck(dir).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
