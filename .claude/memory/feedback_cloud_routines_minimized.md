---
name: cloud-routines-minimized
description: クラウドルーティンは 2026-09-19 に全停止（weekly PDCA も enabled:false・週次はローカル土曜実行）。listはページ送り不可でgetを使う／updateはnested置換でevents消滅／.claude/直書きは許可プロンプトで数日沈黙
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 7ef431fc-1194-47fb-b14b-0a39480f8906
  modified: 2026-08-15T23:18:06.301Z
---

2026-06-27 にクラウドルーティン（claude.ai RemoteTrigger）を棚卸しし、「できるだけ利用しない方向」へ削減した。

**最終状態（2026-09-19）**: 稼働(enabled:true)のルーティンは **0 本**。`doboku-note weekly PDCA`（`trig_01Edgim5qXCiGwKtnL4AVEmM`・cron `0 0 * * 6`）も enabled:false で退役し、週次レビューは**ローカルの対話セッションで土曜に `/weekly-review`**（催促＝SessionStart の check-weekly-review-due・backstop＝月曜 guard）。退役理由: サンドボックスでは `.claude/` 配下の書き込みが許可プロンプトで止まり数日沈黙（09-18 は W38 欠落）、Playwright/tsx 依存の検査が動かず材料が欠ける。本文は保持してあるので再開は `update {enabled:true}`。

**停止した(enabled:false)もの**:
- doboku: daily-doboku-progress-sync / doboku-todo-weekly-refresh / cem-qa monthly / note-funnel monthly（note-funnel は 2026-08-16 時点で 404＝UI削除済み）
- stats47: weekly-blog-10-articles / weekly CWV PR / weekly PDCA（3本とも停止）

**Why**: ルーティンは毎回compute/トークンを消費し、大半は on-demand スキルで代替できる。

## API操作の罠（2026-08-16 実測・重要）

- **`list` はページ送りできない**。`has_more:true` / `next_cursor` が返るが、body に cursor や limit を渡しても**無視されて同じ先頭ページが返る**。先頭 20 件は stats47 の使い捨て `send_later` トリガーで埋まっており、正典ルーティンまで辿り着けない。→ **trigger_id を控えて `get` で直接引く**（IDは本メモリ上部に記載）
- **`update` は nested オブジェクトを丸ごと置換する**。`job_config.ccr.session_context` だけを送ったら `events`（＝プロンプト本文4KB）が消えた。触る前に必ず `get` で全文を控え、`environment_id` と `events` を同送する。`environment_id` 欠落は HTTP 400（`job_config must set ccr.environment_id`）
- **delete アクションは無い**（list/get/create/update/run のみ）。完全削除は claude.ai Web UI のみ。ただし **claude.ai はブラウザツールからポリシーで遮断されている**ため、削除は人手
- 停止=`update {enabled:false}` は可逆

## 故障の型（2026-08-16）

**「停止」より「発火しているのに沈黙」の方が起きる**。2026-W33 欠落時、ルーティンは enabled のまま毎週発火していた（`last_fired_at` 2026-08-14）のに、2026-07-31 以降 3 回連続で成果物ゼロだった。診断は `git ls-remote --heads origin "*weekly-pdca*"`（空＝早期失敗）と、過去の週次 commit の author（ルーティン産は `claude/weekly-pdca-*` ブランチの PR 経由・人手は直接 commit）で切り分ける。対処＝ルーティン本文に「PR に到達しなければ `scripts/report-automation-failure.mjs` で起票してから終了」を明記。

**How to apply**:
- 停止機能の手動代替: `/plan-weekly`（todo更新）・`/weekly-improve`（cem採点系）・`/audit-note-funnel`（note導線監査）。
- 新規ルーティン作成前に必ず `/routines`（または RemoteTrigger list）で重複確認（CLAUDE.md「クラウドルーティン作成ルール」）。ただし list の制約は上記のとおり。
- 詳細な調査手順は [[reference_doc_sync_system]] ではなく `.claude/knowledge/reference/workflows.md`「発火の信頼性」に記載。
