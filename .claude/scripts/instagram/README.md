# Instagram 自動投稿パイプライン

doboku-note の Instagram 自動投稿（Carousel / Reels / 単体写真）の実装一式。`uruhayato373/stats47` の同種パイプラインをベースに、Carousel 対応を追加した派生実装。

## 全体フロー

```
docs/sns/instagram/{slug}/
  ├ slide-data.json          (人手で執筆 or ig-carousel-writer agent)
  ├ caption.txt              (generate-caption.cjs で自動生成)
  ├ carousel/img/00〜04.png  (slide-render 等で生成済み)
  └ reels/img/00〜04.png + reel.mp4 (任意)
                  ↓
       upload-to-r2.mjs       (R2 にアップロード)
                  ↓
       https://storage.doboku-note.com/sns/{domain}/{slug}/
                  ↓
       post-from-schedule.cjs (GitHub Actions cron が呼び出す)
                  ↓
       Instagram に投稿
```

## 必要な GitHub Secrets

以下を **Settings → Secrets and variables → Actions** に登録:

| Secret | 値 | スコープ |
|---|---|---|
| `INSTAGRAM_ACCESS_TOKEN_DOBOKU_NOTE` | **doboku-note Page 専用 Page Access Token**（無期限） | doboku-note Page のみ |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID_DOBOKU_NOTE` | doboku-note の IG Business Account ID | doboku-note IG のみ |
| `CLOUDFLARE_ACCOUNT_ID` | 既存（他ワークフローで使用済み） | — |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | 既存 | — |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | 既存 | — |

### Page Access Token + IG Business Account ID を 1 回で取得する方法

**Graph API Explorer** が最速・最確実です（UI 経路に依存しない）。

1. [https://developers.facebook.com/tools/explorer/](https://developers.facebook.com/tools/explorer/) を開く
2. 右上「**Meta App**」のドロップダウンで stats47 と同じ App を選択
3. 「**ユーザートークンを取得**」→ 権限に以下を含める:
   - `pages_show_list`
   - `pages_read_engagement`
   - `instagram_basic`
   - `instagram_content_publish`
4. クエリ欄に以下を入力して **送信**:

   ```
   me/accounts?fields=name,access_token,instagram_business_account{id,username,name}
   ```

5. レスポンスから doboku-note の Page を探す:

   ```json
   {
     "name": "doboku-note Page",
     "access_token": "EAAxxxxxxxxxxxxxxx",  ← INSTAGRAM_ACCESS_TOKEN_DOBOKU_NOTE
     "instagram_business_account": {
       "id": "17841YYYYYYYYY",                ← INSTAGRAM_BUSINESS_ACCOUNT_ID_DOBOKU_NOTE
       "username": "doboku_note"
     }
   }
   ```

6. **`access_token` フィールド**を `INSTAGRAM_ACCESS_TOKEN_DOBOKU_NOTE` に登録
7. **`instagram_business_account.id`** を `INSTAGRAM_BUSINESS_ACCOUNT_ID_DOBOKU_NOTE` に登録

### Page Access Token を選ぶ理由

| 観点 | User Access Token（共通） | **Page Access Token（推奨）** |
|---|---|---|
| 有効期限 | 60 日（長期化で延長） | **無期限**（User 権限が変わらない限り） |
| スコープ | ユーザーが管理する全 Page | **doboku-note Page のみ** |
| 漏洩時のリスク | 両アカウントに波及 | **doboku-note Page のみ** |
| stats47 と独立 | 同じトークン共有 | **完全分離** |
| トークン更新作業 | 60 日毎に再取得必要 | **不要** |

stats47 と doboku-note は別 Page なので Page Access Token を分離することで、**片方のトークンが期限切れや revoke されても他方は無影響**になります。

## スケジュール JSON 形式

`.claude/state/instagram-schedule.json`:

```json
[
  {
    "date": "2026-05-29",
    "type": "carousel",
    "domain": "ig",
    "content_key": "2026-05-29-pdca-cycle",
    "status": "pending"
  },
  {
    "date": "2026-05-30",
    "type": "reels",
    "domain": "ig",
    "content_key": "2026-05-30-something",
    "status": "pending"
  }
]
```

- `date`: JST 日付（YYYY-MM-DD）
- `type`: `carousel` / `reels` / `image`
- `domain`: R2 パスの分類（MVP は `ig` 固定）
- `content_key`: `docs/sns/instagram/{slug}/` の slug と一致
- `status`: `pending` / `posted` （workflow が自動更新）

## 運用手順

### 1. 新規投稿の準備

```bash
# 1. slide-data.json を執筆
# docs/sns/instagram/2026-06-01-new-keyword/slide-data.json を作成

