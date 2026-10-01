---
name: backlog-id-in-open-pr
description: 未マージ PR の中で起票した DN-ID は develop の --next-id から見えず、同じ番号を二重に振る。PR で起票したら直後の起票は番号を 1 つ飛ばすか PR 側を先に確かめる
metadata:
  type: feedback
---

`node scripts/backlog-edit.mjs --next-id` は作業ツリーの backlog.md（develop）だけを見る。2026-09-27 に PR #672（未マージ）の中で DN-0414 を起票した直後、develop で別のカードを起票して同じ DN-0414 を振った（気づいて DN-0415 へ振り直した）。

**Why:** カードをコード PR に同梱すると、マージされるまで develop の採番から見えない。

**How to apply:** 起票は develop へ直接 push するのを基本にし、PR には入れない。やむなく PR に入れたら、その PR の番号を控えておき、develop で次に起票するときは `git grep -h -o 'DN-0[0-9]*' $(git branch -r --list 'origin/feature/*')` などで未マージ側の最大番号も確かめる。関連: [[backlog-insert-anchor]]
