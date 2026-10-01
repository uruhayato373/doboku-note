---
name: pe-pastexam-answer-compromise
description: 過去問ページの解答・解説＝折衷案（正誤検証は残す／ExamPointは引っかけ1行≤2項目／試験対策ポイントは過去問側に置く）
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 3dfc6f89-b04a-4df4-8ebc-1a74d997b2f0
---

2026-06-18 ユーザー判断。総監の過去問（primary/択一）ページの「解答・解説」は折衷案で統一する。

- **残す**：各選択肢の正誤理由（✅/❌の検証リスト）、計算問題の KaTeX 数式、`<RelatedKeywords>`。
- **圧縮**：`<ExamPoint>` は `summary`＝その設問固有の引っかけ1行 ＋ `items` 最大2項目（体言止め）。検証の言い換え・メタ指示（「詳細はキーワードページに集約」等）・ノイズ（「出題頻度：★★★」等）は削除。
- **撤去**：太字見出し「**各選択肢の検証：**」（計算問題で正誤リスト直前に付いていた）。
- **全廃しない**：ExamPoint 自体は過去問側に残す。`content-principles.md §5`「引っかけ論点は過去問MDX、概念解説はキーワードページ」の分業を維持（§5 本文は据え置き＝ユーザーが現行のまま選択）。

**Why:** 「解答・解説をシンプルに・情報量を減らしたい」が要望。ただし per-option 検証は過去問解説の核（学習＋SEO価値）で、削ると thin content 化する。ExamPoint 全廃は §5 の分業と逆行し、その設問固有の引っかけ（例：管理限界と規格値の混同）が行き場を失う（キーワードページは規約上それを持てない）。

**How to apply:** 新年度の作問・既存リライトはこの形に揃える。`items` は lint 9-11 準拠（読点≤1個・句点0個・列挙は ／ 区切り）。適用済み＝pe-comprehensive primary h21〜r07（h22/h30 は元からクリーン、secondary は ExamPoint 不使用、civil primary は ExamPoint 撤去済みで対象外）。[[no-new-keyword-pages]] の分業思想と整合。
