---
name: parallel-agent-commit-sweep
description: 並行エージェント運用中は他エージェントの commit が自分のファイルを sweep する前提で動く。重要ファイルは編集即 commit
type: feedback
originSessionId: ff31ba36-e9f0-4350-8883-c122b9d08206
---
複数のエージェント（別ターミナル・別セッション）が同じリポジトリで並行作業しているとき、**他エージェントが `git add -A` / `git add .` を実行すると、自分が編集中・staging 待ちのファイルも一緒に commit される**。コミットメッセージは他エージェントの作業内容で書かれるため、自分の作業の追跡性が失われる。

**Why:** 2026-04-29 SNS 画像生成セッションで実例発生。
- 自分が SNS 画像 140 ファイル（70 PNG + 70 SVG）を生成して staging
- 並行で動いていた別エージェントが `note-drafts/90 番` の編集後 `git add -A` 相当で commit
- 結果: commit `35d3edb3` のメッセージが「90 番ドラフト 引っかけパターン例に過去問アンカーリンク追加」になり、その中に SNS 画像 140 ファイルが含まれてしまった
- ファイル自体は無事だが「いつ・誰が・なぜ作ったか」が log から追えなくなった

CLAUDE.md には既に「`git add` で明示パス指定、`git add -A` 禁止」と書いてあるが、別エージェントセッションがそれを守っているかは制御不能。**自分の作業を守るには「先に commit してしまう」しかない**。

**How to apply:**
- **重要ファイルは作成・編集後 5 分以内に commit する**（次のタスクに移る前に必ず）
- 大量ファイル生成の作業（画像バッチ・コンテンツ大量生成）では、最後にまとめてではなく、**生成完了直後に即 commit**
- 並行作業中だと察知したら（`git status` で想定外のファイルが見える等）、自分の作業範囲だけを `git add <specific-paths>` で先に commit する
- 自分が編集してない他エージェントのファイルが staging に紛れている場合は、`git restore --staged <他のファイル>` で外してから commit
- コミットメッセージで作業を追跡できなくなった場合は、後追いで「empty commit + メッセージ」で記録を残す（`git commit --allow-empty -m "...説明..."`）
- **`git add -A` だけでなく `git commit`（pathspec 無し）も巻き込む**（2026-06-25 実例）: 自分が `git add <自分のファイル>` で明示ステージしても、index に**既に別セッションが stage 済みの変更**があると、pathspec 無し `git commit` がそれら全部を巻き込む。対策＝`git commit -- <pathspec>`（`-m` は `--` の前）。さらに別セッションがブランチを切替えている可能性があるので **commit 前に `git branch --show-current` を確認**。最も安全なのは **develop を別 worktree に分離**（`git worktree add <dir> develop`→編集→pathspec commit→`push origin develop:develop`→`worktree remove`。worktree に node_modules/.local を symlink するとフック/ブラウザが動く）。symlink は worktree remove 前に `rm` で外す（ただし symlink は worktree remove が安全に外すので残っても実体は無事）。
- 関連: CLAUDE.md「並行エージェント作業時」セクション（`git checkout` で他エージェントのファイル消失事例も含む）・[[reference_ig_publish_reconcile]]
