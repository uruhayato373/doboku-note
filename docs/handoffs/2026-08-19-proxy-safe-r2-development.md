# Codex 実施ログ：プロキシ環境向けR2開発構成

> [!done]
> **2026-08-19 完了**：`npm run dev` の画像表示をローカル優先に変更し、R2差分監査とコンテンツ品質監査を別々のGitHub Actionsへ分離した。型検査、lint、静的ビルド、画像ルートのHTTP確認まで完了している。

## 背景

開発PCはプロキシ環境下にあり、Cloudflare R2への接続が不安定になる場合がある。開発画面の表示をR2の接続状態に依存させず、R2の整合性確認は安定したGitHub Actions上で実行する構成が必要だった。

## 実施内容

### ローカル開発の画像配信

- `npm run dev` でNext.js（`127.0.0.1:3020`）とローカル画像サーバー（`127.0.0.1:3022`）を同時に起動するよう変更した。
- 開発時の表示用OGP画像は `/posts/...` を経由し、`content/site` から配信する。
- ローカル画像が存在しない場合は、壊れた画像ではなく案内用SVGを返す。
- 本番のOGPメタデータと表示URLは従来どおりR2を利用する。
- ローカル画像を静的成果物へ重複混入させないため、旧 `public/posts` シンボリックリンクは削除した。画像本体は `content/site` で管理する。
- ローカル画像の更新は `npm run download-images` で明示的に行う。

### GitHub Actionsの責務分離

- `r2-audit.yml` はR2のOGPカバレッジ、孤立OGP、差分監査だけを担当する構成に整理した。
- R2差分はStep Summaryと `r2-diff.json` アーティファクトへ出力する。
- 読み取り専用の監査用シークレットを設定できるようにし、未設定時は既存のR2シークレットへフォールバックする。
- コンテンツ品質検査は新しい `content-quality-audit.yml` に分離した。

推奨する監査用GitHub Secrets：

- `CLOUDFLARE_R2_AUDIT_ACCESS_KEY_ID`
- `CLOUDFLARE_R2_AUDIT_SECRET_ACCESS_KEY`

## 検証

以下をローカルで実行し、すべて成功した。

```powershell
npm run type-check
npm run lint
npx tsc --noEmit -p tools/admin-app/tsconfig.json
npm run check-public-bloat
node scripts/check-ogp-coverage.mjs
npm run check-orphan-ogp
npx next build
```

- 静的ビルド：1,114ページ生成完了
- OGPカバレッジ：公開記事1,092件を確認
- 孤立OGP：検出なし
- `public` 容量ガード：992ファイルで上限5,000件以内
- 2つのGitHub Actions YAML：構文解析成功
- `git diff --check`：エラーなし（Windowsの改行警告のみ）

`npm run dev` 起動中のHTTP確認結果：

- 実在する `/posts/.../ogp.png`：`200 image/png`
- 存在しない画像：`200 image/svg+xml` と `X-Local-Media-Fallback: missing`
- ローカル画像サーバーへのパストラバーサル要求：`404`

確認後、開発用ポート3020・3022は停止した。管理画面のポート3021には触れていない。

## 後続メモ

- 監査専用の読み取りシークレットは任意設定であり、現時点では既存シークレットへのフォールバックがある。
- Actionsの実環境実行は、変更をGitHubへ反映した後に手動実行して確認する。
- Cloudflare MCPのOAuth接続は今回のローカル画像配信には必須ではない。データ面の整合性確認はGitHub Actionsへ寄せている。
