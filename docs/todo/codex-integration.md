# Codex × Claude Code 役割分担 方針メモ

**作成**: 2026-06-19  
**ステータス**: 方針検討中（すぐに着手しない）

---

## なぜ役割分担するか

- Codex はクラウドで非同期・自律実行 → 仕様が固まった作業を投げっぱなしにできる
- Claude Code はインタラクティブ + プロジェクト固有資産（スキル/エージェント/MCP/hooks）が強み
- 両者を適切に使い分けることで、ユーザーの判断コストと待ち時間を削減できる

---

## 基本的な切り分け原則

### Codex に向く作業

- 仕様が明確で、モデルの判断・曖昧さ解消が不要
- バルク・繰り返し・ファイル横断（10本以上の一括処理）
- コードベース変更（リファクタリング・バグ修正・テスト追加）
- PR ベースの非同期ワークフローで完結する
- `.claude/` スキル/エージェント/MCP が不要

### Claude Code に残す作業

- 対話・戦略立案・曖昧な要件の整理
- note 公開自動化（Playwright ＋ MCP 必須）
- スキル/エージェントを使う複合ワークフロー
- プロジェクト固有コンテキスト（CLAUDE.md・skills・agents）が深く必要
- hooks と連動した作業（SessionStart・PreToolUse 等）
- 判断を都度求めるタスク（ユーザーが確認しながら進めたい）

---

## 作業別の暫定マッピング

| 作業 | 担当（暫定） | 根拠 |
|---|---|---|
| MDX 記事バルク生成（仕様固定後） | Codex | 仕様明確・大量・PR で確認可 |
| コードリファクタリング | Codex | ファイル横断・PR ベースで安全 |
| テスト追加・lint 一括修正 | Codex | 機械的・PR で差分レビューできる |
| スクリプト新規作成 | Codex | コード生成に強い |
| note 公開自動化（Playwright） | Claude Code | MCP/Playwright 必須 |
| SNS コンテンツ生成 | Claude Code | ig-carousel-writer 等エージェント依存 |
| 戦略立案・計画・週次 PDCA | Claude Code | 対話・判断必須 |
| キーワードページ執筆・品質評価 | Claude Code | cem-qa/past-exam-qa 等エージェント依存 |
| PDF→MDX 変換（視覚突合あり） | Claude Code | 原典 PDF 照合・判断が必要 |
| デプロイ・PR マージ | Claude Code | `/deploy` スキル・ユーザー確認フロー |

---

## 実現ステップ（優先度順ではない、思いついたら着手）

- [ ] Codex の `AGENTS.md` 仕様を把握する（どこまで書けるか）
- [ ] このプロジェクト用 `AGENTS.md` を作成（プロジェクト基本コンテキストを自然言語で記述）
- [ ] 適性のある作業を 1〜2 本 Codex に投げて動作確認
- [ ] 上記マッピングを実績ベースで更新
- [ ] Codex が得意と判明した作業を Claude Code のスキルから外すか明示する

---

## 判断の原則

- 「Claude Code でできるなら Claude Code で」ではなく  
  **「Codex が苦手なことだけ Claude Code で」** という方向に段階的に移行する
- `.claude/` スキル/エージェント/MCP は Claude Code の根幹 → 移植しない
- Codex は PR ベース → `develop` への直接 push・コミットは Claude Code が担当
- どちらに投げるか迷ったら Claude Code（コンテキストロスが少ない）

---

## 保留・未解決事項

- Codex の GitHub 連携の詳細（ブランチ権限・PR 自動作成の挙動）
- Codex でのプロジェクト固有ツール（`npm run refresh-indexes` 等）の実行可否
- 並行実行時の git コンフリクト回避策（worktree ルールが適用されるか）
