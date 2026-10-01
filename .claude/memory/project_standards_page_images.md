---
name: standards-page-images
description: 共通仕様書を1ページ1画像+1テキストへ展開。出典は section+版面ページで一意に指す
metadata:
  node_type: memory
  type: project
---

2026-09-05、公的基準（国交省 土木工事共通仕様書）10 文書＝9 ユニーク・5,949 ページを
原本 PDF から **1 ページ = 1 画像 + 1 テキスト**へ展開した。動機は章記事の本文が
`part-NN.md`（50 ページ束）までしかページ情報を持たず「原本の何ページか」を機械で
言えなかったこと（出典明示・読み取りの再現性・図クロップの原寸確保）。

- 置き場 `content/sources/standards/{agencyId}/{documentId}/`。ID は
  `content/site/standards-library/catalog.json` と同じ体系で、章記事・カタログ・
  ページ画像が同じキーで引ける
- `pages/p0001.jpg`（pdftoppm 270dpi＝2233px・JPEG q85）と `text/p0001.txt`
  （pdftotext -layout をページ境界 \f で割る）。**実体 3.4GB は Google Drive vault の原本 PDF と
  同名フォルダ（隣）**（private R2 へ上げかけて撤回 → [[asset-audience-routing]]）、
  Git には `manifest.json`（1.7MB・per-page sha256 つき）と README だけ
- 生成 `npm run build-standards-page-images`（`--manifest-only` で再描画せず
  manifest だけ作り直せる）／検査 `npm run check-standards-page-images`（quality:audit 同梱）

**嵌まりどころ 3 つ**

1. **原本の同定はファイル名でなく sha256**。Drive のファイル名は整理で動く
2. **PDF の通しページと版面のページは一致しない**（PDF p0120 = 版面 1-42）。
   さらに**目次が 1-1..1-77 と進んだあと本文が再び 1-1 から始まる**ので版面番号だけでは
   重複する。各ページに `section`（front=目次 / body=本文）を持たせ、境界は「同じ編で
   番号が減った最初の地点」で機械判定して **section+版面ページで一意**にした。
   北海道版は目次が無番号で巻き戻りが無いため全ページ body
3. **対象 PDF は全て born-digital**（`pdfimages -list` が空＝純ベクタ）。`text/` は OCR
   ではなく PDF 自身のテキスト層なので取り違えが起きない。OCR が要るのはスキャン教材
   （`content/sources/textbook/`）side で別パイプライン

沖縄総合事務局版は中国地方整備局版と原本 sha256 が一致するため画像を重複生成せず
`sameAs: "chugoku/common"` の alias にした（catalog も同じ扱い）。
companion 62 文書（4,500p）は未着手。`--role all` で同じ仕組みが回る。
Drive 側の置き場は [[reference_book_sources_drive_vault]]。
