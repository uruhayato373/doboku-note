---
name: book-ocr-route-d
description: 参考文献bundle 26冊6,860pのうち6,765pを経路D（Sonnet第1読＋Tesseract突合＋対象ページ第2読）と旧経路割当で登録済み（2026-09-10完了）。残りは原本の再撮影が要るページだけ
metadata:
  type: project
---

2026-09-09、`.claude/skills/conversion/pdf-to-mdx/scripts/book-ocr/` の経路Dで参考文献 bundle 11 冊
3,557 ページを全文起こしし、Drive vault `原資料PDF/書籍/<id>/ocr/part-NN.md` と台帳へ登録・push 済み
（ipej-cem-keywords-2026 はテキスト層抽出＝経路C）。登録済みは book-manifest の ocrStatus=complete で分かる。

未着手だった 5 冊（pe-cem-exam-guide 93p・civil2-first-exam-manga-2026 123p・construction-claude-code-guide 159p・
construction-ai-management 167p・civil-technology-basics 314p）も 2026-09-10 に経路Dで登録済み（合計 6,141/6,860p）。
claude-code-guide は p0002〜p0011 が同一の表紙画像（原本欠陥）で〔欠落〕。マンガ本は Tesseract 突合が 12p しか成立せず字句照合の担保が薄い。
旧経路の章別文字起こし 6 冊（主任技士2022/2024・総監標準テキスト・建設部門キーワード・civil1 テキスト2冊）は
2026-09-10 に book_ocr_align_legacy.py でページ割当して登録済み（旧 textbook/ キーは adopted 別名）。
主任技士2022 の分野別問題編 p0001〜p0200、土木業界の動向 第3版 262p、安全管理のすべて 第7版 168p も 2026-09-10 に経路Dで登録し全 379/262/168p complete。台帳合計 6,765/6,860p。2026-09-10 に 原資料PDF/教材 の『技術士論文の書き方』（分割スキャン合本 99 版面→193p）も bundle 化して経路Dで登録し、27 冊 6,958/7,053p。教材フォルダの残り（過去問 PDF はサイト記事へ変換済み・テキストは書籍 bundle 済み）で未着手は人事/働き方改革/IT/経営学/行政書士の 39 PDF だけで、サイトの守備範囲外なので保留。
総監標準テキストは 115p が内挿（撮影のぼけで文字照合できず）。

**再スキャンが要る**: pe-cem-essay-guide（16版面中9で指の隠れ・既存文字起こしに推測埋めあり）、
civil1-primary-workbook-2021（上端欠け・二重写り約60p・〔判読不能〕204箇所は埋めずに残した）、
concrete-chief-textbook-2024 p0059（露出失敗）。

**Why:** 途中成果物 `.tmp/ocr/<本>/` はローカルのみ。別PCで続けるには prep から。
**How to apply:** 手順は runbook README。1冊=1 Workflow、並行2本まで。利用制限で止まったら resumeFromRunId。
