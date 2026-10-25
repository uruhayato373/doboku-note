---
taskId: DN-0851
type: implementation-plan
createdAt: 2026-10-25
deleteOnComplete: true
---

# 管理画面の自動化を Mac と CI の画面に分け、部品と表を共通化する（DN-0851）

バックログ: [DN-0851](../todo/backlog.md)。完了したら削除する。

## Context

- 運営者（2026-10-25）：「週次レビューで Mac でやることと CI でやることが混ざっている。ページを分け、shadcn の DataTable などで UI をもっと共通化できるはず」。
- **画面が混ざっている**
  - 土曜の Mac の結果が 2 画面に分かれている。収集の段は `/ops/automations`、launchd の最後の実行と下書きは `/metrics/business/weekly`（`review-parts.tsx` の `AutomationStatus`）。
  - GSC の記録層（DN-0849・`run_gsc_record`）の結果はどこにも出ていない。
  - 自動化の Issue（`automation-failure`）は週次レビューの画面に Mac 発・CI 発・消した仕組みの残り（#1186・#1087・#1204 など）が混ざって並ぶ。
- **部品が混ざっている**（`check-admin-ui-debt` は生の table・card・badge を 0 件で通している）
  - 表：DataTable（shadcn の Data Table）は 6 ページだけ。TableFrame を手で組んだ表が 39 ページに 72 個あり、少なくとも 49 個は行・列の結合も合計行も無い一覧。
  - shadcn の Card を直接使う画面が 3（`/`・`/metrics/search-strategy`・`review-parts.tsx`）、Badge が 9。
  - 金額の書式を約 10 か所で書き写し、日時は 3 通り。`review-parts.tsx` の `at` は ISO の文字列を切るだけなので、下書きの作成時刻を UTC のまま出している（14:27 を 05:27 と表示）。

## PR1：自動化を Mac と CI の画面に分ける

- **`/ops/mac`「Mac の自動実行」**（新規）
  - 土曜の流れを実行順に 1 本の DataTable にする：収集（前）→ GSC の記録 → 週次レビュー → 収集（後）。各段の結果・最後の時刻・中身。
    - 収集：`state.weekly-collect` の `judgeRuns`（今の `judgeCollect`）を段の前・後で集計する。
    - GSC の記録：`check-gsc-auto-review --json` の `gates`（週次・coverage の最新の記録日・要否）と、ログの `[gsc-record] FAILED`。
    - 週次レビュー：`weeklyLaunchd`（ログの最後の実行）と下書き（`readWeeklyDraft`）。
  - 収集の段ごとの表（今の `CollectTable`）、launchd の一覧（weekly-review・disk-hygiene）、ログの置き場。
  - Mac 発の自動化の Issue。
- **`/ops/ci`「CI（GitHub Actions）」**（新規）：今の GitHub Actions の表（`filter` で絞り込み）、CI 発の Issue、台帳のどの自動化にも当たらない channel の Issue（消した仕組みの残り・人が閉じる）。
- **Issue の振り分け**：`gh issue list --label automation-failure` の題名 `[auto] <channel>:` から channel を取り、`config/automations.json` の readers の `issue:<channel>` で runner を引く。題名の規約は `scripts/report-automation-failure.mjs` だけが持つので、そこに `channelOfTitle` を足す（`issuePrefix` の逆）。
- **ログの解析**：`scripts/lib/review-automation.mjs` の `lastLaunchdRun` に `gscFailed`（`[gsc-record] FAILED`）を `collectFailed` と同じ形で足す（テストつき）。
- **`/metrics/business/weekly`**：`AutomationStatus` の「土曜の自動実行」カードを 1 行の状態と `/ops/mac` へのリンクにする。下書きはレビューの材料なので残す。
- **`/ops/automations` を消す**：サイドバー（`config/domains.json`）を 2 行にし、参照を直す（`config/automations.json` の readers・`tools/admin-app/README.md`・`docs/operations/04_自動化マップ.md`・`playwright-auth-profiles.md`・`datasets.mjs` の説明・型の注記・`check-workflow-health` とテストの注記）。説明文の「cron の発火」（#1231 で消した判定）もここで直す。
- 確認：`npm run type-check:admin`・`npm test`・`npm run check-automations`・`npm run check-admin-ui-debt`・`npm run quality:audit:ci`。ブラウザペインで `/ops/mac`・`/ops/ci`・`/metrics/business/weekly` を開いて表示を見る。

## PR2：囲み・状態・書式を共通部品にそろえる

- `tools/admin-app/src/lib/format.ts` に `yen`・`jstDateTime`（JST・`Asia/Tokyo`）・`num` を置き、各画面の書き写しを置き換える。`review-parts.tsx` の UTC 表示もこれで直る。
- shadcn の Card を直接使う 3 画面を PanelCard に、Badge を直接使う 9 画面を StatusBadge（tone）にする。形が合わないものは理由を残してそのままにする。
- `check-admin-ui-debt` に `uiCard`（`@/components/ui/card` の直接利用）と `uiBadge`（`<Badge` の直接利用）を足し、基準値で増やさない。テストを足す。
- 確認：PR1 と同じ。表示の変わる画面はブラウザペインで見る。

## PR3：一覧の表を DataTable に移す

- TableFrame で組んだ表のうち、行・列の結合・合計行・行内の入力・入れ子の無い一覧を DataTable（列は `values` で並べ替え、表示は `cells`）に移す。形の違う表は TableFrame に残す。
- 数が多いので領域ごとに分ける（目安：content／metrics・strategy・sales／ops・quality・その他）。並行するときは担当のファイルを分け、git は親が扱う。
- `check-admin-ui-debt` に `handTable`（ページの `<TableFrame` の数）を足し、基準値で増やさない。新しい一覧は DataTable で作る。
- 確認：PR1 と同じ。移した画面は全部ブラウザペインで開き、行数・並べ替え・ページ送りを見る。

## 置き場と順番

- 共有の作業フォルダは別セッションが使っているので、各 PR は `.claude/worktrees/` の worktree で作る（node_modules は symlink）。
- PR1 → PR2 → PR3 の順に develop へ入れる（PR2・PR3 は同じ画面を触るので、前の PR が入ってから切る）。
- 運営者の判断：開いたままの消した仕組みの Issue（#1186・#1087・#1204 など）を閉じるか。
