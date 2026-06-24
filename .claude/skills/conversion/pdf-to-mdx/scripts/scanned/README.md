# scanned/ — 単ページスキャン本の PyMuPDF 文字起こし＋図埋め込み スクリプト一式

`--scanned` の **PyMuPDF 経路**（`pdfimages`/ImageMagick が無い環境・**1 PDF ページ＝1 書籍ページ・正立**のスキャン本）用の再利用スクリプト。
見開き2ページが 90° 回転で格納されたスキャンは本経路を使わず、親手順書 [`../../references/scanned-image-pipeline.md`](../../references/scanned-image-pipeline.md) の pdfimages 経路（回転＋分割）を使う。

> 実績: 1級土木テキスト 施工管理・法規編 327p/図135、土木一般編 385p/図320（2026-06-24）。建設部門は pdfimages 経路（別実績）。

## 前提

- `python -X utf8`（PyMuPDF=`fitz`, Pillow が入っていること）。`Date.now()` 等は不要。
- 一時作業ディレクトリ `WORK_ROOT`（例 `C:\tmp\xxx-ocr`）。レンダ画像は数百 MB になるので終わったら削除。
- 章 .md と `img/` は原書 PDF の隣（`DEST_DIR`、既定 = `SRC_DIR`）に置く＝内部リファレンス（`docs/textbook/...`、**公開しない**）。

## 実行順（end-to-end）

```bash
WORK=C:/tmp/xxx-ocr
SRC="docs/textbook/.../テキスト（○○編）"     # 章PDFが並ぶdir

# 0. 着手前に1ページ Read して「単ページ・正立か / 見開きか」を必ず目視確認

# 1. レンダリング＋バッチ計画（manifest.json を書く）
python render_pages.py "$SRC" "$WORK" --source-label "テキスト（○○編）" --width 2200

# 2. 本文OCR（Workflow ツールで ocr_fanout.workflow.js を実行。args = manifest の chapters/outDir/batchSize）
#    → 完了後 WORK/out/NN__bMM.md が揃う

# 3. 章別 .md ＋ README 連結
python concat_chapters.py "$WORK"

# 4. 図ジョブ＋サムネ生成（drift を見て figWindow を決める。drift<=±1 なら既定 window=2 で可）
python prep_figures.py "$WORK"

# 5. 図領域検出（Workflow で figure_bbox.workflow.js を実行。
#    args = {thumbDir, groupSize:40, jobFiles:[WORK/figjobs_01.json, ...]}）
#    → 返り値 results を WORK/bbox.json に保存
#    未検出が残ったら、その figId だけ candPages を ±5 等に広げて再実行しマージ

# 6. クロップ＆埋め込み（confidence<0.55 は除外。再実行時は 3 をやり直してから）
python crop_embed_figures.py "$WORK"

# 7. README の図カラムを実埋込数へ手直し＋未検出図を注記 → 変更ファイルのみ git add（img 含む）
```

## つまずきポイント（このスクリプト群が織り込み済み）

| 罠 | 対策（どこで） |
|---|---|
| 低解像度で漢字を誤読（リース料→リリース料 等） | OCR 2200px / クロップ 2600px（render の既定） |
| `pdfimages`/`magick` が無い環境 | PyMuPDF で全処理（外部バイナリ不要） |
| マーカー↔ページのズレで図ページを誤特定 | 候補窓±N＋キャプション照合（prep/figure_bbox） |
| 図が多い→ bbox 一括 parallel でレート制限失敗 | groupSize ずつ順次バリア（figure_bbox の GROUP） |
| 数百ジョブを args inline で破綻 | 章別ジョブファイル＋コーディネータ読込（figure_bbox の Load phase） |
| 低確信度 bbox で誤クロップ | confidence<confThreshold を未埋め込み（crop_embed） |
| crop_embed の二重挿入 | 冪等でない。再実行前に concat で章 md を再生成 |
| 系統 OCR 誤読（築造→施造） | concat の SUBS で一括補正（本ごとに追記可） |
| 図を公開R2に出してしまう懸念 | `docs/textbook/**/img` は r2-sync 対象外＝git のみ（公開されない） |
