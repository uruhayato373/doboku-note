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
# 今週のレビューが develop に既にあれば何もしない（人が先に回した週・2 回目の起動）。
# 終わったら develop に今週のレビューがあるかを確かめ、無ければ automation-failure Issue（channel: weekly-review-local）。

set -euo pipefail

export PATH="/opt/homebrew/opt/node@20/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export LANG="ja_JP.UTF-8"
export LC_ALL="ja_JP.UTF-8"
export DOBOKU_PW_MIN_FREE_MB="${DOBOKU_PW_MIN_FREE_MB:-1024}"
export DOBOKU_PW_ALLOW_PARALLEL=1

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WT="$REPO/.claude/worktrees/weekly-review"
LOG_DIR="$HOME/Library/Logs/doboku-note"
LOG_FILE="$LOG_DIR/weekly-review.log"
mkdir -p "$LOG_DIR"

{
  echo ""
  echo "=== $(date -Iseconds) [weekly-review] start ==="
} >> "$LOG_FILE"

week="$(node -e "import('$REPO/scripts/lib/business-direction.mjs').then(m=>import('$REPO/scripts/lib/jst-date.mjs').then(j=>console.log(m.isoWeekKey(j.todayJst()))))")"
review="docs/reviews/weekly/${week}-review.md"

rc=0
{
  git -C "$REPO" fetch -q origin develop
  if git -C "$REPO" cat-file -e "origin/develop:$review" 2>/dev/null; then
    echo "[weekly-review] $review は develop に既にある。何もしない"
    exit 0
  fi
  if ! git -C "$REPO" worktree list --porcelain | grep -qx "worktree $WT"; then
    git -C "$REPO" worktree prune
    git -C "$REPO" worktree add -q --detach "$WT" origin/develop
    git -C "$REPO" worktree lock --reason "weekly-review launchd routine" "$WT"
  fi
  git -C "$WT" reset -q --hard origin/develop
  [ -e "$WT/node_modules" ] || ln -s "$REPO/node_modules" "$WT/node_modules"
  [ -e "$WT/.env.local" ] || ln -s "$REPO/.env.local" "$WT/.env.local"
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
- 最後に、作ったファイル・起票した DN・諮問待ちの件数・未取得の材料を 10 行以内で書いて終える。
PROMPT
)"
  npx --yes @anthropic-ai/claude-code -p "$prompt" \
    --permission-mode acceptEdits \
    --allowedTools "Bash Read Write Edit Glob Grep Agent Skill TodoWrite" \
    --disallowedTools "Bash(git reset:*) Bash(git checkout:*) Bash(git stash:*) Bash(git push --force:*) Bash(git push -f:*) Bash(gh pr merge:*) Bash(rm -rf:*)"
} >> "$LOG_FILE" 2>&1 || rc=$?

# 成否は終了コードでなく develop の実体で見る（偽の完了を「完了」と呼ばない）
git -C "$REPO" fetch -q origin develop || true
run_url="Mac launchd（ログ: ~/Library/Logs/doboku-note/weekly-review.log）"
if git -C "$REPO" cat-file -e "origin/develop:$review" 2>/dev/null; then
  echo "=== $(date -Iseconds) [weekly-review] ok ($review) ===" >> "$LOG_FILE"
  (cd "$REPO" && node scripts/report-automation-failure.mjs --resolve --channel weekly-review-local --body "復旧: $review が develop にある（$run_url）") >> "$LOG_FILE" 2>&1 || true
  exit 0
fi
echo "=== $(date -Iseconds) [weekly-review] FAILED rc=${rc}（$review が develop に無い）===" >> "$LOG_FILE"
body="$(mktemp)"
{
  echo "土曜の自動の週次レビュー（Mac launchd）で $review が develop に入りませんでした（rc=${rc}）。"
  echo ""
  echo "- ログ: ~/Library/Logs/doboku-note/weekly-review.log の末尾"
  echo "- 手で回す: 対話セッションで /weekly-review、または npm run weekly-review:install -- --run-now"
  echo ""
  echo '```'
  tail -30 "$LOG_FILE" | sed 's/[[:cntrl:]]//g'
  echo '```'
} > "$body"
(cd "$REPO" && node scripts/report-automation-failure.mjs --channel weekly-review-local --title "土曜の自動の週次レビューが完了しませんでした" --body-file "$body") >> "$LOG_FILE" 2>&1 || true
rm -f "$body"
exit 1
