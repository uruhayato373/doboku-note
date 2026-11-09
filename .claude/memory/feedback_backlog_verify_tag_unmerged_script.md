---
name: feedback_backlog_verify_tag_unmerged_script
description: 未マージのブランチにしか無い npm script を backlog の [検証:] に書くと develop の backlog-schema が赤になる
metadata:
  type: feedback
---

起票（todo:add・自動起票するスクリプト）の `[検証:<npm script>]` には、**origin/develop の package.json に今ある script だけ**を書く。PR がまだ入っていない新しい script を書くと、todo:add は develop へ直接積むので、develop と全 PR の CI（quality:audit の backlog-schema・ci:true）が赤になる。

**Why:** 2026-11-09、PR #1468（standards-visual-review）のマージ前に、その record --ticket で DN-1052・1053 を `[検証:standards-visual-review]` で起票し、別の PR の pre-commit と CI ゲートで backlog-schema が落ちた。develop 上のカードのタグを check-standard-articles へ直して解消した。

**How to apply:** 新しい script を使う起票は、その PR のマージ後に回すか、マージ前は develop にある検査をタグに書く。自動起票を足すときは、タグに使う script が develop にあることを前提にしてよいかを確かめる。関連: [[feedback_review_tasks_to_backlog]]
