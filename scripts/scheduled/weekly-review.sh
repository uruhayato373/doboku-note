#!/bin/bash
# launchd から毎週土曜 9:30 と、ログイン・起動のたび（RunAtLoad）に呼ばれるラッパー（com.doboku-note.weekly-review）。名前は登録済みの launchd に合わせて残している。
# 土曜の開始時刻から日曜の間だけ、収集の記録から今週まだ終わっていない範囲（全部・後段だけ・なし）を決めて回す（再起動で途中終了した回の回し直し・DN-1196）。
#   1. 土曜の収集（前）: ログインが要る取得と、その検算・note の公開状態の照合を scripts/weekly-collect.mjs --phase pre で回す（DN-0817・DN-0819・DN-0847）
#   2. GSC の記録層: 要るときだけヘッドレスの Claude に週次観測・coverage の断片を書かせ、scripts/apply-gsc-records.mjs が
#      gsc-management.md へ追記して push する（旧 gsc-auto-review.yml・CI の中の Claude をやめて土曜へ寄せた・DN-0849）
#   3. 土曜の収集（後）: 時間がかかる照合と note への書き込みを --phase post で回す
# 導入・状態確認・即実行・解除: npm run weekly-review:install [-- --status|--run-now|--uninstall]
#
# 週次レビュー（/weekly-review・/plan-weekly・/monthly-review）はここで回さない（2026-11-08 にヘッドレスの実行をやめた。画面のない実行は
# 落ちても気づかれなかった）。週次は 2026-11-14 から Claude デスクトップアプリのスケジュール済みタスクが土曜 13:10 に回す。
# 未作成の週はセッション開始時に check-weekly-review-due が 1 行で知らせる。
#
# なぜ収集を Mac で回すか: クラウドルーティンはサンドボックスで .claude/ への書き込みが止まり、Playwright・ログインの要る
# 検査も回せず退役した（memory feedback_cloud_routines_minimized）。Mac にはログイン済みのプロファイルとキーチェーンがある。
# ログインが要る処理はこの 1 本にまとめ、CI と他のセッションはログインしない（記録を読む・DN-0817）。
# Claude Code の中（CLAUDECODE=1）では資格情報が読めないので、収集は Claude の外（このスクリプト）で回す。
#
# 人が作業する checkout には触らない。自動実行用の worktree（.claude/worktrees/weekly-collect・detached・lock 済み）を
# 毎回 origin/develop に合わせて使う。毎日の GSC の登録（gsc-indexing-daily.sh）も同じ worktree を使う。
# 失敗は automation-failure へ通知する（収集は weekly-collect、GSC の記録層は gsc-auto-review）。

set -euo pipefail

export PATH="$HOME/.local/bin:/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export LANG="ja_JP.UTF-8"
export LC_ALL="ja_JP.UTF-8"
export DOBOKU_PW_MIN_FREE_MB="${DOBOKU_PW_MIN_FREE_MB:-1024}"
unset DOBOKU_PW_ALLOW_PARALLEL

# launchd の処理は、Google Drive の未ダウンロードのファイルの取り寄せが既定で禁止される（iopolicy の
# materialize dataless files が 1=OFF。対話セッションは 2=ON）。禁止のままだと Drive の読みが EDEADLK
# （node は Unknown system error -11）で落ち、note 同期の配布 PDF とカバーの保存が毎週失敗した（2026-10-31〜11-14）。
# 設定は子プロセスへ引き継がれるので、最初に許可へ切り替えて自分を起動し直す。python3 が無ければ切り替えずに進む。
# あわせて /bin/bash と node の実体にフルディスクアクセスが要る（無いと open が Operation not permitted）。
# macOS だけで切り替える（CI の Linux には libSystem が無い）。切り替えに失敗しても、必ず元のスクリプトへ戻る。
if [ -z "${DOBOKU_DATALESS_ON:-}" ] && [ "$(uname)" = "Darwin" ] && [ -x /usr/bin/python3 ]; then
  export DOBOKU_DATALESS_ON=1
  exec /usr/bin/python3 -c 'import os, sys
try:
    import ctypes
    ctypes.CDLL("/usr/lib/libSystem.B.dylib").setiopolicy_np(3, 0, 2)
