# scanned/ — 単ページスキャン本の PyMuPDF 文字起こし＋図埋め込み スクリプト一式

`--scanned` の **PyMuPDF 経路**（`pdfimages`/ImageMagick が無い環境・**1 PDF ページ＝1 書籍ページ・正立**のスキャン本）用の再利用スクリプト。
見開き2ページが 90° 回転で格納されたスキャンは本経路を使わず、親手順書 [`../../references/scanned-image-pipeline.md`](../../references/scanned-image-pipeline.md) の pdfimages 経路（回転＋分割）を使う。

> 実績: 1級土木テキスト 施工管理・法規編 327p/図135、土木一般編 385p/図320（2026-06-24）。建設部門は pdfimages 経路（別実績）。

## 前提

- `python -X utf8`（PyMuPDF=`fitz`, Pillow が入っていること）。`Date.now()` 等は不要。
- 一時作業ディレクトリ `WORK_ROOT`（例 `C:\tmp\xxx-ocr`）。レンダ画像は数百 MB になるので終わったら削除。
- 章 .md と `img/` は原書 PDF の隣（`DEST_DIR`、既定 = `SRC_DIR`）に置く＝内部リファレンス（`content/sources/textbook/...`、**公開しない**）。

## 実行順（end-to-end）

```bash
WORK=C:/tmp/xxx-ocr
SRC="content/sources/textbook/.../テキスト（○○編）"     # 章PDFが並ぶdir

# 0. 着手前に1ページ Read して「単ページ・正立か / 見開きか」を必ず目視確認

# 1. レンダリング＋バッチ計画（manifest.json を書く）
python render_pages.py "$SRC" "$WORK" --source-label "テキスト（○○編）" --width 2200

# 2. 本文OCR（Workflow で ocr_fanout.workflow.js。args = manifest の chapters/outDir/batchSize）
#    → WORK/out/NN__bMM.md

# 2.5 本文OCR校正パス（Workflow で proofread.workflow.js。args は 2 と同じ）
#    各バッチ md をページ画像と逐語照合して誤読/言い換え/脱落を修正・上書き（任意だが品質に効く）

# 3. 章別 .md ＋ README 連結
python concat_chapters.py "$WORK"

# 4. 図ジョブ＋サムネ生成（drift<=±1 なら既定 window=2）
python prep_figures.py "$WORK"

# 5. 図 locate（Workflow で figure_bbox.workflow.js。args={thumbDir,groupSize:40,jobFiles:[figjobs_01.json,...]}）
#    → 返り値 results を WORK/bbox.json に保存。未検出は figId の candPages を ±5 に広げ再実行しマージ

# 6. 初期クロップ（埋め込みはまだしない）
python crop_embed_figures.py "$WORK" --crop-only

# 7. 図クロップ audit/refine ループ（タイト化。本文写り込み・切れを締める＝品質の肝）
python prep_audit_jobs.py "$WORK"                 # → audit_jobs_NN.json / jobFiles 配列
#   反復: figure_crop_audit.workflow.js を実行 → 返り値を WORK/audit.json に保存 →
python apply_deltas_recrop.py "$WORK" "$WORK/audit.json"   # adjust_bbox 適用＋不合格図のみ再クロップ
#   不合格が残れば prep_audit_jobs.py "$WORK" --only <audit_retry_ids.txt の中身> で対象を絞って再監査。
#   全 pass か 2〜3 反復で打ち切り。relocate=true の図は locate(5) をやり直し。

# 8. 埋め込み（最終 bbox で。再実行時は concat(3) で章 md をクリーン再生成してから）
python crop_embed_figures.py "$WORK"

# 9. 冗長プレースホルダ短縮（![図]直後の長い（図:…）行を要点だけに）
python trim_placeholders.py "$WORK"

# 10. README の図カラムを実埋込数へ手直し＋未検出図を注記 → 変更ファイルのみ git add（img 含む）
```

> 図品質の肝は **6→7 の audit/refine ループ**。locate(5) の "確信度" は「正しい図か」しか測らないので、
> **実クロップ PNG を見る scanned-figure-crop-auditor の adjust_bbox 反復**でタイト化しないと本文写り込み・切れが残る。

## つまずきポイント（このスクリプト群が織り込み済み）

| 罠 | 対策（どこで） |
|---|---|
| 低解像度で漢字を誤読（リース料→リリース料 等） | OCR 2200px / クロップ 2600px（render の既定） |
| `pdfimages`/`magick` が無い環境 | PyMuPDF で全処理（外部バイナリ不要） |
| マーカー↔ページのズレで図ページを誤特定 | 候補窓±N＋キャプション照合（prep/figure_bbox） |
| 図が多い→ bbox 一括 parallel でレート制限失敗 | groupSize ずつ順次バリア（figure_bbox / figure_crop_audit の GROUP） |
| 数百ジョブを args inline で破綻 | 章別ジョブファイル＋コーディネータ読込（Load phase） |
| **bbox が緩く本文段落の写り込み・図の切れ**（locate 単発の限界） | **audit/refine ループ**＝scanned-figure-crop-auditor が実クロップ PNG を見て adjust_bbox を返し、apply_deltas_recrop が算術適用＋再クロップを反復 |
| 低確信度 bbox で誤クロップ（別図を掴む） | confidence<confThreshold を未埋め込み（crop_embed）＋監査の correct_figure=0→relocate でlocateやり直し |
| 本文OCRの言い換え/誤読/脱落（密な数値段落） | proofread.workflow.js でページ画像と逐語照合して補正（concat 前の2パス目） |
| ![図]直後の冗長な（図:…）プレースホルダ | trim_placeholders.py で要点だけに短縮（埋め込み済みのみ） |
| crop_embed の二重挿入 | 冪等でない。再実行前に concat で章 md を再生成 |
| 系統 OCR 誤読（築造→施造） | concat の SUBS で一括補正（本ごとに追記可） |
| 図を公開R2に出してしまう懸念 | `content/sources/textbook/**/img` は r2-sync 対象外。かつ 2026-08-27〜 README.md 以外 git 追跡外＝実体は Drive vault のみ（公開されない）。**文字起こし .md は `文字起こし/{資格}/{書名}/` へ手コピー、`img/*.png` は `npm run drive-vault-sync -- --group textbook-page-image --commit` で `原資料PDF/教材/{書名}/**` へ登録**（手コピーは台帳に載らず `check-drive-vault` が未同期扱いにする） |
