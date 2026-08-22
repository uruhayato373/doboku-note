# Codex × Claude Code の切り分け

**役割**: どの作業を Codex に投げ、どれを Claude Code に残すかの判断基準。運用上の印は backlog の `[Codex候補]` タグが担う（現在 12 件）。

> [!note] 2026-08-18 に `.claude/todo/codex-integration.md` から退避 <!-- doc-ref:ignore -->
> 旧メモは実行計画の中心を「このプロジェクト用 `AGENTS.md` を作成する」に置いていたが、**`AGENTS.md` は作られておらず**、実際の Codex は MCP ツール（`mcp__codex__codex`）として接続されている。前提にしていた「PR ベースの非同期フロー」とは別経路のため、計画部分は破棄し、いまも通用する切り分け原則だけを残した。`.claude/todo/` は annual/monthly/weekly/backlog の 4 層のみという宣言に戻すための移設でもある。

## 責任分界（役割で決める・モデル名で決めない）

| 担当 | 主責任 |
|---|---|
| **Codex** | 調査、設計、比較、受入条件の確定、実装指示書、実装後レビュー |
| **Claude Code** | コード・文書の実装、機械検証、外部連携を伴わないローカル反映、恒久 SSOT への抽出 |
| **ユーザー** | 方針決定、公開・課金・削除など重大操作の承認 |

> [!note] 2026-08-18 改定
> 旧版は「Codex が実装、Claude Code が戦略」を前提にしていたが、実運用は逆で定着した。
> 標準サイクルは [implementation-handoff.md](./implementation-handoff.md) が持つ。

例外はモデルの優劣ではなく、**スキル・MCP・外部ログインの要否**で判断する（下表）。

## Codex に向く作業

- 仕様が明確で、モデルの判断・曖昧さ解消が不要
- バルク・繰り返し・ファイル横断（10 本以上の一括処理）
- コードベース変更（リファクタリング・バグ修正・テスト追加）
- `.claude/` のスキル/エージェント/MCP が不要

## Claude Code に残す作業

- 対話・戦略立案・曖昧な要件の整理
- note / ココナラ / Brain の公開自動化（Playwright ＋ ログイン済みプロファイルが要る）
- スキル/エージェントを使う複合ワークフロー
- プロジェクト固有コンテキスト（CLAUDE.md・skills・agents）が深く必要
- hooks と連動した作業（SessionStart・PreToolUse 等）
- 判断を都度求めるタスク

## 作業別の目安

| 作業 | 担当 | 根拠 |
|---|---|---|
| MDX 記事バルク生成（仕様固定後） | Codex | 仕様明確・大量・差分で確認できる |
| コードリファクタリング | Codex | ファイル横断・レビューしやすい |
| テスト追加・lint 一括修正 | Codex | 機械的 |
| スクリプト新規作成 | Codex | コード生成に強い |
| note / SNS の公開自動化 | Claude Code | Playwright・MCP が要る |
| SNS コンテンツ生成 | Claude Code | 専用エージェント依存 |
| 戦略立案・週次 PDCA | Claude Code | 対話・判断が要る |
| キーワードページ執筆・品質評価 | Claude Code | Evaluator エージェント依存 |
| PDF→MDX 変換（視覚突合あり） | Claude Code | 原典 PDF 照合が要る |
| デプロイ・PR マージ | Claude Code | `/deploy` のユーザー確認フロー |

## 判断の原則

- 「Claude Code でできるなら Claude Code で」ではなく **「Codex が苦手なことだけ Claude Code で」**
- `.claude/` のスキル/エージェント/MCP は Claude Code の根幹 → 移植しない
- `develop` への直接 push・コミットは Claude Code が担当
- 迷ったら Claude Code（コンテキストロスが少ない）