except Exception:
    pass
os.execv("/bin/bash", ["/bin/bash"] + sys.argv[1:])' "$0" "$@"
fi
# X was resumed on 2026-11-12 (DN-1159), so the SessionStart x-sync runs again. Instagram stays on hold
# but has no SessionStart check. To hold SNS again, export DOBOKU_SNS_PAUSED=1 here.

REPO="${DOBOKU_WEEKLY_REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
REPO="$(cd "$REPO" && pwd -P)"
CWT="$REPO/.claude/worktrees/weekly-collect"
LOG_DIR="$HOME/Library/Logs/doboku-note"
LOG_FILE="$LOG_DIR/weekly-review.log"
# 6 時間を超えて前の回が動き続けていたら止まっているとみて知らせる（ロックが残ると以後の土曜が黙って飛ぶ）
STUCK_MINUTES=360
mkdir -p "$LOG_DIR"

# launchd は定刻（土曜 9:30）に加えて、ログイン・起動のたびにもここを起動する（RunAtLoad）。再起動で途中終了した収集を
# 回し直すため（2026-11-14 は Mac の再起動で後段が消えた）。土曜の開始時刻から日曜の終わり以外は、何も触らずに終わる。
# 運営者の「今すぐ実行」（npm run weekly-review:install -- --run-now）は印のファイルを置いてから起動する。印があれば曜日を問わず、
# 今週の収集が済んでいても最初から回す。
FORCE_FILE="$LOG_DIR/weekly-review.force"
force="${DOBOKU_WEEKLY_FORCE:-0}"
if [ -f "$FORCE_FILE" ]; then force=1; rm -f "$FORCE_FILE"; fi
if [ "$force" != "1" ] && [ "${DOBOKU_WEEKLY_SKIP_DAY_GATE:-0}" != "1" ]; then
  dow="$(date +%u)"
  if [ "$dow" != "6" ] && [ "$dow" != "7" ]; then exit 0; fi
  if [ "$dow" = "6" ] && [ "$(date +%H%M)" -lt "0930" ]; then exit 0; fi
fi

{
  echo ""
  echo "=== $(date -Iseconds) [weekly-review] start ==="
} >> "$LOG_FILE"

week="$(date +%G-W%V)"
collect_rc=0
gsc_rc=0
# 回す範囲が無い（今週の収集は済んでいる）ときは、失敗の通知も復旧の通知も出さずにロックだけ外す
quiet_exit=0
# 同じ週に収集を起動してよい回数（定刻 1 回 + 回し直し 2 回）。収集そのものが Mac を固まらせるときに、起動のたびに回し続けない
MAX_ATTEMPTS=3

# A concurrent invocation must not reset the active worktree. gsc-indexing-daily.sh も同じロックを見て譲る
LOCK="$LOG_DIR/weekly-review.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  if [ -f "$LOCK/pid" ] && kill -0 "$(cat "$LOCK/pid")" 2>/dev/null; then
    echo "[weekly-review] already running pid=$(cat "$LOCK/pid")" >> "$LOG_FILE"
    if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +"$STUCK_MINUTES" 2>/dev/null)" ]; then
      (cd "$REPO" && node scripts/report-automation-failure.mjs --channel weekly-collect --key saturday-mac-run --title "土曜の収集が ${STUCK_MINUTES} 分を超えて動き続けている" --body "前の回（pid $(cat "$LOCK/pid")）が終わらず、この回は始められなかった。ログ: ~/Library/Logs/doboku-note/weekly-review.log") >> "$LOG_FILE" 2>&1 || true
    fi
    exit 0
  fi
  rm -f "$LOCK/pid"
  rmdir "$LOCK"
  mkdir "$LOCK"
fi
echo "$$" > "$LOCK/pid"

# 土曜の収集と GSC の記録層は同じ Mac の同じ回で動くので、片方が落ちると両方の見張りが赤くなりやすい。
# 根本原因の鍵で 1 件の Issue にまとめる（DN-0935）。両方が合格した回だけ鍵の Issue を閉じる
KEY=saturday-mac-run

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
  (cd "$REPO" && node scripts/report-automation-failure.mjs --channel "$1" --key "$KEY" --title "$2" --body-file "$body") >> "$LOG_FILE" 2>&1 || echo "[weekly-review] failure notification also failed ($1)" >> "$LOG_FILE"
  rm -f "$body"
}

