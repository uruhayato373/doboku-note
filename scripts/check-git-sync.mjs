#!/usr/bin/env node
/**
 * SessionStart フック: ローカル main/develop が origin より遅れていれば警告する。
 *
 * 動機（2026-06-11 事故）: 複数セッション・worktree 常態 + CI が deploy で main に
 * 自動マージするため、ローカル main が origin/main から数十コミット遅れることがある。
 * ブランチ名の確認だけでは気づけず、古いツリー上で作業して既存作業を重複・劣化させた。
 * develop も同様に遅れることがあるため（2026-06-19 拡張）、両ブランチを監視する。
 * 開幕で behind を可視化し、着手前の同期を促す。
 *
 * 安全策: 何が起きても session を止めない（常に exit 0、出力は警告のみ）。
 */
import { execFileSync } from 'node:child_process';

function gitSafe(args) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

// 軽量 fetch（origin の main / develop のみ・タグ無し）。失敗は無視。
gitSafe(['fetch', '-q', '--no-tags', 'origin', 'main', 'develop']);

function checkBranch(branch, remote) {
  const behind = Number(gitSafe(['rev-list', '--count', `${branch}..${remote}`]) || '0');
  if (behind > 0) {
    const ahead = Number(gitSafe(['rev-list', '--count', `${remote}..${branch}`]) || '0');
    const diverged = ahead > 0 ? `（ローカル独自 ${ahead} コミットあり＝分岐）` : '';
    const cmd =
      ahead > 0
        ? `git fetch && git rebase ${remote}`
        : `git pull --ff-only`;
    console.log(
      `[git-sync] ⚠ ローカル ${branch} が ${remote} より ${behind} コミット遅れ${diverged}。` +
        ` 着手前に同期推奨: ${cmd}`,
    );
  }
}

checkBranch('main', 'origin/main');
checkBranch('develop', 'origin/develop');
