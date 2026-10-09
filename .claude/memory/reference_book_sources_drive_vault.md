---
name: reference_book_sources_drive_vault
description: "Google Drive vault。書籍文字起こしの移設先と構造・ストリーミングマウントの罠(stat 16MiB・アップロード中ECANCELED)・Drive MCP でバイナリ送信不可"
metadata:
  type: reference
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

---

## アップロード中のマウント読みは ECANCELED

2026-09-05、`drive-vault-sync --verify --deep --cloud`（マウント読み 11,898 件）と `--from-r2 --dedupe-by-sha`
（既存 PDF 157 本のハッシュ化）が **どちらも `ECANCELED: operation canceled, read` で即死**した。
原因は Drive クライアントの未送信バックログ（vault 17,984 件のうちクラウドには 8,061 件しか届いていなかった）。
アップロード中はマウント経由の読みが不安定になる。

**待ち方**: `rclone size doboku-gdrive:doboku-note --json` の `count` と、マウント側の
`find <vault> -type f -not -name .DS_Store | wc -l` が一致するまで 5 分おきに見る（Monitor で 20〜30 分無変化は
停滞として通知）。速度は 36〜150 件/分と大きく揺れ、1 万件で 1〜2 時間かかった。
追いついた直後の照合は 20,078 件すべて 1 発で通った。

**順序**: 読むだけの照合を先に、マウントへ書く同期を後に（書いた瞬間からまた送信が始まり読みが不安定になる）。
rclone リモート `doboku-gdrive` は drive.readonly スコープなので代替アップロード経路には使えない。

関連: [[project_asset_audience_routing]]

---

## Drive MCP でバイナリをアップロードできない

Drive MCP `create_file` はバイナリに `base64Content` が要るが、filesystem MCP の読み出し上限が約 25K chars のため PNG 等（IG カルーセル 1080×1350 で 57〜152KB＝76K〜203K chars）は context に載せられず送れない。テキストは `textContent` 経由で可（caption.txt 等）。

代替: ①ブラウザで drive.google.com へ手動ドラッグ＆ドロップ ②OAuth スクリプト（`C:\tmp\upload-to-drive.mjs`・gemini-cli の公開 installed-app 資格を流用・drive.file スコープ・REST マルチパート。**client_id/secret の値はリポジトリにも memory にも書かない**＝GitHub push protection が止める）③git 管理のまま Mac 側で使う。確立済み運用: PNG は git commit で保持、caption.txt のみ MCP で Drive へ。

**取り戻し（--pull）の範囲（2026-10-10）**: `--pull` は送る側と違い既定で実行される（dry-run ではない）。`--pull --path content/sources/books/` のように接頭辞を広く取ると、書籍のページ画像まで数百枚取り寄せる（701 枚で止めた）。group 単位で取り戻すなら `--pull --group <group id>`（例: `reference-book-coverage`）で絞り、件数が多そうなら先に `--dry-run` で対象件数を見る。
