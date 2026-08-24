# .claude/state/ — エージェント・スキルが生成する mutable 状態

`.claude/` 配下の他ディレクトリ（`agents/`・`skills/`・`config/`）が **declarative**（人間が定義する固定内容）であるのに対し、このディレクトリは **mutable**（スキル・エージェントが実行中に読み書きする状態）を扱う。

## 情報蓄積ルール（4 ゾーンモデル）

本ディレクトリは **Zone C: 機械可読データ**。CI 出力・監査結果・サイクル状態を JSON で持つ。

| Zone | 置き場 | 用途 |
|---|---|---|
| A | `docs/` | 戦略・設計・進捗・週次 PDCA・引き継ぎ（散文 md） |
| B | `.claude/knowledge/reference/` | 運用手順・ポリシー・レジストリ（散文 md） |
| **C**（本ディレクトリ） | `.claude/state/*.json`, `.claude/config/*.json` | 機械可読データ |
| D | `.claude/skills/`, `.claude/agents/` | 実行可能な能力の定義 |

### 禁止事項

- **新規 `.md` ファイルを置かない**（本 README.md を除く）。状態・進捗は JSON か Zone A/B の md へ
- **GitHub Issue は使わない**。やるべきことは `.claude/todo/`（手動運用）に集約する（旧 `task-queue.json` 自動化は 2026-06-11 廃止）

詳細・判断フロー: [information-architecture.md](../../.claude/knowledge/reference/information-architecture.md)

## ファイル一覧（主な JSON / ディレクトリ）

| ファイル / ディレクトリ | 内容 | 更新者 |
|---|---|---|
| `mechanical-screen.json` | 全ページの機械的指標（CEM 版 Tier 1 screen 出力） | `/quality-cycle --mode screen` |
| `quality-scores.json` | CEM 版 Tier 2 質的評価結果（5 軸ルーブリック） | `/quality-cycle --mode score` |
| `quality-cycle-state.json` | CEM 版 各ページの状態遷移履歴 | `/quality-cycle --mode rewrite/verify/approve` |
| `civil-quality-scores.json` | 1級土木版の評価結果 | `/civil-textbook-cycle --mode score` |
| `civil-quality-cycle-state.json` | 1級土木版の状態遷移 | `/civil-textbook-cycle` |
| `experiments.json` | NSM 実験の状態（running / measuring / done） | `/nsm-experiment` |
| `metrics/` | PSI / GA4 / GSC の生 JSON（CI が develop に直接 commit） | `.github/workflows/psi-audit.yml` / `fetch-metrics.yml` |
| `note/magazines-snapshot.json` | note ライブのマガジン一覧＋**収録記事リスト**（`check-magazine-membership` の軸 C。鮮度 9 日超は検査不成立扱い） | `.github/workflows/note-live-audit.yml`（週次・CI が develop に直接 commit） |
| `exam-keyword-cycles/` | 過去問起点校正サイクルの進捗 JSON | `/exam-keyword-cycle` |
| `proofread-learnings/` | 校正学習の蒸留ログ | `/distill-proofread-learnings` |
| `resurrection-candidates/` | 復活候補ページのメタ | `/resurrect-content` |
| `improvements/` | PSI 改善候補レポート（`performance-auditor` 出力） | `performance-auditor` エージェント |

## 消費者

- **スクリプト**: `.claude/skills/content/quality-cycle/scripts/quality-cycle.mjs` / `.claude/skills/content/civil-textbook-cycle/scripts/civil-textbook-cycle.mjs`
- **エージェント**: `keyword-rewriter` / `civil-textbook-rewriter` / `performance-auditor` / `metrics-analyzer` / `strategy-advisor`
- **スキル**: `quality-cycle` / `civil-textbook-cycle` / `weekly-plan` / `weekly-review` / `nsm-experiment`

## 設計方針

- **git 管理対象**: 状態遷移の履歴を追跡可能にするため、差分コミットを許容
- **Next.js ランタイム非依存**: `src/` から import されることはない（エージェント作業領域）
- **`data/` からの移動**: 旧 `data/*.json` は 2026-04-15 に `.claude/state/` 配下へ集約（ADR: `.claude/knowledge/reference/data-storage-decision.md`）
- **タスクの単一正源**: やるべきことは `.claude/todo/`（annual/monthly/weekly、手動運用）に集約。旧 `task-queue.json` + 旧 Project TODO ビュー 自動生成は 2026-06-11 廃止

詳細なアーキテクチャは [information-architecture.md](../../.claude/knowledge/reference/information-architecture.md) を参照。
