# Instagram 予約投稿 セットアップ手順書（Mac で実施）

会社 PC（Windows）は **Digital Arts i-FILTER / Palo Alto のプロキシで `graph.facebook.com` がブロック**されており、ローカルから Meta API を叩けない。
そのため **トークン取得と投稿テストはプロキシ外の Mac で実施**する。本番の定期投稿は GitHub Actions（クラウド）が担うのでネットワーク制限の影響を受けない。

> この手順書は 2026-06-05 の調査・意思決定を踏まえて作成。背景は末尾「決定の記録」を参照。

---

## 全体像

| やること | 実行場所 | 理由 |
|---|---|---|
| アクセストークン取得 | **Mac**（ブラウザ + Node） | `graph.facebook.com` が通る環境が必要 |
| R2 への素材アップロード | GitHub Actions or Mac | R2 は会社 PC からでも可。Actions 推奨（鍵をコピーせず済む） |
| テスト投稿（手動） | **Mac** | `graph.facebook.com` への publish が必要 |
| 本番の定期投稿 | GitHub Actions (cron) | クラウドなのでプロキシ非該当 |

**認証ルート: Facebook ログイン版**（`graph.facebook.com` + Page/User トークン + `instagram_business_account.id`）。
理由: Instagram ログイン版のダッシュボード内トークン生成が「開発者の役割が不十分です」で詰まったため、実績のある Facebook ログイン版に確定。前提（IG プロアカウント化 + Facebook ページ連携）は充足済み。

---

## ⚠️ 事前にやること（セキュリティ）

調査中、プロキシのブロック画面 URL に **stats47 アプリの app secret が露出**した。安全のため:

1. Meta アプリ →「設定 → ベーシック」→ **app secret を「リセット」**（既存トークンは無効化されないので安全）
2. リセット後の新しい secret を Mac の `.env.local` に入れる（後述）

---

## Phase 1: 認証〜投稿チェーンの疎通確認（画像1枚で最小テスト）

目的: トークン・`graph.facebook.com`・R2・publish の一連が通ることを、最小構成で確認する。

### 1-1. Mac にリポジトリを用意

```bash
git clone <このリポジトリ> doboku-note   # 既にあれば git pull
cd doboku-note
npm ci --legacy-peer-deps                  # upload-to-r2 が @aws-sdk/client-s3 を使う
```

### 1-2. `.env.local` を作成

リポジトリ直下に `.env.local`（git 管理外）を作り、以下を記入:

```
# Meta アプリ（stats47）
META_APP_ID=（アプリID）
META_APP_SECRET=（リセット後の app secret）

# R2（Mac からローカルでアップロードする場合のみ必要。Actions 経由なら不要）
CLOUDFLARE_ACCOUNT_ID=（GitHub Secrets と同じ値）
CLOUDFLARE_R2_ACCESS_KEY_ID=（同上）
CLOUDFLARE_R2_SECRET_ACCESS_KEY=（同上）
```

### 1-3. 短期トークンを取得（Mac のブラウザ）

1. https://developers.facebook.com/tools/explorer/ を開く
2. 右上「Meta アプリ」= **stats47** を選択
3. 権限に追加: `instagram_basic` / `instagram_content_publish` / `pages_show_list` / `pages_read_engagement`
4. 「**アクセストークンを生成**」→ doboku_note の Facebook ページを管理するアカウントで承認（対象ページにチェック）
5. 表示された**短期トークン**をコピー

### 1-4. 長期トークン＋IG アカウント ID を取得（Mac の Node）

```bash
node .claude/scripts/get-meta-token.mjs --short-token <コピーした短期トークン>
```

成功すると `.env.local` に自動追記される:

```
META_LONG_LIVED_TOKEN=...                  # 60日有効のユーザートークン
META_INSTAGRAM_BUSINESS_ACCOUNT_ID=17841...
```

> 補足: これは 60 日で失効するユーザートークン。**無期限にしたい場合**は Phase 3 の「無期限ページトークン」を参照（Graph API Explorer で `me/accounts` の `access_token` を使う方式）。まずは疎通確認なので 60 日トークンで進めてよい。

