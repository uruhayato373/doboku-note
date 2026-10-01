---
name: project-ci-encrypted-state-login-collectors
description: "暗号化 storageState の hosted CI は coconala/a8/note(traffic) のみ成立（2026-09-21 実測）。google/instagram/kdp/afb/x は不可（セッション失効・ボット挑戦・再認証）。brain は撤退"
metadata: 
  node_type: memory
  type: project
  originSessionId: 3d31dc7a-199e-4849-9e8c-9fa9c87e117b
  modified: 2026-09-21T21:32:02.055Z
---

2026-09-21 に 3 PR を起票（#548 API 経路・#549 encrypted-state 基盤・#550 書き込み。#550 は #549 に積む）。ユーザー決定: self-hosted runner ではなく暗号化 state を hosted CI へ、X は投稿も Playwright で頻度ゲート付き、書き込みも CI（承認は dispatch の plan hash / 承認済みキュー）。**Instagram は Meta の利用制限で Graph API トークンを発行できない**ため、照合（verify-ig-status）も予約投稿（publish-ig-bs）も Business Suite セッションの Playwright で CI 化（Graph API 系コードは dispatch 専用で待機）。

**設計の核**: Mac の `auth:export` が storageState を age 暗号化して private R2 `auth-state/<svc>/{state.age,state.prev.age,manifest.json}` へ（転送は rclone `doboku-r2`・Mac に R2 key を置かない方針を維持）。CI は `auth:ci-restore` で RUNNER_TEMP 配下に復元。resolver が CI を自動検出し、`DOBOKU_AUTH_SESSION_MODE=encrypted-state` + tmp root + allowlist（`ci.readOnlyScripts` / `writeScripts` は `DOBOKU_CI_WRITE_PLAN_SHA256` 必須）以外は拒否。plan hash は**ブラウザを開かず repo の inputs から**決める（ops-write）。X は queue 項目の hash。identity は Mac の auth root `age/identity.txt`（0600）と Secret のみ、公開 recipient はレジストリに commit 済み。

**実 CI の結論（2026-09-21・全サービス export 後に canary）**: hosted runner（datacenter IP・headless Chrome）で成立したのは **coconala（全工程・毎回緑）・a8（3 レポート。period-daily は headless で期間入力欄が見つからず対象外）・note（traffic・添付 live 615 本 67 分・会員限定。売上 note-sales-fetch は購入者一覧のパスワード再確認で ABORT＝ローカル儀式）** の 3 つだけ。**google と instagram（Business Suite）は CI で 1 回使った直後に Google/Meta がセッションを全面失効（Mac も CI 書き戻しも expired）**、kdp は Amazon が再認証要求（Mac も失効）、x は「セキュリティ検証の実行」ボット挑戦、afb は別プロセスへ持ち出せない。これらは `ci.enabled:false`。brain はユーザー決定で撤退（CI 対象外）。残す経路は Mac 自身を self-hosted runner にする以外に無い。cron: a8 月・coconala 火・note 水（06:20 JST）。

**Why:** 計測の欠落（sales/kdp/coconala/A8/GSC UI の freshness 赤）はローカル儀式依存が原因。ログインだけ人が残し、以後の定期取得と承認済み書き込みを機械に渡す。

**How to apply:** 「CI で authenticated が 1 回出た」を成功と呼ばず、**CI 実行後に Mac 側 `auth:status` が authenticated のままか**まで確認する。Google/Meta/Amazon 系は hosted CI に載せない。Mac 側セッションが失効したら `npm run auth:login -- --service <svc>` で回復（google/instagram/kdp は 2026-09-21 に失効中）。書き込み（ops-write / scheduled-publish）は基盤のみで canary 未実施。手順は handoff 2026-09-21。関連 [[reference-ci-encrypted-state-gotchas]]

**2026-09-22 追記（証拠ベース再監査）**: cron は main に載ったが **event=schedule の実績は 0 件**、緑は全部 `workflow_dispatch`（canary）。「cron 稼働中」は誤り＝正しくは「cron 定義済み・初回 schedule 発火は未実証」。`check-workflow-health` は event を区別せず dispatch 成功が cron 停止を永久にマスクしていた（契約「手動成功による異常隠蔽」）→ PR #569 で `auditSchedule`（event=schedule のみで発火の有無/鮮度を判定）と workflow-health.json の schedule 契約を追加。3 サービスは freshness ゲート（a8-report-due/coconala-analytics/sales-freshness 月次照合 ¥71,640 一致）が緑で記録に接続済み。**stats47 は実 schedule で GSC/ココナラ/afb が pass**しており「google は hosted CI 不可」は未確定（disabled は維持）。段階 4（実 schedule 起動）・5（別日連続 2 回）は翌日以降観測＝handoff 2026-09-22。

**2026-09-23 ユーザー決定: Instagram は Graph API を使わない**（Meta の制限が解けても戻さない）。`fetch-ig-insights` / `ig-graph-publish` は使わず、インサイトは欠測のまま扱う。照合・予約投稿は Playwright 経路のみ。
