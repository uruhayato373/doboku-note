# 参考文献の共通ルール

参考文献の原本、文字起こし、公開記事を一つの参照 ID でつなぐための運用 SSOT。機械可読の真実源は
`.claude/config/reference-sources.json`、原本と非公開文字起こしの保管先は Google Drive vault とする。

## 1. 参考文献の区分

記事の `sources` は自由記述の書名ではなく、`reference-sources.json` の ID を使う。区分の値を変えるときは
台帳、検査、既存コンテンツへの影響を一体で設計し、個別記事や変換スキルで例外を作らない。

| class | 対象 | 逐語 | 図 | 文字起こし公開 | 出典粒度 |
|---|---|---|---|---|---|
| `public-standard` | 国・自治体が公開する仕様書・示方書 | 可 | 可 | 可 | 版面ページ（`page`） |
| `government-publication` | 白書・省庁資料 | 可（利用条件に従う） | 可（利用条件に従う） | 可 | 資料名と URL（`title-url`） |
| `exam-official` | 試験実施機関が公開する過去問 | 問題文だけ可 | 可 | 可 | 出典節（`section`） |
| `commercial-book` | 市販書籍・スキャン教材 | 不可 | 不可 | 不可 | 書名（`title`） |
| `operator-owned` | 運営者が権利を持つ著作物 | 可 | 可 | 可 | 著作物名（`title`） |
| `external-primary` | 法令・規格・指針・便覧 | 短い引用だけ | 不可 | 対象外 | 資料名（`name`） |

補足:

- `government-publication` は出典を示し、編集・加工した場合はその旨も明記する。
- `exam-official` は問題文に限って出典明示のうえ使用し、解答・解説は独自表現で再構成する。
- `commercial-book` の逐語転載は一文でも公開しない。記事本文は原本の技術的意味を確認したうえで独自に書き直す。
- 数値や基準は市販教材から写さず、`external-primary` の法令・規格・指針で取り直す。条番号は
  `labor-safety-rules#第240条` のように ID の後ろへ付けられる。

## 1-2. 台帳へ載せる参照・載せない参照

台帳は**公開可否（逐語・図の再利用・文字起こし公開）を管理するため**にあり、記事が触れた資料の全一覧ではない。

- **載せる**: 白書・省庁資料、法令・規格・指針、公的仕様書、試験実施機関の過去問、市販書籍・スキャン教材、
  運営者の著作物。いずれも「どこまで再利用してよいか」を判断する必要がある原本。
- **載せない**: Wikipedia、民間企業の解説記事、個人ブログなど、逐語・図を再利用しない参照。これらは
  記事の参考資料節に資料名と URL を示すにとどめ、`sources` へは書かない（自由文字列の ID を作らない）。

2026-09-07 の実測では、総監 747 本のうち 387 本が白書・法令・規格を本文で名指ししており、残り 360 本の
参考資料は上記「載せない」側だった。`sources` が空であること自体は欠落ではない。

## 2. 原本から記事までのライフサイクル

```text
原本を Drive vault へ保管
  → reference-sources.json へ登録
  → 文字起こしに source frontmatter を付けて source-transcript group で同期
  → 記事 frontmatter の sources から ID で参照し、class 所定の粒度で出典を書く
  → check-reference-sources（通常／staged／deep）で鎖と利用条件を検査
```

順序を逆にしない。台帳登録より先に文字起こしや記事を作ると、著作物区分が未確定の素材が増え、公開可否を
後から判断できなくなる。

文字起こしは先頭に次の frontmatter を持つ。`sourcePdfs` は
`.claude/state/assets/drive-manifest.json` の `reference-book-source-pdf` キーを指定する。
未移行書籍だけは旧 `textbook-source-pdf` キーも許容する。

```yaml
---
source: registry-id
sourcePdfs:
  - content/sources/books/registry-id__短い書名/source/001.pdf
pdfPages: 1-6
printedPages: 10-15
method: visual-ocr
---
```

記事側は `sources: [registry-id]` とする。`aliases` は旧表記からの移行候補を出すためだけに使い、記事へ
残さない。出典本文は class の `citation` に応じてページ、資料名と URL、出典節、書名、資料名を示す。

検査コマンド:

```bash
npm run check-reference-sources
npm run check-reference-sources -- --staged
npm run check-reference-sources -- --deep
```

既存データを共通 ID へ移行するときだけ、`npm run backfill-reference-sources -- --transcripts` または
`npm run backfill-reference-sources -- --articles` を使う。どちらも既定は dry-run なので差分候補を確認し、
適用時に限って末尾へ `--commit` を付ける。

`--deep` は Drive 上の文字起こし frontmatter と原本台帳を突合し、`commercial-book` 由来の記事に
40 文字以上の逐語一致がないことも確認する。Drive がマウントされていない環境では実体検査 0 件を明示し、
通常検査だけを行う。

**40 文字の根拠**（2026-09-08 実測・DN-0181）。真実源は `scripts/lib/reference-sources.mjs` の
`VERBATIM_MIN_RUN` で、下の測定はそのコメントに残してある。

| 閾値 | 実データの一致件数（192 組・文字起こし 1,295,248 字 × 記事 987,365 字） | 中身 |
|---|---|---|
| 40 | 0 | — |
| 35 | 206 | JIS 規格名・数値付きの技術要件（実在の最長一致は 38 字） |
| 30 | 502 | 同上に試験方法の定型句が加わる |

