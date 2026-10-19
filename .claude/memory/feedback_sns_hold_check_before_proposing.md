---
name: feedback-sns-hold-check-before-proposing
description: SNS（Instagram・X・YouTube の新規投稿・予約）のカードを提案・着手する前に、保留指示が出ていないか週次レビューとバックログで確かめる
metadata:
  node_type: memory
  type: feedback
  originSessionId: 82d78f64-8217-4608-b3d1-2f6bd2ae1642
  modified: 2026-10-19T19:14:43.479Z
---

2026-10-17 にユーザーが SNS の新規展開・追加予約を保留にした（W42 週次レビュー冒頭・backlog の保留条件に記録）。2026-10-20、期日だけを見て DN-0537（Instagram の予約補充）を「次にやること」に挙げ、Facebook ログインの復旧まで頼んでしまい、「インスタは一旦休止ではなかったのか」と指摘された。カード本文に保留が書かれていなかったのが原因の一つ（DN-0537 には追記済み）。

**Why:** 保留中の作業を勧めると、ユーザーに不要な操作（ログイン復旧など）を頼むことになり、方針への信頼を損なう。

**How to apply:** SNS 系のカード（領域:SNS・Instagram・X・YouTube の公開・予約）を候補に出す前に、最新の週次レビュー冒頭と `git grep -n "SNS.\{0,10\}保留" -- .claude/todo docs/reviews` で保留中かを確かめる。保留中なら候補から外し、外したことを一言添える。[[project-sns-v7-pivot]]
