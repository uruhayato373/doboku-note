# .claude/state/ — エージェント・スキルが生成する mutable 状態

`.claude/` 配下の他ディレクトリ（`agents/`・`skills/`・`reference/`・`config/`）が **declarative**（人間が定義する固定内容）であるのに対し、このディレクトリは **mutable**（スキル・エージェントが実行中に読み書きする状態）を扱う。

## 情報蓄積ルール（3 層モデル）

本ディレクトリは **Tier 3: 機械可読データのみ**。状態あり（open/close の概念）の情報は **Tier 1: GitHub Issue** に置く。

| Tier | 置き場 | 用途 |
|---|---|---|
| Tier 1 | GitHub Issue（`weekly-pdca` / `session-handoff` / `queue` / `task` / `umbrella` 等のラベル） | open/close する状態 |
| Tier 2 | `docs/project/`, `.claude/reference/`, `.claude/skills/**/SKILL.md` | 固定的知識・戦略・ADR |
| **Tier 3**（本ディレクトリ） | `.claude/state/*.json`, `.claache/config/*.json` | エージェントが programmatic に読み書きする構造化データ |

### 禁止事項

- **新規 `.md` ファイルを置かない**（本 README.md を除く）
  - 週次レビュー → Issue `[PDCA] YYYY-Www`（`.github/ISSUE_TEMPLATE/weekly-pdca.md`）
  - セッション引き継ぎ → Issue `[Handoff] YYYY-MM-DD <ctx>`（`.github/ISSUE_TEMPLATE/session-handoff.md`）
  - レビュー待ち → Issue `[Queue] ...`（`.github/ISSUE_TEMPLATE/queue.md`）
  - 単発タスク → Issue `[Task] ...`（`.github/ISSUE_TEMPLATE/task.md`）
  - 長期計画 → Issue `[Umbrella] ...`（`.github/ISSUE_TEMPLATE/umbrella.md`）

詳細: [.claude/reference/docs-issue-separation.md](../reference/docs-issue-separation.md)

## ファイル一覧（主な JSON / ディレクトリ）

| ファイル / ディレクトリ | 内容 | 更新者 |
|---|---|---|
| `mechanical-screen.json` | 全ページの機械的指標（CEM 版 Tier 1 screen 出力） | `/quality-cycle --mode screen` |
| `quality-scores.json` | CEM 版 Tier 2 質的評価結果（5 軸ルーブリック） | `/quality-cycle --mode score` |
| `quality-cycle-state.json` | CEM 版 各ページの状態遷移履歴 | `/quality-cycle --mode rewrite/verify/approve` |
| `civil-quality-scores.json` | 1級土木版の評価結果 | `/civil-textbook-cycle --mode score` |
| `civil-quality-cycle-state.json` | 1級土木版の状態遷移 | `/civil-textbook-cycle` |
| `flagship-100.json` | スコア上位 100 件の優先改善リスト | `/quality-cycle --mode score` |
| `experiments.json` | NSM 実験の状態（running / measuring / done） | `/nsm-experiment` |
| `broken-explanations.json` | 解説文壊れの検出結果 | 解説監査スクリプト |
| `definition-audit.json` | 定義文監査結果 | 定義監査スクリプト |
| `svg-audit.json` | SVG 図版監査結果 | SVG 監査スクリプト |
| `metrics/` | PSI / GA4 / GSC の生 JSON（CI が develop に直接 commit） | `.github/workflows/psi-audit.yml` / `fetch-metrics.yml` |
| `exam-keyword-cycles/` | 過去問起点校正サイクルの進捗 JSON | `/exam-keyword-cycle` |
| `proofread-learnings/` | 校正学習の蒸留ログ | `/distill-proofread-learnings` |
| `resurrection-candidates/` | 復活候補ページのメタ | `/resurrect-content` |
| `improvements/` | PSI 改善候補レポート（`performance-auditor` 出力） | `performance-auditor` エージェント |

## 消費者

- **スクリプト**: `.claude/skills/content/quality-cycle/scripts/quality-cycle.mjs` / `.claude/skills/content/civil-textbook-cycle/scripts/civil-textbook-cycle.mjs`
- **エージェント**: `keyword-rewriter` / `civil-textbook-rewriter` / `performance-auditor` / `metrics-analyzer` / `strategy-advisor`
- **スキル**: `quality-cycle` / `civil-textbook-cycle` / `exam-keyword-cycle` / `weekly-plan` / `weekly-review` / `nsm-experiment`

## 設計方針

- **git 管理対象**: 状態遷移の履歴を追跡可能にするため、差分コミットを許容
- **Next.js ランタイム非依存**: `src/` から import されることはない（エージェント作業領域）
- **`data/` からの移動**: 旧 `data/*.json` は 2026-04-15 に `.claude/state/` 配下へ集約（ADR: `.claude/reference/data-storage-decision.md`）
- **Issue 一本化**: 2026-04-21 に `.claude/state/*.md`（session-handoff, review-queue 等）を GitHub Issue に全面移行

詳細なアーキテクチャは `.claude/skills/quality/quality-cycle/DESIGN.md` と `.claude/reference/docs-issue-separation.md` を参照。
