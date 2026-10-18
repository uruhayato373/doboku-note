---
name: feedback_commit_others_wip_run_ci_gate
description: 他セッションが残した未コミットの作業を develop に入れる前に quality:audit:ci を回し、関連する state（AI 判定台帳など）の取りこぼしを探す
metadata:
  node_type: memory
  type: feedback
  originSessionId: 3b51ebc6-8206-49d3-93ac-6d637cf699df
  modified: 2026-10-18T00:06:14.611Z
---

他のセッションが作業ツリーに未コミットで残した成果（例: 2026-10-17 の 2級 YouTube シリーズ 8 本の台帳・動画パック）をコミットするときは、個別の check を数本通しただけで push しない。`npm run quality:audit:ci`（CI と同じゲート）を回してから push する。

**Why:** 2026-10-17 に check-content-registry・check-video-content・関連テスト 3 本だけを見て develop へ入れ、CI の quality audit で 3 検査（content-registry R10・youtube-shorts・youtube-authority-metadata）を約 1 日赤くした。手元の check-content-registry が PASS だったのは、AI 画像の判定台帳（`.claude/state/quality/ai-image-review-ledger.json`）が手元にだけあったから。同じ作業の産物が別ファイル（state・台帳・判定記録）に散っていた。

**How to apply:** 未コミットの他人の作業を拾うときは、(1) その作業が触った全ファイル（state・ledger・config を含む）を git status から洗い出して同じコミットに入れる (2) push 前に quality:audit:ci を回す (3) 新しい型の成果物（Shorts なしのパックなど）は、旧型を前提にした件数決め打ちの検査・テストに当たると想定する。[[feedback_commit_result_check]] [[feedback_multi_session_concurrent_git]]
