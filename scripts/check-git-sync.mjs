#!/usr/bin/env node
/**
 * SessionStart フック: ローカル main が origin/main より遅れていれば警告する。
 *
 * 動機（2026-06-11 事故）: 複数セッション・worktree 常態 + CI が deploy で main に
 * 自動マージするため、ローカル main が origin/main から数十コミット遅れることがある。
 * ブランチ名の確認だけでは気づけず、古いツリー上で作業して既存作業を重複・劣化させた。
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

const behind = Number(gitSafe(['rev-list', '--count', 'main..origin/main']) || '0');
if (behind > 0) {
  const ahead = Number(gitSafe(['rev-list', '--count', 'origin/main..main']) || '0');
  const diverged = ahead > 0 ? `（ローカル独自 ${ahead} コミットあり＝分岐）` : '';
  console.log(
    `[git-sync] ⚠ ローカル main が origin/main より ${behind} コミット遅れ${diverged}。` +
      ' 着手前に同期推奨: git fetch && git reset --hard origin/main' +
      '（独自コミットは退避ブランチで保全してから）。',
  );
}
