# content/sources/standards/ — 公的基準のページ画像・ページテキスト

国交省の土木工事共通仕様書などを、原本 PDF から「1 ページ = 1 画像 + 1 テキスト」へ展開したもの。

## なぜページ単位に割るか

章記事（`content/site/standards-articles/`）の本文は `part-NN.md`（50 ページ束）までしかページ情報を持たず、「この記述は原本の何ページか」を機械で言えなかった。ページ単位に割ってはじめて次の 3 つが成立する。

1. **出典ページの明示**。記事の記述を原本のページ番号で裏付けられる
2. **読み取りの再現性**。同じページ画像から何度でも読み直せる。読み間違いを後から検証できる
3. **図クロップの原寸確保**。270dpi の原寸から切り出せる

## 構成

```
content/sources/standards/
├── README.md                    # このファイル（git 追跡）
└── {agencyId}/{documentId}/     # catalog.json と同じ ID 体系（例 tohoku/common）
    ├── manifest.json            # git 追跡。provenance の実体
    ├── pages/p0001.jpg …        # git 追跡外 → private R2
    └── text/p0001.txt           # git 追跡外 → private R2
```

`agencyId` / `documentId` は `content/site/standards-library/catalog.json` の値をそのまま使う。章記事・カタログ・ページ画像が同じキーで引けるようにするため、独自の命名を作らない。

## manifest.json が持つもの

| キー | 中身 |
|---|---|
| `sourceSha256` | 原本 PDF のハッシュ。catalog と一致しなければ別の原本を写している |
| `sourceFile` | Drive vault 内の相対パス |
| `render` | 描画条件（pdftoppm / 270dpi / JPEG q85） |
| `parts` | catalog の part とページ範囲。章記事との突き合わせ用 |
| `pageEntries` | 各ページの画像パス・バイト数・sha256・テキスト文字数・**版面ページ番号**・**section** |
| `printedPage` | 本文開始 PDF ページ・版面番号を拾えた枚数・一意に指せない件数 |

原本の同定はファイル名ではなく **sha256** で行う。Drive 側のファイル名は整理で変わりうるがハッシュは変わらないため。

## 出典は「section + 版面ページ番号」で指す

PDF の通しページ番号（p0120）と、版面に刷られたページ番号（1-42）は一致しない。原本を引くとき人が使うのは後者なので、両方を持たせている。

ただし版面番号だけでは足りない。この共通仕様書は目次が 1-1 から 1-77 まで進んだあと、本文が再び 1-1 から始まる。同じ「1-42」が目次と本文に 1 つずつ存在する。そこで各ページに `section`（`front` = 目次・前付け / `body` = 本文）を持たせ、**section と版面ページ番号の組で一意**にしている。

```
PDF p0050 = front 版面 1-49
PDF p0079 = body  版面 1-1     ← ここから本文。番号が巻き戻る
PDF p0120 = body  版面 1-42
```

境界は「同じ編の中で番号が減った最初の地点」で機械判定する。北海道開発局版のように目次が無番号で巻き戻りが起きない文書は、全ページを `body` として扱う。

`check-standards-page-images` は section と版面番号の組の重複を FAIL にする。一意に指せない状態を緑にしないため。

## 生成と取り戻し

```bash
npm run build-standards-page-images              # role=common を全整備局（既定）
npm run build-standards-page-images -- --role all # companion 62 文書も含む
npm run check-standards-page-images              # provenance 整合。quality:audit にも同梱
npm run asset-hydrate -- --path content/sources/standards/tohoku/
```

生成には Google ドライブ vault（`原資料PDF/共通仕様書/`）の原本 PDF と poppler（`brew install poppler`）が要る。どちらも無い端末では生成できないので、R2 から取り戻す。

## 沖縄総合事務局について

沖縄の共通仕様書は中国地方整備局版と原本 sha256 が完全一致する。画像は重複生成せず、`okinawa/common/manifest.json` に `sameAs: "chugoku/common"` を持たせて実体は 1 つにしている。catalog.json 側も同じ扱い。

## テキスト層について

対象の PDF はすべて born-digital（スキャンではない）で、PDF 自身がテキスト層を持つ。`text/pNNNN.txt` はそれを `pdftotext -layout` でページ境界ごとに割ったもので、OCR ではない。したがって文字の取り違えは原理的に起きない。OCR が要るのはスキャン教材（`content/sources/textbook/`）の側で、そちらは別のパイプライン（`/pdf-to-mdx --scanned`）が扱う。
