---
name: feedback_multi_session_concurrent_git
description: 複数Claudeセッションが同じワークツリー・.gitで並行commitするのが常態。reflog/develop/未コミットが自分の操作と無関係に動くのは正常、push前に巻き込み確認
metadata: 
  node_type: memory
  type: feedback
  originSessionId: bc74f5cc-13b7-4673-a77f-3e9e899572a2
---

doboku-note では**複数の Claude Code セッションが同じワークツリー・同じ `.git` で並行作業（commit 含む）するのが常態**（ユーザー確認済み 2026-06-11）。これを前提に、驚かず・事故らず動く。

**Why:** 2026-06-11、私が「並行エージェントの干渉」「私の操作」と二転三転して誤帰属した事象は、別セッションが同じ `.git` で commit していたのが真因と判明。決定的証拠＝私がターン間で完全停止していた 10:35:55 に develop が `eff5266c1`→`7d2e5b364`（道路R8予想の別セッション作業）に進んだ。Claude はターン間に一切実行しないので物理的に私ではない。`.git/logs/HEAD` は**その `.git` を使う全プロセスの HEAD 移動を混在記録**するため、`git reflog` に出ても自分が実行したとは限らない。

**How to apply:**
- **驚かない**: reflog・`develop` 先頭・未コミットファイル・ブランチが自分の操作と無関係に動くのは正常。原因究明は「自分のツール呼び出し履歴に該当 git コマンドがあるか」＋「committer 時刻が自分の操作時刻と一致するか」＋「`.git/logs/HEAD` の生ログ（`<old> <new> <committer> <email> <unix-ts> <tz>\t<msg>`）」で切り分ける。
- **push 前に必ず `git log origin/develop..HEAD`**: 自分以外のコミット（他セッション作業）が混ざっていれば認識・報告してから push（develop 共有ブランチの前進は正常。過去の「巻き込み push」＝別セッションがローカル develop を先に進め、私がその上に commit→push で全未push分が上がる、は git の正常動作）。
- **pathspec commit 厳守**: `git commit -- <pathspec>`。bare commit / `git add -A` 禁止。他セッションの未コミット変更・別テーマファイルは touch/`checkout` しない。`checkout -- <file>` での復元も自分の産物以外はしない。
- **ブランチ操作前に `git branch --show-current`**。checkout は最小限（往復が無関係ファイルの mtime/EOL を揺らし modified に見せる＝内容差分ゼロなら `numstat` 空で確認、`checkout --` で正規化可）。
- 真実源は CLAUDE.md §10。関連: [[feedback_shared_index_commit_safety]] [[feedback_parallel_agent_git]] [[feedback_pr_squash_bundles_unpushed_commits]]。
