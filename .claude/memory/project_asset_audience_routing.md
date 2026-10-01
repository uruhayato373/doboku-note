---
name: asset-audience-routing
description: アセット置き場は「誰が使うか」で決める（site→public R2 / ci→private R2 / human→Google Drive vault）。2026-09-05 制定・同日 DN-0169 で移行完了（R2 の人 tier は全撤去）
metadata: 
  node_type: memory
  type: project
  originSessionId: 47ac84ba-587e-4670-85ad-86238b6c526a
  modified: 2026-09-05T09:55:56.391Z
---

2026-09-05、共通仕様書のページ画像 3.4GB を「教材ページ画像→private R2」の行に従って private R2 へ
上げかけ、ユーザーの「なぜ R2?」で止めた。旧ルールは資産の種類の列挙で判断軸が無かった。
ユーザー提案「サイトで使う画像は R2、それ以外は Google Drive」に CI の制約を 1 行足して 3 行ルールへ:

| audience | 置き場 |
|---|---|
| site（サイトが配信） | public R2 `doboku-note` |
| ci（Actions が読み書き） | R2 private / byVisibility |
| human（人か手元のスクリプトだけ） | Google Drive vault `マイドライブ/doboku-note/` |

- 機械化: `asset-storage.json` 全 group に `audience` 必須（`loadConfig`・`tests/asset-storage.test.mjs`・
  `check-drive-vault` の 3 か所で止める）。human を R2 に残すなら `audienceException`（20 字以上）。
- Drive は R2 の第 3 バケットにせず独立系（`drive-vault.json` / `scripts/lib/drive-vault.mjs` /
  `drive-vault-sync` / `check-drive-vault` / `drive-manifest.json`）。理由: R2 側の fail-closed コードに分岐を足さない・
  CI に Drive が無い構造をコードでも表す。`/asset-route` スキルが決定木。
- Drive vault 4 フォルダ: 原資料PDF（隣にページ画像・教材/{書名} は repo 1:1）/ 文字起こし / 制作物 / アーカイブ。
- **CI 調査の事実**: render-longform・Kindle・IG 公開のワークフローは存在しない（人 tier）。note-cover-png は
  2026-09-29 から human＋例外 R2（Mac の週次 note-cover-routine が書く・CI 供給は廃止。ci tier は該当なし）。post-youtube-scheduled.yml が読む `sns/youtube-shorts/` は台帳外。
- **移行完了（2026-09-05・DN-0169 削除）**: 11 group 19,236 件を Drive へ、全 group `--verify --deep --cloud` 不一致 0 →
  R2 側 13,700 超を削除 → forget。R2 台帳は note-cover-png / site-ogp-png / sns-archived-media / git-history-bundle の
  4 group 2,696 エントリだけ。DN-0170 も同日完了＝reels wav/mp4・YouTube Shorts mp4（sns-archived-media 281 件）を Drive 制作物/SNS音声動画/ へ移し public R2 sns/ を空に・upload-sns-r2 廃止（post-youtube-scheduled の Shorts 台帳は pending 0・参照キーは R2 に 0 件で CI 読者は休眠）。DN-0172 も 2026-09-06 完了＝drive-manifest を lean format（導出できる vaultPath / regenerable を省く・1 エントリ 1 行・loadDriveManifest が補完・書き時は往復 deep-equal を検証）へ。12.9→7.8MiB（23,485 件）。台帳 JSON を直読みする側は vaultPath を当てにしない。DN-0171 は同日完了＝note-cover-png を private 一本化（public 823 件を server-side copy→md5 照合→削除。byVisibility で公開のたび private 旧コピーが台帳外に残る型を根絶）。
- 外部へ書くスクリプトの入口は `ensureLocalAny()`（`scripts/lib/asset-locate.mjs`・R2→Drive の順）。

嵌まりどころ: Drive の `stat` は cloud-only で 16MiB プレースホルダ（読んで測る）／マウントへ書けた≠クラウドへ上がった
（rclone md5 で照合）／**Drive クライアントがアップロード中はマウント読みが ECANCELED で落ちる**→ `rclone size` の
クラウド件数がローカル件数に追いつくまで待つ（[[reference_drive_mount_upload_backlog]]）／`delete-r2-objects
--from-manifest-group` の保全判定は R2 台帳自身では循環するので Drive 台帳の同 sha256 だけを認める（動画レンダー
1,724 件を未同期のまま消せた穴・同日修正）／pre-commit hook を変えたら `npm run pre-commit:install` しないと
「導入済みフックが古い」で commit が黙って止まる／自動モードの分類器は R2 削除をサブエージェント経由でも止める
（ユーザーがモードを切り替えて解除）。
関連: [[standards-page-images]] [[reference_book_sources_drive_vault]]