post-from-schedule.cjs は `INSTAGRAM_ACCESS_TOKEN` が無ければ `META_LONG_LIVED_TOKEN` を、`INSTAGRAM_BUSINESS_ACCOUNT_ID` が無ければ `META_INSTAGRAM_BUSINESS_ACCOUNT_ID` を自動で使う（改修済み）。

### 1-5. 最小テスト用の投稿素材を用意

既存パックのカバー画像を流用して、フラット構成のテスト投稿を1つ作る:

```bash
mkdir -p docs/sns/instagram/_test-pilot/carousel/img
cp "docs/sns/instagram/_exam-packs/1級土木/r07/pack-01/carousel/img/00-cover.png" \
   docs/sns/instagram/_test-pilot/carousel/img/00-cover.png
printf 'テスト投稿です。\n\n#土木 #施工管理技士 #doboku_note' \
   > docs/sns/instagram/_test-pilot/caption.txt
```

### 1-6. 素材を R2 にアップロード

**方法 A（推奨・鍵不要）: GitHub Actions**
1. 上記 `_test-pilot` を commit して main へ（または develop→main）
2. GitHub →  Actions →「📤 Upload Instagram assets to R2」→ Run workflow →
   `slug = _test-pilot`、`domain = ig` で実行

**方法 B: Mac からローカル**（`.env.local` に R2 鍵がある場合）
```bash
node .claude/scripts/instagram/upload-to-r2.mjs _test-pilot --domain ig
```

アップロード後、公開 URL が見えることを確認:
```
https://storage.doboku-note.com/sns/ig/_test-pilot/carousel/img/00-cover.png
https://storage.doboku-note.com/sns/ig/_test-pilot/instagram/caption.txt
```

### 1-7. スケジュールにテストエントリを追加

`.claude/state/instagram-schedule.json` を一時的に:

```json
[
  {
    "date": "2026-06-05",
    "type": "image",
    "domain": "ig",
    "content_key": "_test-pilot",
    "status": "pending"
  }
]
```

### 1-8. Mac でテスト投稿を実行

```bash
# IG_FORCE_DATE で日付を強制（schedule の date と一致させる）
IG_FORCE_DATE=2026-06-05 node .claude/scripts/instagram/post-from-schedule.cjs
```

期待される出力:
```
✅ media URL OK: https://storage.doboku-note.com/sns/ig/_test-pilot/carousel/img/00-cover.png
📦 image container 作成...
⏳ image 処理 polling...
  status (1/30): FINISHED
🚀 publish...
✅ 投稿完了 media id: ...
PERMALINK=https://www.instagram.com/p/...
```

> ✅ **ここまで通れば認証〜投稿チェーンは完成**。Instagram に実際にテスト投稿されるので、確認後は手動で削除してよい。
> テスト後は `_test-pilot` ディレクトリと schedule のテストエントリを片付ける。

### Phase 1 チェックリスト
- [ ] app secret をリセットした
- [ ] `.env.local` に META_APP_ID / META_APP_SECRET を記入
- [ ] `get-meta-token.mjs` が `META_LONG_LIVED_TOKEN` / `META_INSTAGRAM_BUSINESS_ACCOUNT_ID` を書いた
- [ ] R2 に `_test-pilot` の素材が上がった（URL が 200）
- [ ] `post-from-schedule.cjs` が `PERMALINK=...` を出した
- [ ] Instagram に投稿が出た（確認後に削除）

---

## Phase 2: カルーセルパック対応（要スクリプト改修）

Phase 1 は画像1枚の最小確認。実コンテンツ（過去問パック）は構成が異なり、現状スクリプトのままでは投稿できない:

| 項目 | スクリプトの想定 | パックの実態 |
|---|---|---|
| パス | `docs/sns/instagram/{slug}/` フラット | `_exam-packs/{試験}/{年度}/pack-NN/` の3階層 |
| カルーセル枚数 | 5枚固定（`00-cover,01-board,02-figure,03-board,04-cta`） | **10枚可変**（`00-cover,01-problem,02-answer…09-cta`） |
| caption の場所 | スラッグ直下 `caption.txt` | `carousel/caption.txt` |

