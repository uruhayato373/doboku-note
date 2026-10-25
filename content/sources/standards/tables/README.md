# content/sources/standards/tables/ — 原本と照合して組み直した表

共通仕様書の章記事（`content/site/standards-articles/`）で、`pdftotext -layout` の版面のままでは表にできない表を、
原本のページ画像と照合して組み直したもの。1 表 1 ファイル（`{key}.json`）。生成器 `scripts/build-standard-articles.mjs` が読む。

2026-10-16 時点で 217 件（近畿版などの共通仕様書 8 文書で共有 95・北海道版 120・四国版／北陸版だけの地域版 9 ほか）。
共通仕様書で版面のまま残る表は「図の中の文字」の 4 件だけ（各文書）。2026-10-19 以降に加えた必携・マニュアル・特記・参考資料・付表の 13 文書は 1,176 種類が版面のまま残っており、順に組み直している（DN-0850）。文書ごとの残り件数は `config/standards-structure.json` の `readabilityBaselines.verbatimTables`（増やさない）。

## 形

- `key`: 版面の行（キャプション除く）を空白を除いて連結した文字列の sha256 先頭 16 桁。同じ表を持つ機関すべてに効く。ファイル名と一致させる
- `layout`: 版面の行をそのまま（照合の鍵）
- `kind`: `table`（`header` / `rows` / `notes`）・`list`（`items`）・`parts`（下の部品の並び）・`absorbed`（`into` の版面が取り込む）・`verbatim`（図の中の文字など。版面のまま）
- `parts` の部品: `caption`・`text`・`table`・`list`・`note`・`verbatim`（`lines`。分数の式など）
- 表の部品: `header`（複数行可。2 行目以降は太字の行）・`rows`・`headerFrom`（見出しの無い続きの表に前の表の見出しを写す。`key#n` で n 番目の表）・`headerFill`（見出しの語がテキスト層に無く空欄になった列だけを、同じ列構成の表の見出しで補う。`key#n` 可・表示だけで照合の外）・`headerImage`（斜線の枠などで見出しの語がテキスト層に無いか崩れたとき、原本の紙面から読んだ見出しで表示だけを置き換える。`header` と同じ列数の行の並び・横の結合は `{"same":"left"}`・照合の外で QA が画像と照合する。DN-0850）・`headerless: true`（原本・版面に見出しが無い）。結合セルの繰り返しは `{"same":"above"}` / `{"same":"left"}`
- `absorbs`: 同じ章のこの表より前の版面を取り込む（版面の区切りと表の区切りが合わない紙面のため）
- `absorbsParagraphs`: `{ "before": [...], "after": [...] }`。表の領域の外で段落に化けた表の行・見出し（次のページに続いた行・表の上の見出しの断片）を取り込む。文字は章記事の段落の文字そのまま（原本の並び順・before は表の直前の段落で終わり、after は直後の段落から始まる）。生成器は前後の段落が一致するときだけ段落を出さずに表へ渡し、合わなければ止まる。照合の文字には版面に加えてこの段落の文字も入る。版面の key は変わらない（DN-0755）
- `documentVariants`: `{ "<機関>/<文書>": { 中身の欄 } }`。版面（key）が同じでも、その文書だけ表の外に化けた段落の文字が違う（北海道版は ㎝ が cm）ときに、その文書で使う中身を丸ごと書く（`kind`・`header`・`rows`・`notes`・`items`・`parts`・`headerFrom`・`headerFill`・`headerImage`・`headerless`・`absorbs`・`into`・`absorbsParagraphs` を置き換え、元の欄は使わない）。承認はファイル 1 つで、`validate` は差し替えも照合して確認用の表を別に書く（DN-0776）
- `review`: `status`（`draft` / `approved` / `rejected`）・`by`・`at`（UTC）・`note`（版面に無い行・文字化け・判断の根拠）

## 守ること（生成器と検査が機械で止める）

- **承認済み（approved）だけが使われる。** 下書きは版面のまま出る
- **文字の過不足ゼロ**: 部品の文字（結合セルの繰り返しと headerFrom・headerFill の写しを除く）と、版面（取り込んだ版面を含む）の文字が多重集合で一致する。並べ替えは自由、追加・欠落は 1 文字も不可。承認済みで合わなければ生成が止まる
- 検査 `npm run check-standard-articles` の 14 番が、生成器とは別の実装で、承認・ハッシュ・layout の原典実在・文字の一致・取り込みの対応・件数を照合する

## 作り方

流れは `/standards-table-rebuild`（`.claude/skills/conversion/standards-table-rebuild/SKILL.md`）、道具は `npm run standards-tables -- inventory|render|sheets|validate|review`、
組み直しは `standards-table-writer`、照合・承認は `standards-table-qa`（`.claude/agents/`）。どの PC でも同じ手順で回せる。

- 原本のページ画像は Google Drive vault（`npm run build-standards-page-images` が作る 270dpi の画像・provenance は `content/sources/standards/{機関}/{文書}/manifest.json`）を使う。vault が見えない PC は発行機関の掲載ページから原本 PDF を取り、`render` で必要なページだけ画像にする（catalog の SHA-256 と違えば拒否）
- 版面に無い行・注記（原本では表の中にあるが、テキスト層では別の段落になっているもの）は表に足さず、`review.note` に書く。それらは章の本文側に段落として残っている
- 地域版（四国・北陸）だけの表は、その機関の画像が無ければ近畿版の同じ表の画像で構造を見る（`review.note` に記載）

原本が改訂されて版面が変わると key が変わり、古いファイルは使われなくなる（台帳で新しい key を出し、組み直し直す）。
