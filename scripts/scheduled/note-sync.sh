#!/bin/bash
# launchd から毎週呼ばれるラッパー（com.doboku-note.note-sync）。note の記事を記事単位で同期（本文・カバー・タグを
# 1 記事 1 回の更新で反映）し、マガジンのカバーも登録して、台帳を develop へ push する（理由は scripts/note-sync-routine.mjs の冒頭）。
# 導入・状態確認・即実行・解除: npm run note-sync:install [-- --status|--run-now|--uninstall]
#
# 人が作業する checkout には触らない。専用の worktree（.claude/worktrees/note-sync・detached・lock 済み）を
# 毎回 origin/develop に合わせて、その中で動かす。生成したカバー PNG と取り寄せた配布 PDF（どちらも Git 管理外）は
# この worktree に残り、R2 に同じ sha256 があるカバーは次回の保存で送り直さない。

set -euo pipefail

# launchd の PATH は最小なので node を明示的に通す（gsc-local.sh と同じ）。
export PATH="$HOME/.local/bin:/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export LANG="ja_JP.UTF-8"
export LC_ALL="ja_JP.UTF-8"
# 8GB の Mac は日中の空きが 2GB を切るので、手動運用と同じしきい値にそろえる（gsc-local.sh と同じ理由）。
export DOBOKU_PW_MIN_FREE_MB="${DOBOKU_PW_MIN_FREE_MB:-1024}"
# KDP など別サービスのブラウザ作業と同時に動いても止まらないようにする（note のプロファイルは lock で排他される）。
export DOBOKU_PW_ALLOW_PARALLEL=1

REPO="${DOBOKU_NOTE_SYNC_REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
WT="$REPO/.claude/worktrees/note-sync"
LOG_DIR="$HOME/Library/Logs/doboku-note"
LOG_FILE="$LOG_DIR/note-sync.log"
mkdir -p "$LOG_DIR"

# Never reset a dedicated worktree while another sync owns its browser and state.
LOCK="$LOG_DIR/note-sync.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  if [ ! -f "$LOCK/pid" ]; then
    echo "[note-sync] lock is being acquired (or stale without pid): $LOCK" >> "$LOG_FILE"
    exit 1
  fi
  if [ -f "$LOCK/pid" ] && kill -0 "$(cat "$LOCK/pid")" 2>/dev/null; then
    echo "[note-sync] already running pid=$(cat "$LOCK/pid")" >> "$LOG_FILE"
    exit 0
  fi
  rm -f "$LOCK/pid"
  rmdir "$LOCK"
  mkdir "$LOCK"
fi
echo "$$" > "$LOCK/pid"
trap 'rm -f "$LOCK/pid"; rmdir "$LOCK"' EXIT

{
  echo ""
  echo "=== $(date -Iseconds) [note-sync] start ==="
} >> "$LOG_FILE"

rc=0
(
  git -C "$REPO" fetch -q origin develop || exit $?
  if ! git -C "$REPO" worktree list --porcelain | grep -qx "worktree $WT"; then
    git -C "$REPO" worktree prune
    git -C "$REPO" worktree add -q --detach "$WT" origin/develop || exit $?
    # disk-hygiene の「マージ済み・clean・放置」判定で消されないよう lock する（ルーチン専用の印）。
    git -C "$REPO" worktree lock --reason "note-sync launchd routine" "$WT" || exit $?
  fi
  # A previous failed commit/push may contain the only local evidence of completed updates.
  if ! git -C "$WT" diff --quiet || ! git -C "$WT" diff --cached --quiet; then
    echo '[note-sync] uncommitted state remains; preserve it and repair the previous run before resetting'
    exit 1
  fi
  if ! git -C "$WT" merge-base --is-ancestor HEAD origin/develop; then
    echo '[note-sync] unpushed commits remain; publish or reconcile them before resetting'
    exit 1
  fi
  git -C "$WT" reset -q --hard origin/develop || exit $?
  # 依存と R2 の接続設定は人の checkout と共有する（worktree ごとに npm install しない）。
  [ -e "$WT/node_modules" ] || ln -s "$REPO/node_modules" "$WT/node_modules" || exit $?
  [ -e "$WT/.env.local" ] || ln -s "$REPO/.env.local" "$WT/.env.local" || exit $?
  cd "$WT" || exit $?
  # pre-commit フックが読む生成物（git 追跡外）。無いと commit の瞬間に ENOENT で落ちる。
  node .claude/scripts/build-doc-meta-index.mjs --ci > /dev/null || exit $?
  # 手動起動の引数（例: --only <パス>）をそのまま渡す。launchd の週次は引数なし。
  node scripts/note-sync-routine.mjs "$@"
) >> "$LOG_FILE" 2>&1 || rc=$?

if [ "$rc" -eq 0 ]; then
  echo "=== $(date -Iseconds) [note-sync] ok ===" >> "$LOG_FILE"
else
  echo "=== $(date -Iseconds) [note-sync] FAILED rc=${rc} ===" >> "$LOG_FILE"
fi
exit "$rc"
