---
taskId: DN-0817
type: implementation-plan
createdAt: 2026-10-24
deleteOnComplete: true
---

# ログインが要る処理を土曜の Mac に集約し、CI・スキル・台帳を整理する（DN-0817）

バックログ: [DN-0817](../todo/backlog.md)。完了したら削除する。

## Context

- **何が問題か**：ログインが要る処理が 3 か所に分かれていて、毎週どこかが壊れている。
  - Mac の launchd：6 本（毎日 2・毎週 4）
  - CI：`login-collectors.yml`・`scheduled-publish.yml`・`ops-write.yml`
  - Windows のタスク
- **今週の状態**
  - Mac の 4 本が失敗した。
  - 週次レビューの自動実行も完了しなかった。原因は `.claude/` への書き込みの拒否と、600 秒の打ち切り（DN-0829）。
- **作る形**
  - ログインして読む処理と書く処理を、**土曜の Mac の 1 本**（週次レビューの前後）にまとめる。
  - ほかのセッションはログインせず、記録を読む。
  - 自動化を 1 本の台帳で管理し、管理画面に出し、機械の検査で台帳と実物の一致を守る。
  - 要らない CI を消す。
- **運営者の決定（2026-10-24）**
  - 今日、手で 1 回流して全段通ったら、その場で古い launchd と CI を止める。
  - KDP は先に入り直す。
  - `post-youtube-scheduled.yml` は削除する。
  - 重複している CI 4 本も今日統合する。
  - カードは backlog 全体を棚卸しする。

## 今日の切り替えの合格基準（P2）

- 各段が `ok`、または理由つきの `skipped` であること。
  - skipped の理由として認めるもの：SNS 保留・GSC の 20 時間ルール（今朝 10:30 に送信済み）・期日前・対象 0 件
- チェーンが原因の新しい失敗が 0 件であること。
- 収集用の worktree が clean で、記録が origin/develop に入っていること。
- 今日検証できるのは**収集の段だけ**。
  - W43 は確定済みなので、Claude の段は早期終了で動かない。
  - Claude の段の修正（DN-0829）は、P2 の中で小さな試運転で仕組みを確かめる。
  - 通しの確認は 10/31 の土曜の実行で行う。

## 要点（調査で分かった制約）

- **定期実行の CI は main の YAML で動き、develop のスクリプトを呼ぶ**（`login-collectors.yml:62,132,542`）。
  - develop でファイルを消しても cron は止まらない。むしろ消えたスクリプトを呼んで落ちる。
  - → 切り替えは `gh workflow disable` で即時に行い、ファイルの削除は後の PR にする。
- **毎日の auth-session-refresh は、CI の A8・note のログイン状態を書き出している。**
  - → login-collectors の停止と、refresh の解除は同時に行う。
- **Claude の中では `CLAUDECODE=1` で資格情報が読めない**（`scripts/lib/credential-store.mjs:97-110`）。
  - → 収集は bash の段で、`claude -p` の外で回す。
- **`.claude/` への書き込みは Claude Code 本体が「sensitive file」として拒否する**（-p では承認者がいない）。
  - → Claude には `.tmp/claude-out/<.claude からの相対パス>` に書かせる。
  - Claude の終了後に、ラッパーが許可リスト（`.claude/todo/weekly.md`・`.claude/state/proofread-learnings/*`）だけを `.claude/` へ写して commit する。
- **`weekly-review.sh:93-96` は worktree が汚れていると exit 1 する。**
  - → 収集は専用の使い捨て worktree `.claude/worktrees/weekly-collect` で動かす。レビューが失敗しても翌週の収集が止まらないようにするため。
- **`--run-now` は `launchctl kickstart` なので引数を渡せない。**
  - → 収集はレビューの早期終了（`weekly-review.sh:109-112`）より前に置く。今日の手動実行でも動く。

## 段の順番

