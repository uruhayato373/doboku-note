/**
 * 一時リポジトリで git を呼ぶテストが、pre-commit の GIT_DIR・GIT_INDEX_FILE を引き継がないこと（DN-0897）。
 * 2026-10-27、引き継いだ `git init` が親の .git/config に core.bare = true を書き、本体と全 worktree の git status が止まった。
 */
import './lib/isolate-git-env.mjs';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const TESTS_DIR = join(REPO_ROOT, 'tests');
const CALLS_GIT_INIT = /['"](init|clone)['"]|\bgit (init|clone)\b/;
const ISOLATED = /import '\.\/lib\/isolate-git-env\.mjs';|startsWith\('GIT_'\)/;

test('git の init・clone を呼ぶテストは、すべて GIT_ の環境変数を外している', () => {
  const files = readdirSync(TESTS_DIR).filter((f) => f.endsWith('.test.mjs'));
  const callers = files.filter((f) => CALLS_GIT_INIT.test(readFileSync(join(TESTS_DIR, f), 'utf8')));
  assert.ok(callers.length > 0, 'git の init・clone を呼ぶテストを 1 本も見つけられていない（検出の正規表現が壊れている）');
  const leaking = callers.filter((f) => !ISOLATED.test(readFileSync(join(TESTS_DIR, f), 'utf8')));
  assert.deepEqual(leaking, [], `先頭で import './lib/isolate-git-env.mjs'; を足す（${callers.length} 本中）`);
});

test('isolate-git-env を読んだプロセスから起動した git init は、親の GIT_DIR を使わない', () => {
  const parent = mkdtempSync(join(tmpdir(), 'git-env-parent-'));
  const child = mkdtempSync(join(tmpdir(), 'git-env-child-'));
  try {
    spawnSync('git', ['init', '-q', parent]);
    const leaked = { ...process.env, GIT_DIR: join(parent, '.git'), GIT_INDEX_FILE: join(parent, '.git', 'index') };
    const script = "import './tests/lib/isolate-git-env.mjs'; import { execFileSync } from 'node:child_process'; execFileSync('git', ['init', '-q'], { cwd: process.argv[1] });";
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', script, child], { cwd: REPO_ROOT, env: leaked, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const bare = spawnSync('git', ['config', '--file', join(parent, '.git', 'config'), 'core.bare'], { encoding: 'utf8' }).stdout.trim();
    assert.equal(bare, 'false', '親リポジトリの core.bare が書き換わった');
    assert.ok(readdirSync(child).includes('.git'), '子のディレクトリに .git ができていない');
  } finally {
    rmSync(parent, { recursive: true, force: true });
    rmSync(child, { recursive: true, force: true });
  }
});
