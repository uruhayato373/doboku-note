---
name: project_affiliate_3asp_site_guard
description: アフィリは3ASP(A8/もしも/afb)横断。運用SSOT=.claude/knowledge/reference/affiliate-operations.md。3ASPともstats47と同居しafbは既定stats47→asp-site-guardが例外で停止
metadata: 
  node_type: memory
  type: project
  originSessionId: 79005ff2-16cb-437e-9284-ce3988227180
  modified: 2026-07-27T08:08:46.367Z
---

3 ASP（A8 / もしも / afb）横断のアフィリ提携運用基盤（2026-07-27 構築・feature/a8-report-pipeline）。

- **運用 SSOT = `.claude/knowledge/reference/affiliate-operations.md`**（旧 `docs/project/04_運営/02_アフィリエイト提携状況.md` は解体・削除）。機械可読は `.claude/state/ads/affiliate-catalog.json`（提携状態）＋ `.claude/config/affiliate-asp.json`（接続設定・実機確定値のみ）。
- **3 ASP すべてで doboku-note と stats47 が同一口座に同居し、afb は既定が stats47**。切り替えずに読むと他サイトのデータを自分のものと誤認する。**私は実際にこれで stats47 の一覧を読み「afb に建設系 0 件」と誤報告した**。
- 再発防止＝`scripts/lib/asp-site-guard.mjs` の `assertSiteOrThrow` が**戻り値ではなく例外**で止める。事故の原因は「不一致を警告して続行できた」ことなので、**警告して続行できる形に戻さない・`--force` 相当も作らない**。回帰テスト `tests/asp-site-guard.test.mjs`（事故そのものをケース化）。
- 運用: `/affiliate-status`（read-only 照合）・`/affiliate-apply`（dry-run 既定・`--commit` gate・**申請は規約同意なので都度ユーザー許可**）・`affiliate-operator`（3 ASP 横断オーケストレーター）。A8 の成果取込（`/a8-report`）と A8 の案件開拓（`/scout-asp`）とは守備範囲が直交。
- **「見つからなかった」と「探せなかった」を混同しない**: カタログの `status` は `none`（未提携と確認）と `unknown`（調べていない）を分けている。afb 走査は検索 5 語のうち 2 語が回線タイムアウトで未取得＝「afb に建設案件が無い」ではない（`_openQuestions` に記録）。
- 実走検証（3 ASP で `affiliate:status` を通す・わざと stats47 を選んで throw を確認）は**未実施**。

関連 [[project_affiliate_mat_ssot]] [[feedback_prevention_over_patching]] [[feedback_metrics_cicd_supplied]]
