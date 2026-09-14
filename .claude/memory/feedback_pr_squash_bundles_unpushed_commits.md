---
name: feedback_pr_squash_bundles_unpushed_commits
description: origin より先行したローカルdevelopからfeatureブランチを切ると、PR squashマージが未pushコミットを丸ごと巻き込む。分岐解消はreset --hardでなくmergeで
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 1c47cdf0-0a3c-40a5-a56e-dccbe0e1522a
---

ローカル develop が origin/develop より先行（未push commit あり）している状態で feature ブランチを切り PR を作ると、**squash マージが未push の全コミットを1つに圧縮して origin に載せる**（2026-06-03 PR #235：カード幅2ファイルのつもりが他セッションの content 11件＝69ファイル/3261行を巻き込み「カード幅修正」名でミスラベル squash）。

**Why:** 並行する別セッションが同一作業ツリーのローカル develop に commit を積むため、feature ブランチ作成時点で develop が origin より先行していることに気付きにくい。gh pr merge --squash は base(origin/develop) との全差分を1コミット化する。

**How to apply:**
- feature ブランチを切る前に `git rev-list --count origin/develop..develop` で先行数を確認。0でなければ未push commit が混入する。
- 分岐した develop の整合は **`git reset --hard` 禁止**（別セッションの未push commit・43行等を失う）。`git stash`→`git merge origin/develop`→`pop` で取り込む。マージ更新対象ファイルと未コミットファイルの重複を `comm -12` で事前検証してから実行。
- `gh pr merge` の「fatal: Not possible to fast-forward」は GitHub 側マージは成功していてローカル develop 更新だけ失敗のことがある。origin/develop を実査して判定。
- 本番昇格はローカルを触らず origin ref 同士の ff push（`git push origin <develop-sha>:refs/heads/main`、ff可能を merge-base で確認）。詳細は [[feedback_deploy_mechanics_parallel_safe]]、共有ツリー競合は [[feedback_shared_index_commit_safety]]。
