---
name: project_yt_shorts_quality_campaign
description: YouTube Shorts 台本品質改善キャンペーン（139本）の進行状況と再開方法
metadata: 
  node_type: memory
  type: project
  originSessionId: ca3d5aae-1ac2-4a75-a27a-df2487208ff5
---

技術士総監キーワードの YouTube Shorts 139本の台本（`storyboard.json` の script）を Generator→Evaluator agent で品質改善するキャンペーン。機械生成の体言止め断片を解説文へ書き直す。

- **2026-05-20 に feature ブランチ・worktree は develop/main へ統合済み**。`feature/yt-shorts-quality` と worktree `C:/tmp/doboku-note-yt` は削除済み。作業は develop（main checkout `%USERPROFILE%/doboku-note`）で直接行うか、必要なら worktree を再作成する。
- **139/139 本 完走**（storyboard 品質改善キャンペーン完了、2026-05-21。真実源 `.claude/state/sns/quality-campaign-progress.json` の `yt.totalDoneIndex=139`）。
- 再開手順・agent プロンプト要点・字数チェックスクリプトは [[handoff]] = `docs/handoffs/_archive/2026-05-20-yt-shorts-quality.md`（2026-05-29 に archive 済）に記録。
- Phase 0（YT パイプラインの storyboard.json SSOT 化・字幕 budoux 折り返し）と品質ルーブリック `docs/reference/yt-shorts-script-policy.md` は実装済み。
- **戦略 v7（2026-05-28）で YT は IG Reels 派生（`yt-shorts-create --from-reels`）に再定義**。MDX 直結の storyboard→mp4 経路は事実上クローズ。詳細 [[project_sns_v7_pivot]]。
- mp4 化は ffmpeg+VOICEVOX 環境が前提（未整備、T-001 系で追跡）。

**Why:** storyboard 台本の品質改善は完了。残るのは音声/動画化の環境整備のみで、しかも v7 で YT は IG Reels 由来に移行した。
**How to apply:** 新規 YT は `ig-reel-create` → `yt-shorts-create --from-reels` の派生フロー。storyboard 品質改善キャンペーン自体は完了済みなので再開不要。