finish() {
  local rc=$?
  trap - EXIT
  rm -f "$LOCK/pid"
  rmdir "$LOCK"
  if [ "$quiet_exit" -eq 1 ]; then return 0; fi
  # set -e で途中終了したときは収集の失敗として扱う
  [ "$rc" -eq 0 ] || [ "$collect_rc" -ne 0 ] || [ "$gsc_rc" -ne 0 ] || collect_rc=$rc
  if [ "$collect_rc" -eq 0 ]; then
    (cd "$REPO" && node scripts/report-automation-failure.mjs --resolve --channel weekly-collect --body "復旧: $week の土曜の収集（前・後）が合格") >> "$LOG_FILE" 2>&1 || true
    if [ "$gsc_rc" -eq 0 ]; then
      (cd "$REPO" && node scripts/report-automation-failure.mjs --resolve --channel weekly-collect --key "$KEY" --body "復旧: $week の土曜の収集と GSC の記録層がどちらも合格") >> "$LOG_FILE" 2>&1 || true
    fi
  else
    echo "=== $(date -Iseconds) [weekly-collect] FAILED rc=$collect_rc ===" >> "$LOG_FILE"
    notify weekly-collect "土曜の収集（ログインが要る取得と書き込み）が完了しませんでした" "$collect_rc" "土曜の収集"
  fi
  # GSC の記録層の失敗は channel gsc-auto-review。復旧は月曜の weekly-review-guard が記録の鮮度で閉じる
  #（ここで閉じると、Claude が同じ channel に出した異常の報告まで閉じてしまう）
  if [ "$gsc_rc" -ne 0 ]; then
    echo "=== $(date -Iseconds) [gsc-record] FAILED rc=$gsc_rc ===" >> "$LOG_FILE"
    notify gsc-auto-review "土曜の GSC の記録層（週次観測・coverage）が完了しませんでした" "$gsc_rc" "GSC の記録層"
  fi
  if [ "$collect_rc" -ne 0 ]; then
    echo "=== $(date -Iseconds) [weekly-review] FAILED rc=$collect_rc ===" >> "$LOG_FILE"
    exit "$collect_rc"
  fi
  if [ "$gsc_rc" -ne 0 ]; then
    echo "=== $(date -Iseconds) [weekly-review] FAILED rc=$gsc_rc ===" >> "$LOG_FILE"
    exit "$gsc_rc"
  fi
  echo "=== $(date -Iseconds) [weekly-review] ok ($week の収集と GSC の記録層) ===" >> "$LOG_FILE"
  exit 0
}
trap finish EXIT
exec >> "$LOG_FILE" 2>&1
# The assertion lasts only while this invocation is alive; lid-close still yields measured inconclusive.
caffeinate -i -w "$$" &

link_deps() { # worktree
  [ -e "$1/node_modules" ] || [ -L "$1/node_modules" ] || ln -s "$REPO/node_modules" "$1/node_modules"
  [ -e "$1/.env.local" ] || [ -L "$1/.env.local" ] || ln -s "$REPO/.env.local" "$1/.env.local"
}

# 自動実行用の worktree を origin/develop に合わせる。前回の残り（未保存・未 push）は捨てずに退避してから戻す（翌週を止めない）
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

