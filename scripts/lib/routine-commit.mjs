/**
 * routine-commit.mjs — Mac の launchd ルーチン（専用 worktree・detached HEAD）が台帳を commit して develop へ push する共通部品。
 * 読み手: scripts/gsc-local-routine.mjs・scripts/coconala-local-routine.mjs。
 * 順序は CI の書き込み workflow と同じ（commit → fetch → rebase → push）。他の書き込みと競合したら 1 回だけやり直す。
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const git = (args) => spawnSync('git', args, { encoding: 'utf8' });

/** ブランチに乗った checkout か（人の作業ブランチに台帳 commit を混ぜないための判定）。 */
export function onBranch() {
  return git(['symbolic-ref', '-q', 'HEAD']).status === 0;
}

/**
 * paths を commit して develop へ push する。
 * @returns {{ status: 'no-change' | 'committed' | 'pushed', problem?: string }}
 */
export function commitAndPush(paths, message, { push = true } = {}) {
  git(['add', '--', ...paths.filter((p) => existsSync(p))]);
  if (git(['diff', '--cached', '--quiet']).status === 0) return { status: 'no-change' };
  const c = git(['commit', '-m', message]);
  if (c.status !== 0) return { status: 'no-change', problem: `commit に失敗: ${(c.stderr || c.stdout).trim().slice(0, 300)}` };
  if (!push) return { status: 'committed' };
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    git(['fetch', '-q', 'origin', 'develop']);
    if (git(['rebase', '-q', 'origin/develop']).status !== 0) {
      git(['rebase', '--abort']);
      break;
    }
    if (git(['push', '-q', 'origin', 'HEAD:develop']).status === 0) return { status: 'pushed' };
  }
  return { status: 'committed', problem: 'develop への push に失敗（次回の実行は worktree を origin/develop に戻すので、この回の台帳は失われる）' };
}
