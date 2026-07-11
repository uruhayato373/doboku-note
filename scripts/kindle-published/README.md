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

| 品番 | ASIN | 版 | EPUB | 表紙 | KDP メモ |
|---|---|---|---|---|---|
| A-00 全科目合本【審査中】 | （審査中・未取得） | 1.0 | `kindle-A-00-goubon.epub` | `kindle-cover-a-00.jpg` | `KDP入力メモ_A-00全科目合本.txt` |
| A-01 安全管理 | B0H8B1HYRY | 1.1 | `A-01_安全管理_論点別過去問.epub` / `kindle-A-01-anzen-updated.epub` | `kindle-cover-A-01.jpg`（`-確認用` は校正版） | `KDP入力メモ_A-01安全管理.txt` |
| A-02 法規 | B0H8CY453L | 1.0 | `kindle-A-02-hoki.epub` | `kindle-cover-a-02.jpg` | — |
| A-03 施工計画 | B0H8D25H93 | 1.0 | `kindle-A-03-sekokeikaku.epub` | `kindle-cover-a-03.jpg` | `KDP入力メモ_A-03施工計画.txt` |
| A-04 環境管理 | B0H8CXKX6Q | 1.0 | `kindle-A-04-kankyo.epub` | `kindle-cover-a-04.jpg` | `KDP入力メモ_A-04環境管理.txt` |
| A-05 品質管理 | B0H8FQ4L2T | 1.0 | `kindle-A-05-hinshitsu.epub` | `kindle-cover-a-05.jpg` | `KDP入力メモ_A-05品質管理.txt` |
| A-06 工程管理 | B0H8FQ7QQL | 1.0 | `kindle-A-06-koutei.epub` | `kindle-cover-a-06.jpg` | `KDP入力メモ_A-06工程管理.txt` |

## cover-designs/

AI生成の表紙デザイン元 PNG（Downloads から退避・7/8 生成分 8枚）。品番マッピングは付いていない生成物（採用/不採用のバリアント混在）。最終採用の表紙は上記の `kindle-cover-*.jpg`（satori 合成・1600×2560）が正。

戦略・価格の真実源は `docs/project/01_戦略/08_Kindle出版戦略.md`。
