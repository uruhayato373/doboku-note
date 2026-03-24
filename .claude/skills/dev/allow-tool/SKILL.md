---
name: allow-tool
description: ツール許可プロンプトが出たとき、そのツールパターンを settings.local.json に追加して今後の確認をスキップする
user-invocable: true
argument-hint: "[tool-pattern]"
---

## 用途

Claude Code でツール使用の確認（yes/no）が求められたとき、そのツールパターンを `.claude/settings.local.json` の `permissions.allow` に追加し、以後の確認をスキップする。

## 引数

- `$ARGUMENTS`: 追加したいツールパターン（例: `Bash(docker *)`, `Bash(curl:*)`）
  - 省略時: 直前にブロックされたツールを推測して追加

## 手順

1. `.claude/settings.local.json` を Read で読み込む
2. `permissions.allow` 配列に同じパターンが既にあるかチェック
3. なければパターンを追加して Write で保存
4. 追加したパターンをユーザーに報告

## パターンの書き方

| パターン | 意味 |
|----------|------|
| `Bash(npm run:*)` | `npm run` で始まるコマンド |
| `Bash(docker *)` | `docker` で始まるコマンド |
| `Bash(for *)` | `for` ループ |
| `Read` | Read ツール全般 |
| `WebFetch(domain:example.com)` | 特定ドメインへの WebFetch |

## 注意

- セキュリティに影響するパターン（`Bash(rm -rf *)`, `Bash(sudo *)` 等）は追加前に警告する
- 設定ファイルのパスは `/Users/minamidaisuke/doboku-note/.claude/settings.local.json`
