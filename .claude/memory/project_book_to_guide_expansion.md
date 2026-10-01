---
name: project_book_to_guide_expansion
description: "市販書籍OCR(commercial-book)を公開ガイドへ展開する手順と罠(2026-09-10〜12・建設部門書き方5本・主任技士・土木)。書籍OCR27冊の登録状況(経路D)と再スキャン要ページ"
metadata:
  type: project
---

2026-09-10、『技術士論文の書き方』（`pe-essay-writing-guide`）を建設部門の書き方ガイド群へ展開した。
hub `pe-secondary-essay-guide` はそのまま、薄い節を新規スポーク 5 本（setsumon-bunkai／aimai-hyougen-sahou／
suikou-checklist／shiken-toujitsu-tejun／keyword-note-tsukurikata）へ深め、`gyoumu-keireki-hyou` に 4 段階棚卸しの
H2 を追加。サイトで commercial-book id を `sources` に宣言した最初の記事群（commit 0f7fc2526〜3564a28eb）。

**手順（再利用できる型）**: 親が transcript を読んで方法を理解 → 執筆エージェント（guide-rewriter・新規起草モード）には
transcript を渡さず、親の言葉で 30 字以内の語句だけの brief を渡す → H2 は原本の章順でなく受験者の時間軸で組み、
ラベル名・項目数を原本と揃えない → 例題はサイトの過去問記事から → guide-qa → guide-fact-checker（制度数値）→
`check-reference-sources:deep`（40 字逐語 0 件）→ 1 記事 1 コミット。5 本で Sonnet/Opus 合計約 1.4M トークン。

**Why:** 商用書籍は逐語 1 文・図・章立ての流用も不可（reference-sources-policy.md）。writer に原文を見せなければ
構造的に漏れない。
**How to apply:** 同じ本から総監へは展開しない（有料 note『記述式の書き方』と衝突・Red Line #3）。原本にある
「三分割展開法」は JES の登録商標なので語ごと使わない。原本の制度数値（H31 時点）は使わず一次資料へ。
QA の「である調混在」は評価者により厳しさが違うので、ですます基調＋体言止めで通す。

2026-09-11 に標準化 → `.claude/knowledge/reference/content-taxonomy.md` §7（原本 class × 展開先の表と標準手順）。backlog カードはそこを指す。

**textbook 深掘りの分業（2026-09-12・主任技士 前半 4 章で実測）**: Reader（sonnet・原本 OCR 1 章＋既存記事→語句だけの gap brief・約 150〜210k）→ 親（brief を取捨し自分の言葉で writer brief。数値は「使ってよい規格値」を列挙し、それ以外は「（要確認）」を付けさせる）→ Writer（sonnet・原本は渡さない・260〜340k）→ Evaluator＋fact-check を 1 体に統合（sonnet・WebSearch・190〜220k）→ 親が Edit＋deep 照合＋baseline 返済＋commit。1 章あたり Sonnet 約 0.7M・Opus 約 40k。**Writer に commit させない**（1 体が勝手に commit し、deep の逐語 1 件〔JIS の呼び方の語順〕と単位換算ミス〔0.2 %＝200×10⁻⁶〕を含んだまま HEAD に載った→amend で是正）。QA で毎回出る指摘＝設問の数値の写し・市販書名の参考資料・段落 200 字超・出所の無い管理値。
2026-09-12 後半 4 章（製品・構造設計・製造 QC・施工）も同じ分業で完了＝主任技士テキスト 8 章すべて sources 宣言済み（DN-0187/0188 完了）。追加の罠: **`wc -m` はこの環境では bytes を返す**（字数は Python len で測る。前半の「現状 11k 字」等は 3 倍過大だった）／親の brief に書いた規格値が誤っていることがある（混和材の計量許容差 ±3 % → 正 ±2 %。QA が一次資料で捕まえた）／JIS の規格名称をそのまま参考資料に書くと原本と 40 字以上一致する（表記を短縮）／指示に「git 禁止」を書いても、指示書ファイルを Read させる方式なら守られた。

**2026-09-12 土木へ横展開（DN-0196〜0203）**: 専門土木 8 章（新規・主根拠はサイトの過去問記事）、法規 3・安全 3（市販書の「場面→条文→判断」法）、技士 6 章、実務 4 本、2 級ガイドの 1 級横断リンク、概念図 16＋15 枚。学び: (1) 過去問記事の解説自体に転記ミスが混ざっている（水抜き孔の向き・大型機械 2 m・泥水圧の目的・推進ジャッキの部位・RCD 降雨・バケット高さ）ので、Writer が過去問解説を「正」として写すと誤りが伝染する → QA の「過去問との整合」軸で捕まえ、過去問側も同時に直す。(2) 法規は 2024〜2025 年改正（営業所技術者・金額基準・専任特例・拘禁刑・施行令の条番号ずれ）が多く、書籍も過去問も古い → e-Gov API（`laws.e-gov.go.jp/api/1/lawdata/<法令番号>`）で親が直接照合するのが速い。(3) 技士テキストは ですます調、1 級 textbook は である調、実務は ですます調 — Writer 指示に文体を明記しないと混在する。(4) QA の WebSearch 予算はセッション共有で枯渇する（6 体並列で 200 回上限）→ 一次資料の URL は親が先に確認して渡す。

## 統合: 書籍 OCR 登録（旧 book_ocr_route_d・2026-09-09〜10）
- 参考文献27冊 6,958/7,053ページを経路D（Sonnet 第1読＋Tesseract 突合＋対象ページ第2読）と旧経路の割当（`book_ocr_align_legacy.py`）で登録済み。Drive vault `原資料PDF/書籍/<id>/ocr/part-NN.md`＋台帳、完了は book-manifest の `ocrStatus=complete`。手順 runbook `.claude/skills/conversion/pdf-to-mdx/scripts/book-ocr/README`（1冊=1 Workflow・並行2本・利用制限で止まったら `resumeFromRunId`・途中成果物 `.tmp/ocr/<本>/` はローカルのみ）。
- **再スキャンが要る:** pe-cem-essay-guide（16版面中9で指の隠れ・既存文字起こしに推測埋め）、civil1-primary-workbook-2021（上端欠け・二重写り約60p・〔判読不能〕204箇所は埋めず）、concrete-chief-textbook-2024 p0059（露出失敗）。品質の薄い箇所: 総監標準テキスト115pは内挿、construction-claude-code-guide p0002〜0011 は同一表紙画像（原本欠陥）、マンガ本は Tesseract 突合が12pのみ。未着手で保留: 人事/働き方改革/IT/経営学/行政書士の39 PDF（サイトの守備範囲外）。
