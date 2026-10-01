---
name: agent-bash-permission
description: サブエージェントはBashツールが使えない。PDF抽出等は事前にメインで実行してテキストファイルを渡す必要がある
type: feedback
---

サブエージェント（Agent ツール）は Bash ツールの実行権限を持たない（bypassPermissions モードでも拒否される）。

**Why:** settings.local.json の permissions.allow はメインプロセスにのみ適用される。サブエージェントは独立した権限コンテキストで動作するため、Bash コマンド（pdftotext, pdftoppm 等）を実行できない。

**How to apply:** PDF→MDX変換などBashコマンドが必要なタスクでは、メインプロセスでテキスト抽出を先に行い、結果をテキストファイルとして `/tmp/` に保存してからサブエージェントに渡す。サブエージェントには Read + Write のみで完結するタスクを委譲する。
