---
name: shared-worktree-autostash-hazard
description: 共有.gitのworktreeで git stash/checkout すると別セッションのautostashを自分の作業ツリーにpop→競合。worktreeはmain派生だとdevelopのnote-lint rule8/9欠落で重複作業リスク
metadata: 
  node_type: memory
  type: reference
  originSessionId: a1b5eb72-eece-47ae-bdfa-14c7b51dcf4f
---

複数worktreeが共有 `.git`（`.git/worktrees/<name>`）を持つ本プロジェクトでの、2026-07-15 に実際にぶつかった2つの非自明ハザード。[[session-start-git-sync]] [[feedback_parallel_agent_commit_sweep]] と同系統（§1/§10 の具体例）。

**1. `git stash` / `git checkout <other>` は別セッションの autostash を巻き込む**
- stash entry は共有 `.git` にグローバル保存される。別セッションの `rebase --autostash` 等が残した `stash@{0}: autostash` が存在する状態で、自分の worktree で（clean tree に対し無害のつもりで）`git stash` → `checkout origin/develop` → `checkout 戻る` → `git stash pop` すると、**その autostash（他人の textbook PNG 群等）が自分の作業ツリーに pop され binary CONFLICT**。
- 復旧: `reset --hard` は使わず（ユーザー拒否・§10）、混入は特定ディレクトリに限局するので `git -c core.quotepath=false checkout HEAD -- "<混入dir>/"` で外科的に戻す。**stash は drop せず温存**（所有セッション用）。pop はコンフリクト時 stash を保持するので list に残る。
- 教訓: worktree での状態確認に `git stash`/`checkout <branch>` を安易に使わない。ブランチ横断の中身確認は `git show <ref>:<path>` / `git diff <ref>` で済ませる（checkout 不要）。

**2. worktree の派生元が `main` だと develop の note ゲートを欠く→重複作業**
- 会社運用は content が `develop` に蓄積・`develop→main` は deploy 時のみ。worktree が `main`（deploy commit）派生だと `origin/develop` に十数コミット遅れ、**develop にある note-lint rule8（notePricing:free の200字段落BLOCK・`SKIP_NOTE_PARA`）/rule9（複数行blockquote BLOCK・`SKIP_NOTE_BQ`）・lib/note-cardify・段落バーンダウンを丸ごと欠く**。旧ゲートしか通らないコミットを量産し、並行セッションが develop で既に済ませた記事と重複・乖離した（一般部門との違い＝develop側が別 utmCampaign で完了済み）。
- 着手前チェック: note コンテンツ作業は `git rev-list --count HEAD..origin/develop` と `git merge-base HEAD origin/develop` で develop 基盤か確認。遅れていれば `git rebase --onto origin/develop <自分の最初のcommit^>` で載せ替え、develop 側が既に触ったファイルは競合時 `git rebase --skip`（develop 版採用）。段落標準は reflow `--target 120`（§14-e）で rule8(200) も自動充足。