**必要な改修（Phase 1 成功後に着手）:**
1. `upload-to-r2.mjs`: ネストしたパックパスを受け取り、`carousel/img/*.png` を**全部**（ソート順）・`carousel/caption.txt` を `instagram/caption.txt` として上げる
2. `post-from-schedule.cjs`: カルーセル枚数を固定 5 枚でなく**動的**に扱う。R2 はディレクトリ一覧が取れないので、アップロード時に `manifest.json`（画像ファイル名リスト）も R2 に置き、投稿時にそれを読む方式が堅い
3. `content_key` の命名規約を決める（例: `civil1-r07-pack01` のような ASCII スラッグにし、パックパスとの対応表を持つ）

> この改修は未テスト状態で書くと事故るため、Phase 1 でチェーンが通ってから実装する。実装担当は Claude（次セッションで依頼可）。

---

## Phase 3: 本番自動化（GitHub Actions cron）

### 3-1. 無期限ページトークンの取得（推奨）

60 日で切れるユーザートークンの代わりに、**実質無期限の Page トークン**を使う:

1. Phase 1 の Graph API Explorer で**長期ユーザートークン**を用意（トークン欄の「i」→ Access Token Tool →「Extend Access Token」）
2. その長期トークンを Explorer に貼り、クエリ:
   ```
   me/accounts?fields=name,access_token,instagram_business_account{id,username}
   ```
3. doboku_note ページの `access_token`（= 無期限 Page トークン）と `instagram_business_account.id` を控える

### 3-2. GitHub Secrets を登録

GitHub → Settings → Secrets and variables → Actions → New repository secret（**Web UI 推奨**。トークンを CLI/ログに残さない）:

| Secret 名 | 値 |
|---|---|
| `INSTAGRAM_ACCESS_TOKEN_DOBOKU_NOTE` | 3-1 の Page トークン（無期限） |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID_DOBOKU_NOTE` | `instagram_business_account.id`（`17841...`） |

> `CLOUDFLARE_*` は既に登録済み。
> ワークフローが Secrets → `INSTAGRAM_ACCESS_TOKEN` / `INSTAGRAM_BUSINESS_ACCOUNT_ID` に写像し、`IG_GRAPH_BASE` 未設定なので `graph.facebook.com` で動く（Page トークンと整合）。

### 3-3. 動作確認（Actions 上で手動発火）

1. 本番パックを1つ schedule.json に `pending` で入れて main へ
2. Actions →「📸 Instagram scheduled post (daily)」→ Run workflow → `force_date` にその日付を入力
3. 成功すると schedule の該当エントリが `posted` になり、`ig-posted-log.jsonl` に追記される

### 3-4. cron の時刻

`.github/workflows/post-instagram-scheduled.yml` の `cron`（現状 `3 0 * * *` = 09:03 JST）を戦略に合わせて調整。

---

## トラブルシューティング

| 症状 | 原因 / 対処 |
|---|---|
| `ブロックされました / Paloalto / Digital Arts` | 会社 PC のプロキシ。Mac（プロキシ外）で実行する |
| `503` を返す / HTML が返る | 同上。Meta API が会社網で遮断されている |
| `トークン変換失敗: 400 ... Error validating ...` | 短期トークンが失効（1〜2時間）。Explorer で取り直す |
| `Page 取得失敗` / IG ID が出ない | FB ページ ↔ IG プロアカウントの連携を確認 |
| `container 作成失敗` | トークン失効、または `instagram_content_publish` 権限不足 |
| `caption fetch failed (403)` / `画像到達不能` | R2 未アップロード。upload を先に実行 |
| `開発者の役割が不十分です` | Instagram ログイン版の token generator 固有。本手順（Facebook ログイン版）では回避済み |

---

## 決定の記録（2026-06-05）

- **認証ルート**: Facebook ログイン版に確定（Instagram ログイン版は「開発者の役割が不十分」で頓挫）
- **真因**: 会社 PC のプロキシ（Digital Arts i-FILTER / Palo Alto）が `graph.facebook.com` を遮断 → ローカル実行不能。これが前回失敗の主因と判断
- **stats47 アプリ流用**: 新規アプリ作成がビジネス制限で不可だったため、既存 stats47 アプリ（管理者権限あり・制限ビジネス未紐付け）を流用
- **app secret 露出**: プロキシのブロック画面 URL に出たためリセット必須
- **役割分担**: トークン取得/テスト = Mac、素材アップロード/定期投稿 = GitHub Actions
