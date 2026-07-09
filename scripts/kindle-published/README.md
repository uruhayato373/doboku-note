# scripts/kindle-published/

KDP で**公開済み（LIVE）**の Kindle 実物アーカイブ。実際に出版した EPUB・表紙・KDP 入力メモを「版として」保全する置き場。

- ビルド出力（`.tmp/`）や Downloads の受け渡しコピーとは別。ここに置くのは**公開が確定した最終物のみ**。
- 再生成可能なビルド中間物ではないので gitignore しない（追跡する）。
- SoT（再生成元）はあくまで各ビルド spec（`scripts/kindle-specs/` ほか）と原稿。ここは「実際に世に出したもの」の記録。

## 収録（2026-07-09 時点）

1級土木施工管理技士 論点別過去問 A シリーズ（A-01〜A-06、個別本）。合本 A-00 は未公開のため対象外。

| 品番 | EPUB | 表紙 | KDP メモ |
|---|---|---|---|
| A-01 安全管理 | `A-01_安全管理_論点別過去問.epub` / `kindle-A-01-anzen-updated.epub` | `kindle-cover-A-01.jpg`（`-確認用` は校正版） | `KDP入力メモ_A-01安全管理.txt` |
| A-02 法規 | `kindle-A-02-hoki.epub` | `kindle-cover-a-02.jpg` | — |
| A-03 施工計画 | `kindle-A-03-sekokeikaku.epub` | `kindle-cover-a-03.jpg` | `KDP入力メモ_A-03施工計画.txt` |
| A-04 環境管理 | `kindle-A-04-kankyo.epub` | `kindle-cover-a-04.jpg` | `KDP入力メモ_A-04環境管理.txt` |
| A-05 品質管理 | `kindle-A-05-hinshitsu.epub` | `kindle-cover-a-05.jpg` | `KDP入力メモ_A-05品質管理.txt` |
| A-06 工程管理 | `kindle-A-06-koutei.epub` | `kindle-cover-a-06.jpg` | `KDP入力メモ_A-06工程管理.txt` |

## cover-designs/

AI生成の表紙デザイン元 PNG（Downloads から退避・7/8 生成分 8枚）。品番マッピングは付いていない生成物（採用/不採用のバリアント混在）。最終採用の表紙は上記の `kindle-cover-*.jpg`（satori 合成・1600×2560）が正。

戦略・価格の真実源は `docs/project/01_戦略/08_Kindle出版戦略.md`。
