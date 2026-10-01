---
name: reference-book-sources-drive-vault
description: 書籍由来の文字起こしソースはpublic repoから外しGoogle Driveへ移設済み（2026-08-27）
metadata: 
  node_type: memory
  type: reference
  originSessionId: c2e81150-e33b-4758-b238-7a3044a182eb
  modified: 2026-09-05T00:00:00.000Z
---

`content/sources/textbook/**` の文字起こし本文（.md/.html/派生図版）は 2026-08-27 に public repo
の git 追跡から外し、Google Drive の private vault へ移設した。理由: doboku-note repo は public で、
書籍の文字起こしをそのまま追跡するのは著作権上のリスクだった。

**現在の Drive 構造（2026-09-05 に日本語化・1 階層へ簡素化）**。マウント先は
`~/Library/CloudStorage/GoogleDrive-uruhayato373@gmail.com/マイドライブ/doboku-note/`:

```
doboku-note/
├── README.md                       # Drive を開いた人向けの貼り紙
├── 文字起こし/                     # 旧 private-sources/textbook/
│   └── 共通仕様書/{整備局}/
└── 原資料PDF/                      # 旧 references/
    ├── 白書/ 資格試験/ 書籍/
    └── 共通仕様書/{整備局}/         # 地方整備局 10 局
```

- `文字起こし/` 直下の名前は `content/sources/textbook/` 直下と 1 対 1。**ここを変えると復元手順が壊れる**
- `資格試験/` 直下にあった完全一致の重複 4 dir（156MB・84 ファイル）と Word の `~$` 一時ファイル
  12 個は 2026-09-05 に削除済み（正本は `資格試験/１級土木施工管理技士/` 配下に現存）。
  同日、`資格試験/１級土木施工管理技士/` に埋もれていた共通仕様書を `共通仕様書/` へ独立させ
  地方整備局ごとに整理（近畿だけ二重だった PDF 2 本・文字起こし 36 件も削除。証跡 zip と
  qa-report.md は正本へ退避）。整理後は計 905 ファイル
- **`文字起こし/共通仕様書/` だけ `content/sources/textbook/` に対応先が無い**（1 対 1 の例外）。
  成果物は `content/site/standards-articles/` として公開済み。`build-standard-articles` の入力は
  repo 側の `content/site/standards-library/catalog.json` で Drive パスは見ない＝移動で壊れない
- Drive はストリーミングマウント。**`stat` のサイズは cloud-only ファイルだと 16MiB の
  プレースホルダを返す**（実サイズは `wc -c`）。サイズ比較で重複判定するときに嵌まる
- ローカルの実体は削除していない（untrack のみ）。この Mac では従来の読み手はそのまま動く
- 各サブディレクトリの `README.md` だけは git 追跡を継続（案内用）
- git 履歴には旧コミットの内容がまだ残っている（force-push は複数セッション並行環境で危険なため未実施）
- 構造の SSOT は [[reference_civil_pdfs]] が併記する asset-storage-policy.md §1-1。土木奥義（基準類696本）は移動せず現位置
