---
name: ci-signal-issue-channel
description: CI/CD の失敗は GitHub Issue（自動クローズ）で拾い、投稿・配信もれは Issue の担当者割当（Gmail）＋任意で Slack webhook に通知する——ユーザー決定（2026-09-18）
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 4493fa3c-b0d0-4f24-9b81-ba293298dc72
  modified: 2026-09-18T00:28:14.102Z
---

CI/CD の赤は `automation-failure` Issue で拾う。投稿・配信・転記の遅れ（quality-audit の ops 区分）も同じ経路で、Issue を repo owner に assign して GitHub 通知メール（Gmail）で届け、Slack は secret `SLACK_WEBHOOK_URL` を足したときだけ送る。

**Why:** 2026-09-18 の調査で Pre-merge 勝率 23%（membership-drip が全 PR を赤にしていた）と Issue open 8 件放置（クローズが人手）が判明。ユーザーは「CI/CD は Issue で拾えばよい」「投稿もれは Slack や Gmail で通知」と決めた。branch protection は CI bot の develop 直 push を壊すので採らない。

**How to apply:** 壁時計依存の検査は `ops: true, ci: false`（[[reference_quality_audit_system]]）。新しい起票 channel を足すときは必ず同じ workflow の成功経路に `report-automation-failure.mjs --resolve --channel X` を配線する（`tests/report-automation-failure.test.mjs` が未配線を止める）。通知手段を増やす提案（メール直送・別 SaaS）はしない。真実源は `.claude/knowledge/reference/information-architecture.md` の限定例外ブロック。