| 段 | 内容 | 形 |
|---|---|---|
| P0 | 準備 | 運営者の操作と PR #1208 |
| P1 | 土曜の流れ | PR-A |
| P2 | 手で 1 回流して確かめる | 手元 |
| P3 | 切り替え（同日・一括） | 手元 |
| P4 | CI と Mac の後片づけ・自動化の台帳・CI の統合 | PR-B（大きければ B1 削除・B2 統合と台帳に分ける） |
| P5 | セッションはログインしない（ガード・スキル・エージェント） | PR-C |
| P6 | backlog 全体の棚卸しとカードの整理 | develop へ直接 |
| P7 | 運営者のチェックリスト | 運営者 |

コードの変更は feature ブランチから develop への PR にする（automerge は Pre-merge・E2E・Lighthouse を待つ）。土曜の worktree は origin/develop で動くので、**PR-A は P2 の前に develop へ入っている必要がある**。

### P0 準備
- PR #1208（DN-0818）を develop へ入れる。
- **運営者**：KDP に入り直し、失敗の印を外す（`npm run auth:login -- --service kdp`）。
- 確認
  - `npm run auth:status -- --service kdp` が authenticated
  - `gh pr view 1208 --json state -q .state` が MERGED

### P1 PR-A：土曜の流れ（DN-0819・0820・0829・0828）

**新規**
- `scripts/lib/weekly-collect-plan.mjs`：純関数。
  - 段の表を持つ（id・コマンド・timeout・前と後のどちらか・skip の条件）。
  - 対象の月は `scripts/lib/jst-date.mjs` で決める（前月・当月、note の売上は前月を 14 日まで）。
  - note の期間は、レビューと同じ `reviewWindowOfWeek(reviewWeekOfDay(todayJst()))`。
- `scripts/weekly-collect.mjs`
  - `--plan --json`：ブラウザを開かず段の計画だけ出す。
  - `--phase pre|post`・`--only <段>`（運営者が手元で取り直すとき用）・`--verify-last`。
  - 段は順に 1 本ずつ回し、失敗しても次の段へ進む。
  - 各段に timeout を付け、止めるときはプロセスグループごと kill する。ブラウザが使用中なら、決めた回数だけ待つ。
  - 結果は `state.weekly-collect`（`.claude/state/weekly-collect/runs.json`）に書く。`scripts/lib/datasets.mjs` に 1 行宣言する。
  - 書き戻しは `scripts/ci-data.mjs add`（型の検査つき）と `scripts/lib/routine-commit.mjs` の `commitAndPush` を使う。
  - 最後に `git status --porcelain` が空かを確かめる。差分が残ったり push に失敗したりしたら赤にする。

**段**

前（レビューより前に回す）：
1. ログインの確認と入り直し：`auth-session-refresh` の Mac の分だけ（export と CI の起動はしない）
2. A8：`a8-ui:fetch` → `a8-ui:normalize`
3. KDP：`kdp-report --list-due`
4. ココナラ：orders・analytics `--append-kpi`・revenue
5. note のアクセス：月と、レビューの期間
6. note の売上
7. GSC：`gsc-local-routine.mjs`（登録リクエスト 10 件と、期日の月次 UI CSV）

後（レビューより後に回す。時間がかかるため）：
1. note の添付と会員限定のライブ照合
2. note 同期：`note-sync-routine.mjs`。この段にだけ `DOBOKU_PW_ALLOW_PARALLEL=1` を渡す
3. note の反映の照合：`check-note-sync`（公開 API・ログイン不要。CI の note-sync-live の代わり）

X・Instagram の段は作らない（SNS 保留中）。

**`scripts/scheduled/weekly-review.sh` の変更**
- 段の流れ：doc-meta-index を作る → 収集用 worktree を準備して reset → `weekly-collect --phase pre || collect_rc=$?` → `build-weekly-review-draft.mjs` で下書きを作り直す → 既存の早期終了の判定 → Claude → 許可リストの写しと commit → `weekly-collect --phase post`
- Issue の channel を `weekly-collect` に分ける。レビューの成功で収集の赤が閉じないようにするため。
- Claude の起動
  - `--disallowedTools` に `ScheduleWakeup` を足す。
  - `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=1800000`（無期限にはしない）。
  - プロンプトで、背景のエージェントを使わないこと、ログインして取りに行かず収集の記録を読むこと、`.claude/` には書かず `.tmp/claude-out/` に書くことを指示する。
- ロックを長く持ち続けたら（例：6 時間）通知する。

