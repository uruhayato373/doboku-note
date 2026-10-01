---
name: reference_scanned_pdf_pipeline
description: "スキャンPDF/書籍の文字起こし・OCR。pdf-to-mdx --scanned 正規版と旧pdftoppm方式の学び・視覚OCRの罠(psm3/jpn_vert・Drive 0バイト・マーカー相対番号)"
metadata:
  type: reference
---
> **更新 2026-06-14（正規版へ昇格）**: このパイプラインは **`pdf-to-mdx --scanned` スキル** ＋ **`scanned-textbook-transcriber` エージェント**として資産化済み。手順の真実源は `.claude/skills/conversion/pdf-to-mdx/references/scanned-image-pipeline.md`。**抽出は `pdftoppm` ではなく `pdfimages -j` が正**（再ラスタライズせず直接ダンプ＝瞬時・ネイティブ解像度、pdftoppm はネイティブ超え upscale で遅い）。回転は `magick -rotate 90`、見開きは L/R 分割で単頁化（vision の ~1568px downscale 対策＝単頁が borderline 解消）。落とし穴（macOS bash3.2 `declare -A` 不可・zsh `${=var}`・ディスク ENOSPC で静かに truncate→破損ページはスプレッド直接クロップで救済・図は bbox 比率判定→元解像度クロップ埋め込み）も skill reference に収録。技術士建設部門「論文対策キーワード」168見開き→7章312k字＋図31点で実証。**下記は旧 pdftoppm 方式の記録（agent flake 自己修復・details/summary 等の学びは現役）。**

コンクリート主任技師の原典は**手持ち写真スキャン**（90°回転・指写り・縦書き）。レンダリングPNGは表示縮尺だと判読不可だが、回転補正で完全可読になる。

**パイプライン（実証済 2026-05-29）**:
1. `pdftoppm -png -r 170 "in.pdf" out/prefix`（PyMuPDF/fitz は未インストール、poppler の pdftoppm と pdfinfo は `/opt/homebrew/bin` にある）
2. `sips -r 90 page.png`（手持ち写真は90°CW回転している。`-r 270`は上下逆になるので`-r 90`が正）→ landscape 化＝見開きが正立
3. agent に回転済みPNGを Read させ転記（1ファイル=見開き2頁。3748×4999px≈7-8MB と大きいので vision コスト高）
4. **必須**: 別agentで同じ画像と転記MDXを1問ずつ視覚突合（[[feedback_exam_pdf_cross_reference]] / exam-content-policy 53-58行）。パイロットは verdict=pass / accuracyScore 5.0 を達成＝このパイプラインは信頼できる

**workflow設計の学び**: agent は MDX を文字列で return → 親が検証してから writeMdxFile で書込（捏造リスク対策）。過去問は検証完了まで published:false。図（グラフ等）はテキスト再現不可→Callout で明示し figure クロップは別途。ExamPoint は過去問では使わない（civil primary 準拠＝problem+選択肢+details のみ）。生成 MDX の Callout `info/warning` は LEGACY_ALIASES で動くが正規化必須（info→note, warning→warn）。

**batch量産の追加学び（2026-05-30 batch1）**:
- **`<details><summary>` 同一行は MDX コンパイル失敗**（next-mdx-remote: "Expected a closing tag for `<details>` before the end of paragraph"）。必ず `<details>\n<summary>解答・解説</summary>\n\n…\n\n</details>` と別行＋空行。pre-commit `scripts/pre-commit-mdx.mjs` が実コンパイルで HIGH 検出。組立時に `.replace("<details><summary>","<details>\n<summary>")` で正規化。
- **transcribe agent は時々 mdx 空を返す**（複数の密な大画像を読むと発生。同じ画像を verify agent は読めるので画像でなく agent flake）。対策: workflow 内で transcribe→verify→(空/不合格なら feedback付き再transcribe→再verify) の自己修復ループ。
- **チャンク境界で [正解(n)] が次頁に載る**ことがある→チャンクに末尾1ページの重複を含める。
- **大スプレッド画像は vision で ~1568px に downscale される**（縦書き密文字の可読性が落ちる）。1スプレッド=見開き2頁で borderline。失敗が続く分野は単頁分割(left/right)を検討。
- コスト実測: survey 615k tokens、転記batch 610k tokens/7チャンク。8分野×2本フルは数百万〜1千万tokens（ユーザーはフルスロットル承認 2026-05-30）。

---

## 視覚OCRパイプラインの罠

- Tesseract `--psm 6` は2段組で左右の段を行ごとに混ぜる→一致率中央値 0.555。`--psm 3` で 0.908
- 縦書きの本は横書きモデルが雑音→ `--lang jpn_vert --psm 5` を tess_vert に追加し compare がページごとに良い方を採る
- Drive ストリーミングマウントは追い出されたファイルを「ls はサイズあり・読むと 0 バイト」で返す（310枚中1枚）。
  sha256 照合＋rclone 取り直しで止める。エージェントにマウントを直接読ませない
- Sonnet がバッチ内マーカーを p0001〜 と付け直すことがある。内容は正しいので id を付け替えて突合で確認
- 画像を 1500px に縮小してもサブエージェントのトークンはほぼ減らない（多ターンで文脈が積む構造が主因）
- 図解本は図の脇に本文が載る。見直し条件を「図1つ以上・400字未満」まで絞ると本文の実誤りが漏れる
- Workflow が利用制限で止まったら同じ args で resumeFromRunId。完了分はキャッシュ
