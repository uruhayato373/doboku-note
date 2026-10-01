---
name: feedback_cloud_routines_minimized
description: "自動化の置き場: クラウドルーティン0本(週次はローカル土曜)・list不可/updateでevents消滅・CI赤はIssue(自動クローズ)で拾う・ログイン要る処理のCI化前にauth notesを読む(googleはhosted不可)"
metadata:
  type: feedback
---

## クラウドルーティンは全停止（2026-06-27 棚卸し→2026-09-19 最終）
2026-06-27 にクラウドルーティン（claude.ai RemoteTrigger）を棚卸しし「できるだけ利用しない方向」へ削減。**最終状態（2026-09-19）: 稼働(enabled:true)は0本**。`doboku-note weekly PDCA`（`trig_01Edgim5qXCiGwKtnL4AVEmM`・cron `0 0 * * 6`）も enabled:false で退役し、週次レビューは**ローカルの対話セッションで土曜に `/weekly-review`**（催促＝SessionStart の check-weekly-review-due・backstop＝月曜 guard）。退役理由: サンドボックスでは `.claude/` 配下の書き込みが許可プロンプトで止まり数日沈黙（09-18 は W38 欠落）、Playwright/tsx 依存の検査が動かず材料が欠ける。本文は保持してあるので再開は `update {enabled:true}`。
- **停止した(enabled:false)もの**: doboku: daily-doboku-progress-sync / doboku-todo-weekly-refresh / cem-qa monthly / note-funnel monthly（note-funnel は2026-08-16時点で404＝UI削除済み）。stats47: weekly-blog-10-articles / weekly CWV PR / weekly PDCA（3本とも停止）。
- **Why**: ルーティンは毎回 compute/トークンを消費し、大半は on-demand スキルで代替できる。

**API 操作の罠（2026-08-16 実測）:**
- **`list` はページ送りできない**: `has_more:true`/`next_cursor` が返るが cursor・limit を渡しても無視され同じ先頭ページ。先頭20件は stats47 の使い捨て `send_later` トリガーで埋まり正典ルーティンまで辿り着けない→trigger_id を控えて `get` で直接引く。
- **`update` は nested オブジェクトを丸ごと置換**: `job_config.ccr.session_context` だけ送ったら `events`（＝プロンプト本文4KB）が消えた。触る前に必ず `get` で全文を控え、`environment_id` と `events` を同送。`environment_id` 欠落は HTTP 400（`job_config must set ccr.environment_id`）。
- **delete アクションは無い**（list/get/create/update/run のみ）。完全削除は claude.ai Web UI のみで、claude.ai はブラウザツールからポリシーで遮断＝人手。停止=`update {enabled:false}` は可逆。

**故障の型（2026-08-16）**: 「停止」より「発火しているのに沈黙」が起きる。2026-W33 欠落時、ルーティンは enabled のまま毎週発火（`last_fired_at` 2026-08-14）していたのに2026-07-31 以降3回連続で成果物ゼロ。診断は `git ls-remote --heads origin "*weekly-pdca*"`（空＝早期失敗）と過去の週次 commit の author（ルーティン産は `claude/weekly-pdca-*` ブランチの PR 経由・人手は直接 commit）。対処＝ルーティン本文に「PR に到達しなければ `scripts/report-automation-failure.mjs` で起票してから終了」を明記。
**How to apply**: 停止機能の手動代替は `/plan-weekly`（todo更新）・`/weekly-improve`（cem採点系）・`/audit-note-funnel`（note導線監査）。新規ルーティン作成前に必ず `/routines`（または RemoteTrigger list）で重複確認（CLAUDE.md「クラウドルーティン作成ルール」・list 制約は上記）。詳細な調査手順は `.claude/knowledge/reference/workflows.md`「発火の信頼性」（[[reference_doc_sync_system]] ではない）。

## CI/CD の失敗は GitHub Issue（自動クローズ）で拾う（ユーザー決定 2026-09-18）
CI/CD の赤は `automation-failure` Issue で拾う。投稿・配信・転記の遅れ（quality-audit の ops 区分）も同経路で、Issue を repo owner に assign して GitHub 通知メール（Gmail）で届け、Slack は secret `SLACK_WEBHOOK_URL` を足したときだけ送る。
- **Why:** 2026-09-18 の調査で Pre-merge 勝率23%（membership-drip が全 PR を赤にしていた）と Issue open 8件放置（クローズが人手）が判明。ユーザーは「CI/CD は Issue で拾えばよい」「投稿もれは Slack や Gmail で通知」と決めた。branch protection は CI bot の develop 直 push を壊すので採らない。
- **How to apply:** 壁時計依存の検査は `ops: true, ci: false`（[[reference_quality_audit_system]]・ci:true に置かない）。新しい起票 channel を足すときは同じ workflow の成功経路に `report-automation-failure.mjs --resolve --channel X` を配線（`tests/report-automation-failure.test.mjs` が未配線を止める）。通知手段を増やす提案（メール直送・別 SaaS）はしない。真実源 `.claude/knowledge/reference/information-architecture.md` の限定例外ブロック。

## ログインが要る処理の CI 化は提案前に auth notes を読む（2026-09-24）
外部サービス（google / instagram / kdp / afb / x 等）の処理を「CI に載せる」提案・起票の前に、`.claude/config/playwright-auth-profiles.json` の当該サービスの `notes` と `ci`、`.claude/knowledge/reference/measurement-incidents.md` の 2026-09-21 エントリ（hosted runner での復元実測）を読む。
- **Why:** 2026-09-24、GSC 登録リクエストの CI 化を DN-0285 として「hosted runner で probe-only canary→卒業」で起票したが、google は 2026-09-21 に hosted runner（datacenter IP）で復元した直後に Google が Mac 側を含めてセッションを全面失効させた実測があり、registry の notes に「hosted CI 不可・self-hosted runner かローカル儀式」と書かれていた。起票どおりだと Mac のログインまで壊す手順だった。DN-0286 実装中に notes を読んで気づき、self-hosted runner 限定設計（gsc-request-indexing.yml・requiresSelfHostedRunner）に直して DN-0285 を作り直し、さらにリポジトリが公開で self-hosted runner も危険と分かり最終的に Mac の launchd（gsc-local）にした。
- **How to apply:** 「CI に置きたい」と言われたら registry の `ci.enabled` と `notes`、measurement-incidents の実測を確認し、hosted 不可のサービスは Mac のローカル定期実行（launchd）として提示。self-hosted runner はリポジトリが公開だと fork の PR に Mac 上でコードを実行されうるので、公開・非公開を確かめてから出す（2026-09-24 に見落として一度勧めた）。hosted の canary は勧めない。関連: [[feedback_ssot_no_hand_copies_self_verify]]