**その他の変更**
- **新規** `scripts/apply-claude-out.mjs`：`.tmp/claude-out/` から許可リストのファイルだけを写す。テストつき。
- **`scripts/lib/review-automation.mjs:43-52`**：管理画面が成功した回を「running」と出す文言のずれを直す（`tests/review-week.test.mjs` も）。
- **鮮度を行ごとに直す**（`scripts/lib/datasets.mjs`）
  - 週次で集めるもの：coconala.orders-snapshot・coconala.analytics・note.sync-log・a8.ui-last-run を 注意 8／失敗 15 程度にする。
  - `gsc.indexing-history` に freshness を宣言し、`check-gsc-indexing-due.mjs:22` の直書き 7 日をやめる。
  - `check-gsc-ui-due` は「集める期日」と「止まっている」を分ける（ops の `--fail-on-due` で毎月最大 6 日赤になるのを防ぐ）。
  - `quality-audit.mjs:225-238` の note（読み手と経路の説明）を直す。
- **スキル**：週次・月次の SKILL（`weekly-review/SKILL.md:71,92,133` などのログイン取得）を「収集の記録を読む」に直し、`.claude/config/review-wiring.json` も同じ commit で直す。
- **DN-0828**：A8 の取得が失敗しても `ui-last-run` が進む不具合を直す。進めるのは成功したときだけにする。
- **テスト**：`weekly-collect-plan` の単体テスト、`tests/weekly-review-launchd.test.mjs` の stub に収集の段を足す。
- **確認**
  - `node scripts/weekly-collect.mjs --plan --json` が exit 0
  - `npm test`
  - `npm run quality:audit:ci`

### P2 手で 1 回流して確かめる
- 他セッションの Chrome と Playwright を閉じてから `npm run weekly-review:install -- --run-now` を実行し、Monitor で終わるのを待つ。
- 確認
  - `node scripts/weekly-collect.mjs --verify-last` が上の合格基準で exit 0
  - 収集用 worktree の `git status --porcelain` が空
  - 記録の commit が origin/develop にある
- Claude の段の試運転
  - 土曜の worktree で、短いプロンプトの `claude -p` に `.tmp/claude-out/.claude/todo/weekly.md` を書かせる。
  - `apply-claude-out --dry-run` で写す対象を確かめる。
  - ScheduleWakeup が拒否されることも確かめる。
- **失敗したら切り替えない**。直して流し直す。古い仕組みはそのまま動いている。

### P3 切り替え（同日・一括）
- CI を止める：`gh workflow disable` で `login-collectors`・`scheduled-publish`・`ops-write`・`note-sync-live` を止める（`post-youtube-scheduled` は止めてある）。
- Mac の launchd を外す：auth-session-refresh・gsc-local・coconala-local・note-sync を `npm run <名前>:install -- --uninstall` で外す。
- worktree を消す：上の 4 本の lock を外して `git worktree remove` する。中に残る状態ファイルは先に中身を確かめる。
- 確認
  - `launchctl list | grep doboku-note` が weekly-review と disk-hygiene の 2 行
  - `gh workflow list --all` で上の 4 本が disabled_manually

### P4 PR-B：CI と Mac の後片づけ・台帳・CI の統合（DN-0821・0822、新しいカード）

**消すワークフロー（7 本）**
- `login-collectors.yml`・`ops-write.yml`・`scheduled-publish.yml`
- `note-sync-live.yml`（P1 で土曜の流れへ移したので）
- `cf-cleanup.yml`（使い捨て）・`fetch-ig-insights.yml`（一度も動いていない）
- `post-youtube-scheduled.yml`（運営者の決定）

**統合して消すワークフロー（4 本）**
- `content-quality-audit.yml`：独自の 5 検査（price-consistency・note-attachments・intro-benefit・gate-coverage・affiliate-prose）を quality-audit へ移す。
- `link-audit.yml`：外部リンクと X の生存確認を、quality-audit の report 区分と weekly-review-guard の digest へ移す（内部リンクは既に ci:true）。
- `r2-audit.yml`：diff-r2 を `ogp-supply.yml` の月曜の回へ移す。
- `verify-yt-status.yml`：`registry-reconcile.yml:66-72` が同じスクリプトを毎日回しているので、あちらの `|| true` を外して Issue へ流す。

