---
name: feedback-git-add-verify-staged
description: git commit前に必ず git diff --cached --name-only で staged ファイル一覧を提示し、意図外ファイル巻き込みを防ぐ
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 84572e07-6463-486c-997d-79c070142da3
---

`git commit` を実行する前に、必ず以下を確認するルーチンを守る:

1. `git add` を明示パス指定で実行
2. **`git diff --cached --name-only` で staged ファイル一覧を表示**
3. ユーザーが意図したファイルだけが含まれているか目視確認
4. 想定外があれば `git restore --staged <file>` で外す
5. 確認後に `git commit`

**Why:**
2026-05-19、`docs/reference/*.md` 20件 + プラグインファイルの commit 作業で、明示パス指定で `git add` したにもかかわらず、`.local/r2/posts/.../r8-essay-theme-*/` 8件・`src/config/*.json` 5件・別途 `r8-essay-keyword-forecast/article.mdx` が同 commit に混入した（37 files / 13664 insertions）。原因未特定（PowerShell/Bash 経由のシェル解釈疑い、ディレクトリ末尾スラッシュ展開疑い）。push 済みのため force-push 回避で受容したが、コミットメッセージと実内容が乖離する事態に。

**How to apply:**
- 大規模 commit（5ファイル以上）・並行エージェント作業中・ディレクトリ単位 add（`path/to/dir/`）を含む場合は必ず staged 一覧確認を挟む
- 単一ファイル commit の場合は省略可
- CLAUDE.md §3「`git add` は変更したファイルだけ明示指定」の補強ルール
- 関連: [[feedback_parallel_agent_git]]（並行エージェント時の git checkout 復元禁止）