# GSC の記録層（DN-0849）。失敗しても worktree の残りを退避して戻し、この後の収集を止めない
run_gsc_record() {
  prepare_collect_worktree || return $?
  cd "$CWT" || return 1
  # 実行前のゲートは worktree の外に置く（worktree を汚すと、記録の検査が「未保存の変更」を拾う）
  local gates
  gates="$(mktemp)"
  node scripts/check-gsc-auto-review.mjs --json > "$gates" || true
  local need_rc=0
  node scripts/apply-gsc-records.mjs --needed --before "$gates" || need_rc=$?
  if [ "$need_rc" -eq 3 ]; then echo '[gsc-record] 週次・coverage とも記録済みか、データが古い。Claude は回さない'; rm -f "$gates"; return 0; fi
  [ "$need_rc" -eq 0 ] || { rm -f "$gates"; return "$need_rc"; }
  local rc=0
  rm -rf .tmp/claude-out/gsc && mkdir -p .tmp/claude-out/gsc
  CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=1800000 claude -p "$(cat scripts/scheduled/gsc-record-prompt.md)" \
    --permission-mode acceptEdits \
    --allowedTools "Bash Read Write Edit Glob Grep Agent" \
    --disallowedTools "ScheduleWakeup Bash(git commit:*) Bash(git push:*) Bash(git reset:*) Bash(git checkout:*) Bash(git stash:*) Bash(rm -rf:*)" || rc=$?
  [ "$rc" -ne 0 ] || node scripts/apply-gsc-records.mjs --before "$gates" || rc=$?
  rm -f "$gates"
  [ "$rc" -ne 0 ] || rm -rf .tmp/claude-out/gsc
  git -C "$REPO" fetch -q origin develop || true
  if [ -n "$(git -C "$CWT" status --porcelain)" ] || [ -n "$(git -C "$CWT" log --oneline origin/develop..HEAD)" ]; then
    local keep
    keep="$LOG_DIR/gsc-record-leftover-$(date +%Y%m%dT%H%M%S)"
    mkdir -p "$keep"
    git -C "$CWT" -c core.quotepath=false status --porcelain > "$keep/status.txt"
    git -C "$CWT" diff > "$keep/diff.patch"
    git -C "$CWT" format-patch -q origin/develop..HEAD -o "$keep" > /dev/null 2>&1 || true
    echo "[gsc-record] 残りを退避して origin/develop に戻す（収集を止めない）: $keep"
    git -C "$CWT" reset -q --hard origin/develop
    git -C "$CWT" clean -q -fd
    [ "$rc" -ne 0 ] || rc=1
  fi
  return "$rc"
}

# いま回す範囲（all・post・none）を、収集の記録（runs.json）から決める
prepare_collect_worktree || { echo "[weekly-collect] worktree を用意できない"; collect_rc=1; exit 1; }
plan="$(cd "$CWT" && node scripts/weekly-collect.mjs --resume-plan)" || plan=""
if [ "$force" = "1" ] && [ "$plan" = "none" ]; then plan="all"; fi
case "$plan" in
  all|post) ;;
  none) echo "[weekly-collect] 今週の収集は済んでいる（回し直しなし）"; quiet_exit=1; exit 0 ;;
  *) echo "[weekly-collect] 回す範囲を決められない（--resume-plan の出力: ${plan:-空}）"; collect_rc=1; exit 1 ;;
esac
attempts_file="$LOG_DIR/weekly-collect-attempts-$week"
attempts=$(( $(cat "$attempts_file" 2>/dev/null || echo 0) + 1 ))
find "$LOG_DIR" -maxdepth 1 -name 'weekly-collect-attempts-*' -mtime +30 -delete 2>/dev/null || true
if [ "$force" != "1" ] && [ "$attempts" -gt "$MAX_ATTEMPTS" ]; then
  echo "[weekly-collect] 今週は ${MAX_ATTEMPTS} 回起動して終わらなかったので、これ以上は回さない（範囲: ${plan}）"
  quiet_exit=1
  (cd "$REPO" && node scripts/report-automation-failure.mjs --channel weekly-collect --key saturday-mac-retries --title "土曜の収集が ${MAX_ATTEMPTS} 回起動しても終わらない" --body "$week の収集（範囲 ${plan}）が終わらないまま ${MAX_ATTEMPTS} 回起動した。Mac が途中で再起動していないか（メモリ不足）を確かめる。ログ: ~/Library/Logs/doboku-note/weekly-review.log") || true
  exit 0
fi
echo "$attempts" > "$attempts_file"
echo "[weekly-collect] 範囲: ${plan}（今週 $attempts 回目の起動）"

if [ "$plan" = "all" ]; then
  collect_phase pre
  run_gsc_record || gsc_rc=$?
  cd "$REPO"
fi
collect_phase post
