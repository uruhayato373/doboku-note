# 経路D: 参考文献 bundle の視覚OCR（Sonnet 第1読 ＋ Tesseract 突合 ＋ 対象ページだけ第2読）

`content/sources/books/<id>__<書名>/` の bundle（Drive vault に `pages/pNNNN.jpg`）を、
**テキスト層が無い**本について全文起こしする経路。テキスト層がある本は経路C（`../text-layer/`）。

## 設計（何にモデルを使い、何を機械に任せるか）

| 段 | 担当 | やること |
|---|---|---|
| 0 | 機械 | `book_ocr_prep.py` — 原寸画像を **sha256 で台帳と照合しながら** `.tmp/ocr/<id>/src/` へ複製し、`--width 1500` なら `img/` に縮小版を作る。照合に落ちたページは rclone で雲から取り直し、1 ページでも合わなければ止める |
| 1 | Sonnet | `book_ocr_fanout.workflow.js` — 6 ページ/体で逐語転記。読めない箇所は 〔判読不能〕、切れ・隠れは 〔欠落: 理由〕。推測で埋めない |
| 2 | 機械 | `book_ocr_tesseract.py` — Tesseract jpn で独立に読む（本文には使わない。突合の材料） |
| 3 | 機械 | `book_ocr_compare.py` — ページごとに 1 と 2 の一致率を測り、本の中央値から外れたページ・字数が合わないページ・マーカー欠落バッチを挙げる |
| 4 | Sonnet | `book_ocr_proofread.workflow.js` — **3 で挙がったページだけ**画像を読み直し、Tesseract 出力を「脱落を探す手がかり」にして字句を直す |
| 5 | 機械 | `book_ocr_concat.py` — part（48 ページ）へ連結し、マーカー全数一致・U+FFFD 0 のゲート。README と登録コマンドを出す |
| 6 | 親 | 各本 3 ページを画像と目視で抜き取り、`register.sh --commit` で Drive と台帳へ登録 |

モデルが読むのは「全ページ 1 回」＋「食い違ったページだけもう 1 回」。全ページ 2 回読みの半分以下で、
第2読は Tesseract という独立系の目を借りるので、同じモデルで 2 回読むより脱落を拾える。

## 手順

```bash
B=concrete-basics-5th
python3 .claude/skills/conversion/pdf-to-mdx/scripts/book-ocr/book_ocr_prep.py --book $B --width 1500
python3 .claude/skills/conversion/pdf-to-mdx/scripts/book-ocr/book_ocr_tesseract.py --book $B --jobs 6   # 背景で可
# Workflow: scriptPath=book_ocr_fanout.workflow.js, args={sourceId,title,pagesDir,outDir,batchSize,pageIds,hints}
#   （jobs.json の値をそのまま。初回は onlyBatches:[0..5] で 36 ページ試し、出力を 1 本目視してから全量）
python3 .claude/skills/conversion/pdf-to-mdx/scripts/book-ocr/book_ocr_compare.py --book $B
# Workflow: scriptPath=book_ocr_proofread.workflow.js, args={sourceId,title,pagesDir,tessDir,items=compare.json.proofreadItems}
python3 .claude/skills/conversion/pdf-to-mdx/scripts/book-ocr/book_ocr_concat.py --book $B
sh .tmp/ocr/$B/register.sh            # dry-run
sh .tmp/ocr/$B/register.sh --commit   # Drive と台帳へ
```

- `compare.json` の `rerunBatches` は fanout を `onlyBatches` で取り直す（校正では直らない構造不良）。
- Workflow の並行は 2 本まで（CLAUDE.md §5）。1 冊 = 1 Workflow なので 2 冊まで同時。
- 着手前に `../occlusion/detect_occlusion.py` の候補率を見る。高い本は手持ち撮影＝〔判読不能〕が多く出る前提で読む。

## エージェントは Drive マウントを直接読まない

Drive のストリーミングマウントは、キャッシュから追い出されたファイルを「`ls` ではサイズがあるのに
読むと 0 バイト」で返すことがある（2026-09-09 `concrete-basics-5th` p0080 で実測。310 枚中 1 枚）。
そのまま読ませると空ページを「本文なし」と起こす。prep が sha256 照合済みのローカル複製を作り、
Workflow の `pagesDir` にはその `.tmp/ocr/<id>/img/`（または `src/`）を渡す。

## マーカーの契約

`<!-- p0001 -->` を各ページ本文の先頭に 1 回。印字ノンブルが見えるときだけ `<!-- p0001 印字:62 -->`。
compare / concat はこの正規表現で照合する: `<!--\s*(p\d{4})(?:\s+印字:[^>]*?)?\s*-->`

## 検査ゼロを緑にしない

- prep: ページ 0 件で止まる。tesseract: 失敗数を出し 1 件でも exit 1。
- compare: 比較 0 ページで止まる。「比較したページ数」と「本の一致率中央値」を必ず出す。
- concat: バッチ出力の欠落・マーカー不一致・U+FFFD のどれかで exit 1。〔判読不能〕は数えて README に出す。
