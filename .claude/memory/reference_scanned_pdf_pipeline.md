---
name: reference-scanned-pdf-pipeline
description: スキャンPDF（回転・指写り）を文字起こし/過去問MDX化するパイプライン。正規版は pdf-to-mdx --scanned スキル + scanned-textbook-transcriber エージェント
metadata: 
  node_type: memory
  type: reference
  originSessionId: 1257b70d-c2d5-4a35-9568-2d2b6b6734b0
---

> **更新 2026-06-14（正規版へ昇格）**: このパイプラインは **`pdf-to-mdx --scanned` スキル** ＋ **`scanned-textbook-transcriber` エージェント**として資産化済み。手順の真実源は `.claude/skills/conversion/pdf-to-mdx/references/scanned-image-pipeline.md`。**抽出は `pdftoppm` ではなく `pdfimages -j` が正**（再ラスタライズせず直接ダンプ＝瞬時・ネイティブ解像度、pdftoppm はネイティブ超え upscale で遅い）。回転は `magick -rotate 90`、見開きは L/R 分割で単頁化（vision の ~1568px downscale 対策＝単頁が borderline 解消）。落とし穴（macOS bash3.2 `declare -A` 不可・zsh `${=var}`・ディスク ENOSPC で静かに truncate→破損ページはスプレッド直接クロップで救済・図は bbox 比率判定→元解像度クロップ埋め込み）も skill reference に収録。技術士建設部門「論文対策キーワード」168見開き→7章312k字＋図31点で実証。**下記は旧 pdftoppm 方式の記録（agent flake 自己修復・details/summary 等の学びは現役）。**

コンクリート主任技師の原典は**手持ち写真スキャン**（90°回転・指写り・縦書き）。レンダリングPNGは表示縮尺だと判読不可だが、回転補正で完全可読になる。

**パイプライン（実証済 2026-05-29）**:
1. `pdftoppm -png -r 170 "in.pdf" out/prefix`（PyMuPDF/fitz は未インストール、poppler の pdftoppm と pdfinfo は `/opt/homebrew/bin` にある）
2. `sips -r 90 page.png`（手持ち写真は90°CW回転している。`-r 270`は上下逆になるので`-r 90`が正）→ landscape 化＝見開きが正立
3. agent に回転済みPNGを Read させ転記（1ファイル=見開き2頁。3748×4999px≈7-8MB と大きいので vision コスト高）
4. **必須**: 別agentで同じ画像と転記MDXを1問ずつ視覚突合（[[feedback-exam-pdf-cross-reference]] / exam-content-policy 53-58行）。パイロットは verdict=pass / accuracyScore 5.0 を達成＝このパイプラインは信頼できる

**workflow設計の学び**: agent は MDX を文字列で return → 親が検証してから writeMdxFile で書込（捏造リスク対策）。過去問は検証完了まで published:false。図（グラフ等）はテキスト再現不可→Callout で明示し figure クロップは別途。ExamPoint は過去問では使わない（civil primary 準拠＝problem+選択肢+details のみ）。生成 MDX の Callout `info/warning` は LEGACY_ALIASES で動くが正規化必須（info→note, warning→warn）。

**batch量産の追加学び（2026-05-30 batch1）**:
- **`<details><summary>` 同一行は MDX コンパイル失敗**（next-mdx-remote: "Expected a closing tag for `<details>` before the end of paragraph"）。必ず `<details>\n<summary>解答・解説</summary>\n\n…\n\n</details>` と別行＋空行。pre-commit `scripts/pre-commit-mdx.mjs` が実コンパイルで HIGH 検出。組立時に `.replace("<details><summary>","<details>\n<summary>")` で正規化。
- **transcribe agent は時々 mdx 空を返す**（複数の密な大画像を読むと発生。同じ画像を verify agent は読めるので画像でなく agent flake）。対策: workflow 内で transcribe→verify→(空/不合格なら feedback付き再transcribe→再verify) の自己修復ループ。
- **チャンク境界で [正解(n)] が次頁に載る**ことがある→チャンクに末尾1ページの重複を含める。
- **大スプレッド画像は vision で ~1568px に downscale される**（縦書き密文字の可読性が落ちる）。1スプレッド=見開き2頁で borderline。失敗が続く分野は単頁分割(left/right)を検討。
- コスト実測: survey 615k tokens、転記batch 610k tokens/7チャンク。8分野×2本フルは数百万〜1千万tokens（ユーザーはフルスロットル承認 2026-05-30）。
