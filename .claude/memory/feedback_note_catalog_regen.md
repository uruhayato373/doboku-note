---
name: feedback_note_catalog_regen
description: "note の原稿（H1・公開状態・新規下書き）を変えたら build-note-catalog で .claude/state/note-published.json を作り直して同じ commit に入れる"
metadata:
  type: feedback
---

note の原稿を変えたら、`npm run build-note-catalog`（`refresh-indexes` に含まれる）で `.claude/state/note-published.json` を作り直し、同じ commit に入れる。カタログの題名は本文の H1 から取るので、H1 の変更・下書きの追加・公開状態の変更はすべて作り直しが要る。

**Why:** 2026-10-06、クラウドのセッションで「落ちる答案」2本の H1 を直した commit（57c4af4bf）と、2級の無料下書き 2 本を足した commit（5cf185c9a）の両方で作り直しを忘れ、develop の CI（generated-indexes）を 2 回赤くした。1 回目は別セッションが直した。「MDX を変えたら refresh-indexes」は覚えていたが、note の .md は対象外だと思い込んでいた。

**How to apply:** note の `article*.md` を stage する commit では、pre-commit（`scripts/pre-commit-ci-gates.mjs` の generated-indexes）が `build-note-published-index.mjs --check --staged` で作り直し漏れと stage 漏れを止める。止まったら `npm run build-note-catalog` を回してカタログも stage する。
