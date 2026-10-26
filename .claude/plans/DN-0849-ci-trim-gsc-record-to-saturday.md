---
taskId: DN-0849
type: implementation-plan
createdAt: 2026-10-25
deleteOnComplete: true
---

# CI を 2 本外し、GSC の記録層を土曜の週次レビューへ寄せる（DN-0849）

バックログ: [DN-0849](../todo/backlog.md)。完了したら削除する。

## Context

- 2026-10-25 に、管理画面 `/ops/automations` で CI 26 本を役目・読み手・実際の働きで見直した（運営者の依頼）。
- **rerun-cancelled-schedules.yml**（2 時間ごと）：記録が残る 44 回すべてで「再実行 0 件」。書き込み系の CI を減らしたので、共通の group での取り消しが起きていない。止まった定期実行は `check-workflow-health` の「最後の成功が古い」でも拾える。
- **weekly-review-draft.yml**（金曜）：土曜の Mac が収集の後に `build-weekly-review-draft` を作り直すので、金曜の下書きは使われていない。材料の欠けは、取得元（fetch-metrics）が自分の Issue に出す。
- **gsc-auto-review.yml**（金曜）：CI の中で Claude（claude-code-action・`CLAUDE_CODE_OAUTH_TOKEN`）を動かし、GSC の週次観測・coverage を `gsc-management.md` へ、改善候補を `.claude/state/improvements/<日付>.md` へ書く。土曜の週次レビューも同じ計測ダイジェストを Claude で読んでいる。
- 運営者の決定（2026-10-25）：上の 2 本は CI から外し、gsc-auto-review は土曜の週次レビューへ寄せる。

## 変更

1. **rerun-cancelled-schedules を消す**
   - workflow・`scripts/rerun-cancelled-schedules.mjs`・`scripts/lib/cancelled-schedule-runs.mjs`・テスト・npm script を消す（CI の付属物だけで、手元で使う道具ではない）。
   - 消す前に `gh workflow disable`。各 workflow の concurrency の注記と、workflow-health・台帳の行を直す。
2. **weekly-review-draft を消す**
   - workflow を消す（先に disable）。`build-weekly-review-draft.mjs` と `npm run weekly-review:draft` は土曜の Mac が使うので残す。
   - workflow-health・台帳・注記（review-automation・管理画面のレビュー・SKILL・reference）を直す。
3. **gsc-auto-review を土曜へ寄せる**
   - CI の prompt を `scripts/scheduled/gsc-record-prompt.md` に移す。Mac 用に直すのは書き先だけで、断片は `.tmp/claude-out/gsc/{weekly-entry,coverage-entry,improvements}.md` に書かせる。
   - 新規 `scripts/apply-gsc-records.mjs`：CI の「Apply records and commit」と「Verify」を移す。
     - 断片の見出し・行数を検査し、`gsc-management.md` へ追記、`.claude/state/improvements/` へ写す。
     - commit・push は `routine-commit` で行う。
     - 実行前後の `check-gsc-auto-review --json` で、週次が必要だったのに書かれていなければ失敗にする。
     - テストつき。
   - `scripts/scheduled/weekly-review.sh`：前段の収集の後、レビューの前に `run_gsc_record` を足す。
     - ゲートで要るときだけ `claude -p` を回し、`apply-gsc-records` で追記・commit する。
     - 失敗は Issue channel gsc-auto-review に出し、成功で閉じる。
     - レビューより前に置くのは、週次レビューの growth-triage が新しい観測を読めるようにするため。
   - workflow を消す（先に disable）。
     - weekly-review-guard の案内（`gh run list --workflow gsc-auto-review.yml`）を Mac のログに直す。
     - workflow-health・台帳（weekly-review の行に writes を足す）・reference・skill を直す。
   - `CLAUDE_CODE_OAUTH_TOKEN` の Secret は使われなくなる。消すかは運営者が決める。
4. **文書**：doc-sync（doc-sync-auditor）で突き合わせる。

## 確認

- `npm test`・`npm run quality:audit:ci`・`npm run check-automations`・`npm run check-workflow-hygiene` が緑。
- `gh workflow list --all` で 3 本が無効。
- `node scripts/apply-gsc-records.mjs --dry-run` が、断片が無いときに「書く断片が無い」を出し、週次が必要なら失敗を返す。
- `tests/weekly-review-launchd.test.mjs` が、GSC の段（claude を 2 回呼ぶ）を含めて通る。
- 10/31（土）の自動実行で、GSC の週次観測が `gsc-management.md` に追記され、check-gsc-auto-review の週次が OK になる（DN-0817 の通しの確認と同じ回）。

## 戻し方

- `gh workflow enable <名前>`。ファイルは git の履歴から戻す。
