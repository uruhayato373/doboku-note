---
name: weekly-review-automation
description: 週次レビューは md 保存方式 + クラウドルーティンで自動化。NSM オフラインデータの窓サイズに注意
metadata: 
  node_type: memory
  type: project
  originSessionId: e29cd8cf-5030-4fb4-a57e-04ec9ebbacc7
---

週次レビュー（`/weekly-review`）を 2026-05-30 に md 保存方式へ変更＋クラウドルーティンで自動化した。

- **出力先**: GitHub Issue 廃止 → `docs/reviews/weekly/YYYY-Www-review.md`（plan は `YYYY-Www.md`）。CLAUDE.md §8「Issue 廃止」と整合（`fetch-metrics.yml` 96行でも CI レベルで Issue 廃止確認済み）。
- **2026-09-19 からローカル実行**: 週次レビューは土曜に対話セッションで `/weekly-review`。クラウドルーティン `doboku-note weekly PDCA`（id `trig_01Edgim5qXCiGwKtnL4AVEmM`・cron `0 0 * * 6`）は enabled:false で退役（許可プロンプト沈黙と Playwright/tsx 依存のため）。review + 翌週計画 + **PR**（base develop）まで実施。NSM は `ga4-channel-organic-*`（7日窓）優先に更新済み。これが doboku-note 週次の本命。**2026-06-14 にユーザー要望で日曜 22:00→金曜 20:00 JST へ変更**（金 06:00 CI のメトリクスが当日朝に揃うため鮮度良好）。**2026-06-15 に obsidian 週次ログ（旧 `weekly-doboku-review`）を Phase 9 として統合**：source に obsidian repo を追加し、PR（doboku-note）に加えて obsidian `notes/claude/agent-log.md` への週次ログ追記＋push まで1本で実施。Phase 1-8（PDCA）と Phase 9（obsidian）は**疎結合**で、PDCA が失敗しても Phase 9 は doboku-note の `git log` から独立実行する。
- **重複で作って無効化**: `doboku-weekly-review`（id `trig_01RqdVux1fKJtgYs1PKt9GdX`、金 18:07 JST）は今回新規作成したが上記 PDCA と同一ファイルを生成する重複だったため **enabled:false に無効化**（2026-05-30）。
- **統合で無効化（2026-06-15）**: `weekly-doboku-review`（id `trig_019xPxsZ3RWNAJM9y7JTzPMV`、obsidian `agent-log.md` 専用の軽量ログ routine）は **PDCA の Phase 9 へ統合し enabled:false に無効化**（金20:00・同 repo の二重起動と7日コミット集計の重複を解消。ユーザー要望「金20:00の2本を1本に」）。存続する doboku-note 系 routine: `daily-doboku-progress-sync`（毎日 09:00 → obsidian 進捗ログ）、`doboku-todo-weekly-refresh`（毎週月 09:00 → weekly.md リフレッシュ PR）、`doboku-note cem-qa monthly scoring`（毎月1日 23:00 → CEM 採点 PR）。 統合時に旧プロンプトの集計窓ロジック（直近7日窓 `date -d '7 days ago'`・ISO週番号 `%G-W%V`、旧「日曜起点 `date -d 'sunday'`」は金曜実行で未来日になり壊れる罠を修正済み）を PDCA Phase 9 に引き継いだ。
- **ルーティンの制約**: リモートで repo の独立 checkout を持つが、**ローカル creds (.env.local) は無い** → `metrics-reader.mjs` のライブ GA4/GSC は不可。CI（金 06:00 JST `fetch-metrics.yml`）がコミットした `.claude/state/metrics/{ga4,gsc,psi}/` の JSON を読む設計。
- **Agent I 追加（2026-06-24, commit 35490f02b）**: Phase 1 に「X 予約キュー投入 surfacer」を新設。`scripts/x-queue-surfacer.mjs`（オフライン・status.json+tweets.md読み・creds 不要）が、コミット済みだが X 予約キューへ未投入の下書きで go-live が lookahead(8日)内のものを DUE/OVERDUE 列挙→「## SNS予約キュー投入（X）」。直前カウントダウンの週次小分け投入（[[project_x_account_reboot_2026_06]]）の投入忘れ＝キューの穴を防ぐ。**ルーチンは step4 で SKILL を Read 実行する設計＝SKILL 編集だけで自動反映（トリガー本体の編集不要）**。実投入はローカル publish-x で人手（クラウドは Playwright プロファイル無しで不可）。`npm run x-queue-surfacer`。

**NSM オフラインデータの落とし穴**: CI 既定の `ga4-channel-*.json` / `gsc-query-*.json` は **28 日窓**で、これだと WoW にならない（手動レビューが使う `metrics-reader.mjs` は 7 日窓を明示要求するので正確）。対策として PR #229 で `fetch-metrics.yml` に 7 日窓スナップショット（`ga4-channel-organic-*` = JP Organic = NSM、`gsc-date-*`）を追加。SKILL.md のオフライン経路＋ルーティン prompt は `ga4-channel-organic-*` 優先・無ければ 28 日窓にフォールバックし「28 日ローリング」と明記する。**クリーンな 7 日 WoW は #229 merge ＋金曜 CI が 2 回走って organic スナップショットが 2 週分たまってから**。

関連 PR: #228（skill md 化＋offline reader）、#229（CI 7 日窓）。**両方 develop に merge → develop→main までデプロイ済み（2026-05-30）**。手動 fallback は `metrics-reader.mjs`（ローカル creds 必要）。

**教訓（routine 重複）**: `/schedule` で routine を作る前に必ず `RemoteTrigger {action:"list"}` で既存を確認すること。doboku-note には既に weekly PDCA / obsidian weekly / daily sync / CEM monthly の routine 群があり、確認せず weekly-review を新規作成して重複させた。CI 7日窓スナップショット＋SKILL.md md化は正典 #14 にも効く改善なので無駄ではなかったが、routine 自体は無効化で後始末した。

**教訓（GitHub Actions の落とし穴）**: `on: schedule`（cron）のワークフローは**デフォルトブランチ（main）のファイルから実行される**。`fetch-metrics.yml` の変更を develop に merge しただけでは金曜の自動実行に効かず、main までデプロイして初めて有効化される。今回これに気づかず一度ハマった。＋ `gh pr merge` は origin を更新するがローカル develop ポインタは追従しないので、deploy 前に `git fetch` + `git merge origin/develop`（ローカル develop ではなく remote-tracking ref）を使うこと。クリーン 7 日 WoW は organic スナップショットが 2 週分たまる 6/12 のルーティンから。[[ga4-default-filter]] [[project_ga4_default_filter]]
