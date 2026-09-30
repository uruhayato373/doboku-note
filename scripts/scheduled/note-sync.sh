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
export PATH="/opt/homebrew/opt/node@20/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export LANG="ja_JP.UTF-8"
export LC_ALL="ja_JP.UTF-8"
# 8GB の Mac は日中の空きが 2GB を切るので、手動運用と同じしきい値にそろえる（gsc-local.sh と同じ理由）。
export DOBOKU_PW_MIN_FREE_MB="${DOBOKU_PW_MIN_FREE_MB:-1024}"
# KDP など別サービスのブラウザ作業と同時に動いても止まらないようにする（note のプロファイルは lock で排他される）。
export DOBOKU_PW_ALLOW_PARALLEL=1

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WT="$REPO/.claude/worktrees/note-sync"
LOG_DIR="$HOME/Library/Logs/doboku-note"
LOG_FILE="$LOG_DIR/note-sync.log"
mkdir -p "$LOG_DIR"

{
  echo ""
  echo "=== $(date -Iseconds) [note-sync] start ==="
} >> "$LOG_FILE"

rc=0
{
  git -C "$REPO" fetch -q origin develop
  if ! git -C "$REPO" worktree list --porcelain | grep -qx "worktree $WT"; then
    git -C "$REPO" worktree prune
    git -C "$REPO" worktree add -q --detach "$WT" origin/develop
    # disk-hygiene の「マージ済み・clean・放置」判定で消されないよう lock する（ルーチン専用の印）。
    git -C "$REPO" worktree lock --reason "note-sync launchd routine" "$WT"
  fi
  git -C "$WT" reset -q --hard origin/develop
  # 依存と R2 の接続設定は人の checkout と共有する（worktree ごとに npm install しない）。
  [ -e "$WT/node_modules" ] || ln -s "$REPO/node_modules" "$WT/node_modules"
  [ -e "$WT/.env.local" ] || ln -s "$REPO/.env.local" "$WT/.env.local"
  cd "$WT"
  # pre-commit フックが読む生成物（git 追跡外）。無いと commit の瞬間に ENOENT で落ちる。
  node .claude/scripts/build-doc-meta-index.mjs --ci > /dev/null
  # 手動起動の引数（例: --only <パス>）をそのまま渡す。launchd の週次は引数なし。
  node scripts/note-sync-routine.mjs "$@"
} >> "$LOG_FILE" 2>&1 || rc=$?

if [ "$rc" -eq 0 ]; then
  echo "=== $(date -Iseconds) [note-sync] ok ===" >> "$LOG_FILE"
else
  echo "=== $(date -Iseconds) [note-sync] FAILED rc=${rc} ===" >> "$LOG_FILE"
fi
exit "$rc"
