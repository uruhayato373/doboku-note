---
name: pdf
description: 再配布サイトから取得した過去問PDFはファイル名と中身の年度が入れ替わっていることがある。import前にPDF表紙の年度をPyMuPDFで視覚確認する
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 2075863f-718c-4f06-bd5e-2aa1051dadd2
---

過去問 PDF を再配布サイト（土木のトリセツ等）から取得したら、**import 前に各 PDF の表紙年度を視覚確認し、ファイル名と中身が一致するか検証する**。

**Why**: 2026-05-28、2級土木の過去問を土木のトリセツから取得したところ、**R05 と R06 の PDF（前期・後期・二次の全5ペア）がファイル名と中身で入れ替わっていた**。`R05_第一次検定_後期.pdf` の表紙が「令和6年度」、`R06_...` が「令和5年度」。問題数でも判別可能だった（真のR05=61問、真のR06=66問）。気づかず MDX 化すると年度ラベルと内容が全て食い違う。サブエージェントが PDF 表紙を直接読んで検出したが、取得直後に確認していれば手戻り（MDXスワップ+frontmatter再修正）を防げた。

**How to apply**:
- 取得直後に全 PDF の表紙(1ページ目)を PyMuPDF で画像化して年度を目視: `python -c "import fitz; [fitz.open(p)[0].get_pixmap(dpi=120).save(...) for p in pdfs]"`
- 問題数でもクロスチェック（2級土木は R03-R05=61問、R06-R07=66問。pdfinfo のページ数や最終問題番号で推定）
- ファイル名と表紙年度が食い違ったら **PDF をリネーム/スワップして正しい年度に揃えてから** import する（MDX 生成後の是正は手戻りが大きい）
- 関連: [[feedback_exam_pdf_cross_reference]]（生成・修正時の原典視覚突合）
