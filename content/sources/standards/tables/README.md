# content/sources/standards/tables/ — 原本と照合して組み直した表

共通仕様書の章記事（`content/site/standards-articles/`）で、`pdftotext -layout` の版面のままでは表にできない表を、
原本のページ画像と照合して組み直したもの。1 表 1 ファイル（`{key}.json`）。生成器 `scripts/build-standard-articles.mjs` が読む。

2026-10-16 時点で 217 件（近畿版などの共通仕様書 8 文書で共有 95・北海道版 120・四国版／北陸版だけの地域版 9 ほか）。
版面のまま残る表は「図の中の文字」の 4 件だけ（各文書）。

## 形

- `key`: 版面の行（キャプション除く）を空白を除いて連結した文字列の sha256 先頭 16 桁。同じ表を持つ機関すべてに効く。ファイル名と一致させる
- `layout`: 版面の行をそのまま（照合の鍵）
- `kind`: `table`（`header` / `rows` / `notes`）・`list`（`items`）・`parts`（下の部品の並び）・`absorbed`（`into` の版面が取り込む）・`verbatim`（図の中の文字など。版面のまま）
- `parts` の部品: `caption`・`text`・`table`・`list`・`note`・`verbatim`（`lines`。分数の式など）
- 表の部品: `header`（複数行可。2 行目以降は太字の行）・`rows`・`headerFrom`（見出しの無い続きの表に前の表の見出しを写す。`key#n` で n 番目の表）・`headerless: true`（原本・版面に見出しが無い）。結合セルの繰り返しは `{"same":"above"}` / `{"same":"left"}`
- `absorbs`: 同じ章のこの表より前の版面を取り込む（版面の区切りと表の区切りが合わない紙面のため）
- `review`: `status`（`draft` / `approved` / `rejected`）・`by`・`at`（UTC）・`note`（版面に無い行・文字化け・判断の根拠）

## 守ること（生成器と検査が機械で止める）

- **承認済み（approved）だけが使われる。** 下書きは版面のまま出る
- **文字の過不足ゼロ**: 部品の文字（結合セルの繰り返しと headerFrom の写しを除く）と、版面（取り込んだ版面を含む）の文字が多重集合で一致する。並べ替えは自由、追加・欠落は 1 文字も不可。承認済みで合わなければ生成が止まる
- 検査 `npm run check-standard-articles` の 14 番が、生成器とは別の実装で、承認・ハッシュ・layout の原典実在・文字の一致・取り込みの対応・件数を照合する

## 作り方（2026-10-16 の手順）

1. 版面のまま残った表の台帳: `node scripts/build-standard-articles.mjs --check <文書…> --table-inventory=<出力.json>`
2. 原本 PDF（catalog の SHA-256 と一致するもの）から該当ページを画像にする
3. Writer が画像で構造を決め、版面の文字だけで組む（status draft）。別の QA が画像と 1 セルずつ照合して approved / rejected を付ける
4. 版面に無い行・注記（原本では表の中にあるが、テキスト層では別の段落になっているもの）は表に足さず、`review.note` に書く。それらは章の本文側に段落として残っている
5. 地域版（四国・北陸）だけの表は原本 PDF が手元に無く、近畿版の同じ表の画像と組み直しを参照した（`review.note` に記載）

原本が改訂されて版面が変わると key が変わり、古いファイルは使われなくなる（台帳で新しい key を出し、組み直し直す）。
