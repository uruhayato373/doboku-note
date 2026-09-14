---
name: reference_git_gc_concurrent_commit_corruption
description: git gc --prune=now の走行中に commit すると tree オブジェクトが欠損して破損する。gc は前景で完走させる
metadata: 
  node_type: memory
  type: reference
  originSessionId: 79005ff2-16cb-437e-9284-ce3988227180
  modified: 2026-07-27T01:04:15.511Z
---

このリポジトリで `git gc --prune=now` を**バックグラウンド実行したまま commit すると、その commit の tree オブジェクトが欠損して破損する**（2026-07-27 実際に発生）。`--expire now` は mtime の猶予期間を無効化するため、gc が到達可能性を走査した**後**に作られたオブジェクトが「到達不能」と誤判定されて即削除される、Git 公式が警告する競合そのもの。

**症状**: commit 自体は成功するが `fatal: unable to read tree <sha>` が出る。`git fsck` で `missing tree` / `broken link from tree` / `invalid sha1 pointer in cache-tree of .git/index`。`git ls-tree -r <commit>` が失敗する一方、親コミットと blob は無傷。

**復旧**（今回これで完全復旧・fsck クリーン）:
1. 走行中の `git gc` / `git prune` プロセスを kill（それ以上の削除を止める）
2. 編集済みファイルをスクラッチパッドへ退避（作業ツリーは無傷なので実体はここに残っている）
3. `git reset --mixed <親コミット>` — 作業ツリーは触らずブランチと index だけ戻す
4. 同じ内容で commit し直す → **欠損 tree が同一ハッシュで書き直され破損が解消する**
5. `git fsck` で clean を確認してから push

**予防**: gc は前景で完走させ、その間そのリポジトリで一切の git 操作をしない。10 GiB 級で数分〜十数分かかるので「待つのが面倒でバックグラウンド化」が事故の入口。並行セッションが常態のリポジトリでは、そもそも gc 実行前に他セッションの不在を確認する（[[feedback_multi_session_concurrent_git]]）。

**関連**: Bash ツール（Git Bash）で PowerShell の here-string `@'...'@` を使うと `@` がコミットメッセージに混入する。複数行メッセージは Write でファイル化して `git commit -F` を使う。
