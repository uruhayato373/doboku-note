---
name: feedback_backlog_close_via_todo_complete
description: backlog のカードは手で消さず todo:claim → todo:complete で閉じる（完了の記録 dispatch-log が残らない）
metadata:
  node_type: memory
  type: feedback
  originSessionId: d10891bf-75a4-4ed6-af10-a5f0555a2e73
  modified: 2026-11-12T04:24:28.551Z
---

済んだカードは backlog.md から手で消さない。`node scripts/todo-claim.mjs DN-#### --owner <名前>` → `node scripts/todo-complete.mjs DN-#### --confirm-conditions --commit --note … --verify …`（不具合は `--prevention gate:/memory:/doc:/none:` 必須）で閉じる。`--commit` は dispatch-log とカードの削除を書くだけで git commit はしないので、続けて pathspec で commit する。

**Why:** 2026-11-12 に DN-1146・DN-1077・DN-1105 を手で消し、完了の記録が残らなかった。4 枚目以降は pre-commit の check-backlog-schema（removed-cards・上限 2）が止めたので気づいた。消したカードは git の履歴から戻して todo:complete で閉じ直した。

**How to apply:** 「カードを片付ける」と言われたら最初から claim → complete。直す所が無かった・対象が消えていたカードも同じ手順で、note に理由と根拠を書く。関連: [[feedback_review_tasks_to_backlog]]
