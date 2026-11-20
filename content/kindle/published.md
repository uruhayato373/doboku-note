# 出版済みの Kindle 本（人が読む索引）

KDP で公開した本の ASIN・版・配布物を人が引くための表。2026-11-20 までは `scripts/kindle-published/` にこの README と A 系の実物（EPUB・表紙）を置いていた（DN-1204 で移した）。

- 配布物（EPUB・表紙）は全冊 private R2 の `kindle/dist/` が正本で、手元では `scripts/kindle-dist/<書籍id の小文字>.(epub|jpg)`。無ければ `npm run asset-hydrate -- --group kindle-dist`。
- 再生成元は各ビルド spec（`content/kindle/books/<id>/spec.json`）と原稿。A 系は `builder` と `buildTheme`。
- 差し替え前の旧版（A-01 の旧 EPUB・確認用表紙・令和7年度の POP 表紙）は Drive vault の `アーカイブ/repo/scripts/kindle-published/` に退避した。

## 収録

公開済みの各シリーズを下表に記録する。EPUB・表紙の列のうち A 系の名前は 2026-11-20 までのファイル名で、今は `scripts/kindle-dist/a-0x.(epub|jpg)`。

**機械可読 SSOT = `config/products.json` の Kindle の書籍**（ASIN・価格・状態・版 version の真実源）。下表と `content/kindle/strategy.md` の「出版済み一覧」はここから派生させる。ASIN は Amazon 恒久 ID（アフィリリンク・公開状態照合・外部導線に使用）。

## 版管理（継続的改善）

EPUB を更新して KDP に再アップしたら、正本の当該本の `version` を上げ `versionHistory` に1行足す（例: A-01 は解説補完後の再アップで `1.0 → 1.1`）。リビルドは `node <builder> --theme <buildTheme>` で再現できる（両フィールドは catalog に記録済み）。上げた EPUB と表紙は `scripts/kindle-dist/` に置き、`node scripts/asset-offload.mjs --group kindle-dist --include-untracked --commit` で R2 へ上げる。

## 書式インバリアント検査（全シリーズ共通）

`npm run check-kindle-format`（`scripts/check-kindle-format.mjs`）で、ビルド済み EPUB が書式ハウスルールを満たすか機械検査する（読み取り専用）。`epubcheck`（EPUB 仕様の妥当性）の上に乗る意味層で、**入稿前チェックの必須ゲート**。

検査する UX 不変条件（CSS 文字列ではなく outcome ベース）:
- **R1 可読性**: `style.css` の body に font-family と `line-height >= 1.5`
- **R2 章の分離**: 各章が改ページ境界で始まる（章別 spine ファイル or 見出しに `break-before:page`）
- **R3 解答の分離**: 解答が改ページ境界で始まる（別 `*a.xhtml` spine or `.ans` に `break-before:page`）
- **R4 選択肢の連番**: 単一項目の `<ol class="opts">` が連続しない（原稿の loose list をパーサーが各選択肢別 `<ol>` にすると番号が全て「1.」にリセットされる沈黙バグの検出。D系で実発生）

A（問題/解答を別 XHTML に分割＝構造的改ページ）と D（`.ans` の CSS 改ページ）は実装が違うが、同じ UX 不変条件で両方を検証する。ビルド直後の入稿前は `node scripts/check-kindle-format.mjs .tmp/kindle-<id>/*.epub` で個別検査できる。

