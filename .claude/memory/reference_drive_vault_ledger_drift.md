---
name: reference_drive_vault_ledger_drift
description: Drive 台帳のずれの罠（Google Drive 本体停止で ETIMEDOUT・同時書き込みで更新が消える・CI は手元を見ず WARN に沈む）と直し方
metadata:
  type: reference
---

2026-10-10 に quality:audit:ci の手元 FAIL 4 件（past-exam-inventory・asset-storage・drive-vault・reference-book-pages）を追って分かったこと。

- **Google Drive の本体アプリが止まっていると、マウントの read が全部 ETIMEDOUT**（File Provider の拡張だけが動いている）。`pgrep -fl "Google Drive.app/Contents/MacOS"` が空なら `open -a "Google Drive"`。20 秒ほどで読めるようになる。起動直後は取り込みが混むので、大量に読む処理は少し待つか資格・フォルダ単位で回す。
- **Drive 台帳（drive-manifest.json）の同時書き込みで更新が消える**: 書き手は台帳を読んでから丸ごと書き戻していた。9/9 夜に書籍の取り込みと動画の作り直しが重なり、動画 2,618 本の台帳が初回退避（9/5〜6）のまま残った。#963 で lock＋差分の重ね書きにした（DN-0656）。症状は「手元に無く、Drive の中身が台帳と違う」が 1 つの日付に固まること。直し方は Drive の実体が新しい版なら `drive-vault-sync --group <g> --from-vault --commit`（Drive へは書かず台帳だけ直す）。
- **CI は手元を見ないので、Drive 未登録は WARN に沈む**（過去問 2,112 本が CI では WARN のまま読まれなかった）。手元で FAIL が出たら「環境のせい」で片づけず中身を見る。
- **`drive-vault-sync --commit` は `--force` が無くても、台帳と中身が違うファイル（local-newer）の Drive 側を上書きする**。未登録分だけ直すときは `--path <ファイル>` で 1 本ずつ回す。R2 側は `asset-offload --only-new`。
- 大きな検査は抜き取り（check-drive-vault）なので、不一致は回すたびに違うファイルが出る。全件は `drive-vault-sync --group <g> --verify --deep --out <一致一覧>` で、不一致は台帳から一致一覧を引いて出す。

関連: [[reference_book_sources_drive_vault]] [[feedback_worktree_ignored_data]]
