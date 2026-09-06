# 教材スキャンPDF アーカイブ運用（Google Drive vault）

`content/sources/textbook/` 配下のスキャン教材・白書・過去問の**元PDF**とページ画像（PDF→MDX 変換の入力）を git に溜め込まず、Google Drive vault へ退避し、必要なときだけローカルへ取り戻す運用方針。2026-07-20 制定、2026-09-05 に置き場を private R2 から Drive vault へ改めた。

## なぜ Drive vault か

置き場は「誰が使うか」で決める（真実源: [asset-storage-policy.md](asset-storage-policy.md) §1）。

- サイトが配信する → public R2 `doboku-note`
- GitHub Actions が読み書きする → private R2 `doboku-note-archive`
- 人か手元のスクリプトだけが使う → Google Drive vault `マイドライブ/doboku-note/`

教材の原本 PDF・ページ画像を読むのは人（文字起こし・OCR照合）と手元の変換スクリプト（`pdf-to-mdx --scanned`）だけで、サイトの配信にもビルドにも登場せず、GitHub Actions が触ることもない。したがって private R2 ではなく **Drive vault が正しい置き場**になる。決定木は `/asset-route` スキル。

> [!warning] 著作権のあるスキャンは公開バケットに置かない
> スキャン教材・問題集は著作権物。public R2 `doboku-note`（カスタムドメイン `storage.doboku-note.com` 経由で公開）には置かない。Drive vault は非公開かつ「誰が使うか」の分類にも合致する唯一の置き場。

## 置き場と対応関係

| 項目 | 値 |
|---|---|
| 置き場 | Google Drive vault `マイドライブ/doboku-note/原資料PDF/教材/{書名}/`（`content/sources/textbook/{書名}/` の 1:1 ミラー。PDF とページ画像 `pages/` が同居） |
| キー対応 | `content/sources/textbook/<相対パス>` ↔ `原資料PDF/教材/<相対パス>` |
| git（元PDF） | `.gitignore` で除外。実体は Drive vault のみ |
| git（ページ画像・図クロップ） | `.gitignore` で `content/sources/textbook/**/*.{png,jpg,jpeg,webp,pdf}` を除外。実体は Drive vault、台帳は `.claude/state/assets/drive-manifest.json` |
| 文字起こし `.md` | `マイドライブ/doboku-note/文字起こし/{書名}/`。group `source-transcript` で台帳化し、原本との対応は frontmatter が保持（手順は [reference-sources-policy.md](reference-sources-policy.md)） |
| マウント先 | 端末ごとに違う（Mac `~/Library/CloudStorage/GoogleDrive-<account>/マイドライブ/`、Windows `G:\マイドライブ\` 等）。コードは `scripts/lib/drive-vault.mjs` の `resolveVaultRoot()` が解決する |

> [!note] Drive はストリーミングマウント
> `stat`/Finder のサイズは cloud-only ファイルで 16MiB のプレースホルダになる。実サイズは読んで測る（`drive-vault-sync` は常にファイルを読んで sha256/バイト数を確認する）。

## rclone リモート設定

R2（既存・S3 互換）と Drive（新規・OAuth）の 2 系統を併用する。

```bash
# R2 側（既存・.env.local の値で一度だけ登録）
rclone config create doboku-r2 s3 provider Cloudflare \
  access_key_id "$CLOUDFLARE_R2_ACCESS_KEY_ID" \
  secret_access_key "$CLOUDFLARE_R2_SECRET_ACCESS_KEY" \
  endpoint "https://$CLOUDFLARE_ACCOUNT_ID.r2.cloudflarestorage.com" region auto

# Drive 側（新規・ブラウザ OAuth・人が1回だけ）
rclone config create doboku-gdrive drive
# 対話プロンプトでブラウザが開くので Google アカウントでログイン・許可する
```

`--verify --cloud`（後述）は `doboku-gdrive` リモートを使って Drive API の md5 を照合する。リモート未設定なら fail-closed（検証不成立）で止まる。

## コマンド

```bash
# R2 にしか無いものを vault へ寄せる（既に vault にある同一 sha256 は複製せず adopt）
node scripts/drive-vault-sync.mjs --group textbook-source-pdf --from-r2 --dedupe-by-sha --commit
node scripts/drive-vault-sync.mjs --group textbook-page-image --from-r2 --dedupe-by-sha --commit

# 検証（ローカル実体 ↔ 台帳 ↔ Drive の3者照合。--cloud で Drive API の md5 まで見る）
node scripts/drive-vault-sync.mjs --group textbook-source-pdf --verify --deep --cloud

