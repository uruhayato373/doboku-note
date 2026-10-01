---
name: commit-pipe-hides-failure
description: git commit を `| grep ✗` に通すと失敗が見えず、後続の worktree remove --force で staged の変更を失う。push 成功を確かめてから片付ける
metadata:
  type: feedback
---

`git commit ... 2>&1 | grep "✗"` はパイプの終了コードが grep のものになり、pre-commit が止めてもコマンド列が先へ進む。2026-09-27 に売上取り込み（sales-log.json）のコミットが check-backlog-schema で止まったまま、同じ行の `; git worktree remove --force` で作業ツリーを消した。`git add` 済みだったので `git fsck --unreachable` の dangling blob から取り戻せた（`git cat-file -p <blob> > file`）。

**Why:** grep で出力を絞ると、コミットの成否が見えない。`;` でつないだ後片付けは失敗でも走る。

**How to apply:** コミットの成否は `git log --oneline -1` で自分の件名が出るかで確かめる。worktree の削除は push 成功を確認した別のコマンドで行い、`&&` でつなぐ（`;` を使わない）。失ったら dangling blob を探す。関連: [[parallel-agent-commit-sweep]]
