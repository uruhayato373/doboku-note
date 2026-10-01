---
name: reference_civil_pdfs
description: "1級・2級土木の過去問・問題集・テキストPDFの保管場所とファイル構成（docs/textbook配下に移動済み）"
metadata:
  type: reference
---
## 保管場所（2026-06-20 更新）

**`docs/textbook/{資格}/` 配下に集約済み**。旧 `.claude/pdfs/１級土木施工管理技士/` は撤去（現在 `.claude/pdfs/` は `guide.pdf` のみ）。**`.claude/pdfs/` だけ見て「PDF が無い」と早合点しないこと**（2026-06-20、2級図クロップで誤って「ブロック」と判断しかけた）。

- 1級: `docs/textbook/１級土木施工管理技士/`
  - `問題集/`（第1次・第2次の教材 PDF）
  - `テキスト（土木一般編）/` `テキスト（施工管理・法規編）/`（章別 PDF）
  - `過去問/` は **R03〜R07 のみ**。**H26〜R02 の年度別PDFは無い**（2026-06-21 確認）。これら古い年度の設問図は `問題集/１級土木施工管理第１次試験問題集.pdf`（616p・論点別に過去問を再録）が唯一の図ソース。手順: `pdftotext -layout` → 論点語を grep → `awk -v RS='\f' '/語/{print NR}'` でページ特定 → `pdftoppm -f P -l P -r 300` でレンダリング。年度は側面の年度マークで確認。
  - **ネットワーク工程表等の図表は写真でなくダイアグラム**なので、クロップでなく解説の全経路・全区間日数を実読して **SVG再作図**が適切（著作権クリア＋モバイル可読、figure-3-20 系スタイル準拠）。h26-b/h27-b/h29-b で実施（primary 過去問）。h29-b は記事の選択肢・解説・正答まで破損していた＝図補完時は本文データも問題集と突合する。
- 2級: `docs/textbook/２級土木施工管理技士/過去問/R03〜R07/`
  - `R{NN}_第一次検定_前期.pdf` / `_後期.pdf` / 各 `_正答.pdf` / `R{NN}_第二次検定.pdf`

他資格も `docs/textbook/{資格}/` に同様に格納（技術士第一次/建設部門/総監/コンクリート/行政書士 等）。`.gitignore` で多くが追跡外だがディスク上に実在。

## 用途
- MDX コンテンツの図抽出元。手順: `pdftoppm -png -r 200 -f P -l P` でページ画像化 → `magick … -crop WxH+X+Y +repage -fuzz 8% -trim +repage` で図を切り出し → `npm run generate-webp`（quality 80・既存はスキップ=sweep無し）→ `<ArticleImage src="/posts/{cat}/{slug}/img/qN-fig.webp" alt="…" width height />` を「下図」参照行の直後に挿入。
- コンテンツ照合（`/verify-content`, `/qa-pdf-mdx`）の原本。
- 図クロップは [[feedback_exam_pdf_cross_reference]] / `civil-exam-figure-extractor` も参照。