# 2. PNG 画像を生成（既存 slide-render 等）
# docs/sns/instagram/2026-06-01-new-keyword/carousel/img/00-cover.png 〜 04-cta.png

# 3. caption.txt を生成
node .claude/scripts/instagram/generate-caption.cjs \
  docs/sns/instagram/2026-06-01-new-keyword/slide-data.json

# 4. ローカルで R2 アップロードをドライラン
node .claude/scripts/instagram/upload-to-r2.mjs \
  2026-06-01-new-keyword --dry-run

# 5. schedule.json にエントリ追加
# .claude/state/instagram-schedule.json
```

### 2. main にマージ

- `docs/sns/instagram/**` の変更で `upload-instagram-assets.yml` が自動発火
- R2 に素材アップロード
- 毎朝 09:03 JST に `post-instagram-scheduled.yml` が schedule.json をチェック
- 該当日の `pending` エントリがあれば投稿

### 3. 投稿後の確認

- 投稿成功時: `instagram-schedule.json` の `status` が `posted` に更新（自動 commit）
- ログ: `.claude/state/ig-posted-log.jsonl` に追記
- 失敗時: GitHub Actions のログを確認

## ファイル一覧

| ファイル | 役割 |
|---|---|
| `post-from-schedule.cjs` | メイン投稿スクリプト（Carousel / Reels / image 対応） |
| `generate-caption.cjs` | slide-data.json → caption.txt 生成 |
| `upload-to-r2.mjs` | docs/sns/instagram/{slug}/ → R2 アップロード |
| `../../.github/workflows/post-instagram-scheduled.yml` | 日次投稿ワークフロー（cron） |
| `../../.github/workflows/upload-instagram-assets.yml` | R2 同期ワークフロー（push trigger） |
| `../state/instagram-schedule.json` | 予約投稿スケジュール |
| `../state/ig-posted-log.jsonl` | 投稿ログ（追記専用） |

## トラブルシューティング

### `caption fetch failed (403)` / `media URL 到達不能`

R2 への素材アップロードが未完了。`upload-instagram-assets.yml` を手動実行するか、ローカルで `upload-to-r2.mjs` を実行。

### `container 作成失敗`

- アクセストークンの有効期限切れ → Meta Business Suite で再発行
- IG Business Account ID が間違っている → Secrets の `INSTAGRAM_BUSINESS_ACCOUNT_ID_DOBOKU_NOTE` を確認

### 投稿時刻を変えたい

`post-instagram-scheduled.yml` の `cron: "3 0 * * *"` を変更。

- 月水金 19:30 JST: `cron: "30 10 * * 1,3,5"`（戦略 v5 の Reels 投稿時刻）
- 火金 07:00 JST: `cron: "0 22 * * 1,4"`（戦略 v5 の Carousel 投稿時刻）

## 関連ドキュメント

- 戦略: `docs/project/03_SNS/01_SNS集客戦略.md` v5.2（IG Carousel + Reels + Highlight + Threads 待機）
- 実装参考: `uruhayato373/stats47` の `.claude/scripts/instagram/`
