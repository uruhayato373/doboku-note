# Kindle 管理領域

Kindle/KDP 固有の戦略と書き下ろし原稿は、このディレクトリを真実源として Claude エージェントが管理する。
`docs/` は note・SNS・サイト等の人向け成果物に限定し、Kindle 専用の管理ファイルは置かない。

## 配置

- `strategy.md` — ラインナップ、価格、出版方針、運用チェックリスト
- `published.md` — 出版済みの本の ASIN・版・配布物の表（人が読む索引。正本は `config/products.json`）
- `books/{id}/` — 1 冊ぶんの制作物と入力（フォルダ名は書籍 id。A 系は大文字）
  - `front-matter.md` — EPUB に組み込む書き下ろし前付け
  - `spec.json` — ビルド定義（題名・価格・収録する原稿）。`--spec` でビルダーへ渡す
  - `cover.json` — 表紙の仕様（`pop` と採用済みなら `adoptedImage`）
  - `pop-image.json` — 採用した表紙の制作記録
- `cover-records/` — 複数冊にまたがる表紙の制作記録
- コードからは `scripts/lib/kindle-catalog.mjs` の `kindleBookFile` で引く（大文字小文字を区別しない）

書籍の機械可読な状態・ASIN・版は `config/products.json`（channel kindle）、ビルド定義は
`content/kindle/books/{id}/spec.json` が真実源。

## 所有者

- `kindle-book-composer` — strategy/spec/原稿ソースを読んで前付けを作成・修正する唯一の編集担当
- `kindle-book-qa` — EPUB と前付けを監査する。原稿は編集しない
- `kdp-operator` — KDP メタデータ、提出、catalog と `strategy.md` の公開状態を更新する

正本の状態が `in_review` または `live` の書籍は、既刊・審査中の内容と Git の原稿が乖離するため、
明示された改訂作業以外では前付けを変更しない。
