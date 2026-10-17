#!/bin/bash
# launchd から毎週土曜 9:30 に呼ばれるラッパー（com.doboku-note.weekly-review）。Mac のヘッドレスの Claude Code で
# /weekly-review と /plan-weekly を最後まで回し、develop へ push する。
# 導入・状態確認・即実行・解除: npm run weekly-review:install [-- --status|--run-now|--uninstall]
#
# なぜ Mac で回すか: 2026-W40 の週次レビューが抜けた（土曜に対話セッションを開かないと何も始まらなかった）。
# クラウドルーティンはサンドボックスで .claude/ への書き込みが止まり、Playwright・ログインの要る検査も回せず退役した
# （memory feedback_cloud_routines_minimized）。Mac にはログイン済みのプロファイルとキーチェーンがあるので全部回せる。
# 判断待ち（🟣）の諮問だけはヘッドレスでは聞けないので、レビューに「諮問待ち」として残し、次の対話セッションで聞く。
#
# 人が作業する checkout には触らない。専用の worktree（.claude/worktrees/weekly-review・detached・lock 済み）を
# 毎回 origin/develop に合わせて、その中で動かす（note-sync.sh と同じ）。
# レビュー・翌週計画・事業記録・点検・backlog 検証が develop で成立した場合だけ再生成しない。
# 途中の取得/生成/通知の失敗は非ゼロ終了し、automation-failure（weekly-review-local）へ通知する。

set -euo pipefail

export PATH="$HOME/.local/bin:/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export LANG="ja_JP.UTF-8"
export LC_ALL="ja_JP.UTF-8"
export DOBOKU_PW_MIN_FREE_MB="${DOBOKU_PW_MIN_FREE_MB:-1024}"
export DOBOKU_PW_ALLOW_PARALLEL=1

REPO="${DOBOKU_WEEKLY_REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
WT="$REPO/.claude/worktrees/weekly-review"
LOG_DIR="$HOME/Library/Logs/doboku-note"
LOG_FILE="$LOG_DIR/weekly-review.log"
mkdir -p "$LOG_DIR"

{
  echo ""
  echo "=== $(date -Iseconds) [weekly-review] start ==="
} >> "$LOG_FILE"

week="未確定"
review="未確定"

# A concurrent invocation must not reset the active dedicated worktree.
LOCK="$LOG_DIR/weekly-review.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  if [ -f "$LOCK/pid" ] && kill -0 "$(cat "$LOCK/pid")" 2>/dev/null; then
    echo "[weekly-review] already running pid=$(cat "$LOCK/pid")" >> "$LOG_FILE"
    exit 0
  fi
  rm -f "$LOCK/pid"
  rmdir "$LOCK"
  mkdir "$LOCK"
fi
echo "$$" > "$LOCK/pid"

