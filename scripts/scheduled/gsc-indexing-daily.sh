#!/bin/bash
# launchd から毎日呼ばれるラッパー（com.doboku-note.gsc-indexing）。
# 登録リクエストを 1 日 10 件送る。土曜の収集と同じ gsc-local-routine を使い、20 時間以内の二重送信はそちらが止める。
# 導入・状態確認・解除: npm run gsc-indexing:install [-- --status|--uninstall|--run-now]

set -euo pipefail

export PATH="$HOME/.local/bin:/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export LANG="ja_JP.UTF-8"
export LC_ALL="ja_JP.UTF-8"

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WT="$REPO/.claude/worktrees/gsc-indexing"
LOG_DIR="$HOME/Library/Logs/doboku-note"
LOG_FILE="$LOG_DIR/gsc-indexing.log"
mkdir -p "$LOG_DIR"

echo "=== $(date -Iseconds) [gsc-indexing] start ===" >> "$LOG_FILE"

# 人が作業する checkout には触らない。ブランチに乗らない専用の worktree を毎回 origin/develop に合わせる。
git -C "$REPO" fetch -q origin develop >> "$LOG_FILE" 2>&1
if [ -e "$WT/.git" ]; then
  git -C "$WT" checkout -q --detach -f origin/develop >> "$LOG_FILE" 2>&1
  git -C "$WT" clean -fdq -e node_modules >> "$LOG_FILE" 2>&1
else
  git -C "$REPO" worktree add -q --detach "$WT" origin/develop >> "$LOG_FILE" 2>&1
fi
[ -e "$WT/node_modules" ] || ln -s "$REPO/node_modules" "$WT/node_modules"

if (cd "$WT" && node scripts/gsc-local-routine.mjs) >> "$LOG_FILE" 2>&1; then
  echo "=== $(date -Iseconds) [gsc-indexing] ok ===" >> "$LOG_FILE"
else
  rc=$?
  echo "=== $(date -Iseconds) [gsc-indexing] FAILED rc=${rc} ===" >> "$LOG_FILE"
  (cd "$REPO" && node scripts/report-automation-failure.mjs --channel gsc-indexing-local --title "GSC の登録リクエストが失敗した" --body "ログ: $LOG_FILE") >> "$LOG_FILE" 2>&1 || true
  exit $rc
fi
