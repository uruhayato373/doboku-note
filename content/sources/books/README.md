# 参考文献の書籍 bundle

市販書籍などの参考文献を、`reference-sources.json` の **1 ID = 1 ディレクトリ**で管理する。

- ディレクトリ名: `{referenceId}__{短い書名}`
- `source/`: 読み順の原本 PDF（`001.pdf` からの連番）
- `pages/`: 書籍全体の通しページ画像（`p0001.jpg` からの連番）
- `ocr/`: 文字起こし本文・既存章別図版・校正記録
- `crops/`: 原典照合済みの最終図クロップ
- `book-manifest.json`: 原本・分冊順・ページ対応・sha256 の追跡情報

Git が追跡するのはこの README と `book-manifest.json` だけ。原本、ページ画像、OCR、クロップは
Google Drive vault の内部資料であり、public R2 や公開記事へ置かない。
同一内容の PDF は正本1箇所だけ。旧論理キーは台帳から正本へ解決し、旧取込元のコピーは必要ない。
文字起こし専用のトップレベルフォルダも作らない。

生成と検査:

```bash
npm run build-reference-book-pages -- --source-id <referenceId>       # dry-run
npm run build-reference-book-pages -- --source-id <referenceId> --commit
npm run record-reference-book-artifacts -- --source-id <referenceId> ... # OCR/crop の dry-run
npm run record-reference-book-artifacts -- --source-id <referenceId> ... --commit
npm run check-reference-book-pages
npm run check-reference-book-pages -- --deep
```
