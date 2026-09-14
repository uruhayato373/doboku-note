---
name: feedback_note_prepublish_verify_not_proxy
description: note公開前は代理指標でなく実不変条件を検証。画像は参照名↔ファイル実在を突合し、ハードゲート通過=公開可と等値せずPhase2(fact/figure)まで回す
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a23613a4-35e2-474d-8ca8-79944432d999
---

note 記事を「公開できる状態」と判断する前に、**代理指標で済ませず実不変条件を検証する**。2026-06-03 の総監依存3記事整備で、図版を `ls img/ | wc -l`（ファイル個数）で「揃っている」と誤判定し、本文の `![](img/figure-X.png)` 参照名と実ファイル名のズレ・欠落（roi-curve/keishin-chain未作成、independence名前不一致）を見落とした。png/svgペアを2で割れば気づけた二重の杜撰さ。さらにファクトチェック(Phase2)を「ハードゲート通過=公開可」と等値して任意扱いにし、実害（R7合格者615→584、年収700-900→600-850、回収年数の基準不統一、図↔本文のケース番号ズレ）を放置しかけた。

**Why:** 検証は「何が通れば完了か」の実条件（CLAUDE.md原則9）。ファイル個数・Lint通過は SSR/事実性/図整合を保証しない。代理指標は「カバーした」と錯覚させる。

**How to apply:** note公開前は必ず `/note-prepublish-review` を実行。Phase1 inline（画像=参照名→`test -f` 突合・pipe表0・U+FFFD0・太字内全角括弧0・404 RISK・hashtags）+ Phase2エージェント（note-fact-checker=数値/出典の内部DB突合、note-figure-auditor=svg-policy採点）。図の数値は本文・キーワードページ・内部DB(exam-index等)と突合。自分が作った/直した図も自己申告せず再監査で合格を実証する。キーワード解説ページ数の公式値は `keyword-relations.json` の `published_keywords`（2026-06=650）。関連: [[feedback_note_article_three_set_dod]] [[feedback_exam_pdf_cross_reference]] [[feedback_prevention_over_patching]] [[feedback_tool_output_hallucination]]
