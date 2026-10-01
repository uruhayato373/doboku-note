---
name: session-start-git-sync
description: 着手前に git fetch で origin との遅れ(behind)を確認。複数セッション常態でローカルが大幅遅れの罠
metadata: 
  node_type: memory
  type: feedback
  originSessionId: f06ba0d0-b48c-4131-89fb-371d31834f56
---

着手前に `git fetch -q origin && git log --oneline main..origin/main | head` で **origin との遅れ（behind）** を必ず確認する。ブランチ名の確認（CLAUDE.md 原則1）だけでは不十分。

**Why:** このリポジトリは worktree 分離・複数セッション常態（commit `7cb6d655f`）＋ CI が deploy で main に自動マージするため、ローカル main が origin/main から数十コミット遅れるのが高頻度で起きる。2026-06-11、私はローカル main が **43 コミット遅れ**（祖先 `adfbf02b4` で停止）なのに pull せず作業し、origin が既に正しく完了していた「note 模範論文5マガジンの公開配線・R08二記事化」を古いツリー上で劣化版で重複させた。原因はブランチ確認のみで behind を見なかったこと。

**How to apply:** (1) 作業開始時、特に content/SoT 編集前に fetch + behind 確認。(2) 遅れていれば pull/reset で origin に追従してから着手（勝手な reset はユーザー確認後）。(3) **古いベース上のコミットを push しない**。(4) note の公開状態は origin/main の `note-magazines.ts` が真実源で、ローカルが古いと [[related-keywords-prefix]] 同様に古い前提で誤判断する。関連: [[no-confirmation]]（破壊的 git 操作は例外で要確認）。
