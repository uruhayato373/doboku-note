// 共有 pre-commit フックの入れ直しで新しい版が古い版に戻らないこと（DN-0506）。
//
// 一時の git リポジトリに install-pre-commit.mjs の「旧版→新版」の 2 コミットを作り、
// origin/develop を新版に向ける。新版のツリーで入れたあと、旧版の worktree から入れ直しても
// 共有フックが新版のまま残ることと、書き込みが一時ファイル→rename（inode が変わる）であることを確かめる。
// 実リポジトリの .git/hooks には触れない（cwd を一時リポジトリにして git に hooks の場所を解決させる）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, statSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { hookBodyHash, installedHookHash, decideHookInstall } from '../scripts/lib/hook-install-guard.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = 'scripts/install-pre-commit.mjs';

test('decideHookInstall: 古いツリーからは上書きしない／新しいゲートを足す途中なら入れる', () => {
  const history = ['new000000000', 'old000000000', 'older0000000'];
  assert.equal(
    decideHookInstall({ installedHash: 'new000000000', sourceHash: 'old000000000', developHash: 'new000000000', developHistory: history }),
    'refuse-stale',
  );
  // develop に無い版（＝feature で足している途中）は入れる
  assert.equal(
    decideHookInstall({ installedHash: 'new000000000', sourceHash: 'feat00000000', developHash: 'new000000000', developHistory: history }),
    'install',
  );
  // 導入済みが develop より古いなら、develop 版のツリーから入れ直す
  assert.equal(
    decideHookInstall({ installedHash: 'old000000000', sourceHash: 'new000000000', developHash: 'new000000000', developHistory: history }),
    'install',
  );
  // develop が取れない・未導入なら従来どおり入れる
  assert.equal(decideHookInstall({ installedHash: null, sourceHash: 'old000000000', developHash: 'new000000000', developHistory: history }), 'install');
  assert.equal(decideHookInstall({ installedHash: 'new000000000', sourceHash: 'old000000000', developHash: null, developHistory: [] }), 'install');
});

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

test('旧版の worktree から pre-commit:install しても、共有フックは新版のまま・書き込みは rename', () => {
  const base = mkdtempSync(join(tmpdir(), 'hook-guard-'));
  try {
    const repo = join(base, 'repo');
    mkdirSync(join(repo, 'scripts/lib'), { recursive: true });
    git(base, 'init', '-q', '-b', 'develop', repo);
    git(repo, 'config', 'user.email', 'test@example.com');
    git(repo, 'config', 'user.name', 'test');
    git(repo, 'config', 'commit.gpgsign', 'false');
    // 実フックの検査（node scripts/...）を走らせないよう、テスト用リポジトリではフックを無効にしてコミットする
    git(repo, 'config', 'core.hooksPath', join(base, 'no-hooks'));
    copyFileSync(join(ROOT, 'scripts/lib/hook-install-guard.mjs'), join(repo, 'scripts/lib/hook-install-guard.mjs'));
    const real = readFileSync(join(ROOT, SRC), 'utf8');
    const oldSrc = real.replace('# Pre-commit hooks\n', '# Pre-commit hooks (old)\n');
    assert.notEqual(oldSrc, real, '旧版を作れない（HOOK_CONTENT_BODY の先頭が変わった＝検査不成立）');

    writeFileSync(join(repo, SRC), oldSrc);
    git(repo, 'add', '.');
    git(repo, 'commit', '-q', '-m', 'old');
    const oldCommit = git(repo, 'rev-parse', 'HEAD');
    writeFileSync(join(repo, SRC), real);
    git(repo, 'commit', '-q', '-am', 'new');
    git(repo, 'update-ref', 'refs/remotes/origin/develop', git(repo, 'rev-parse', 'HEAD'));
    // 共有フックの置き場を既定（.git/hooks）へ戻す
    git(repo, 'config', '--unset', 'core.hooksPath');

    const hookPath = join(repo, '.git/hooks/pre-commit');
    const run = (cwd) => spawnSync('node', [SRC], { cwd, encoding: 'utf8', env: { ...process.env, DOBOKU_HOOKS_DIR: '', npm_lifecycle_event: '' } });

    // 1. 新版（develop 先頭）のツリーから入れる
    const first = run(repo);
    assert.equal(first.status, 0, first.stderr);
    const newHash = hookBodyHash(real);
    assert.equal(installedHookHash(readFileSync(hookPath, 'utf8')), newHash);
    const inodeBefore = statSync(hookPath).ino;

    // 2. 同じツリーから入れ直すと、一時ファイル→rename で別の inode になる（実行中のシェルは旧 inode を読み続ける）
    assert.equal(run(repo).status, 0);
    assert.notEqual(statSync(hookPath).ino, inodeBefore, '上書きが rename になっていない');

    // 3. 旧版の worktree から入れ直そうとすると拒否され、共有フックは新版のまま
    const oldTree = join(base, 'old-tree');
    git(repo, 'worktree', 'add', '-q', '--detach', oldTree, oldCommit);
    const stale = run(oldTree);
    assert.equal(stale.status, 1, `旧版からの上書きが止まらない: ${stale.stdout}${stale.stderr}`);
    assert.match(stale.stderr, /origin\/develop/);
    assert.equal(installedHookHash(readFileSync(hookPath, 'utf8')), newHash, '共有フックが旧版に戻った');
    assert.notEqual(hookBodyHash(oldSrc), newHash);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