**その他の CI の手直し**
- `competitor-scan.yml` の Instagram の段を外す（SNS 保留）。
- `.github/actions/restore-auth-state` を消す。

**Mac の後片づけ**
- 4 本の `scripts/install-*-launchd.mjs`・`scripts/scheduled/*.sh`・`*.plist.tmpl`、Windows の `install-auth-session-refresh-task.mjs` と `.ps1` を消す。
- package.json の行も消す。ルーティン本体（`gsc-local-routine.mjs`・`coconala-local-routine.mjs`・`note-sync-routine.mjs`）は土曜の段から呼ぶので残す。

**CI-auth のデッドコード**
- `scripts/playwright-auth.mjs` の ci-restore・ci-writeback・ci-plan・export・keygen
- `scripts/lib/playwright-auth-state.mjs` の `attachCISession`（呼び出し側の約 11 本も直す）
- `scripts/ops-write.mjs`・`scripts/lib/ci-write-gate.mjs`・`.claude/config/ci-write-operations.json`
- `auth-session-refresh.mjs` の `--ci`・`--export`・`--dispatch-due`
- `credential-store.mjs` の CI の環境変数、`playwright-launch.mjs:24`
- `.claude/config/playwright-auth-profiles.json`：`ci.readOnlyScripts`・`writeScripts` を `collectors`・`writers` へ移して（P5 のガードが使う）、ci ブロックは消す。

**自動化の台帳（新規）**
- `config/automations.json` を作る。
  - 項目：runner（mac-launchd・github-actions）・source・schedule・login のサービス・writes（データセット id）・readers（quality-audit の id・スキル・画面）・状態
  - `datasets.mjs` に `config.automations` を宣言し、zod の型 `ConfigAutomations` を `scripts/lib/dataset-schemas-config-ops.mjs` に書く。
- 新規 `scripts/check-automations.mjs` を quality-audit の ci:true に入れる。次の 4 つを見る。
  - 台帳と `.github/workflows/*.yml`・`scripts/scheduled/*.plist.tmpl` が双方向で一致すること（js-yaml を使う）
  - schedule が一致すること
  - どのワークフローも `DOBOKU_AUTH_`・`restore-auth-state`・`playwright-auth.mjs ci-` を使っていないこと
  - writes と readers が実在すること
  - 対象数と実検査数を出力する。
- `check-playwright-auth-wiring.mjs` の検査 6・7・9 はこれに置き換える。
- 管理画面に `/ops/automations` を作る（DataTable・PanelCard・StatusBadge）。
  - 台帳と、writes の最終日（`freshnessOf`）と、土曜の収集の結果（`state.weekly-collect`）を出す。
  - サイドバーは `config/domains.json` の ops の nav、`/ops/auth` の後に置く。`tools/admin-app/README.md` の表も足す。
  - `/ops/auth` の CI の列は外す。
- `docs/operations/04_自動化マップ.md` は、台帳と管理画面への短い案内に縮める（1 トピック 1 正本）。

**巻き込まれるものの更新**
- `config/workflow-health.json`：消すワークフローの行（login-collectors:67・scheduled-publish:91 など）
- `.claude/config/gate-parity-baseline.json` か quality-audit への登録（呼び出し元が無くなる検査スクリプト）
- テスト：`auth-credential-ssot`・`ci-data`・`ops-write`・`playwright-auth-*`・`x-publish-scheduled` など
- 案内文：`check-a8-report-due.mjs:42`、`check-sales-freshness.mjs:191`、管理画面の `affiliate/page.tsx`、`note-sync` の案内
- ドキュメント：commands.md・playwright-auth-profiles.md・gsc-management.md・sales-tracking.md・workflows.md・ci-cd-security-hardening.md、SKILL の ops-write の案内 5 本
- measurement-incidents.md に今回の教訓を書く（main の YAML で cron が動く・sensitive file・600 秒）

**確認**
- `npm test`
- `npm run quality:audit:ci`
- `npm run check-automations`
- `git grep -lE "DOBOKU_AUTH_|restore-auth-state" .github` が 0 件
- PR の CI が緑

