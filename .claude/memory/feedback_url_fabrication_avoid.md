---
name: feedback-url-fabrication-avoid
description: 新規 URL は記載前に WebFetch で実在確認必須。EMIRA pedia 系などの連番 URL の捏造（パターン補完）は事故の典型例
metadata: 
  node_type: memory
  type: feedback
  originSessionId: c1669602-11f1-44e6-b557-dc56339cfae1
---

新規 URL を 参考資料・Callout reference・本文リンクに記載する前に、必ず WebFetch で実在確認する。推測・記憶・パターン補完による URL 記載は厳禁。

**Why**: 2026-05-27 のエネルギーキーワード分割作業（commit c7f5aa167）で、EMIRA `pedia/{数字}/` パターンの URL を 3 件パターン補完で記載してしまい、全て 404。cem-qa 並列評価でようやく発見し、修正 commit 646d2461f で 民間 ソースを差し替えた。lint MDX PASS + HTTP 200 だけで品質保証されたと誤判定し、cem-qa を起動する前に commit してしまったのが直接原因。

**How to apply**:
- 民間 解説サイトの記事 URL は特に危険（`{site}/pedia/{番号}/`・`{site}/article/{連番}/`・`{site}/category/{id}/` 系の連番／slug URL）
- 「他の番号で存在するから」「いつもこの形式だから」を理由に未確認 URL を書かない
- 候補が出たら必ず WebFetch で実在確認 → 404 / redirect なら別 URL を探す → 見つからなければ削除
- 新規キーワードページ作成時は **commit 前に必ず cem-qa Evaluator** を起動して 5 軸ルーブリックで品質確認（lint だけで済ませない）
- 連動して: [[feedback_url_verification]]（既存ルール）と組み合わせて運用

**ガード公式化**:
- `content-principles.md §12`: 連番 URL の捏造リスクを明記
- `cem-qa.md`: 「参考資料 URL 捏造の検出」節で HIGH 違反として surface
- `keyword-rewriter.md`: 新規 URL の WebFetch 必須 + cem-qa 起動を明記
