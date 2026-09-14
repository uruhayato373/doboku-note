---
name: project_civil1_h29_corpus_drift
description: 1級土木 primary-h29-a は原典と26/60問ずれている。原典PDFは git 履歴と dobokujira.com から入手可
metadata: 
  node_type: memory
  type: project
  originSessionId: a76915a6-5486-4902-b4da-4747f79b330d
  modified: 2026-08-03T04:46:44.658Z
---

1級土木一次の原典 `１級土木施工管理第１次試験問題集.pdf`（2021年版・H26〜R2）はリポジトリから削除済みだが、**git 履歴から復元できる**: `git show '175945884:_backup/１級土木施工管理第１次試験問題集.pdf' > out.pdf`（58MB・テキスト層なし）。

**この本のスキャンは PDF index 270（＝平成29年度の開始）以降が landscape（5791x4144）に切り替わり、各ページの一部が欠落している。** 具体的には【問題 No.XX】の枠と解説冒頭が消え、ページ下部が真っ白（純 255）になる。R2/R元/H30 セクション（index 270 未満）は portrait（4988x7035）で完全。印刷ページ番号は連番なので「ページ欠落」には見えず、内容だけが飛ぶ。offset は PDF index = 印刷ページ + 1。

**その結果 `primary-h29-a/article.mdx` は 60 問中 26 問で選択肢が原典と一致しない**（2026-08-03 に No.54 で発覚し全問突合して判明）。No.54 は設問文・選択肢4つとも別物で、解説だけが本物の論点を指していた。欠落区間の問題文が創作された疑いが強い。H28/H27/H26（同じ landscape 区間）も同じ疑いがある。未検証。

原典の代替入手先: dobokujira.com が年度別の公式問題冊子 PDF（テキスト層あり）を公開している。例 `https://dobokujira.com/wp-content/uploads/2021/05/h29_1dobokuA_gakka_doboku.pdf`。取得は `curl --ssl-no-revoke`。突合はこちらの方が速く確実。

関連: [[feedback_exam_pdf_cross_reference]] / [[feedback_gate_zero_coverage_false_pass]]（「解説だけ読んで緑」にしない）
