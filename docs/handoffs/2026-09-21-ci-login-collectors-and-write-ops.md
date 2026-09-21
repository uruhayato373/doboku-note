# ログイン必須の計測・書き込みを CI/CD へ移す — 引き継ぎ

作成 2026-09-21 / PR #548（API 経路）・#549（encrypted-state 基盤）・#550（書き込み・#549 の上に積む）

> [!important] コードは揃った・稼働はユーザー操作待ち
> 3 PR は CI 緑でマージ可能な状態。login-collectors / scheduled-publish は**全サービス `ci.enabled:false`** で
> 入るので、マージしても何も動かない。動かすには下の「ユーザー操作」と canary 手順が要る。

---

## 1. 何ができたか

| 経路 | 内容 | PR |
|---|---|---|
| API | Instagram Graph API 週次（media+insights+SoT 照合）・Cloudflare zone analytics 日次・zone 設定ドリフト週次。business-direction に 4 指標、ops 鮮度検査 2 本 | #548 |
| encrypted-state | Mac の storageState を age 暗号化して private R2 `auth-state/<svc>/` へ置き、`login-collectors.yml` が一時 root に復元して read-only 取得。resolver が CI を自動検出し allowlist 外 script を拒否 | #549 |
| 書き込み | `ops-write.yml`（dispatch + repo 由来 plan hash・17 操作）、`scheduled-publish.yml`（X・30 分刻み・頻度ゲート 12 規則・queue hash）、IG Graph 投稿、Brain 売上取得 | #550 |

実測済み: coconala で export → CI 模擬 restore（authenticated）→ `coconala-orders` 7/7 → writeback gen 2 → Mac セッション健在。

## 2. ユーザー操作（順番どおり）

1. `gh secret set DOBOKU_AUTH_AGE_IDENTITY < "$HOME/Library/Application Support/doboku-note/playwright-auth/age/identity.txt"`（identity は生成済み・公開 recipient はレジストリに commit 済み）
2. IG: Graph API Explorer で `instagram_basic, instagram_manage_insights, instagram_content_publish, pages_show_list, pages_read_engagement` の User トークン → `node scripts/ig-graph-token.mjs exchange --user-token <短期>` → `page-token` → `debug` → `gh secret set IG_GRAPH_ACCESS_TOKEN` / `IG_BUSINESS_ACCOUNT_ID`。app secret は露出歴があるので先にリセット
3. Cloudflare: 既存 `CLOUDFLARE_API_TOKEN` に Zone Analytics:Read が無ければ読み取り専用トークンを `CLOUDFLARE_ANALYTICS_API_TOKEN` に
4. 各サービスを Mac でログインして `npm run auth:export -- --service <svc>`（coconala 済・note/x は authenticated なので即 export 可・kdp/a8/google/brain/afb は先に `npm run auth:login -- --service <svc>`）
5. GitHub Environment `external-writes`（required reviewer = 本人）を作り `ops-write.yml` の該当行のコメントを外す（推奨）
6. Brain 販売管理ページを 1 回開き、URL と行 selector を `.claude/config/brain-account.json` の `salesPage` に記入（null のままだと `brain-sales-fetch` は exit 2）

## 3. canary 手順（1 サービスずつ）

読み取り: レジストリで `canary:true, enabled:true` → `gh workflow run login-collectors.yml --ref develop -f service=<svc> -f mode=probe-only` ×2 → `-f mode=collect` ×3（別日）→ Mac で `npm run auth:status -- --service <svc>` が authenticated のまま → `canary:false` で cron。順序 **a8 → kdp → coconala → note → brain → x（読み取り）→ google → afb**。

書き込み: `npm run ops-write:plan -- --operation <id> --args '{...}'` → hash を確認 → `gh workflow run ops-write.yml ...`（最初は `commit=false`）。順序 **IG Graph 投稿 → note.sync-tags → note.update-body → note.publish → coconala → brain → X 投稿（`commit:false`×3 → 1 日 1 本 2 週間 → 2 本）→ X Articles → KDP（最後）**。

## 4. 落とし穴（実測）

- `rclone cat` / `lsjson` は存在しないキーでも exit 0（空出力 / `[]`）。アダプタは `[]` を NoSuchKey に写像する
- `npm install` を worktree で叩くと node_modules の symlink が実体コピー（985MB）に化ける。復元は `rm -rf` → `ln -s`
- 共有セッション lib（note-browser / coconala-session / brain-session）は import 時に profile を解決してはいけない。CI のオフライン検査（check-coconala-blog）まで CI 判定で落ちた（#549 の赤・修正済み・回帰テストあり）
- `redactAuthDiagnostic` は長い英数字列を伏せるので、公開鍵 recipient は `keyHint === 'recipient'` で除外した
- zsh では `env $VAR cmd` の `$VAR` が word-split されない。CI 模擬 env は 1 行に直書きする

## 5. 4 週安定後にやること

`check-*-due` と ops freshness（sales / kdp / coconala）の `note:` 文言を CI 主経路に更新。X は S1 再開条件（x-post-policy §11）を満たしたら上限 2 本へ。Cloudflare Web Analytics ビーコンは GA4 の bot 疑義が残れば再検討。
