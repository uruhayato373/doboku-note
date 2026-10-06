// pathspec commit（git commit -- <path>）では pre-commit が書き換えて stage した内容が本物の index に入らず、
// index にだけ古い版が残る（2026-10-06・backfill-mdx-dates の dateModified）。post-commit がそれを HEAD に揃える。
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const SCRIPT = resolve('scripts/sync-index-after-commit.mjs');
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' });

function repoWithBumpingHook({ postCommit }) {
  const repo = mkdtempSync(join(tmpdir(), 'dn-sync-index-'));
  git(repo, 'init', '-q');
  git(repo, 'config', 'user.email', 't@example.com');
  git(repo, 'config', 'user.name', 't');
  writeFileSync(join(repo, 'a.mdx'), 'dateModified: 2026-09-01\n本文\n');
  writeFileSync(join(repo, 'other.txt'), 'x\n');
  git(repo, 'add', '.');
  git(repo, 'commit', '-q', '-m', 'init');
  const hooks = mkdtempSync(join(tmpdir(), 'dn-sync-index-hooks-'));
  // backfill-mdx-dates --staged の代わり: staged の a.mdx の日付を進めて stage し直す
  writeFileSync(join(hooks, 'pre-commit'), '#!/bin/sh\nif git diff --cached --name-only | grep -q a.mdx; then sed -i "s/2026-09-01/2026-10-06/" a.mdx && git add a.mdx; fi\n');
  chmodSync(join(hooks, 'pre-commit'), 0o755);
  if (postCommit) {
    writeFileSync(join(hooks, 'post-commit'), `#!/bin/sh\nnode ${JSON.stringify(SCRIPT)} || true\n`);
    chmodSync(join(hooks, 'post-commit'), 0o755);
  }
  git(repo, 'config', 'core.hooksPath', hooks);
  return { repo, hooks };
}
const cleanup = ({ repo, hooks }) => {
  rmSync(repo, { recursive: true, force: true });
  rmSync(hooks, { recursive: true, force: true });
};

test('post-commit が無いと、pathspec commit の後に index だけ古い版が残る（問題の再現）', () => {
  const t = repoWithBumpingHook({ postCommit: false });
  const { repo } = t;
  try {
    writeFileSync(join(repo, 'a.mdx'), 'dateModified: 2026-09-01\n本文を直した\n');
    git(repo, 'commit', '-q', '-m', 'edit', '--', 'a.mdx');
    assert.match(git(repo, 'show', 'HEAD:a.mdx'), /2026-10-06/);
    assert.match(git(repo, 'show', ':a.mdx'), /2026-09-01/, 'index は古い版のまま');
    assert.equal(git(repo, 'status', '--porcelain').trim(), 'MM a.mdx');
  } finally {
    cleanup(t);
  }
});

test('post-commit が index を HEAD に揃え、別の変更（未 commit の作業・他の staged）には触らない', () => {
  const t = repoWithBumpingHook({ postCommit: true });
  const { repo } = t;
  try {
    // 別セッションが other.txt を stage している状態で、自分は a.mdx だけを pathspec commit する
    writeFileSync(join(repo, 'other.txt'), 'staged by another session\n');
    git(repo, 'add', 'other.txt');
    writeFileSync(join(repo, 'a.mdx'), 'dateModified: 2026-09-01\n本文を直した\n');
    git(repo, 'commit', '-q', '-m', 'edit', '--', 'a.mdx');
    assert.match(git(repo, 'show', ':a.mdx'), /2026-10-06/, 'index が HEAD に揃っている');
    assert.equal(git(repo, 'status', '--porcelain').trim(), 'M  other.txt', '他の staged はそのまま');
  } finally {
    cleanup(t);
  }
});
