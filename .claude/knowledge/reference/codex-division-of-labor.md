---
title: Codex と Claude Code の共同開発
---

# Codex と Claude Code の共同開発

## 担当は案件ごとに決める

通常の修正は、依頼を受けた AI が調査・実装・必要な検証・記録まで完結する。Codex を設計専任、Claude Code を実装専任にはしない。ユーザーが担当や分業を指定した場合はその指示に従う。

- 担当を選ぶ基準は、対象コードの理解、利用できる認証・ツール・端末、現在の作業範囲。AI 名で能力を固定しない。
- 別 AI への引き継ぎは、独立した大きな作業、別環境の認証が必要な作業、またはユーザー指定の分業で行う。手順は [implementation-handoff.md](./implementation-handoff.md)。
- 追加のレビューは複雑・重要な変更の論点に絞る。商品品質の writer / QA 分離と各スキルが定める検査は維持する。
- コミット・PR は担当 AI が行う。ブランチと公開の条件は CLAUDE.md と既存スキルに従う。
- backlog の `[Codex候補]` はバルク処理向きという補助タグで、担当予約ではない。

## 二重着手を防ぐ

同じ DN-ID の作業は [todo-lifecycle.md](./todo-lifecycle.md) の claim で担当を確保する。既に担当がいるタスクを別 AI が並行実装しない。複数セッションの変更は [workflows.md](./workflows.md) の worktree 運用で分離する。担当情報を別の Codex 用台帳へ複製しない。

引き継ぎ先は既存差分・コミット・検証結果を読む。対象の変更や未解決の失敗がなければ、同じ調査・検査を最初から繰り返さない。ただし commit・CI 等の既存ゲートは通す。

## 設定とデータは共用する

原本は `CLAUDE.md`、`.claude/rules/`、`.claude/skills/`、`.claude/agents/`、`.claude/settings.json`。Codex 用の `AGENTS.md`、`.agents/skills/`、`.codex/agents/`、`.codex/hooks.json` は `npm run sync-codex-compat` の生成物として扱う。

AGENTS.md は共通規約と領域ルールの参照索引を持つ。Codex は対象ファイルを扱う前に一致するルール原本を読み、スキルも入口から原本を読む。認証・実行環境の差は端末設定に留め、記事・計測・タスク・判断を AI ごとにコピーしない。
