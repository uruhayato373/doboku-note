# 過去問起点の校正サイクル — ロードマップ（Why / 設計）

**策定日**: 2026-04-20
**ステータス**: MVP + Phase 2 実装済み、Phase 3-1 骨組完成（remote trigger 接続・3-2/3-3 が残タスク）
**追跡 Issue**: [#27 [Umbrella] exam-keyword-cycle Phase 3 & 補強候補](https://github.com/uruhayato373/doboku-note/issues/27)

**関連**:
- 実装スキル: `.claude/skills/content/exam-keyword-cycle/SKILL.md`
- 役割分離ルール: `.claude/reference/docs-issue-separation.md`
- 継続改善ループ全体図: `.claude/reference/workflows.md`
- 類似参考（ADR）: `24_performance-monitoring-architecture.md`（PSI 日次監査）

---

> **注**: 本 md は Why / 設計思想 / 中止判定の真実源。**残タスク（誰が何をいつ）は Issue #27 が真実源**。ルールは `.claude/reference/docs-issue-separation.md` に従う。

## 1. 現状（実装済み）

2026-04-20 時点で以下が動作する:

| 機能 | 実装 |
|---|---|
| 手動起動 `/exam-keyword-cycle` | `.claude/skills/content/exam-keyword-cycle/SKILL.md` |
| 6 Phase オーケストレーション | 同上 |
| サイクルログ永続化 | `docs/reviews/exam-keyword-cycle/YYYY-MM-DD-*.md` |
| 進捗状態管理 | `.claude/state/exam-keyword-cycles/progress.json` |
| PR 作成経路 | 既存 `/pr-create` を再利用 |
| **MVP 実サイクル試運転** | R07 Ⅰ-1-1（PR マージ済）・R06 Ⅰ-1-35（PR #26 マージ済） |
| **Phase 2-1 `--auto` 選択ロジック** | `.claude/skills/content/exam-keyword-cycle/scripts/select-next-question.mjs` |
| **Phase 2-2 weekly-review Agent F** | `.claude/skills/management/weekly-review/SKILL.md` |
| **Phase 2-3 `--since "1cycle"` 連動** | `.claude/skills/management/distill-proofread-learnings/SKILL.md` |
| **Phase 3-1 Workflow 骨組** | `.github/workflows/exam-keyword-cycle.yml`（remote trigger 未接続） |

## 2. Phase 2 の Why — 定期実行と weekly-review 統合（完了）

**目的**: 手動起動の手間を無くし、運用を定常化する。

**設計思想**:
- 「次に何をやるか」の判断は state ファイルと自動選択で決める（人間の判断を要するのはサイクル内の承認のみ）
- 週次 PDCA（`/weekly-review`）にカバレッジと次週候補が自動で surface される
- サイクル終了時に学習抽出（`/distill-proofread-learnings`）を連鎖させ、視点タグ別の新パターンを捕捉する

**キー設計判断**:
- 選択優先順位は「最新年度で未カバー」→「全年度カバー後は 6 ヶ月以上前を再訪」。年度横断のランダム性より、受験者の出題頻度感覚に沿う
- `--since "1cycle"` は期間ではなくサイクル境界で切る（サイクル内のコミットを網羅するため）

## 3. Phase 3 の Why — GitHub Actions スケジュール化（進行中）

**目的**: 完全自動化。受験前（2026-06 以降）の品質上げピーク時に稼働させる。

**設計思想**:
- PSI 日次監査（ADR #24）と同じアーキテクチャを踏襲。cron + workflow_dispatch + 失敗時 Issue 自動起票
- Claude Code remote trigger で `/exam-keyword-cycle --auto` を呼出す（既存の weekly-pdca 自動化と同じ仕組みを再利用）

**キー設計判断**:
- 週 2 回（月・木）を初期案とする。年度 40 問 × 14 年 = 560 問に対して最新 3 年分（120 問）を優先カバー → 約 14 ヶ月で 100%
- 受験日（2026-07）までに R07/R06 の主要 80 問をカバーするには週 5 回ペース必要。**網羅性を犠牲にして深度優先**（週 2 回 × 高優先問題のみ）で妥協する

残タスク（3-2 実行頻度確定、3-3 失敗時 Issue 起票、remote trigger 接続）は Issue #27 を参照。

## 4. 記録（recording）の現状

| 記録先 | 対象 | 生成タイミング |
|---|---|---|
| Git コミット | キーワード MDX の実変更 | 各キーワード修正時 |
| `docs/reviews/exam-keyword-cycle/YYYY-MM-DD-*.md` | 視点タグ・Before/After・スコア推移 | Phase 5 |
| `docs/reviews/exam-keyword-cycle/index.json` | サイクルメタ情報（日付・対象・PR 番号） | Phase 5 |
| `.claude/state/exam-keyword-cycles/progress.json` | カバー状況 | Phase 5 |
| GitHub PR | 差分とレビューコメント | Phase 6 |

**補強候補**（サイクル横断ダッシュボード・frontmatter cycleHistory・PR レビューコメント学習化）は Issue #27 の「補強候補」セクションで追跡する。数サイクル蓄積後に優先度判定。

## 5. 中止判定基準

- **続行**: MVP 試運転で「視点タグ付き校正 → PR」の流れが実際に価値を生んだ場合
  - 2026-04-20 の R06 Ⅰ-1-35 および R07 Ⅰ-1-1 試運転で PR マージ成功。**継続方針**
- **中止**: 「手動校正の方が早い」「視点タグが形骸化した」と判定した場合 → MVP のまま手動運用で継続

**中止時の処理**: Issue #27 を close、本 md の「追跡 Issue」行を削除し、理由を本節に追記。

## 6. 関連

- 元プラン: `C:\Users\m004195\.claude\plans\starry-enchanting-crown.md`
- 実装スキル: `.claude/skills/content/exam-keyword-cycle/SKILL.md`
- 校正学習メタスキル: `.claude/skills/management/distill-proofread-learnings/SKILL.md`
- 週次 PDCA: `.claude/skills/management/weekly-review/SKILL.md`
- PR 作成: `.claude/skills/dev/pr-create/SKILL.md`
- 継続改善ループ図: `.claude/reference/workflows.md`
- PSI 監視 ADR（類似自動化事例）: `docs/project/24_performance-monitoring-architecture.md`
- 役割分離ルール: `.claude/reference/docs-issue-separation.md`