finish() {
  local rc=$?
  trap - EXIT
  rm -f "$LOCK/pid"
  rmdir "$LOCK"
  if [ "$rc" -eq 0 ]; then
    echo "=== $(date -Iseconds) [weekly-review] evidence complete ($review) ===" >> "$LOG_FILE"
    (cd "$REPO" && node scripts/report-automation-failure.mjs --resolve --channel weekly-review-local --body "復旧: $week のレビュー・計画・事業記録・点検・backlog 検証が develop で成立") >> "$LOG_FILE" 2>&1 || rc=1
  else
    echo "=== $(date -Iseconds) [weekly-review] FAILED rc=$rc ===" >> "$LOG_FILE"
    local body
    body="$(mktemp)"
    {
      echo "$week の自動週次レビューが完了しませんでした（rc=$rc）。"
      echo 'ログ: ~/Library/Logs/doboku-note/weekly-review.log'
      echo '再実行: npm run weekly-review:install -- --run-now'
      echo '```'
      tail -30 "$LOG_FILE" | sed 's/[[:cntrl:]]//g'
      echo '```'
    } > "$body"
    (cd "$REPO" && node scripts/report-automation-failure.mjs --channel weekly-review-local --title "自動の週次レビューが完了しませんでした" --body-file "$body") >> "$LOG_FILE" 2>&1 || echo '[weekly-review] failure notification also failed' >> "$LOG_FILE"
    rm -f "$body"
  fi
  exit "$rc"
}
trap finish EXIT
exec >> "$LOG_FILE" 2>&1
# The assertion lasts only while this invocation is alive; lid-close still yields measured inconclusive.
caffeinate -i -w "$$" &
git -C "$REPO" fetch -q origin develop
  if ! git -C "$REPO" worktree list --porcelain | grep -qx "worktree $WT"; then
    git -C "$REPO" worktree prune
    git -C "$REPO" worktree add -q --detach "$WT" origin/develop
    git -C "$REPO" worktree lock --reason "weekly-review launchd routine" "$WT"
  fi
  if [ -n "$(git -C "$WT" status --porcelain)" ] || [ -n "$(git -C "$WT" log --oneline origin/develop..HEAD)" ]; then
    echo '[weekly-review] 前回の未保存変更・未 push commit がある。worktree を保持して停止'
    exit 1
  fi
  git -C "$WT" reset -q --hard origin/develop
  [ -e "$WT/node_modules" ] || [ -L "$WT/node_modules" ] || ln -s "$REPO/node_modules" "$WT/node_modules"
  [ -e "$WT/.env.local" ] || [ -L "$WT/.env.local" ] || ln -s "$REPO/.env.local" "$WT/.env.local"
  week="$(node -e "import('$WT/scripts/lib/review-week.mjs').then(m=>import('$WT/scripts/lib/jst-date.mjs').then(j=>console.log(m.reviewWeekOfDay(j.todayJst()))))")"
  review="docs/reviews/weekly/${week}-review.md"
  if node "$WT/scripts/check-weekly-review.mjs" --week "$week" --ref origin/develop; then
    echo "[weekly-review] $week の全成果物を確認。再生成しない"
    exit 0
  else
    check_rc=$?
    [ "$check_rc" -eq 1 ] || exit "$check_rc"
  fi

  cd "$WT"
  node .claude/scripts/build-doc-meta-index.mjs --ci > /dev/null

  prompt="$(cat <<PROMPT
/weekly-review ${week}

これは Mac の launchd から起動したヘッドレスの実行（scripts/scheduled/weekly-review.sh）で、作業場所は専用の worktree（detached HEAD・origin/develop）です。人は見ていません。次を守ってください。
- 最初に .claude/state/weekly-review/draft.json の markdown（CI が金曜に作った機械の節）を読み、無いか古ければ node scripts/build-weekly-review-draft.mjs --print で作り直す。数字は写し、転記し直さない。
- AskUserQuestion は使えない。判断待ち（🟣）の諮問は「## バックログの関門」に「諮問待ち（次の対話セッションで諮る）」として背景・選択肢・おすすめを 1 件ずつ書き、行頭に <!-- weekly-review:pending-questions --> を置く。台帳の 🟣 はそのまま残す。
- 外部への公開・投稿・送信・購入・価格変更・note やココナラの編集はしない。ログイン済みプロファイルで読むだけの取得（npm run coconala-orders など）は回してよい。
- commit は変更したファイルだけを pathspec で指定し、git push origin HEAD:develop で積む（push が競合したら git pull --rebase origin develop してやり直す）。git reset・checkout・stash・force push はしない。
- レビューの保存とコミットが終わったら /plan-weekly で来週の計画を書き、同じ形でコミットする。
- 最後に node scripts/check-weekly-review.mjs --week ${week} が exit 0 になることを確かめ、不成立なら欠けた取得・記録を補う。既存 md だけで完了にしない。
- 最後に、作ったファイル・起票した DN・諮問待ちの件数・未取得の材料を 10 行以内で書いて終える。
PROMPT
)"
  claude -p "$prompt" \
    --permission-mode acceptEdits \
    --allowedTools "Bash Read Write Edit Glob Grep Agent Skill TodoWrite" \
    --disallowedTools "Bash(git reset:*) Bash(git checkout:*) Bash(git stash:*) Bash(git push --force:*) Bash(git push -f:*) Bash(gh pr merge:*) Bash(rm -rf:*)"
git -C "$REPO" fetch -q origin develop
node "$WT/scripts/check-weekly-review.mjs" --week "$week" --ref origin/develop
