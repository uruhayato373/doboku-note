---
name: feedback_session_start_git_sync
description: "着手前にgit fetchでorigin遅れ確認。未push先行のdevelopからPRを切らない・commitをgrepに通さない・worktree削除はpush確認後"
metadata:
  type: feedback
---

着手前に `git fetch -q origin && git log --oneline main..origin/main | head` で **origin との遅れ（behind）** を必ず確認する。ブランチ名の確認（CLAUDE.md 原則1）だけでは不十分。

**Why（遅れ）:** worktree 分離・複数セッション常態（commit `7cb6d655f`）＋ CI が deploy で main に自動マージするため、ローカル main が origin/main から数十コミット遅れるのが高頻度。2026-06-11、ローカル main が **43 コミット遅れ**（祖先 `adfbf02b4`）なのに pull せず作業し、origin が既に正しく完了していた「note 模範論文5マガジンの公開配線・R08二記事化」を古いツリー上で劣化版で重複させた。

**How to apply（遅れ）:** (1) 作業開始時、特に content/SoT 編集前に fetch + behind 確認。(2) 遅れていれば pull/reset で origin に追従してから着手（勝手な reset はユーザー確認後）。(3) **古いベース上のコミットを push しない**。(4) note の公開状態は origin/main の `note-magazines.ts` が真実源で、ローカルが古いと古い前提で誤判断する。

## 未push先行の develop から feature を切ると PR squash が巻き込む
ローカル develop が origin/develop より先行（未push commit）している状態で feature を切り PR を作ると、**squash マージが未push の全コミットを1つに圧縮して origin に載せる**（2026-06-03 PR #235: カード幅2ファイルのつもりが他セッションの content 11件＝69ファイル/3261行を「カード幅修正」名で squash）。
- feature を切る前に `git rev-list --count origin/develop..develop` で先行数を確認（0でなければ混入）。
- 分岐した develop の整合に **`git reset --hard` 禁止**（別セッションの未push commit を失う）。`git stash`→`git merge origin/develop`→`pop`（更新対象と未コミットの重複を `comm -12` で事前検証）。
- `gh pr merge` の「fatal: Not possible to fast-forward」は GitHub 側成功・ローカル更新だけ失敗のことがある。origin/develop を実査して判定。
- 本番昇格はローカルを触らず origin ref 同士の ff push（`git push origin <develop-sha>:refs/heads/main`、ff可能を merge-base で確認）。詳細は [[feedback_deploy_discipline]]、共有ツリー競合は [[feedback_multi_session_concurrent_git]]。

## commit を grep に通すと失敗が見えず、後片付けで作業を失う
`git commit ... 2>&1 | grep "✗"` はパイプの終了コードが grep のものになり、pre-commit が止めても先へ進む。2026-09-27、売上取り込み（sales-log.json）の commit が check-backlog-schema で止まったまま、同じ行の `; git worktree remove --force` で作業ツリーを消した。`git add` 済みだったので `git fsck --unreachable` の dangling blob から `git cat-file -p <blob> > file` で回復。
- commit の成否は `git log --oneline -1` で自分の件名が出るかで確かめる。
- worktree 削除は push 成功を確認した別コマンドで `&&` でつなぐ（`;` 禁止）。
