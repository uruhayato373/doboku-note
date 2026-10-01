---
name: project_note_article_sync
description: note は記事単位で同期（本文・カバー・タグを 1 記事 1 回の更新）。判定は CI、反映は Mac の launchd note-sync。止まっている記事は管理画面 /content/note-sync
metadata:
  node_type: memory
  type: project
  originSessionId: e302cdce-7d79-4729-9427-839f1588558a
  modified: 2026-09-28T22:55:52.539Z
---

2026-09-29 から note の公開記事への反映は**記事単位**。種類別（本文だけ・カバーだけ・タグだけ）に流すと同じ記事を何度も「更新する」ことになる、という運営者の指摘で作り替えた（PR #700→#701・#702）。

- 反映計画: `scripts/lib/note-sync-plan.mjs`（`npm run note-sync-plan`）。部品 body/cover/tags と、止まっている理由（aborted・trial-guard・image-missing・boundary・meta）と直し方
- 1 記事 1 回の更新: `note-update-body --sync`（計画から部品を決める）/ `--parts cover,tags`（明示）。本文を触らない記事は有料境界・試し読みラインを動かさない。`note-update-cover` は廃止
- 週次: launchd `com.doboku-note.note-sync`（日曜 3:00・`npm run note-sync:install`）が専用 worktree `.claude/worktrees/note-sync` で `note-sync-routine` を回し、最大 200 記事・配布 PDF は Drive から取り寄せ・マガジンのカバーも登録・`.claude/state/note/sync-log.json` に記録して develop へ push
- CI: `note-sync-live.yml`（月曜 9:00・`check-note-sync`・Issue channel note-sync）は判定だけ
- 台帳: カバーの記録は `note-republish-hashes.json` の `coverHashes` / `magazineCovers`。meta・asset からカバーは外した。見た目を変えたら `note-cover-tokens.json` の `designVersion` を上げる
- 会員特典マガジン内の無料記事は frontmatter `memberTrial: bottom|lock` で公開範囲を決める

**Why:** 9/28 のカバー一括差し替え 699 本のうち 286 本は本文の変更も未反映で、二度更新が必要だった。

**How to apply:** note を直したら原稿を develop へ入れるだけでよい（週次が反映）。急ぐ記事だけ `note-update-body --sync --article <path> --commit`。反映状況の質問には管理画面 `/content/note-sync` か `npm run note-sync-plan` を見て答える。DN-0360 が完了条件（`check-note-sync` exit 0）を持つ。序章 n3eb135ebdff7 は DN-0271（有料ラインの位置の判断待ち）。関連: [[reference_note_cover_v5_rollout]] [[project_asset_audience_routing]]
