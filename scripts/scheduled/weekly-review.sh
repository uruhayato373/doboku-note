#!/bin/bash
# launchd から毎週土曜 9:30 に呼ばれるラッパー（com.doboku-note.weekly-review）。
#   1. 土曜の収集（前）: ログインが要る取得を scripts/weekly-collect.mjs --phase pre で回す（DN-0817・DN-0819）
#   2. Mac のヘッドレスの Claude Code で /weekly-review・/plan-weekly と、期日到来の /monthly-review を回し、develop へ push する
#   3. 土曜の収集（後）: 時間がかかる照合と note への書き込みを --phase post で回す
# 導入・状態確認・即実行・解除: npm run weekly-review:install [-- --status|--run-now|--uninstall]
#
# なぜ Mac で回すか: 2026-W40 の週次レビューが抜けた（土曜に対話セッションを開かないと何も始まらなかった）。
# クラウドルーティンはサンドボックスで .claude/ への書き込みが止まり、Playwright・ログインの要る検査も回せず退役した
# （memory feedback_cloud_routines_minimized）。Mac にはログイン済みのプロファイルとキーチェーンがあるので全部回せる。
# ログインが要る処理はこの 1 本にまとめ、CI と他のセッションはログインしない（記録を読む・DN-0817）。
# Claude Code の中（CLAUDECODE=1）では資格情報が読めないので、収集は Claude の外（このスクリプト）で回す。
# 判断待ち（🟣）の諮問だけはヘッドレスでは聞けないので、レビューに「諮問待ち」として残し、次の対話セッションで聞く。
#
# 人が作業する checkout には触らない。収集は使い捨ての worktree（.claude/worktrees/weekly-collect）、レビューは
# 専用の worktree（.claude/worktrees/weekly-review）を、毎回 origin/develop に合わせて使う（どちらも detached・lock 済み）。
# 収集を別にするのは、レビューが途中で落ちて worktree を残しても、翌週の収集を止めないため。
# レビュー・翌週計画・事業記録・点検・backlog 検証が develop で成立した場合だけ再生成しない。
# 失敗は automation-failure へ通知する。レビューは weekly-review-local、収集は weekly-collect（片方の成功でもう片方の赤を閉じない）。

set -euo pipefail

export PATH="$HOME/.local/bin:/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export LANG="ja_JP.UTF-8"
export LC_ALL="ja_JP.UTF-8"
export DOBOKU_PW_MIN_FREE_MB="${DOBOKU_PW_MIN_FREE_MB:-1024}"
unset DOBOKU_PW_ALLOW_PARALLEL
# User hold also applies to the SessionStart hook, before the agent reads its prompt.
export DOBOKU_SNS_PAUSED=1

REPO="${DOBOKU_WEEKLY_REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
REPO="$(cd "$REPO" && pwd -P)"
WT="$REPO/.claude/worktrees/weekly-review"
CWT="$REPO/.claude/worktrees/weekly-collect"
LOG_DIR="$HOME/Library/Logs/doboku-note"
LOG_FILE="$LOG_DIR/weekly-review.log"
# 6 時間を超えて前の回が動き続けていたら止まっているとみて知らせる（ロックが残ると以後の土曜が黙って飛ぶ）
STUCK_MINUTES=360
mkdir -p "$LOG_DIR"

{
  echo ""
  echo "=== $(date -Iseconds) [weekly-review] start ==="
} >> "$LOG_FILE"

week="未確定"
review="未確定"
review_rc=0
collect_rc=0

# A concurrent invocation must not reset the active dedicated worktree.
LOCK="$LOG_DIR/weekly-review.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  if [ -f "$LOCK/pid" ] && kill -0 "$(cat "$LOCK/pid")" 2>/dev/null; then
    echo "[weekly-review] already running pid=$(cat "$LOCK/pid")" >> "$LOG_FILE"
    if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +"$STUCK_MINUTES" 2>/dev/null)" ]; then
      (cd "$REPO" && node scripts/report-automation-failure.mjs --channel weekly-review-local --title "自動の週次レビューが ${STUCK_MINUTES} 分を超えて動き続けている" --body "前の回（pid $(cat "$LOCK/pid")）が終わらず、この回は始められなかった。ログ: ~/Library/Logs/doboku-note/weekly-review.log") >> "$LOG_FILE" 2>&1 || true
    fi
    exit 0
  fi
  rm -f "$LOCK/pid"
  rmdir "$LOCK"
  mkdir "$LOCK"
fi
echo "$$" > "$LOCK/pid"

