# 教材スキャンPDF アーカイブ運用（プライベート R2）

`docs/textbook/` 配下のスキャン教材・白書・過去問の**元PDF**（PDF→MDX 変換の入力。~1.6GB / 295本）を git に溜め込まず、プライベート R2 バケットへ退避し、必要なときだけローカルへ取り戻す運用方針。2026-07-20 制定。

## なぜ必要か・なぜ「公開バケットではない」か

- `docs/textbook/**/*.pdf` は変換の入力素材で、日常のビルド・デプロイには不要なのにローカルと `.git` を圧迫していた（`.git` 肥大の主因の一つ）。
- 退避先は既存の画像 CDN バケット `doboku-note`（＝`storage.doboku-note.com` として**公開**）ではなく、**新規プライベートバケット `doboku-note-archive`** を使う。

> [!warning] 著作権のあるスキャンは公開バケットに置かない
> スキャン教材・問題集は著作権物。カスタムドメインがバインドされた `doboku-note` に置くと URL 経由で公開露出しうる。`doboku-note-archive` はドメイン未バインド＝**S3 API 専用（非公開）**。ここが唯一の置き場。

## 置き場と対応関係

| 項目 | 値 |
|---|---|
| バケット | `doboku-note-archive`（プライベート・カスタムドメインなし） |
| prefix | `textbook/` |
| キー対応 | `docs/textbook/<相対パス>.pdf` ↔ `textbook/<相対パス>.pdf` |
| git | `.gitignore` で `docs/textbook/**/*.pdf` を除外（追跡しない） |

## rclone リモート設定（この端末に登録済み・再現手順）

R2 は S3 互換。creds は `.env.local` の `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_R2_ACCESS_KEY_ID` / `CLOUDFLARE_R2_SECRET_ACCESS_KEY`。リモート名 `doboku-r2`。

```bash
# .env.local の値で一度だけ登録（別端末/再設定時）
rclone config create doboku-r2 s3 provider Cloudflare \
  access_key_id "$CLOUDFLARE_R2_ACCESS_KEY_ID" \
  secret_access_key "$CLOUDFLARE_R2_SECRET_ACCESS_KEY" \
  endpoint "https://$CLOUDFLARE_ACCOUNT_ID.r2.cloudflarestorage.com" region auto
```

## コマンド

```bash
# 退避（アップロード。PDFのみ・相対パス保持）
rclone copy docs/textbook doboku-r2:doboku-note-archive/textbook --include '*.pdf' --include '*.PDF' --transfers 8 --progress

# 検証（ローカルの全PDFが R2 にあるか。--one-way で source→dest のみ照合）
rclone check docs/textbook doboku-r2:doboku-note-archive/textbook --include '*.pdf' --include '*.PDF' --one-way

# 必要なときに取り戻す（download on demand）
#   全部:
rclone copy doboku-r2:doboku-note-archive/textbook docs/textbook --progress
#   資格ディレクトリ単位:
rclone copy "doboku-r2:doboku-note-archive/textbook/技術士（総監）" "docs/textbook/技術士（総監）" --progress
#   R2 上を一覧（容量を食わずに確認）:
rclone ls doboku-r2:doboku-note-archive/textbook | head
```

> [!important] 削除は検証が通ってから
> ローカルPDFを消すのは `rclone check ... --one-way` が「0 differences」を返した後に限る。R2 側にバイト/ハッシュ一致で存在することを確認できないファイルは消さない（データ消失防止）。

> [!note] 追跡から外れているので commit 不要
> `docs/textbook/**/*.pdf` は `.gitignore` 済み。pull しても `git status` に現れない（作業用に取り出すだけ）。変換で新規PDFを追加した場合も追跡されないので、`rclone copy` で R2 に退避しておく。

## 関連

- [sns-archive-policy.md](sns-archive-policy.md) — SNS バイナリ（wav/mp4）の R2 退避（同じ考え方の先行事例）
- [measurement-incidents.md](measurement-incidents.md) — 外部 API は CI 供給が正・会社 PC プロキシ遮断の恒久ルール（ローカル退避は自宅端末で行う）
- `.gitignore` — `docs/textbook/**/*.pdf` 除外ルール（この方針の機械的裏付け）
