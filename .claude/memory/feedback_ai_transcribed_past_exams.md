---
name: ai-transcribed-past-exams
description: AI 転記で作った過去問 MDX は設問文・選択肢の意味が変わる崩れを含む。公式原典との照合を前提にする
metadata:
  node_type: memory
  type: feedback
  originSessionId: a69c318a-3ff6-423a-9e9b-48232f26f5da
  modified: 2026-09-30T21:55:45.401Z
---

2026-09-30、2級土木 一次前期 r03〜r06 を公式問題と照合したら、4 年度で数百行の転記崩れがあった。「適当なもの／適当でないもの」の取り違え、「堆積させなければならない」→「させてはならない」（正答と矛盾）、表の中身が別内容、など意味が変わるものを含む。正答表との不一致は 0 だった＝**正答だけ照合しても設問の崩れは見つからない**。

**Why:** 解説・ExamPoint を書いても、設問文そのものが誤っていれば読者は誤った知識を覚える。
**How to apply:** 過去問の新規作成・監査では、正答照合に加えて設問文・選択肢を公式 PDF（jctc 現行ページが 404 なら Wayback Machine）と照合する。PDF のテキスト層が崩れている年度（数字が別字に化ける等）は画像で読む。残る年度の照合は backlog DN-0475。

関連: [[night-batch-delegation]] [[project_civil1_primary_answer_key_errors]]