### P5 PR-C：セッションはログインしない（DN-0823）
- **ガード**：`scripts/lib/playwright-auth-profile.mjs` の resolver が、`collectors` に載るスクリプトを `CLAUDECODE=1` のとき拒否する。
  - `weekly-collect` が付ける `DOBOKU_WEEKLY_COLLECT=1` のときだけ許す。
  - 書き込み（writers）は人の依頼で使うので許す。
  - 環境変数を注入する形でテストを書く。
- **`scripts/session-start.mjs:33-36`**：セッション開始ごとにログイン済みの X プロファイルを開く処理（x-sync-status）を外す。
- **スキル**：a8-report・affiliate-status（読む部分）・coconala-analytics・google-search-growth・ig-reconcile・playwright-auth を「記録と最終取得日を読む」に直す。古い CI の記述も直す。
- **エージェント**：`a8-report-collector`・`gsc-browser-collector` を退役させる。coconala-operator と kdp-operator の読む部分の記述を直す。
- **台帳との結合**：skills-guide.md・skills-registry.md・agents-registry.md、`npm run sync-codex-compat`、review-wiring.json。
- **ドキュメントの同期**：コミット前に `doc-sync-auditor` で差分と文書を突き合わせ、旧仕様化した記述を直す。
- **確認**
  - `npm run check-doc-coupling`
  - `npm run check-codex-compat`
  - `npm test`
  - `npm run quality:audit:ci`

### P6 backlog 全体の棚卸し
- 今回のカードを `todo:complete` で完了にする（検証の結果を `--verify` に書き、不具合は再発防止を書く）。
  - DN-0817〜0823・0828・0818
  - DN-0816：毎日のログイン維持が無くなり、KDP は入り直したので、土曜の段の結果で判断する
  - DN-0763：土曜の note 同期のカバー保存の結果で判断する
- 置き換えたカードを「DN-0817 で置き換え」として閉じる：DN-0479・0483・0484・0362（と関連の 0480・0481 があれば）。
- DN-0829 は 10/31 の通しの確認だけを残作業に絞る。
- **全体の棚卸し**
  - `backlog-curator`（`/backlog-sweep --audit`）に全カードを監査させる。
  - KEEP・DELETE・TRIM・RESEED を適用する（完了の根拠は commit と実体で裏取りする）。
  - W44 の `weekly.md` を合わせる。
- 確認
  - `npm run check-backlog-schema`
  - `npm run check-dispatch-log`
  - `npm run check-task-plan-links`

### P7 運営者のチェックリスト（私は実行しない、またはその都度確認を取る）
- KDP の入り直し（P0）
- GitHub Secrets `DOBOKU_AUTH_*`（ID/PW 10 個と AGE_IDENTITY）の削除。`gh secret delete` を私が流す場合は、その前に確認を取る。
- R2 の private の `auth-state/` の削除
- Windows のタスク `\doboku-note\auth-session-refresh` の削除（Windows で `schtasks /Delete /TN "\doboku-note\auth-session-refresh" /F`）
- 自動化の Issue を閉じる：#1186（login-collectors-publish）・#1087（auth-state-kdp）・#864（note-sync）。channel が無くなるので人が閉じる。

## 戻し方
- P2 で失敗したら切り替えない。
- P3 の後に問題が出たら、`gh workflow enable <名前>` と、git の履歴から `npm run <名前>:install` で戻す（PR-B のマージ前なら、install スクリプトはまだ develop にある）。

## 最後の確認
- 全 PR のマージ後：`npm test`・`npm run quality:audit:ci`・`npm run check-automations` が緑。
- `launchctl list | grep doboku-note` が 2 行、`git worktree list` が 3 行（人の checkout・weekly-review・weekly-collect）。
- 管理画面 `/ops/automations` をブラウザペインで開き、台帳と最終取得日が出ることを画面で確かめる。
- deploy は `/deploy` の判断なので、この計画には含めない。
- 10/31（土）の自動実行で、収集・レビュー・`.claude/todo/weekly.md` の写し・後段がすべて rc=0 になることを確かめる（DN-0829 の残作業）。
