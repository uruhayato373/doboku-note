# scripts/kindle-published/

KDP で**公開済み（LIVE）**の Kindle 実物アーカイブ。実際に出版した EPUB・表紙・KDP 入力メモを「版として」保全する置き場。

- ビルド出力（`.tmp/`）や Downloads の受け渡しコピーとは別。ここに置くのは**公開が確定した最終物のみ**。
- 再生成可能なビルド中間物ではないので gitignore しない（追跡する）。
- SoT（再生成元）はあくまで各ビルド spec（`scripts/kindle-specs/` ほか）と原稿。ここは「実際に世に出したもの」の記録。

## 収録（2026-07-09 時点）

1級土木施工管理技士 論点別過去問 A シリーズ（A-01〜A-06、個別本）。合本 A-00 は未公開のため対象外。

**機械可読 SSOT = [`catalog.json`](./catalog.json)**（ASIN・価格・状態・版 version の真実源）。下表と `08_Kindle出版戦略.md` の「出版済み一覧」はここから派生させる。ASIN は Amazon 恒久 ID（アフィリリンク・公開状態照合・外部導線に使用）。

## 版管理（継続的改善）

EPUB を更新して KDP に再アップしたら、`catalog.json` の当該本の `version` を上げ `versionHistory` に1行足す（例: A-01 は解説補完後の再アップで `1.0 → 1.1`）。リビルドは `node <builder> --theme <buildTheme>` で再現できる（両フィールドは catalog に記録済み）。実物 EPUB もここへ上書き保存して追跡する。

## 書式インバリアント検査（全シリーズ共通）

`npm run check-kindle-format`（`scripts/check-kindle-format.mjs`）で、ビルド済み EPUB が書式ハウスルールを満たすか機械検査する（読み取り専用）。`epubcheck`（EPUB 仕様の妥当性）の上に乗る意味層で、**入稿前チェックの必須ゲート**。

検査する UX 不変条件（CSS 文字列ではなく outcome ベース）:
- **R1 可読性**: `style.css` の body に font-family と `line-height >= 1.5`
- **R2 章の分離**: 各章が改ページ境界で始まる（章別 spine ファイル or 見出しに `break-before:page`）
- **R3 解答の分離**: 解答が改ページ境界で始まる（別 `*a.xhtml` spine or `.ans` に `break-before:page`）
- **R4 選択肢の連番**: 単一項目の `<ol class="opts">` が連続しない（原稿の loose list をパーサーが各選択肢別 `<ol>` にすると番号が全て「1.」にリセットされる沈黙バグの検出。D系で実発生）

A（問題/解答を別 XHTML に分割＝構造的改ページ）と D（`.ans` の CSS 改ページ）は実装が違うが、同じ UX 不変条件で両方を検証する。ビルド直後の入稿前は `node scripts/check-kindle-format.mjs .tmp/kindle-<id>/*.epub` で個別検査できる。

| 品番 | ASIN | 版 | EPUB | 表紙 | KDP メモ |
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

> ASIN の真実源は `scripts/kindle-published/catalog.json`（`asin` フィールド）。この表と
> `docs/project/01_戦略/08_Kindle出版戦略.md` は人が読む索引で、**3 箇所とも同時に更新する**
> （LIVE 化のたびに漏れやすい。2026-07-27 に C-01〜C-09 で本 README だけ記録漏れが発生した）。
> 審査中で ASIN 未発番の本は catalog の `draftAsin` のみを持ち、この表には載せない。

## cover-designs/

AI生成の表紙デザイン元 PNG（Downloads から退避・7/8 生成分 8枚）。品番マッピングは付いていない生成物（採用/不採用のバリアント混在）。最終採用の表紙は上記の `kindle-cover-*.jpg`（satori 合成・1600×2560）が正。

戦略・価格の真実源は `docs/project/01_戦略/08_Kindle出版戦略.md`。
