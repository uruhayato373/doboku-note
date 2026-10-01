---
name: backlog-delete-doc-refs
description: backlog カードを削除する前に docs/ の DN-ID 参照を grep し、同じ commit で完了記録へ置換する
metadata:
  node_type: memory
  type: feedback
  originSessionId: edcca7ee-0b4e-4427-8acb-9912f6cff81b
  modified: 2026-09-30T11:14:16.525Z
---

backlog カードを完了で削除するときは、先に `grep -rn "DN-XXXX" docs` で参照を探し、同じ commit で「完了（日付・PR番号）」の記述へ置き換える。

**Why:** 2026-09-30 に DN-0405・DN-0365 を削除した直後、docs/editorial/07 と docs/strategy/13 の参照が dangling-id になり、develop の CI（project-task-refs・unit-tests）が赤くなった。`backlog-edit.mjs --delete` はこの参照を見ない。

**How to apply:** 削除前に `node scripts/check-project-task-refs.mjs` を実行して error 0 を確かめる。あわせて、`--delete` は `--commit` を付けないと書き戻さない（dry-run が既定）点にも注意する。関連: [[backlog-insert-anchor]]
