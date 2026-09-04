# scripts/kindle-dist/

KDP 提出用に**制作完了した Kindle 配布物（EPUB＋表紙）を git 追跡**する置き場（B〜G シリーズ = 38冊）。
KDP のアカウント作成数制限で提出は数日〜に分けて進めるため、いつでも取り出せるよう成果物を保全する。

- `<id>.epub` … 入稿用 EPUB（build-pe1-kindle / build-essay-kindle の出力）
- `<id>.jpg`  … 表紙 1600×2560（build-kindle-cover の出力）

## マスター登録簿

全書籍の状態は [`../kindle-published/catalog.json`](../kindle-published/catalog.json) が真実源。
`status` = `ready`（制作完了・提出待ち）/ `in_review`（KDP審査中）/ `live`（公開済）。
提出して ASIN が出たら catalog の `asin` と `status=live` を更新する（Claude に ASIN を渡せば処理）。

A シリーズ（公開済/審査中）の実物は歴史的経緯で [`../kindle-published/`](../kindle-published/) 直下にある。

## 再生成（spec / theme から決定的に再現できる）

EPUB は B〜G 系の `buildSpec` または A 系の `buildTheme`、表紙は
`kindle-covers/specs/<id>.json` から再現可能。A 系は公開済み版を保護するため、ID を明示したときだけ
`scripts/kindle-published/` の catalog 配布先へ再生成する。

```bash
npm run sync-kindle-dist              # ready 全冊を再ビルド → kindle-dist/ へ
npm run sync-kindle-dist -- --downloads   # 併せて ~/Downloads/kindle-<id>.(epub|cover.jpg) も更新（アップロード用）
npm run sync-kindle-dist -- e-01 d-01     # 指定 id のみ
npm run sync-kindle-dist -- A-00 A-01     # A 系は buildTheme で再生成（公開済み版を上書きするため明示時のみ）
```

## KDP 入稿メモ

各本の入力メモは [`../kindle-published/`](../kindle-published/) の `KDP入力メモ_<id>.txt`（`npm run gen-kdp-memo <id>` で共通テンプレ生成・著者=doboku-note で統一）。