notify() { # channel title rc label
  local body
  body="$(mktemp)"
  {
    echo "$week の${4}が完了しませんでした（rc=${3}）。"
    echo 'ログ: ~/Library/Logs/doboku-note/weekly-review.log'
    echo '再実行: npm run weekly-review:install -- --run-now'
    echo '```'
    tail -30 "$LOG_FILE" | sed 's/[[:cntrl:]]//g'
    echo '```'
  } > "$body"
  (cd "$REPO" && node scripts/report-automation-failure.mjs --channel "$1" --title "$2" --body-file "$body") >> "$LOG_FILE" 2>&1 || echo "[weekly-review] failure notification also failed ($1)" >> "$LOG_FILE"
  rm -f "$body"
}

finish() {
  local rc=$?
  trap - EXIT
  rm -f "$LOCK/pid"
  rmdir "$LOCK"
  # set -e で途中終了したときはレビューの失敗として扱う
  [ "$rc" -eq 0 ] || [ "$review_rc" -ne 0 ] || [ "$collect_rc" -ne 0 ] || review_rc=$rc
  if [ "$collect_rc" -eq 0 ]; then
    (cd "$REPO" && node scripts/report-automation-failure.mjs --resolve --channel weekly-collect --body "復旧: $week の土曜の収集（前・後）が合格") >> "$LOG_FILE" 2>&1 || true
  else
    notify weekly-collect "土曜の収集（ログインが要る取得と書き込み）が完了しませんでした" "$collect_rc" "土曜の収集"
  fi
  if [ "$review_rc" -eq 0 ]; then
    echo "=== $(date -Iseconds) [weekly-review] evidence complete ($review) ===" >> "$LOG_FILE"
    (cd "$REPO" && node scripts/report-automation-failure.mjs --resolve --channel weekly-review-local --body "復旧: $week の週次・対象月次のレビュー・計画・事業記録・点検・backlog 検証が develop で成立") >> "$LOG_FILE" 2>&1 || review_rc=1
  else
    echo "=== $(date -Iseconds) [weekly-review] FAILED rc=$review_rc ===" >> "$LOG_FILE"
    notify weekly-review-local "自動の週次レビューが完了しませんでした" "$review_rc" "自動週次レビュー"
  fi
  [ "$collect_rc" -eq 0 ] || echo "=== $(date -Iseconds) [weekly-collect] FAILED rc=$collect_rc ===" >> "$LOG_FILE"
  if [ "$review_rc" -ne 0 ]; then exit "$review_rc"; fi
  exit "$collect_rc"
}
trap finish EXIT
exec >> "$LOG_FILE" 2>&1
# The assertion lasts only while this invocation is alive; lid-close still yields measured inconclusive.
caffeinate -i -w "$$" &

link_deps() { # worktree
  [ -e "$1/node_modules" ] || [ -L "$1/node_modules" ] || ln -s "$REPO/node_modules" "$1/node_modules"
  [ -e "$1/.env.local" ] || [ -L "$1/.env.local" ] || ln -s "$REPO/.env.local" "$1/.env.local"
}

# 収集用 worktree を origin/develop に合わせる。前回の残り（未保存・未 push）は捨てずに退避してから戻す（翌週を止めない）
prepare_collect_worktree() {
  git -C "$REPO" fetch -q origin develop || return 1
  if ! git -C "$REPO" worktree list --porcelain | grep -x "worktree $CWT" > /dev/null; then
    git -C "$REPO" worktree prune || return 1
    git -C "$REPO" worktree add -q --detach "$CWT" origin/develop || return 1
    git -C "$REPO" worktree lock --reason "weekly-collect launchd routine" "$CWT" || return 1
  fi
  if [ -n "$(git -C "$CWT" status --porcelain)" ] || [ -n "$(git -C "$CWT" log --oneline origin/develop..HEAD)" ]; then
    local keep
    keep="$LOG_DIR/weekly-collect-leftover-$(date +%Y%m%dT%H%M%S)"
    mkdir -p "$keep"
    git -C "$CWT" -c core.quotepath=false status --porcelain > "$keep/status.txt"
    git -C "$CWT" diff > "$keep/diff.patch"
    git -C "$CWT" format-patch -q origin/develop..HEAD -o "$keep" > /dev/null 2>&1 || true
    git -C "$CWT" ls-files --others --exclude-standard -z | (cd "$CWT" && xargs -0 tar -czf "$keep/untracked.tgz") 2>/dev/null || true
    echo "[weekly-collect] 前回の残りを退避して origin/develop に戻す: $keep"
  fi
  git -C "$CWT" reset -q --hard origin/develop || return 1
  git -C "$CWT" clean -q -fd || return 1
  link_deps "$CWT"
  # pre-commit が読む生成物（git 追跡外）。無いと commit の瞬間に ENOENT で落ちる
  (cd "$CWT" && node .claude/scripts/build-doc-meta-index.mjs --ci > /dev/null) || return 1
}

