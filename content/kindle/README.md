# Kindle 管理領域

Kindle/KDP 固有の戦略と書き下ろし原稿は、このディレクトリを真実源として Claude エージェントが管理する。
`docs/` は note・SNS・サイト等の人向け成果物に限定し、Kindle 専用の管理ファイルは置かない。

## 配置

- `strategy.md` — 方針・巻の構成・公開の期限・制作と提出の手順（Kindle の企画の正本。一覧は持たない）
- `books/{id}/` — 1 冊ぶんの制作物と入力（フォルダ名は書籍 id。A 系は大文字）
  - `front-matter.md` — EPUB に組み込む書き下ろし前付け
  - `spec.json` — ビルド定義（題名・価格・収録する原稿）。`--spec` でビルダーへ渡す
  - `cover.json` — 表紙の仕様（`pop` と採用済みなら `adoptedImage`）
  - `pop-image.json` — 採用した表紙の制作記録
- `cover-records/` — 複数冊にまたがる表紙の制作記録
- `cover-backgrounds/` — 旧組版の表紙の背景 PNG（Git 管理外。正本は Drive vault の `制作物/Kindle/表紙の背景/`。使う直前に `build-kindle-cover.mjs` が取り戻す）
- コードからは `scripts/lib/kindle-catalog.mjs` の `kindleBookFile` で引く（大文字小文字を区別しない）

書籍の一覧（状態・ASIN・価格・版・公開の予定・置き換え関係）は `config/products.json`（channel kindle）、ビルド定義は
`content/kindle/books/{id}/spec.json` が真実源。人は管理画面の「販売状態 → Kindle」で見る。

配布物（EPUB・表紙）は private R2 の `kindle/dist/` が正本で、手元では `scripts/kindle-dist/<書籍id の小文字>.(epub|jpg)`。
無ければ `npm run asset-hydrate -- --group kindle-dist`。差し替え前の旧版は Drive vault の `アーカイブ/repo/scripts/kindle-published/`。

## 所有者

- `kindle-book-composer` — strategy/spec/原稿ソースを読んで前付けを作成・修正する唯一の編集担当
- `kindle-book-qa` — EPUB と前付けを監査する。原稿は編集しない
- `kdp-operator` — KDP メタデータ、提出、台帳（catalog）の公開状態を更新する

正本の状態が `in_review` または `live` の書籍は、既刊・審査中の内容と Git の原稿が乖離するため、
明示された改訂作業以外では前付けを変更しない。
