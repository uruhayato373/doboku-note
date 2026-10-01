---
name: disk-cleanup-textbook-r2-2026-07
description: 教材PDF1.6Gを私設R2 doboku-note-archive へ退避。残る最大容量は.git 10G(未対応)、縮小策=partial re-clone
metadata: 
  node_type: memory
  type: project
  originSessionId: daa93bb3-29a4-4d15-b735-f413cf1a4ef6
---

2026-07-20 のPC容量削減（プロジェクト計19G→14G、start時 .git 10G/作業ツリー9G）。

- **応急**（ユーザー選択）: `out`(1.4G)/`.next`(888M)/`node_modules`(989M)/デバッグprofile を削除＝再生成物のみ、~5G回収。node_modules復元は [[npm-ci-broken-use-legacy-peer-deps]]。
- **PDF退避**: `docs/textbook/**/*.pdf`（282追跡＋13無視＝295本/1.6G・PDF→MDX変換の入力素材）を **新規プライベートR2バケット `doboku-note-archive`**（カスタムドメイン未バインド＝非公開。公開CDN `doboku-note`＝`storage.doboku-note.com` とは別。著作権スキャンを公開バケットに置かないため）の `textbook/` prefix へ rclone 退避。`rclone check --one-way` で 0 differences 確認後に削除。`.gitignore`＋追跡除外（commit `a8d55bf2a`・**origin/develop へ push済**）。手順SSOT=`docs/reference/textbook-pdf-archive.md`、rclone remote名 `doboku-r2`。

- **`.git` 縮小（完了）**: `.git` 10.17GiB→**21M**（プロジェクト計 19G→4.3G・空き16→38Gi）。手法＝**in-place partial-clone swap**（作業ツリー不動でメタデータのみ差替）: ①未pushコミット(a8d55bf2a)を origin へ push ②`git clone --filter=blob:none --no-checkout` を temp へ（履歴5683コミット保持・blob除外＝19M）③`extensions.partialClone=origin` を明示設定し lazy-fetch を実テスト ④`mv .git .git-old`＋新.git設置→`update-ref/symbolic-ref/reset --mixed` で develop HEAD/index 再構築（作業ツリー無変更）⑤post-swap `git status`＝pre-swap ベースライン(28ファイル)と完全一致を確認 ⑥全検証green後 `.git-old` 削除で reclaim。**global history rewrite（filter-repo＋force-push）は不使用**＝origin無変更。

**副作用/フォロー**: (1) `.git` は partial clone 化。通常作業(edit/status/commit/push/pull)は通常どおりだが、**過去バージョンのコンテンツ取得（git blame / log -p / show OLD:file / 旧コミットcheckout / 世代間diff）は origin から blob を lazy-fetch**（要ネット・都度.git微増）。(2) node_modules 不在→dev/build/commit 前に [[npm-ci-broken-use-legacy-peer-deps]]。(3) 差し替えで消える **leftover autostash（stash@0＝docs/textbook/…/テキスト（施工管理・法規編）/img/02-*.png の画像最適化20ファイル）を `~/doboku-note-autostash-backup-2026-07-20.patch`（12M・バイナリ）に保全**。作業ツリー未適用。要否はユーザー判断（`git apply --binary <patch>` で復元）。
