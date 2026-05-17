# Instagram 投稿運用フロー

このディレクトリは Instagram 投稿の SSOT（Single Source of Truth）。**生成済み 727 ドラフト** を Meta Graph API 経由で順次投稿していく。

## 投稿コマンド（最重要）

```bash
# 1. dry-run（必ず初回・テンプレ変更後に実行）
node scripts/publish-ig.mjs 2026-05-15-process-capability-index --dry-run

# 2. 本番投稿（R2 アップ + Meta API publish + status.json 更新）
node scripts/publish-ig.mjs 2026-05-15-process-capability-index

# 3. 再投稿（既に posted_at がある場合）
node scripts/publish-ig.mjs 2026-05-15-process-capability-index --force
```

## アーキテクチャ

```
docs/sns/instagram/<YYYY-MM-DD-slug>/
├── slide-data.json            # cover / board / cta 構成データ
├── carousel/img/*.png         # 4:5 投稿画像（2〜10 枚）
├── reels/img/*.png            # Reels 用素材（mp4 化は別パイプライン）
└── status.json                # 投稿結果（mediaId / permalink / posted_at）
            ↓ publish-ig.mjs
            ├── R2 upload: storage.doboku-note.com/sns/instagram/<dir>/carousel/*.png
            └── Meta Graph API: postInstagramCarousel(imageUrls, caption)
```

## 環境変数（.env.local）

| キー | 用途 | 取得方法 |
|---|---|---|
| `META_APP_ID` | Meta Developer アプリ ID | Facebook Developer Dashboard |
| `META_APP_SECRET` | Meta Developer アプリ Secret | 同上 |
| `META_LONG_LIVED_TOKEN` | 60 日有効の長期トークン | `node .claude/scripts/meta-auth.mjs` |
| `META_INSTAGRAM_BUSINESS_ACCOUNT_ID` | IG Business Account ID | 上記スクリプトが自動取得 |
| `CLOUDFLARE_ACCOUNT_ID` | R2 用 | Cloudflare Dashboard |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | R2 アクセスキー | 同上 |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | R2 シークレット | 同上 |

### トークン期限切れ時

長期トークンは **60 日有効**。期限切れになると Meta Graph API が `OAuthException` を返す。

```bash
# 再認証（ブラウザで Facebook ログイン → 自動で .env.local 更新）
node .claude/scripts/meta-auth.mjs
```

## API 仕様の制約（重要）

| 制約 | 内容 | 対処 |
|---|---|---|
| **予約投稿不可** | Instagram Graph API は publish 予約をネイティブサポートしない | 外部 cron（GitHub Actions schedule, ローカル cron）で即時投稿 |
| **画像 URL 必須** | 公開アクセス可能な URL のみ。base64 不可 | R2 (`storage.doboku-note.com`) にアップロード |
| **カルーセル枚数** | 2〜10 枚 | `slide-data.json` の構成と一致させる |
| **キャプション上限** | 2,200 字 / ハッシュタグ 30 個 | `publish-ig.mjs` が自動で本文 + 7 タグを構成 |
| **レート制限** | 200 件/24h（IG ユーザーごと） | 1 日 4〜6 件投稿で十分余裕 |
| **トークン期限** | 60 日 | カレンダーリマインダ + meta-auth.mjs 再実行 |

## キャプションテンプレ（publish-ig.mjs 自動生成）

```
【総監キーワード解説】<keyword>

<slideData.board.body>

📌 <slideData.board.noteText>

▼ 関連キーワード
・<related[0]>
・<related[1]>
...

▼ 詳細解説
https://doboku-note.com/docs/pe-comprehensive-management-<slug>?utm_source=instagram&utm_medium=organic&utm_campaign=keyword-<slug>

#技術士 #総合技術監理部門 #技術士総監 #<管理分野> #試験対策 #資格勉強 #<keyword>
```

カスタマイズしたい場合は `scripts/publish-ig.mjs` の `buildCaption()` を編集。

## 投稿ペース戦略

- **在庫**: 生成済み 727 ドラフト（充分）
- **推奨**: **1 日 1〜3 件**（早朝/昼/夜のいずれか）を**毎日**継続
- **アルゴリズム上の最適**: 火・水・木 18-20 時の投稿が IG エンゲージメント高
- **2026-04 v5 戦略**: Carousel 週 2 + Reels 週 3 = 週 5 タッチ

### 簡易自動ループ（ローカル）

```bash
# 未投稿の古い順から 3 件を順次投稿
for d in $(ls docs/sns/instagram | sort | head -3); do
  if [ ! -f "docs/sns/instagram/$d/status.json" ] || ! grep -q posted_at "docs/sns/instagram/$d/status.json"; then
    node scripts/publish-ig.mjs "$d"
    sleep 30
  fi
done
```

### GitHub Actions cron 連携（将来）

`.github/workflows/sns-publish.yml`（未実装、task-queue T-004）で `0 9,12,18 * * *` などのスケジュール定義 → 上記ループを CI 上で実行。`.env.local` は GitHub Secrets に同等キーを登録。

## トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| `OAuthException: An active access token must be used` | トークン期限切れ | `node .claude/scripts/meta-auth.mjs` 再実行 |
| `Carousel requires 2-10 image URLs` | 画像が 0 or 1 枚 or 11 枚以上 | `carousel/img/` の枚数を確認 |
| `Missing required env: CLOUDFLARE_*` | R2 認証情報未設定 | `.env.local` に追記 |
| 投稿は成功するが画像 403 | R2 バケットが non-public | Cloudflare R2 → 設定 → Public Access 有効化、または独自ドメイン (`storage.doboku-note.com`) 接続 |
| 投稿は成功するが画像が真っ白 | R2 アップロード完了前に Meta が fetch | `publish-ig.mjs` の sleep 増やす（現状なし、必要なら追加） |

## 関連リソース

- 画像生成（既存）: `.claude/scripts/sns/render-keyword-pack.mjs`
- 共通 API 層: `.claude/scripts/lib/sns-common/media-uploader.mjs`
- X 投稿フロー: [../x/README.md](../x/README.md)
- SNS 戦略 v5: [../../project/03_SNS/01_SNS集客戦略.md](../../project/03_SNS/01_SNS集客戦略.md)
- 5 チャネル動線設計: [../../project/03_SNS/02_チャネル動線設計.md](../../project/03_SNS/02_チャネル動線設計.md)