下げると増えるのは**言い換えでは短くできない用語**なので、ゲートが構造的に赤くなる。逆に見逃し側は、
句読点・空白・全角半角の差を `normalizeForCompare` が落とすため窓幅の問題ではなく、残る抜け道は
語の挿入・削除で一致を分断する形だけ（40 なら 40 字ごとの語挿入までは検出する）。
索引が `seed=20 / stride=10` である以上 29 字未満は取りこぼすので、**閾値を 29 未満にするなら
seed / stride も同時に変える**（`tests/reference-sources.test.mjs` が縛っている）。

## 3. 参考文献を 1 冊増やす手順

1. `/asset-route` で利用者を判定し、人または手元の変換スクリプトだけが使う原本は Drive vault の
   `原資料PDF/` 配下へ置く。市販書籍の正規形は `書籍/{referenceId}__{短い書名}/`。
2. `.claude/config/reference-sources.json` の既存 6 class から区分を選び、`id`、`title`、`origin`、必要なら
   `transcriptDir`、`appliesTo`、`aliases` を登録する。新しい class や既存 class の値が必要なら実装を止めて判断する。
3. `bookBundle` を登録した書籍は `npm run build-reference-book-pages -- --source-id <id>` の dry-run 後、
   `--commit` で `source/` と通し `pages/`、`book-manifest.json` を作る。
   取込元が vault 外の同じマイドライブにある場合は、`sourceFiles[].legacyMyDrivePath` にマイドライブルートからの
   相対 PDF パスを記録する。絶対パス、`..`、PDF 以外、複数の旧配置指定は検査で拒否する。
   生成器は取込元を削除しないが、正本登録後は正本を優先して読み、旧取込元が無くても動く。
4. `pdf-to-mdx --scanned` 等で文字起こしを作り、§2 の frontmatter を付ける。OCR 本文は原本の再現物なので、
   公開記事向けの言い換えは文字起こしではなく記事側で行う。`bookBundle` 書籍の新規 OCR は
   `content/sources/books/{referenceId}__{短い書名}/ocr/` を論理キーにする。
5. OCR と最終図 crop を作った `bookBundle` 書籍は `npm run record-reference-book-artifacts` の dry-run 後、
   `--commit` で Drive・`drive-manifest.json`・`book-manifest.json` へ同時登録する。従来配置の書籍は
   `npm run drive-vault-sync -- --group source-transcript --commit` を使う。
   最後に対象 group を `--verify --deep --cloud` でローカル・台帳・Drive と照合する。
6. 記事の `sources` に ID を追加し、class 所定の粒度で出典を書く。
7. 通常検査と `--deep` を通す。市販書籍なら逐語一致 0 を確認してから公開する。

Drive や R2 の削除はこの手順に含めない。不要物の削除は対象と復元手段を別途確認してから行う。

## 4. Drive vault と台帳の対応

| 対象 | Drive vault | 台帳・group |
|---|---|---|
| 原本 PDF | `原資料PDF/書籍/{referenceId}__{短い書名}/source/` | `reference-sources.json` の `origin` ＋ `reference-book-source-pdf` |
| 原本ページ画像・クロップ | 同ディレクトリの `pages/`・`crops/` | `reference-book-page-image` ＋ `book-manifest.json` |
| 文字起こし・校正 | 同ディレクトリの `ocr/` | `source-transcript`（README を除く `.md`）＋ `book-manifest.json` |

文字起こしの `source` が参考文献 ID、`sourcePdfs` が原本 PDF の Drive キーを保持する。これにより Drive の
フォルダ名を人が読める状態に保ちながら、記事までの機械的な追跡は安定した ID で行える。
従来の `content/sources/textbook/` 論理キーは `transcriptDir` として互換維持し、物理的には原資料の `ocr/` を指す。
新規 OCR は `bookBundle.transcriptDir` を使う。原本未入手の資料は明示した `transcriptVaultDir` に置き、
原本があるように装わない。旧 PDF キーは台帳で正本へ向け、同一内容の PDF を複製しない。

共通仕様書の旧文字起こしは `原資料PDF/共通仕様書/{整備局}/{PDF名}/ocr/` へ統合した。
公開 `standards-library` / `standards-articles` は repo 側を入力とするため、Drive の物理移動には依存しない。

## 5. 構成流用の扱い

市販書籍では文章や図だけでなく、章立て、項目の選択、並び順も独自に再構成することを推奨する。ただし、
構造の類似を機械的に正誤判定するのは不安定なため、これは `check-reference-sources` のゲートにはしない。
逐語一致 0 を通過しても、公開前レビューで原本の構成をそのままなぞっていないかを確認する。

2026-07-31 のコンクリート診断士では、技報堂のスキャン教材から作ったテキストを独自散文に再構成し、
原典図 25 枚を自作図等へ置換した。さらに、教材由来の 98 問は論点だけを保った自作演習へ書き換えた。
これは市販書籍由来コンテンツを公開可能な形へ直した前例であり、構成も含めて独自編集へ転換する際の基準とする。

展開先（guide・textbook・keyword・practice・primary・past-exam・standards・note）ごとの加工ルール表と、commercial-book → guide/textbook の標準手順（原文を渡さない brief 方式）は [content-taxonomy.md](./content-taxonomy.md) §7 を参照する。