# 文字起こしを同期・検証（frontmatter と原本の対応は reference-sources の deep 検査）
node scripts/drive-vault-sync.mjs --group source-transcript --commit
node scripts/drive-vault-sync.mjs --group source-transcript --verify --deep --cloud
npm run check-reference-sources -- --deep

# 必要なときに取り戻す（vault → repo。書名単位でパス指定）
node scripts/drive-vault-sync.mjs --pull --path 'content/sources/textbook/技術士（総監）/'

# 台帳を経由せず Drive 上を一覧（容量を食わずに確認）
rclone ls doboku-gdrive:doboku-note/原資料PDF/教材 | head
```

> [!important] 削除は検証が通ってから
> ローカル実体・R2 実体を消すのは `--verify --deep --cloud` が3者一致を返した後に限る。Drive 側にハッシュ一致で存在することを確認できないファイルは消さない（データ消失防止）。

> [!note] 追跡から外れているので commit 不要
> `content/sources/textbook/**/*.pdf` は `.gitignore` 済み。pull しても `git status` に現れない（作業用に取り出すだけ）。変換で新規PDFを追加した場合も追跡されないので、`drive-vault-sync` で vault へ退避しておく。

## 既存の手作業アーカイブとの重複排除

`マイドライブ/doboku-note/原資料PDF/{白書,書籍,資格試験}/` は以前から人が手で整えていた既存アーカイブで、`原資料PDF/教材/` とは別系統として並存する。R2→vault 移行時に sha256 で突合したところ、教材PDF 415 件のうち **63 件が既存アーカイブと同一内容**だったため、複製せず `adopted: true` として台帳（`.claude/state/assets/drive-manifest.json`）へ記録し、既存アーカイブ側のパスをそのまま正としている。残り 352 件は新規に `原資料PDF/教材/` へコピーした。

## 沿革（履歴・現行の指示ではない）

以下は「R2 が唯一の保管場所」だった時代（2026-07〜2026-09-05）の記録。現在の置き場は上記の Drive vault であり、この節はその前段の経緯として残す。

> [!note] 2026-07: private R2 への退避
> `content/sources/textbook/**/*.pdf` は変換の入力素材で、日常のビルド・デプロイには不要なのにローカルと `.git` を圧迫していた（`.git` 肥大の主因の一つ）。既存の画像 CDN バケット `doboku-note`（公開）ではなく、新規プライベートバケット `doboku-note-archive` へ退避した。

> [!warning] 2026-08-22: 102 件は git 履歴が唯一の保管場所だった
> 履歴書換えの前に突合したところ、履歴上の教材 PDF 389 件のうち **102 件が R2 に無かった**。
> 2026-07 の退避で取りこぼされていた分で、git 履歴を消していれば失われていた。
> 取り出して R2 へ上げ、389/389 が揃ったことを確認してから git 履歴から除去した。

> [!note] 2026-08-21: ページ画像も private R2 運用へ
> 元 PDF から展開したページ画像・図クロップも git では追跡せず private R2（`doboku-note-archive`）に置いていた。2026-08-18 にいったん「ページ画像は git 追跡」としたが、HEAD の 571.2 MiB を占めて clone と CI を重くしたため、DN-0111 Phase 4-C で 868 件を退避して追跡から外した。
>
> このとき「public repo で `raw.githubusercontent.com` 経由で公開露出するため R2 退避が必要」としていたが、その前提は誤りだった。二重確認（`gh repo view --json visibility` → `PRIVATE`、未追跡ページ画像の raw URL を未認証で GET → `404`）の結果、公開露出は無かった。**根拠は著作権露出ではなく容量**だった点は現在も変わらない。

## 関連

- [asset-storage-policy.md](asset-storage-policy.md) §1 — 置き場ルールの真実源（「誰が使うか」の判断木）
- [reference-sources-policy.md](reference-sources-policy.md) — 原本・文字起こし・記事を参照 ID で結ぶ共通ルール
- `/asset-route` スキル — 置き場の決定木
- [sns-archive-policy.md](sns-archive-policy.md) — SNS バイナリ（wav/mp4）の退避（同じ考え方の先行事例）
- [measurement-incidents.md](measurement-incidents.md) — 外部 API は CI 供給が正・会社 PC プロキシ遮断の恒久ルール（ローカル退避は自宅端末で行う）
- `.gitignore` — `content/sources/textbook/**/*.pdf` 除外ルール（この方針の機械的裏付け）
