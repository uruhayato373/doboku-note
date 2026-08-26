# TODO 実行ライフサイクル契約（task → plan → claim → verify → complete）

> doboku-note 固有のライフサイクル契約。カード構文・タグ語彙の正典は [todo-standards.md](todo-standards.md)（stats47共通）。
> 出典: docs/reviews/critical/todo-ui-agent-implementation-operations_批判的レビュー.md（2026-08-18策定・抽出後に削除済み・記録はgit履歴） <!-- doc-ref:ignore -->

## 原則
- UI（admin /todo）は SSOT を持たない。表示は backlog.md・todo-claims.json・.claude/plans・dispatch-log からの導出のみ
- 状態は新台帳へ複製せず導出する。優先順 IN_PROGRESS > THIS_WEEK > THIS_MONTH > PLANNED > BACKLOG
  （BLOCKED は release 理由の SSOT が無いため未実装。理由の置き場を定義したら追加する）
- `[実行:]` は状態ではなく route（誰がやるか）
- 外部公開・課金・削除・deploy は TODO UI から実行しない。UI のアクションは副作用のないコピーに限定

## plan が必要な条件（どれか1つ）
複数フェーズ／外部書込み／破壊的操作／収益影響／複数の受入ゲート。単純な1ファイル修正は plan 不要。
frontmatter は taskId / type: implementation-plan / createdAt / deleteOnComplete: true の4キーのみ（状態・進捗を書かない）。
命名は DN-####-slug（dir型=00-master.md 持ち、無ければ 00-*.md で代用／file型=単一.md）。発見の唯一の実装は scripts/lib/plan-units.mjs。

## claim（実装開始）
- 実装前に必ず `npm run todo:claim -- DN-#### --owner <name>`。二重 claim は拒否される
- 選定器（pickTasks）は wip を必ず除外する
- blocked になったら `todo:release` で解除し、dispatch-log へ id・理由・再開条件を残す

## complete（完了）
- `npm run todo:complete -- DN-#### --confirm-conditions --commit [--verify "..."]`。dry-run が既定
- 一括で閉じるもの: backlog カード削除・monthly/weekly 行削除・claims 解除・dispatch-log 追記（id/at/task/tier/executor/outcome/plan/commit/verification）・事後検査（schema+task-plan-links+dispatch-log）
- plan unit が残っていれば WARN（受入条件確認のうえ手で削除。自動削除しない）
- **どれか1つでも失敗したらカードと plan を保持し、完了扱いにしない**

## dispatch-log
- 日付キーは `at`（date は禁止・check-dispatch-log が FAIL にする）。id は DN-#### 必須（2026-08-18 以前の11件のみ legacy 許容）
- outcome は done|swept|blocked|fail
- 台帳外の作業を記録したくなったら、先にカードを起票してから記録する

## handoff prompt（UI 生成）
必須要素: カードID＋backlogパス／plan master／ブランチ／実行者／検証コマンド／完了コマンド／停止条件。
UI はコピーまで（実行はしない）。

## 責任分界

| 主体 | 責任 | 持たない責任 |
|---|---|---|
| ユーザー | 月・週の優先順位、重要方針、外部・課金・破壊操作の承認 | 実装手順の再記述、完了ファイルの手掃除 |
| Codex | 調査、選択肢比較、設計、受入条件、plan作成、実装後レビュー | 承認なしの外部変更、進捗台帳の二重作成 |
| Claude Code | claim、実装、検証、残件抽出、完了処理 | 仕様の独断変更、停止条件の迂回 |
| Admin UI | 可視化、選択、限定状態遷移、handoff prompt生成 | 独自DB、任意shell、公開操作 |
| 共通CLI | Markdownの整合した更新、排他、検査、完了transaction | 優先順位や事業判断 |

## 不変条件
- UI・CLI・Agent は同じ parser（backlog-lib.mjs）と状態導出（todo.ts deriveStatus）・plan 発見（plan-units.mjs）を使い、同じルールを再実装しない

## 実装の所在
scripts/todo-{claim,release,complete}.mjs／scripts/lib/todo-lifecycle.mjs／scripts/lib/plan-units.mjs／
scripts/check-task-plan-links.mjs／scripts/check-dispatch-log.mjs／tools/admin-app/src/lib/todo.ts
