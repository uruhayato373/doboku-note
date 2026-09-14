---
name: reference_gmail_mcp_only
description: Gmail は MCP コネクタでのみ読める（Playwright は自動化検知でブロック）。接続先は uruhayato373 の1アカウントだけで、0 件は「メールが無い」ではなく「その宛先が見えていない」
metadata: 
  node_type: memory
  type: reference
  originSessionId: 24047f27-ed05-447b-97a8-49f304723308
  modified: 2026-08-17T04:39:03.716Z
---

**Gmail を Playwright で開くことはできない。** ログイン済み永続プロファイル（`.local/playwright-note-profile`）で
`mail.google.com` を開いても Google の自動化検知で `title=ブロックされました。` が返り、本文は1通も取れない
（2026-08-17 実測）。プロファイルを足しても解決しない。

**読む経路は Gmail MCP コネクタだけ**（`search_threads` / `get_thread`。ツール名は `mcp__<id>__*` で
セッションごとに ID が変わるので ToolSearch で引く）。`in:anywhere` + `includeTrash` で迷惑メール・ゴミ箱も入る。

**最大の罠＝接続先は `uruhayato373 の Gmail` の1アカウントのみ。**
プラットフォームの運用通知は別アドレスに届くことがあり、その場合 MCP では**原理的に**見えない:

- ココナラの取引通知・評価依頼・**運営からの出品取り下げ通知** → `dobokunotecom の Gmail`（出品アカウント登録先）
  のみ。2026-08-12 の 4テーマ版 取り下げは Gmail 全期間・迷惑メール含めて 0 件で、実体はココナラの**メッセージ**にあった
- Brain（brain-market）→ `brain-market` で全期間検索して 0 件（2026-08-17）＝この Gmail は通知先でない公算

したがって **MCP の 0 件を「メールが来ていない」と報告しない**（[[feedback_gate_zero_coverage_false_pass]] のメール版）。
宛先アカウントを先に確かめ、重要通知は**サービス側の実体**（ココナラのメッセージ、Brain のマイページ、
`npm run coconala-orders`）で確認する。

**公開ツールの範囲**（2026-08-17 実測・Claude Code セッション）: 読み取り（`search_threads`/`get_thread`/
`get_message`）・ラベル（`create_label`/`label_thread`）・下書き/返信系は使える。**`create_filter` /
`list_filters` は claude.ai のコネクタ画面には載っているがセッションに公開されていない**（`select:` 指定でも
解決しない）＝**フィルタ作成は人が Gmail UI でやる**。

リポジトリ側 SSOT: `.claude/knowledge/reference/playwright-auth-profiles.md`「Gmail は Playwright の対象外」、
`coconala-operations.md` §3-1。
