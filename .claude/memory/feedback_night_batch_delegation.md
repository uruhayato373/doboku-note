---
name: night-batch-delegation
description: 夜間の一括消化でエージェントを回すときの規律（一時ファイル名・入れ子起動・develop直pushの品質ゲート・PR基準画像）
metadata:
  node_type: memory
  type: feedback
  originSessionId: a69c318a-3ff6-423a-9e9b-48232f26f5da
  modified: 2026-09-30T21:55:40.359Z
---

2026-09-30 夜にバックログ ABC を一括消化（エージェント約20体・PR 7本）した際の失敗と対処。

- develop 直 push のコンテンツが content-quality-ratchet（15-1 等）に触れ、以降の全 PR の CI を赤くした。**Why:** ラチェットが CI にしか無かった。**How to apply:** 2026-10-01 に pre-commit へ staged 版を追加済み（install-pre-commit.mjs・CI と同じく published: true だけ対象）。エージェントが付けた reviewStatus: verified はスキーマ外（needs-review/approved/rejected のみ）。PR が他人起因で赤いときは `gh pr update-branch` で develop の修正を取り込んでから再判定する。
- 並行エージェントがセッション共通 scratchpad に `edit.mjs` 等の汎用名で置き、互いに上書きした。**How to apply:** 委任文で一時ファイルは worktree 内 `.tmp/<担当>/` と指定する（workflows.md「同一ワークツリーで並行」）。
- 親エージェントが子を 3 体起動すると同時起動が §5 の上限を超える。**How to apply:** 委任文に「子は同時 2 体まで」と書く。
- 見た目が変わる PR の e2e visual 失敗は、失敗 run の `playwright-e2e-*` artifact の `*-actual.png` を基準画像名にコピーして commit する（`visual-snapshots-*` artifact は既存と同じで役に立たない）。diff 画像で意図どおりか確かめてから。

関連: [[parallel-agent-commit-sweep]] [[ai-transcribed-past-exams]]
