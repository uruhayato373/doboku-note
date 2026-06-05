# セキュリティレビュー 2026-06-05

**対象ブランチ**: develop → main（3コミット先行）  
**実施日**: 2026-06-05  
**スコープ**: git diff main...HEAD（14ファイル、+1483/-70行）

## サマリ

指摘事項は Instagram 予約投稿スクリプト群（新規追加）に集中。その他の変更（スキル定義・ドキュメント・link-audit・週次レビュー）はセキュリティ上の問題なし。

---

## 指摘一覧

### [HIGH] 1. アクセストークンが stdout に平文出力

| 項目 | 内容 |
|---|---|
| ファイル | `.claude/scripts/instagram/ig-login-token.mjs` line 136 |
| 判定 | CONFIRMED |

`--save` オプション未指定で実行すると、60日有効の長期トークンがターミナルに平文出力される。Shell の history、CI ログ、画面録画で漏洩しうる。

**対処**: トークンを stdout 出力しない（`--save` 時のみ保存、表示は `****` マスク）。

---

### [HIGH] 2. app secret / token が GET クエリパラメータに露出

| 項目 | 内容 |
|---|---|
| ファイル | `.claude/scripts/instagram/ig-login-token.mjs` lines 90-104 |
| 判定 | CONFIRMED |

トークン交換 URL が `?client_secret=...&access_token=...` という GET 形式。会社 PC のプロキシ（Palo Alto）・アクセスログに credentials が平文記録される。Meta API はトークン交換で POST も受け付ける。

**対処**: GET → POST に変更（`client_secret` 等を request body に移動）。

---

### [HIGH] 3. R2 本番 credentials を Mac ローカルへ書き写すよう指示

| 項目 | 内容 |
|---|---|
| ファイル | `.claude/scripts/instagram/SETUP-mac.md` line 55 |
| 判定 | CONFIRMED |

`CLOUDFLARE_R2_ACCESS_KEY_ID` / `CLOUDFLARE_R2_SECRET_ACCESS_KEY`（GitHub Secrets と同値）を `.env.local` に書くよう手順書が指示。Mac が共有・紛失・iCloud 同期された場合に本番 R2 への書き込み権限が漏洩する。

**対処**: 手順書から R2 credentials を `.env.local` に書く手順を削除し、GitHub Actions 経由を必須化（SETUP-mac.md の「方法 B」を削除または警告強化）。

---

### [MEDIUM] 4. `parseEnv` がクォート・インラインコメントを除去しない

| 項目 | 内容 |
|---|---|
| ファイル | `.claude/scripts/instagram/ig-login-token.mjs` line 57 |
| 判定 | CONFIRMED |

`.env.local` の値が `META_APP_SECRET="abc" # comment` の形式だと `"abc" # comment` 全体が secret として扱われ、API 認証がサイレント失敗する。デバッグ時に値をログ出力して漏洩するリスクもある。

**対処**: `parseEnv` でクォート除去（`/^['"]|['"]$/g`）とインラインコメント除去（`/\s+#.*$/`）を追加。

---

### [MEDIUM] 5. API エラーレスポンスがトークンを含む可能性

| 項目 | 内容 |
|---|---|
| ファイル | `.claude/scripts/instagram/post-from-schedule.cjs` lines 125・156 |
| 判定 | PLAUSIBLE |

`throw new Error(\`container 作成失敗: ${JSON.stringify(json)}\`)` が Meta API のエラーボディをそのまま出力。Meta のエラーレスポンスには `debug_info` 等でトークンが含まれる場合があり、GitHub Actions ログに漏洩しうる。

**対処**: エラーログのトークンをマスク処理（`json.error?.message` のみ出力、フルボディ出力を避ける）。

---

### [LOW] 6. schedule.json の JSON パースエラーに診断情報なし

| 項目 | 内容 |
|---|---|
| ファイル | `.claude/scripts/instagram/post-from-schedule.cjs` line 75 |
| 判定 | PLAUSIBLE |

`JSON.parse` に try/catch なし。不正 JSON で `.catch` まで伝播するが、エラーメッセージに有用な情報がなく原因特定が困難。

**対処**: try/catch を追加し「schedule.json のパースに失敗」等の明示的メッセージを出す。

---

## 対処優先度

| 優先 | # | 対処 |
|---|---|---|
| 即対応 | 2 | GET → POST 変換（token exchange） |
| 即対応 | 3 | SETUP-mac.md から R2 credentials をローカルに書く手順を削除 |
| 次回 | 1 | stdout トークン出力を masked 表示に変更 |
| 次回 | 4 | `parseEnv` にクォート・コメント除去を追加 |
| 余裕時 | 5 | エラーログのトークンマスク処理 |
| 余裕時 | 6 | try/catch + 明示エラーメッセージ |

## 非該当

以下の変更はセキュリティ上の問題なし：
- スキル定義（`.claude/skills/`）の更新
- ドキュメント（`docs/reference/`、`CLAUDE.md`）の更新
- link-audit JSON / レポート
- 週次レビュー（`docs/reviews/weekly/`）
- 学習メモ（`docs/study-notes/`）
