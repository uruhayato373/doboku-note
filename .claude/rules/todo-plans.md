---
paths:
  - ".claude/todo/**"
  - ".claude/plans/**"
  - "docs/handoffs/**"
  - "docs/reviews/**"
---

# タスク台帳・実装プラン・handoff を扱うときの規約

## `.claude/todo/`（CLAUDE.md §8）

- backlog がマスタ・ID は `DN-####`・月初に monthly、週初に weekly へ pull（`/plan-weekly`・`todo-planner`）。閲覧は admin `/todo`
- **backlog に置くのは単発で完了がある未着手タスクだけ** — チャネル状態の複製・反復する運用サイクル・コンテンツ制作企画は置かない。行き先は [todo-standards.md](../knowledge/reference/todo-standards.md) §1-2
- **カードに触れたら完了 prose を足さず残作業へ再スコープ**（部分完了は TRIM、タイトルが残作業と乖離したら旧削除＋新 ID で RESEED。確認不要・基準は todo-standards.md「5. 残す条件と削除条件」）してから commit する
- 週次レビューの申し送りは backlog へ `DN-####` 起票まで完了とする。定期作業は置かない。`[検証:]` に surfacer を書かない
- ゲート: `npm run check-backlog-schema`（タグ行の語彙・`[検証:]` の実在・ID 必須/重複・完了 prose の混入。pre-commit `--staged`）、`npm run check-backlog-health`（候補 surfacer・常に exit 0）、`npm run check-task-plan-links`（plan↔backlog の結線）、`npm run check-project-task-refs`（docs/ の backlog ID 参照切れ）
- 実行ライフサイクルの契約 → [todo-lifecycle.md](../knowledge/reference/todo-lifecycle.md)。台帳の構造監査は `backlog-curator`（`/backlog-sweep --audit`）
- **GitHub Issue は使わない**（唯一の例外＝`automation-failure` ラベル＝自動化の失敗・沈黙の記録。起票は `scripts/report-automation-failure.mjs`、クローズは人間）

## `.claude/plans/`

- 一案件だけの実装契約。**完了後に削除する**（SessionStart の `scripts/check-plan-staleness.mjs` が古さを警告）。設計と実装の分業（Codex が設計、Claude Code が実装・抽出・plan 削除） → [implementation-handoff.md](../knowledge/reference/implementation-handoff.md)

## handoff・review（`docs/handoffs/` `docs/reviews/`）

- セッション引き継ぎは `docs/handoffs/YYYY-MM-DD-{context}.md`。**handoff は「タスク→backlog・手順→reference・知見→memory へ抽出→本体は削除（記録は git 履歴）」**（残作業があっても KEEP しない・`handoffs/` は溜めない・`_archive/` は 2026-07-11 廃止）。真実源 → [information-architecture.md](../knowledge/reference/information-architecture.md)「handoff のライフサイクル」
- **鉄則＝外部実体（PR merged・published:true・deploy・ファイル実在）を検証してから削除、未確認なら削除しない**
- 棚卸しは `npm run check-doc-lifecycle`（機械 surfacer）→ `/doc-declutter`（`doc-curator` が KEEP/TRIM/DELETE/CONSOLIDATE を判定→削除/trim/参照更新/memory 同期まで適用）。週次 `/weekly-review` の Agent H が候補を列挙する（surface のみ）
- point-in-time 記録なので `check-doc-refs` の検査対象外（当時のパスを残してよい）。日付は JST で書く（`npm run check-jst-date`）
