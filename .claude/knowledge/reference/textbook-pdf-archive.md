# 教材スキャンPDF アーカイブ運用（プライベート R2）

`content/sources/textbook/` 配下のスキャン教材・白書・過去問の**元PDF**（PDF→MDX 変換の入力。~1.6GB / 295本）を git に溜め込まず、プライベート R2 バケットへ退避し、必要なときだけローカルへ取り戻す運用方針。2026-07-20 制定。

## なぜ必要か・なぜ「公開バケットではない」か

- `content/sources/textbook/**/*.pdf` は変換の入力素材で、日常のビルド・デプロイには不要なのにローカルと `.git` を圧迫していた（`.git` 肥大の主因の一つ）。
- 退避先は既存の画像 CDN バケット `doboku-note`（＝`storage.doboku-note.com` として**公開**）ではなく、**新規プライベートバケット `doboku-note-archive`** を使う。

> [!warning] 著作権のあるスキャンは公開バケットに置かない
> スキャン教材・問題集は著作権物。カスタムドメインがバインドされた `doboku-note` に置くと URL 経由で公開露出しうる。`doboku-note-archive` はドメイン未バインド＝**S3 API 専用（非公開）**。ここが唯一の置き場。

## 置き場と対応関係

| 項目 | 値 |
|---|---|
| バケット | `doboku-note-archive`（プライベート・カスタムドメインなし） |
| prefix | `textbook/` |
| キー対応 | `content/sources/textbook/<相対パス>.pdf` ↔ `textbook/<相対パス>.pdf` |
| git（元PDF） | `.gitignore` で `content/sources/textbook/**/*.pdf` を除外（追跡しない） |
| git（ページ画像） | `content/sources/textbook/<書名>/pages/pageNNN.jpg` は**追跡する**（2026-08-18〜） |

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
rclone copy content/sources/textbook doboku-r2:doboku-note-archive/textbook --include '*.pdf' --include '*.PDF' --transfers 8 --progress

# 検証（ローカルの全PDFが R2 にあるか。--one-way で source→dest のみ照合）
rclone check content/sources/textbook doboku-r2:doboku-note-archive/textbook --include '*.pdf' --include '*.PDF' --one-way

# 必要なときに取り戻す（download on demand）
#   全部:
rclone copy doboku-r2:doboku-note-archive/textbook content/sources/textbook --progress
#   資格ディレクトリ単位:
rclone copy "doboku-r2:doboku-note-archive/textbook/技術士（総監）" "content/sources/textbook/技術士（総監）" --progress
#   R2 上を一覧（容量を食わずに確認）:
rclone ls doboku-r2:doboku-note-archive/textbook | head
```

> [!important] 削除は検証が通ってから
> ローカルPDFを消すのは `rclone check ... --one-way` が「0 differences」を返した後に限る。R2 側にバイト/ハッシュ一致で存在することを確認できないファイルは消さない（データ消失防止）。

> [!note] 追跡から外れているので commit 不要
> `content/sources/textbook/**/*.pdf` は `.gitignore` 済み。pull しても `git status` に現れない（作業用に取り出すだけ）。変換で新規PDFを追加した場合も追跡されないので、`rclone copy` で R2 に退避しておく。

## ページ画像（`pages/`）— 2026-08-18 追加

元 PDF は R2 に退避したままだが、**1 PDF ページ = 1 JPEG に展開したページ画像は git で追跡する**（ユーザー決定）。

| 項目 | 値 |
|---|---|
| 置き場 | `content/sources/textbook/<書名>/pages/pageNNN.jpg`（3 桁ゼロ埋め） |
| 生成 | `python .claude/skills/conversion/pdf-to-mdx/scripts/scanned/pdf_to_page_images.py <PDF>` |
| 方式 | 埋め込み JPEG をそのまま取り出す（再エンコードなし）。1 枚でないページは 200dpi でラスタライズ |
| 現状 | 主任技師2022 = 192 枚 / 172.5MB、主任技士2024 = 111 枚 / 97.0MB |

**なぜページ画像なのか**: GitHub は 100MB/ファイルを超える push を拒否する（主任技師2022 の PDF は 172.6MB）。
ページ単位に割れば最大 1.5MB/枚で制限に掛からず、OCR パイプライン（`scanned-textbook-transcriber`）が
要求する入力形式とも一致する。ただし**総容量は減らない**（分割はバイト数を変えない）。

> [!warning] 未決: 公開リポジトリのまま push すると全ページが公開される
> このリポジトリは **PUBLIC**（`uruhayato373/doboku-note`）。`pages/` を push すると
> `raw.githubusercontent.com` 経由で 303 ページが個別 URL で取得可能になり、git 履歴・fork に恒久的に残る。
> 冒頭の警告（著作権のあるスキャンは公開露出させない）と正面から衝突する。
>
> **解消の選択肢**: ①リポジトリを private 化する（Cloudflare Pages は private でもデプロイ可）
> ②`pages/` 専用の private リポジトリへ分離する ③`pages/` の追跡をやめて R2 運用に戻す。
> **未決の間は `pages/` を含むコミットを push しない**。

## 関連

- [sns-archive-policy.md](sns-archive-policy.md) — SNS バイナリ（wav/mp4）の R2 退避（同じ考え方の先行事例）
- [measurement-incidents.md](measurement-incidents.md) — 外部 API は CI 供給が正・会社 PC プロキシ遮断の恒久ルール（ローカル退避は自宅端末で行う）
- `.gitignore` — `content/sources/textbook/**/*.pdf` 除外ルール（この方針の機械的裏付け）
