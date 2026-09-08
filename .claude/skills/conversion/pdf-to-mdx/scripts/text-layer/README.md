# 経路C: テキスト層抽出（born-digital 原本）

参考文献 bundle（`content/sources/books/`）の原本に**使えるテキスト層がある**場合だけ通る経路。
視覚OCRを 1 ページも回さずに全文が取れるので、**視覚OCRに着手する前に必ず先に判定する**。

## 1. 判定

```bash
python3 .claude/skills/conversion/pdf-to-mdx/scripts/text-layer/classify_text_layer.py
```

全 book-manifest の原本を実際に開いて 3 区分で返す。

| class | 意味 | 経路 |
|---|---|---|
| `CLEAN_TEXT` | テキスト層をそのまま使える | この経路C |
| `DIRTY_OCR_LAYER` | テキスト層はあるが既存OCRが低品質（字送り・誤字・1字ずつ分解） | 視覚OCR（経路A/B） |
| `NO_TEXT_LAYER` | テキスト層なし | 視覚OCR（経路A/B） |

> [!warning]
> `book-manifest.json` の `renderProfile.mode`（`born-digital` 等）は**ページ画像の作り方**であって
> テキスト層の有無ではない。`born-digital` でもテキスト層が無い本が多数ある（Kindle 画面の取込など）。
> mode を根拠に「OCR不要」と判断しない。

2026-09-08 時点の実測は `CLEAN_TEXT` 1冊 40p / `DIRTY_OCR_LAYER` 4冊 1,536p / `NO_TEXT_LAYER` 21冊 5,284p。

## 2. 抽出

構造（見出し・階層・段落）は**版面の幾何**で決める。`pdftotext -layout` の空白数は同じ字下げ段でも
揺れるので階層判定に使わない。`pdftohtml -xml` が返す行頭 x と行末 x を使う。

- 行頭 x のクラスタ = 字下げ段 → 箇条書きの階層
- 段落1字下げの x = 段落の開始
- 行末 x が版面幅いっぱい = 折り返しの継続行（次行と連結する）
- 本文段落に割り込む表（フロート）は段落の再結合から外し、別ブロックとして組む

実装例（総監キーワード集2026）: `extract_ipej_cem_keywords.py`。書籍ごとに章の切れ目と
フロート表が違うので、**この形を雛形にして書籍ごとに 1 本書く**。

## 3. 検証（この経路の合格条件）

1. 原本テキスト層の文字数と出力の文字数を突き合わせ、**差分をすべて説明できること**
   （見出しの全角→半角化などは説明可能な差。説明できない欠落は 0）
2. U+FFFD が 0 件
3. 版面行の**全行**がいずれかの章へ割り当たること（取りこぼし 0）
4. ページ画像と目視照合を最低 1 ページ（階層の深い代表ページ）
5. 再実行して **bit 一致**すること（原本だけで再現できる）

## 4. 登録

```bash
node scripts/record-reference-book-artifacts.mjs --source-id <id> \
  --ocr-path content/sources/books/<dir>/ocr/<章>.md \
  --ocr-pages p0006,p0007,... --ocr-method pdf-text-layer --commit
```

`--ocr-method` に `pdf-text-layer` を入れる（視覚OCRと来歴を区別するため）。
本文 .md は Git 追跡外で Drive vault にだけ置かれる（`source-transcript` group）。
