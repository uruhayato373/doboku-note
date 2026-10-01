---
name: project_asset_audience_routing
description: "アセット置き場は「誰が使うか」で決める(site→public R2/ci→private R2/human→Drive vault)。リポジトリ軽量化(履歴単一commit化・tracked 415MB)・partial clone運用・OGP CI供給を含む"
metadata:
  type: project
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
クラウド件数がローカル件数に追いつくまで待つ（[[reference_book_sources_drive_vault]]）／`delete-r2-objects
--from-manifest-group` の保全判定は R2 台帳自身では循環するので Drive 台帳の同 sha256 だけを認める（動画レンダー
1,724 件を未同期のまま消せた穴・同日修正）／pre-commit hook を変えたら `npm run pre-commit:install` しないと
「導入済みフックが古い」で commit が黙って止まる／自動モードの分類器は R2 削除をサブエージェント経由でも止める
（ユーザーがモードを切り替えて解除）。
関連: [[project_standards_chapters]] [[reference_book_sources_drive_vault]]

## 統合: リポジトリ軽量化の経緯と恒久ルール（旧 dn0111_repo_slimming / disk_cleanup_textbook_r2_2026_07）
恒久ルールは `asset-storage-policy.md` に抽出済み。ここは「なぜそうなったか」と罠。
- 結果（DN-0111・2026-08）: HEAD 4.15→1.14GiB、履歴 11GB→959MB（**単一 commit へ切り詰め**）、さらに git tracked size 1,163→415.4MB（ogp.png 1,166件等を R2 退避）。note カバー SVG は読むコードが無い中間生成物なので保存しない。切り詰め前の履歴は `git bundle --all` を private R2（`archive/git-history/…bundle` 2.59GB）に保全（sha256 照合・6,577 commit 確認済み、台帳 `git-history-bundle`）。GitHub 報告容量は 11.2→0.93GB（古い PR ref は size に計上されない）。書換え作業には `git clone --bare`（`--mirror` は refs/pull/* まで取る）・1 push 2GiB 制限。`.git` は partial clone 化（過去コンテンツの blame/log -p/旧 checkout は origin から lazy-fetch＝要ネット）。
- **退避すると壊れるもの**: ディスク件数を数える検査は手元だけ緑・CI だけ赤（[[reference_quality_audit_system]]）／約束したのに実体が無いゲートは全件違反／期待値をディスクから作る検査は0件検査の緑／内容ハッシュ方式は全件ドリフト／外部書き込み（note/IG）は実体無しで進むと事故→`ensureLocal()` で fail-closed。manifest に width/height を退避時実測で持たせ、検査は「ローカル実体または台帳の記録」を見る。「ローカルに在る分だけ検査する」形にしない。cover PNG は byte 再現できない（sharp ^0.35.0・827件で9件不一致）ので再生成任せにせず R2 保管。記事日付の真実源は frontmatter。`check-plan-staleness`/`check-backlog-health` は commit 総数で「判定不能」を出す。
- OGP は CI 供給（`.github/workflows/ogp-supply.yml`）: develop push（`content/site/**/*.mdx`）で不足/陳腐化を検出→生成→R2→manifest。鮮度は manifest の `srcHash`（`sha256({title,ogp.title,ogp.subtitle,template/category/tags}).slice(0,16)`・40文字未満で findSecretsの long-hex 検知回避）。`npm ci` が pre-commit フックを入れるため workflow 内で `doc-meta-index.json` を明示生成するステップが必須。asset-reentry 検知ゲート DN-0156（退避済ファイルの `git add -f` 再追跡を止める）。DN-0157（srcHash が frontmatter.title を追うが実描画は ogp.title 優先＝非効率・本番影響なし）は起票済み。
- 教材 PDF（`docs/textbook/**/*.pdf` 295本1.6G）は 2026-07-20 に private R2 `doboku-note-archive` の `textbook/` へ退避（手順 `docs/reference/textbook-pdf-archive.md`、rclone remote `doboku-r2`）。その後 audience ルールで Drive vault へ移行済み。`.git` 縮小の in-place partial-clone swap は 2026-07-20 に 10.17GiB→21M（作業ツリー不動・global history rewrite 不使用）。node_modules 不在時は `npm install --legacy-peer-deps`（[[npm-ci-broken-use-legacy-peer-deps]]）。差替えで消えた autostash の画像最適化20ファイルは `~/doboku-note-autostash-backup-2026-07-20.patch`（要否はユーザー判断）。
