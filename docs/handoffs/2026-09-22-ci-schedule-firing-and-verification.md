---
title: 計測 CI の schedule 発火検知と実証状態
type: handoff
created: 2026-09-22
status: active
---

# 計測 CI の schedule 発火検知と実証状態（2026-09-22）

前提は [2026-09-21-ci-login-collectors-and-write-ops.md](2026-09-21-ci-login-collectors-and-write-ops.md)。本 handoff は「証拠ベースで見直し・不足の修正・実 CI 検証」の作業記録。

## 確定した事実（証拠）

- **login-collectors の cron は 2026-09-21 に main へ載った**（`f715912e2`）。有効サービスは a8(月)/coconala(火)/note(水)。google/instagram/kdp/afb/x/brain は `ci.enabled:false`。
- **event=schedule の実績は 0 件**（2026-09-22 時点）。緑は全部 `workflow_dispatch`（canary）。最初の cron 枠は a8 の月 21:20 UTC（=2026-09-21T21:20Z）で、この時刻を過ぎたばかり。
- 3 サービスは **dispatch canary で CI 実データ取得・保存・記録・照合まで成立**（committed 済み）:
  - a8: `a8-results.json` updatedAt 2026-09-21T15:17Z / `check-a8-report-due` OK（0日前）
  - coconala: `analytics-snapshot.json` fetchedAt 2026-09-21T06:27Z / `check-coconala-analytics` OK
  - note traffic: `referrers-2026-08.json`・`articles-pv-2026-08.json` fetchedAt 2026-09-21T13:46Z / `check-sales-freshness` の月次照合 ¥71,640 一致
- note-sales（購入者一覧）は CI で「パスワード再確認画面」ABORT のためローカル儀式に残す（`check-sales-freshness` が催促）。
- **stats47 の実 schedule（2026-09-21T15:53Z main）では GSC・ココナラ・afb が pass**。doboku-note の「google は CI 1 回で失効」実測と食い違う（stats47 は google-admin profile の coverage export、doboku は google-console の UI CSV）。google は現状 disabled のままだが「hosted CI 不可」は確定ではなく、self-hosted runner 化とは別に再検証の余地がある（本セッションでは変更せず）。

## 本セッションで修正した不足（PR #569 → develop）

**cron 発火の異常隠蔽を止める**（契約 D「event=schedule と手動成功を区別」「未発火・古いを検知」）:
- `check-workflow-health.mjs` は success/連続失敗を event で区別せず、dispatch 成功が cron 停止を永久にマスクしていた。
- `auditSchedule`（純関数）を追加し、`event=schedule` の run だけで発火の有無・鮮度を独立判定（conclusion は問わない＝発火≠成功）。
- `workflow-health.json` の login-collectors に `schedule` 契約（activeSince 2026-09-21T21:20Z / maxAgeDays 8 / graceHours 12）。
- 読み手は既存 `weekly-review-guard.yml`（develop・週次）→ Issue channel `workflow-health`。
- テスト `tests/check-workflow-health.test.mjs` 9 ケース（0件/古い/手動成功マスク/境界/後方互換）。

## 実証段階（契約の 6 段階）

| 段階 | a8 | coconala | note(traffic) | schedule 検知(#569) |
|---|---|---|---|---|
| 1 実装済み | ✓ | ✓ | ✓ | ✓ |
| 2 ローカル検証 | ✓ | ✓ | ✓ | ✓ (9 tests) |
| 3 実CI 取得/保存/記録一致 | ✓ (dispatch) | ✓ (dispatch) | ✓ (dispatch) | — |
| 4 実 schedule 起動 | **未**（初回枠が到来したばかり） | 未（火 21:20Z） | 未（水 21:20Z） | n/a |
| 5 別日 schedule 連続 2 回 | 未 | 未 | 未 | n/a |
| 6 失敗時停止と復旧 | 部分（restore≠authで exit2＋Issue／復旧は Mac 再export 待ち） | 同左 | 同左 | — |

## 翌日以降に確認すること（引渡し）

1. **a8 schedule 発火**: 2026-09-22 06:20 JST 前後。`gh run list --workflow login-collectors.yml --event schedule` に a8 の run が出るか。出れば段階 4 達成。出なければ #569 の watchdog が 2026-09-22 09:20Z（猶予明け）以降 `schedule-never-fired` で赤にする → Issue `workflow-health`。
2. **coconala/note の schedule**（火/水）も同様に確認。3 つが別日に 2 回連続で緑になれば段階 5。
3. **未達時の次の行動**: schedule が発火しないなら (a) main の cron 定義・GitHub の schedule 有効性を確認、(b) 60 日無活動での schedule 自動無効化を疑う、(c) 直近 dispatch は緑なので機構自体は健全＝発火経路の問題に絞る。
4. google の hosted CI 可否は stats47 の GSC 成功を踏まえ別途再検証（本セッションでは未着手）。

監視の引渡し先は `check-workflow-health`（週次 weekly-review-guard）と各サービス freshness（日次 ops-audit）。壁時計依存の観測は ci:true に置かない。
