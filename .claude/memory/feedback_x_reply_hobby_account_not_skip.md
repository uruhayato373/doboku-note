---
name: feedback-x-reply-hobby-account-not-skip
description: X 返信の候補を「趣味のアカウント」という理由で見送らない。見るのは候補の投稿が本人の受験の話かどうか
metadata:
  node_type: memory
  type: feedback
  originSessionId: 4c0cba4a-e076-41c9-86f7-e12345d8e13e
  modified: 2026-11-11T21:48:55.246Z
---

X 返信（/x-reply）の候補は、アカウントが趣味・日常中心かどうかでは見送らない。候補の投稿が本人の受験の話なら下書きを書いて送る。

**Why:** 2026-11-12、運営者が「趣味のアカウントだからといって除外する理由にはならない」と判断した。11/11 にこの理由で 7 人を外していたため、見送りの記録から戻した（commit 84aa53f3c）。

**How to apply:** 見送るのは、状況の変化・強い落ち込み・講座や教材を出す側・本人の受験でない・資格が topics の外、のときだけ。正本は `.claude/skills/x-reply/SKILL.md` 手順 4 と `.claude/agents/x-reply-drafter.md`。毎朝の定期タスク `x-reply-morning-list-2` の本文も同じにしてある。[[project-x-reply-trial]]
