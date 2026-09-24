#!/bin/bash
# launchd から毎日呼ばれるラッパー（com.doboku-note.gsc-local）。GSC の登録リクエストと月次の理由別 CSV を、
# ログイン済みの Mac 自身で回す（理由は scripts/gsc-local-routine.mjs の冒頭）。
# 導入・状態確認・即実行・解除: npm run gsc-local:install [-- --status|--run-now|--uninstall]
#
# 人が作業する checkout（別ブランチ・未コミットの変更がありうる）には触らない。専用の worktree
# （.claude/worktrees/gsc-local・detached・lock 済み）を毎回 origin/develop に合わせて、その中で動かす。
# この worktree はルーチン専用なので、前回の残りは reset --hard で捨ててよい。

set -euo pipefail

# launchd の PATH は最小なので node を明示的に通す（disk-hygiene.sh と同じ）。
export PATH="/opt/homebrew/opt/node@20/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export LANG="ja_JP.UTF-8"
export LC_ALL="ja_JP.UTF-8"
# 8GB の Mac は Claude Desktop を開いた日中だと空きが 2GB を切り、既定しきい値（2048MB）で Chrome を起動せず
# 毎回失敗する（2026-09-24 初回 run-now で空き 1879MB）。手動運用と同じ 1200MB にそろえる。
export DOBOKU_PW_MIN_FREE_MB="${DOBOKU_PW_MIN_FREE_MB:-1200}"

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WT="$REPO/.claude/worktrees/gsc-local"
LOG_DIR="$HOME/Library/Logs/doboku-note"
LOG_FILE="$LOG_DIR/gsc-local.log"
mkdir -p "$LOG_DIR"

{
  echo ""
  echo "=== $(date -Iseconds) [gsc-local] start ==="
} >> "$LOG_FILE"

rc=0
{
  git -C "$REPO" fetch -q origin develop
  if ! git -C "$REPO" worktree list --porcelain | grep -qx "worktree $WT"; then
    git -C "$REPO" worktree prune
    git -C "$REPO" worktree add -q --detach "$WT" origin/develop
    # disk-hygiene の「マージ済み・clean・放置」判定で消されないよう lock する（ルーチン専用の印）。
    git -C "$REPO" worktree lock --reason "gsc-local launchd routine" "$WT"
  fi
  git -C "$WT" reset -q --hard origin/develop
  # 依存は人の checkout と共有する（worktree ごとに npm install しない）。
  [ -e "$WT/node_modules" ] || ln -s "$REPO/node_modules" "$WT/node_modules"
  cd "$WT"
  # pre-commit フックが読む生成物（git 追跡外）。無いと commit の瞬間に ENOENT で落ちる。
  node .claude/scripts/build-doc-meta-index.mjs --ci > /dev/null
  node scripts/gsc-local-routine.mjs
} >> "$LOG_FILE" 2>&1 || rc=$?

if [ "$rc" -eq 0 ]; then
  echo "=== $(date -Iseconds) [gsc-local] ok ===" >> "$LOG_FILE"
else
  echo "=== $(date -Iseconds) [gsc-local] FAILED rc=${rc} ===" >> "$LOG_FILE"
fi
exit "$rc"
