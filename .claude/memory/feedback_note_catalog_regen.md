---
name: feedback_note_catalog_regen
description: "note の原稿（H1・公開状態・新規下書き）を変えたら build-note-catalog で .claude/state/note-published.json を作り直して同じ commit に入れる"
metadata:
  type: feedback
---

note の原稿を変えたら、`npm run build-note-catalog`（`refresh-indexes` に含まれる）で `.claude/state/note-published.json` を作り直し、同じ commit に入れる。カタログの題名は本文の H1 から取るので、H1 の変更・下書きの追加・公開状態の変更はすべて作り直しが要る。

**Why:** 2026-10-06、クラウドのセッションで「落ちる答案」2本の H1 を直した commit（57c4af4bf）と、2級の無料下書き 2 本を足した commit（5cf185c9a）の両方で作り直しを忘れ、develop の CI（generated-indexes）を 2 回赤くした。1 回目は別セッションが直した。「MDX を変えたら refresh-indexes」は覚えていたが、note の .md は対象外だと思い込んでいた。

**How to apply:** note の `article*.md` を stage する commit では、pre-commit（`scripts/pre-commit-ci-gates.mjs` の generated-indexes）が `build-note-published-index.mjs --check --staged` で作り直し漏れと stage 漏れを止める。止まったら `npm run build-note-catalog` を回してカタログも stage する。

## 未 commit の下書きがある作業ツリーで作らない（2026-11-10）
`build-note-catalog` は作業ツリーの記事を全部読むので、まだ commit していない note の下書き（水産土木 R01〜R04 の 12 本）がある状態で作った台帳を commit したら、CI（generated-indexes）が「生成物がコミットと一致しない」で落ち、develop と PR #1521 が赤になった。
- **How to apply:** 台帳を作る前に `git status --short content/note` で未追跡・未 commit の記事が無いか見る。あるときは、その記事も同じ commit に入れるか、`origin/develop` から作った一時 worktree で作る。
