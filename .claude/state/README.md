# .claude/state/ — エージェント・スキルが生成する mutable 状態

`.claude/` 配下の他ディレクトリ（`agents/`・`skills/`・`reference/`・`config/`）が **declarative**（人間が定義する固定内容）であるのに対し、このディレクトリは **mutable**（スキル・エージェントが実行中に読み書きする状態）を扱う。

## ファイル一覧

| ファイル | 内容 | 更新者 |
|---|---|---|
| `mechanical-screen.json` | 全ページの機械的指標（Tier 1 screen 出力） | `/quality-cycle --mode screen` |
| `quality-scores.json` | Tier 2 質的評価結果（5 軸ルーブリック） | `/quality-cycle --mode score` |
| `quality-cycle-state.json` | 各ページの状態遷移履歴 | `/quality-cycle --mode rewrite/verify/approve` |
| `flagship-100.json` | スコア上位 100 件の優先改善リスト | `/quality-cycle --mode score` |
| `review-queue.md` | 人間レビュー待ちリスト（自動生成） | `/quality-cycle --mode review` |
| `experiments.json` | NSM 実験の状態（running / measuring / done） | `/nsm-experiment` |

## 消費者

- **スクリプト**: `scripts/quality-cycle.mjs` / `scripts/lib/quality-state.mjs` / `scripts/lib/experiments-state.mjs`
- **エージェント**: `keyword-rewriter` / `strategy-advisor`
- **スキル**: `quality-cycle` / `weekly-plan` / `weekly-review` / `nsm-experiment`

## 設計方針

- **git 管理対象**: 状態遷移の履歴を追跡可能にするため、差分コミットを許容
- **Next.js ランタイム非依存**: `src/` から import されることはない（エージェント作業領域）
- **`data/` からの移動**: 旧 `data/*.json` は 2026-04-15 に `.claude/state/` 配下へ集約（ADR: `docs/project/17_data-storage-strategy.md`）

詳細なアーキテクチャは `docs/project/13_quality-cycle-architecture.md` を参照。
