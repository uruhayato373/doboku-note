---
name: reference_drive_mount_upload_backlog
description: Google Drive ストリーミングマウントはクライアントがアップロード中だと読み取りが ECANCELED で落ちる。rclone のクラウド件数がローカル件数に追いつくまで待ってから照合・同期する
metadata: 
  node_type: memory
  type: reference
  originSessionId: 47ac84ba-587e-4670-85ad-86238b6c526a
  modified: 2026-09-05T09:56:07.796Z
---

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

関連: [[asset-audience-routing]]
