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
`.claude/state/assets/drive-manifest.json` の `textbook-source-pdf` キーを指定する。

```yaml
---
source: registry-id
sourcePdfs:
  - 原資料PDF/教材/example/source.pdf
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

## 3. 参考文献を 1 冊増やす手順

1. `/asset-route` で利用者を判定し、人または手元の変換スクリプトだけが使う原本は Drive vault の
   `原資料PDF/` 配下へ置く。
2. `.claude/config/reference-sources.json` の既存 6 class から区分を選び、`id`、`title`、`origin`、必要なら
   `transcriptDir`、`appliesTo`、`aliases` を登録する。新しい class や既存 class の値が必要なら実装を止めて判断する。
3. `pdf-to-mdx --scanned` 等で文字起こしを作り、§2 の frontmatter を付ける。OCR 本文は原本の再現物なので、
   公開記事向けの言い換えは文字起こしではなく記事側で行う。
4. `npm run drive-vault-sync -- --group source-transcript --commit` で同期し、
   `npm run drive-vault-sync -- --group source-transcript --verify --deep --cloud` でローカル・台帳・Drive を照合する。
5. 記事の `sources` に ID を追加し、class 所定の粒度で出典を書く。
6. 通常検査と `--deep` を通す。市販書籍なら逐語一致 0 を確認してから公開する。

Drive や R2 の削除はこの手順に含めない。不要物の削除は対象と復元手段を別途確認してから行う。

## 4. Drive vault と台帳の対応

| 対象 | Drive vault | 台帳・group |
|---|---|---|
| 原本 PDF | `原資料PDF/{区分}/{書名}/` | `reference-sources.json` の `origin` ＋ `textbook-source-pdf` |
| 原本ページ画像 | `原資料PDF/{区分}/{書名}/pages/` | 原本用の Drive group |
| 文字起こし | `文字起こし/{書名}/` | `source-transcript`（README を除く `.md`） |

文字起こしの `source` が参考文献 ID、`sourcePdfs` が原本 PDF の Drive キーを保持する。これにより Drive の
フォルダ名を人が読める状態に保ちながら、記事までの機械的な追跡は安定した ID で行える。

`文字起こし/共通仕様書/` と公開 `standards-library` の関係は未整理の既存債務であり、別タスクで扱う。

## 5. 構成流用の扱い

市販書籍では文章や図だけでなく、章立て、項目の選択、並び順も独自に再構成することを推奨する。ただし、
構造の類似を機械的に正誤判定するのは不安定なため、これは `check-reference-sources` のゲートにはしない。
逐語一致 0 を通過しても、公開前レビューで原本の構成をそのままなぞっていないかを確認する。

2026-07-31 のコンクリート診断士では、技報堂のスキャン教材から作ったテキストを独自散文に再構成し、
原典図 25 枚を自作図等へ置換した。さらに、教材由来の 98 問は論点だけを保った自作演習へ書き換えた。
これは市販書籍由来コンテンツを公開可能な形へ直した前例であり、構成も含めて独自編集へ転換する際の基準とする。
