#!/bin/bash
# launchd から毎日呼ばれるラッパー（com.doboku-note.auth-session-refresh）。A8 / もしも / KDP のログインを保ち、
# CI が使う service は暗号化 state を書き出して、定期収集が 24 時間以内なら直後に収集を起動する
# （理由は scripts/auth-session-refresh.mjs の冒頭）。
# 導入・状態確認・即実行・解除: npm run auth-refresh:install [-- --status|--run-now|--uninstall]
#
# 17:45 に動かすのは、stats47 の measurement-session-refresh（17:30）が共用口座の state を保存した直後だから。
# 人が作業する checkout には触らない。専用の worktree（.claude/worktrees/auth-session-refresh・detached・lock 済み）を
# 毎回 origin/develop に合わせて、その中で動かす（gsc-local.sh と同じ）。

set -euo pipefail

export PATH="/opt/homebrew/opt/node@20/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export LANG="ja_JP.UTF-8"
export LC_ALL="ja_JP.UTF-8"
# 8GB の Mac は日中の空きが 2GB を切るので、手動運用・gsc-local と同じ 1200MB にそろえる。
export DOBOKU_PW_MIN_FREE_MB="${DOBOKU_PW_MIN_FREE_MB:-1200}"

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WT="$REPO/.claude/worktrees/auth-session-refresh"
LOG_DIR="$HOME/Library/Logs/doboku-note"
LOG_FILE="$LOG_DIR/auth-session-refresh.log"
mkdir -p "$LOG_DIR"

{
  echo ""
  echo "=== $(date -Iseconds) [auth-session-refresh] start ==="
} >> "$LOG_FILE"

rc=0
{
  git -C "$REPO" fetch -q origin develop
  if ! git -C "$REPO" worktree list --porcelain | grep -qx "worktree $WT"; then
    git -C "$REPO" worktree prune
    git -C "$REPO" worktree add -q --detach "$WT" origin/develop
    # disk-hygiene の「マージ済み・clean・放置」判定で消されないよう lock する（ルーチン専用の印）。
    git -C "$REPO" worktree lock --reason "auth-session-refresh launchd routine" "$WT"
  fi
  git -C "$WT" reset -q --hard origin/develop
  [ -e "$WT/node_modules" ] || ln -s "$REPO/node_modules" "$WT/node_modules"
  cd "$WT"
  node scripts/auth-session-refresh.mjs --export --dispatch-due
} >> "$LOG_FILE" 2>&1 || rc=$?

if [ "$rc" -eq 0 ]; then
  echo "=== $(date -Iseconds) [auth-session-refresh] ok ===" >> "$LOG_FILE"
else
  echo "=== $(date -Iseconds) [auth-session-refresh] FAILED rc=${rc} ===" >> "$LOG_FILE"
fi
exit "$rc"
