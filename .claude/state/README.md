# .claude/state/ — エージェント・スキルの作業状態

`.claude/` 配下の他ディレクトリ（`agents/`・`skills/`・`config/`）が **declarative**（人間が定義する固定内容）であるのに対し、このディレクトリは **mutable**（スキル・エージェントが実行中に読み書きする作業状態）を扱う。

**事業の記録はここに置かない**（2026-10-02 に分離）。売上・計測（GA4/GSC/PSI 等）・市場/競合スキャン・ココナラ受注・note のライブスナップショット・実験台帳など「エージェントがいなくても事業として残すべき事実」は `data/`、事業・試験・商品の正本とツールの設定は `config/` に置く。

## 置き場の分け方

| 置き場 | 持つもの | 例 |
|---|---|---|
| `config/` | 事業・試験・商品の正本、スクリプト・CI・サイトの設定（人が判断して変える値） | `qualification-registry.json`・`exam-calendar.json`・`product-lineup.json`・`psi-config.json` |
| `data/` | 外から取ってきた・発生した事業の記録（追記で増える事実） | `sales/`・`metrics/`・`coconala/`・`note/`・`analysis/`・`experiments.json` |
| **`.claude/state/`（本ディレクトリ）** | エージェントの作業状態：品質サイクル・監査結果・ロールアウト進捗・生成索引・claims・dispatch-log | `quality-scores.json`・`exam-keyword-cycles/`・`dispatch/` |
| `.claude/config/` | 品質ゲートの基準・許可リスト、CI 書き込み・認証の許可リスト（`.claude/` の書き込み保護下に置く） | `*-baseline.json`・`*-allow.json`・`ci-write-operations.json` |

パスの定数は `scripts/lib/repository-paths.mjs`（`STATE_ROOT`・`DATA_ROOT`・`CONFIG_ROOT`・`AGENT_CONFIG_ROOT`）。

### 禁止事項

- **新規 `.md` ファイルを置かない**（本 README.md を除く）。状態・進捗は JSON か `docs/`・`.claude/knowledge/reference/` の md へ
- **事業の記録を新しく作らない**（`data/` へ）。旧パス（`.claude/state/metrics/` 等）への新規作成は `check-information-architecture` が止める
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
| `cloudflare/zone-config-latest.json` | Cloudflare ゾーン設定の最新スナップショット（ドリフト検知の基準） | `.github/workflows/cloudflare-config-audit.yml`（月次） |
| `ig-reconcile/` | Instagram の SoT 照合結果（`login-collectors.yml` の `verify-ig-status`） | `verify-ig-status` |
| `exam-keyword-cycles/` | 過去問起点校正サイクルの進捗 JSON | `/exam-keyword-cycle` |
| `proofread-learnings/` | 校正学習の蒸留ログ | `/distill-proofread-learnings` |
| `resurrection-candidates/` | 復活候補ページのメタ | `/resurrect-content` |
| `improvements/` | PSI 改善候補レポート（`performance-auditor` 出力） | `performance-auditor` エージェント |
| `assets/` | Git の外へ出したアセット（R2・Drive vault）の台帳 | `asset-offload` / `drive-vault-sync` |
| `note-published.json` | note 公開状態の生成索引（frontmatter から作る・手で直さない） | `build-note-published-index` |
| `youtube-schedule.json` | YouTube の投稿予定と投稿済みの実績 | `build-schedule` / `post-from-schedule` |
| `dispatch/`・`todo-claims.json` | タスクの実行記録と claim | `todo:claim` / `todo:complete` |

## 消費者

- **スクリプト**: `.claude/skills/quality/quality-cycle/`（CEM 版 `scripts-cem/`・1級土木版 `scripts-civil-textbook/`）
- **エージェント**: `keyword-rewriter` / `civil-textbook-rewriter` / `performance-auditor`
- **スキル**: `quality-cycle` / `civil-textbook-cycle` / `weekly-plan` / `weekly-review`

## 設計方針

- **git 管理対象**: 状態遷移の履歴を追跡可能にするため、差分コミットを許容
- **Next.js ランタイム非依存**: `src/` から import されることはない（エージェント作業領域。サイトが読む正本は `config/`）
- **`data/` との往復**: 旧 `data/*.json` は 2026-04-15 に本ディレクトリへ集約した（ADR: `.claude/knowledge/reference/data-storage-decision.md`）。その結果、事業の記録とエージェントの作業状態が混ざって区別できなくなったため、2026-10-02 に事業の記録だけを `data/` へ戻した。日付付き snapshot の寿命（`scripts/lib/prune-state-snapshots.mjs`）と不変台帳（`data/metrics/business/**`・`data/metrics/gsc/rank-watch/**`）の扱いは `data/` 側に移った。不変台帳の中の旧パスは書き換えず、読む側が `resolveMovedPath` で読み替える
- **タスクの単一正源**: やるべきことは `.claude/todo/`（annual/monthly/weekly、手動運用）に集約。旧 `task-queue.json` + 旧 Project TODO ビュー 自動生成は 2026-06-11 廃止

詳細なアーキテクチャは [information-architecture.md](../../.claude/knowledge/reference/information-architecture.md) を参照。