collect_phase() { # pre|post
  local rc=0
  prepare_collect_worktree || rc=$?
  if [ "$rc" -eq 0 ]; then
    (cd "$CWT" && node scripts/weekly-collect.mjs --phase "$1") || rc=$?
  fi
  echo "[weekly-collect] --phase $1 rc=$rc"
  [ "$rc" -eq 0 ] || collect_rc=$rc
}

# set -e は `||` の中の関数では効かないので、各段の失敗を明示して返す
run_review() {
  git -C "$REPO" fetch -q origin develop || return 1
  if ! git -C "$REPO" worktree list --porcelain | grep -x "worktree $WT" > /dev/null; then
    git -C "$REPO" worktree prune || return 1
    git -C "$REPO" worktree add -q --detach "$WT" origin/develop || return 1
    git -C "$REPO" worktree lock --reason "weekly-review launchd routine" "$WT" || return 1
  fi
  if [ -n "$(git -C "$WT" status --porcelain)" ] || [ -n "$(git -C "$WT" log --oneline origin/develop..HEAD)" ]; then
    echo '[weekly-review] 前回の未保存変更・未 push commit がある。worktree を保持して停止'
    return 1
  fi
  git -C "$WT" reset -q --hard origin/develop || return 1
  link_deps "$WT"
  week="$(node -e "import('$WT/scripts/lib/review-week.mjs').then(m=>import('$WT/scripts/lib/jst-date.mjs').then(j=>console.log(m.reviewWeekOfDay(j.todayJst()))))")" || return 1
  review="docs/reviews/weekly/${week}-review.md"
  cd "$WT" || return 1
  local month weekly_needed=0 check_rc
  month="$(node scripts/check-monthly-review-due.mjs --ref origin/develop --due-key)" || return 1
  if node "$WT/scripts/check-weekly-review.mjs" --week "$week" --ref origin/develop; then
    echo "[weekly-review] $week の全成果物を確認。再生成しない"
  else
    check_rc=$?
    weekly_needed=1
    [ "$check_rc" -eq 1 ] || return "$check_rc"
  fi

  if [ "$weekly_needed" -eq 0 ] && [ -z "$month" ]; then
    echo '[monthly-review] 未実施・再確認日到来なし'
    return 0
  fi
  node .claude/scripts/build-doc-meta-index.mjs --ci > /dev/null || return 1
  if [ "$weekly_needed" -eq 1 ]; then
    # Same prerequisite as CI; 0 EPUBs must never be reported as a successful inspection.
    node scripts/asset-hydrate.mjs --group kindle-dist || return 1
    QUALITY_AUDIT_CONCURRENCY=2 node scripts/check-backlog-verify.mjs || return 1
    # 金曜の CI の下書きは土曜の収集より前の材料なので、収集の後に作り直す
    node scripts/build-weekly-review-draft.mjs || return 1
  fi
  local precheck_changes tasks="" prompt
  precheck_changes="$(git -c core.quotepath=false status --short)"
  [ "$weekly_needed" -eq 0 ] || tasks="/weekly-review ${week} と /plan-weekly を実行する。backlog 検証は直前の実行記録を読み、再実行は失敗・変更がある場合だけ。"
  if [ -n "$month" ]; then
    echo "[monthly-review] 自動起動: $month"
    tasks="$tasks
/monthly-review ${month} を実行する。対象は ${month} の暦月。既存記録を読み、再確認日到来の補完として最新証拠・欠測・判断を追記する。次回日を未来の日に定め、取得できない材料は理由と対応先を明示する。SNS 保留を優先する。"
  fi

  prompt="$(cat <<PROMPT
${tasks}

これは Mac の launchd から起動したヘッドレスの実行（scripts/scheduled/weekly-review.sh）で、作業場所は専用の worktree（detached HEAD・origin/develop）です。人は見ていません。次を守ってください。
- 最初に .claude/state/weekly-review/draft.json の markdown（土曜の収集の後に作り直した機械の節）を読み、無いか古ければ node scripts/build-weekly-review-draft.mjs --print で作り直す。数字は写し、転記し直さない。
- ログインが要る取得（ブラウザ・note/ココナラ/A8/KDP/GSC の画面）はしない。直前に土曜の収集（scripts/weekly-collect.mjs）が取った記録を読む。収集の段ごとの結果は .claude/state/weekly-collect/runs.json の最後の pre の回にある。失敗・skipped の段は理由とともに「未取得の材料」に書き、0 や成功に読み替えない。
- .claude/ の下のファイルは Claude Code の保護で書けない。書く必要があるファイル（翌週の .claude/todo/weekly.md・.claude/state/proofread-learnings/YYYY-MM-DD.md）は、.tmp/claude-out/ の下に同じ相対パスで書く（例: .tmp/claude-out/.claude/todo/weekly.md）。サブエージェント（todo-planner など）に書かせるときも、この置き場を指示する。これらは自分で commit しない（終了後にラッパーが写して commit する）。
- バックグラウンドの実行（Agent や Bash の run_in_background）は使わず、前景で終わるのを待つ。ScheduleWakeup は使えない。ターンを終えると実行が終わる。
- AskUserQuestion は使えない。判断待ち（🟣）の諮問は「## バックログの関門」に「諮問待ち（次の対話セッションで諮る）」として背景・選択肢・おすすめを 1 件ずつ書き、行頭に <!-- weekly-review:pending-questions --> を置く。台帳の 🟣 はそのまま残す。
- 現在の重点は2級土木とコンクリート主任技士のサイト・note教材。主任技士は8立場を維持する。EXP-014・015・016と docs/reviews/critical/2026-10-17-civil2-cce-content-quality.md の公開済み改善を読み、週次・月次の結果と次の一手へ引き継ぐ。POP画像だけをクリック減少の原因と断定しない。
- SNS はユーザー指示で保留中。X/Instagram/YouTube の公開・予約・追加投入・認証復旧・ブラウザによる取得は行わない。既存の保存データだけ参考にする。サイトと note 教材の改善を優先する。
- 外部への公開・投稿・送信・購入・価格変更・note やココナラの編集はしない。
- commit は変更したファイルだけを pathspec で指定し、git push origin HEAD:develop で積む（push が競合したら git pull --rebase origin develop してやり直す）。git reset・checkout・stash・force push はしない。
- quality:audit:ci・check-backlog-verify の再実行は終了を待ってから commit・rebase する。生成物の検査中に HEAD を動かすと検査不成立になる。
- 起動時の専用worktreeはcleanだった。以下は今回の前処理が生成した変更で、他人の変更ではない。レビューとともに各パスを明示して保存・pushし、git status --porcelainが空になるまで終えない（検査記録の時刻更新も対象）:
${precheck_changes}
- 週次が実行対象なら、レビューの保存後に /plan-weekly で来週の計画を .tmp/claude-out/.claude/todo/weekly.md に書く。月次だけの回では週間計画を再生成しない。
- 最後に node scripts/check-weekly-review.mjs --week ${week} を回す。週間計画はラッパーが写した後に成立するので、それ以外の欠けを補う。月次も対象なら node scripts/check-monthly-review-due.mjs --month ${month} が exit 0、同コマンドの --due-key が空になることを確かめる。既存 md だけで完了にしない。
- 最後に、作ったファイル・起票した DN・諮問待ちの件数・未取得の材料を 10 行以内で書いて終える。
PROMPT
)"
  rm -rf "$WT/.tmp/claude-out"
  # print モードは背景の作業を既定で 600 秒しか待たない（2026-10-24 はここで打ち切られた・DN-0829）。無期限にはしない
  CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=1800000 claude -p "$prompt" \
    --permission-mode acceptEdits \
    --allowedTools "Bash Read Write Edit Glob Grep Agent Skill TodoWrite" \
    --disallowedTools "ScheduleWakeup Bash(git reset:*) Bash(git checkout:*) Bash(git stash:*) Bash(git push --force:*) Bash(git push -f:*) Bash(gh pr merge:*) Bash(rm -rf:*)" || return $?
  # .tmp/claude-out/ の許可したファイル（週間計画など）を .claude/ へ写して commit・push する
  node scripts/apply-claude-out.mjs --commit || return $?
  git -C "$REPO" fetch -q origin develop || return 1
  if [ -n "$(git -C "$WT" status --porcelain)" ] || [ -n "$(git -C "$WT" log --oneline origin/develop..HEAD)" ]; then
    echo '[weekly-review] 今回の未保存変更・未 push commit が残る。次回起動を妨げるため完了としない'
    return 1
  fi
  node "$WT/scripts/check-weekly-review.mjs" --week "$week" --ref origin/develop || return $?

  if [ -n "$month" ]; then
    node "$WT/scripts/check-monthly-review-due.mjs" --month "$month" --ref origin/develop || return $?
    local remaining
    remaining="$(node "$WT/scripts/check-monthly-review-due.mjs" --ref origin/develop --due-key)" || return 1
    if [ -n "$remaining" ]; then echo "[monthly-review] 未完・再確認が残る: $remaining"; return 1; fi
    echo "[monthly-review] $month の develop 上の記録・点検・次回日を確認"
  fi
  return 0
}

collect_phase pre
run_review || review_rc=$?
cd "$REPO"
collect_phase post