| 品番 | ASIN | 版 | EPUB | 表紙 | KDP メモ（2026-11-20 に追跡をやめた。A 系は Drive の `アーカイブ/repo/`、ほかは `npm run gen-kdp-memo <id>` で `.tmp/kdp-memo/` に作る） |
|---|---|---|---|---|---|
| A-00 全科目合本 | B0H8HW139T | 1.0 | `kindle-A-00-goubon.epub` | `kindle-cover-a-00.jpg` | `KDP入力メモ_A-00全科目合本.txt` |
| A-01 安全管理 | B0H8B1HYRY | 1.1 | `A-01_安全管理_論点別過去問.epub` / `kindle-A-01-anzen-updated.epub` | `kindle-cover-A-01.jpg`（`-確認用` は校正版） | `KDP入力メモ_A-01安全管理.txt` |
| A-02 法規 | B0H8CY453L | 1.0 | `kindle-A-02-hoki.epub` | `kindle-cover-a-02.jpg` | — |
| A-03 施工計画 | B0H8D25H93 | 1.0 | `kindle-A-03-sekokeikaku.epub` | `kindle-cover-a-03.jpg` | `KDP入力メモ_A-03施工計画.txt` |
| A-04 環境管理 | B0H8CXKX6Q | 1.0 | `kindle-A-04-kankyo.epub` | `kindle-cover-a-04.jpg` | `KDP入力メモ_A-04環境管理.txt` |
| A-05 品質管理 | B0H8FQ4L2T | 1.0 | `kindle-A-05-hinshitsu.epub` | `kindle-cover-a-05.jpg` | `KDP入力メモ_A-05品質管理.txt` |
| A-06 工程管理 | B0H8FQ7QQL | 1.0 | `kindle-A-06-koutei.epub` | `kindle-cover-a-06.jpg` | `KDP入力メモ_A-06工程管理.txt` |
| C-01 道路 | B0HB3374VL | 1.0 | `kindle-dist/c-01.epub` | `kindle-dist/c-01.jpg` | kdp-memo.json |
| C-02 河川砂防 | B0HB3JF9QZ | 1.0 | `kindle-dist/c-02.epub` | `kindle-dist/c-02.jpg` | kdp-memo.json |
| C-03 都市計画 | B0HB3BLV94 | 1.0 | `kindle-dist/c-03.epub` | `kindle-dist/c-03.jpg` | kdp-memo.json |
| C-04 土質及び基礎 | B0HB3KWZBD | 1.0 | `kindle-dist/c-04.epub` | `kindle-dist/c-04.jpg` | kdp-memo.json |
| C-05 鋼構造及びコンクリート | B0HB3CL6C7 | 1.0 | `kindle-dist/c-05.epub` | `kindle-dist/c-05.jpg` | kdp-memo.json |
| C-06 施工計画 | B0HB37CTYN | 1.0 | `kindle-dist/c-06.epub` | `kindle-dist/c-06.jpg` | kdp-memo.json |
| C-07 建設環境 | B0HB3585PD | 1.0 | `kindle-dist/c-07.epub` | `kindle-dist/c-07.jpg` | kdp-memo.json |
| C-08 港湾及び空港 | B0HB3H3N7Y | 1.0 | `kindle-dist/c-08.epub` | `kindle-dist/c-08.jpg` | kdp-memo.json |
| C-09 電力土木 | B0HB34VG8C | 1.0 | `kindle-dist/c-09.epub` | `kindle-dist/c-09.jpg` | kdp-memo.json |
| C-10 鉄道 | B0HBQSYKZ6 | 1.0 | `kindle-dist/c-10.epub` | `kindle-dist/c-10.jpg` | kdp-memo.json |
| C-11 トンネル | B0HBR397N3 | 1.0 | `kindle-dist/c-11.epub` | `kindle-dist/c-11.jpg` | kdp-memo.json |
| C-I 必須科目I | B0HBR2F6KZ | 1.0 | `kindle-dist/c-I.epub` | `kindle-dist/c-I.jpg` | kdp-memo.json |
| F-01 ゼネコン | B0HBQTCDXR | 1.0 | `kindle-dist/f-01.epub` | `kindle-dist/f-01.jpg` | kdp-memo.json |
| F-02 河川コンサル | B0HBQVW3G9 | 1.0 | `kindle-dist/f-02.epub` | `kindle-dist/f-02.jpg` | kdp-memo.json |
| F-03 自治体上水道 | B0H9X5WMX7 | 1.0 | `kindle-dist/f-03.epub` | `kindle-dist/f-03.jpg` | kdp-memo.json |
| F-04 自治体下水道 | B0H1DTYCNG | 1.0 | `kindle-dist/f-04.epub` | `kindle-dist/f-04.jpg` | kdp-memo.json |
| F-05 自治体公園緑地 | B0GYJ94CWB | 1.0 | `kindle-dist/f-05.epub` | `kindle-dist/f-05.jpg` | kdp-memo.json |
| F-06 自治体契約調達 | B0GZKYXZP7 | 1.0 | `kindle-dist/f-06.epub` | `kindle-dist/f-06.jpg` | kdp-memo.json |
| F-07 自治体技術基準 | B0HBR87S59 | 1.0 | `kindle-dist/f-07.epub` | `kindle-dist/f-07.jpg` | kdp-memo.json |
| F-08 自治体河川 | B0HCMGB517 | 1.0 | `kindle-dist/f-08.epub` | `kindle-dist/f-08.jpg` | kdp-memo.json |
| F-09 自治体港湾 | B0HCMC5JHG | 1.0 | `kindle-dist/f-09.epub` | `kindle-dist/f-09.jpg` | kdp-memo.json |
| F-10 自治体砂防 | B0HCMY82PX | 1.0 | `kindle-dist/f-10.epub` | `kindle-dist/f-10.jpg` | kdp-memo.json |
| F-11 自治体道路 | B0HCMLKJZT | 1.0 | `kindle-dist/f-11.epub` | `kindle-dist/f-11.jpg` | kdp-memo.json |
| F-12 自治体都市計画 | B0HCMVSZSW | 1.0 | `kindle-dist/f-12.epub` | `kindle-dist/f-12.jpg` | kdp-memo.json |
| F-13 道路橋梁コンサル | B0HCMLZSCN | 1.0 | `kindle-dist/f-13.epub` | `kindle-dist/f-13.jpg` | kdp-memo.json |
| F-14 都市計画コンサル | B0HCMRYPC8 | 1.0 | `kindle-dist/f-14.epub` | `kindle-dist/f-14.jpg` | kdp-memo.json |
| F-15 5管理クロストレードオフ論文集 | B0HCMR444R | 1.0 | `kindle-dist/f-15.epub` | `kindle-dist/f-15.jpg` | kdp-memo.json |
| F-16 設問3国家施策バンク | B0HCMNDNX8 | 1.0 | `kindle-dist/f-16.epub` | `kindle-dist/f-16.jpg` | kdp-memo.json |
| G-01 コンクリート診断士 | B0HGXCGGS2 | 1.0 | `kindle-dist/g-01.epub` | `kindle-dist/g-01.jpg` | kdp-memo.json |
| G-02 コンクリート主任技士 | B0HGXLGJ5Y | 1.0 | `kindle-dist/g-02.epub` | `kindle-dist/g-02.jpg` | kdp-memo.json |
| i-01 1級 施工経験記述 過去問模範答案集 | B0HPZNQRT1 | 1.0 | `kindle-dist/i-01.epub` | `kindle-dist/i-01.jpg` | `KDP入力メモ_i-01.txt` |

> ASIN の真実源は `config/products.json` の Kindle の書籍（`asin` フィールド）。この表と
> `content/kindle/strategy.md` は人が読む索引で、**3 箇所とも同時に更新する**
> （LIVE 化のたびに漏れやすい。2026-07-27 に C-01〜C-09 で本 README だけ記録漏れが発生した）。
> 審査中で ASIN 未発番の本は catalog の `draftAsin` のみを持ち、この表には載せない。

戦略・価格の真実源は `content/kindle/strategy.md`。
