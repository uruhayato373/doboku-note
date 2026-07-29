# Kindle 管理領域

Kindle/KDP 固有の戦略と書き下ろし原稿は、このディレクトリを真実源として Claude エージェントが管理する。
`docs/` は note・SNS・サイト等の人向け成果物に限定し、Kindle 専用の管理ファイルは置かない。

## 配置

- `strategy.md` — ラインナップ、価格、出版方針、運用チェックリスト
- `books/{id}/front-matter.md` — EPUB に組み込む書き下ろし前付け

書籍の機械可読な状態・ASIN・版は `scripts/kindle-published/catalog.json`、ビルド定義は
`scripts/kindle-specs/{id}.json` が真実源。

## 所有者

- `kindle-book-composer` — strategy/spec/原稿ソースを読んで前付けを作成・修正する唯一の編集担当
- `kindle-book-qa` — EPUB と前付けを監査する。原稿は編集しない
- `kdp-operator` — KDP メタデータ、提出、catalog と `strategy.md` の公開状態を更新する

`catalog.json` が `in_review` または `live` の書籍は、既刊・審査中の内容と Git の原稿が乖離するため、
明示された改訂作業以外では前付けを変更しない。
