---
name: x-repost
description: >
  X(Twitter) の高エンゲージな技術士総監/1級・2級土木施工管理ツイートを検索し、
  サブエージェント x-repost-curator で選別＋引用コメント生成 → Playwright で引用リポストする。
  discover(検索収集) → curate(選別/コメント生成) → exec(引用RP) の 3 段。
  Use when user says "Xリポスト", "引用リポスト", "x-repost".
disable-model-invocation: true
argument-hint: "[discover | curate | exec | run] [--dry-run]"
---

# x-repost — X 引用リポスト curation スキル

技術士総監・1級/2級土木施工管理の**受験者コミュニティで存在感を作る**ため、関連性の高い高エンゲージツイートを**引用リポスト（クオートRP）**する。コメント生成はサブエージェント（Pro/Max 枠で動作・API 課金なし）が担い、検索と投稿は純 Playwright スクリプトが担う。

> **戦略上の注意（必読）**
> - **規約グレー**: X ToS は API 外の自動操作を禁止。低頻度・人間的間隔で検出リスクを下げているが、ゼロではない。運営アカウントは SNS 集客の中核資産であることを理解した上で運用する。
> - **ローカル実行のみ**: X セッションは `.local/playwright-x-profile/`（このMac内）にしかなく、datacenter IP はボット判定される。**クラウド cron 不可**。定期実行は `/loop` をローカルで回す。
> - **完全自動 = コメント無検閲**: 引用コメントは人間の目を通さず投稿される。安全ゲートは curator と config.blocklist の二重。**初回は必ず `--dry-run`**。

## 構成

| 役割 | 実体 | LLM |
|---|---|---|
| discover（検索・候補収集） | `x-repost-discover.ts` | 不使用 |
| curate（選別・コメント生成） | サブエージェント `x-repost-curator`（`.Codex/agents/`） | Pro/Max 枠 |
| exec（引用RP 実行） | `x-repost-exec.ts` | 不使用 |
| 設定 | `.Codex/state/x-repost/config.json` | - |
| 重複防止 | `.Codex/state/x-repost/reposted-log.json` | - |
| キルスイッチ | `.Codex/state/x-repost/PAUSED`（存在すると exec 中止） | - |

## 前提（publish-x と同じ）

1. **システム Chrome** インストール済み（Playwright 同梱 Chromium は X にボット判定される）。
2. **初回ログイン**: `npx tsx .tmp/x-login.ts` でセッションを `.local/playwright-x-profile/` に保存。
3. **config.json の `ownHandle` を設定**（@抜き）。未設定だと discover が停止する（自投稿リポスト防止）。

## 使い方

### 初回セットアップ（必ず 1 回）

```bash
# 1. ownHandle を設定（.Codex/state/x-repost/config.json を編集）
# 2. 候補を収集
npx tsx .Codex/skills/social/x-repost/x-repost-discover.ts --interactive

# 3. curate（このスキル実行時に親が x-repost-curator サブエージェントを spawn）
#    → .Codex/state/x-repost/approved.json が生成される

# 4. ★必須★ 引用RP セレクタを dry-run 検証（投稿せず composer 到達まで）
npx tsx .Codex/skills/social/x-repost/x-repost-exec.ts --dry-run
#    成功: .local/playwright-x-debug/*_dry-run-quote-*.png が保存される
#    失敗: *_no-quote-item-*.png 等を確認し、下の「セレクタ」表を更新
```

### 通常運用（dry-run 検証が済んだ後）

このスキルを実行すると、親エージェントが順に:

1. `npx tsx x-repost-discover.ts` を Bash 実行 → `candidates.json`
2. **`x-repost-curator` サブエージェントを spawn**（candidates.json を読み、安全ゲート＋引用コメント生成 → `approved.json`）
3. `npx tsx x-repost-exec.ts` を Bash 実行 → 上位 `maxPerRun` 件を引用RP、`reposted-log.json` に追記

各段を個別に回すこともできる（引数 `discover` / `curate` / `exec`）。

### 定期実行（完全自動）

ローカルの Codex セッションで `/loop` を使う:

```
/loop 4h /x-repost
```

- クラウド `/schedule`（RemoteTrigger）は **使えない**（ローカル X セッション依存・datacenter IP ボット判定）。
- 1日2-3件運用なら 4〜6 時間間隔で十分（`config.maxPerRun=3`、exec 内でランダム待機 `minDelaySec`〜`maxDelaySec`）。

### 一時停止（キルスイッチ）

```bash
touch .Codex/state/x-repost/PAUSED      # 停止（exec が即中止）
rm .Codex/state/x-repost/PAUSED         # 再開
```

## 引用RP セレクタ（★要 dry-run 検証★）

X UI は頻繁に変わる。壊れたらこの表を更新する。

| 操作 | セレクタ |
|---|---|
| 対象ツイート本体 | `article[data-testid="tweet"]`（先頭） |
| repost ボタン | `[data-testid="retweet"]`（本体 article 内） |
| 引用メニュー項目 | `[role="menu"] [role="menuitem"]:has-text("引用")` / `:has-text("Quote")` / `[data-testid="quoteTweet"]` |
| コメント入力 | `page.getByRole("textbox").first()` |
| 投稿確定 | textbox focus → `ControlOrMeta+Enter`（不発時 `tweetButton` DOM クリック） |
| 成功判定 | compose クローズ（`tweetTextarea_0` 消失 or URL が /compose を離れる） |

## 安全設計まとめ

- **二重の安全ゲート**: config.blocklist（禁止語・禁止ハンドルの機械除外）＋ curator（誤情報/炎上/宣伝/無関係/古さの意味判定、迷ったら reject）。
- **偽成功防止**: exec はコメント read-back・compose クローズ検証で「投稿したつもりで未投稿」を物理的に出さない（publish-x の教訓踏襲）。
- **重複防止**: reposted-log.json で discover/exec 両方が既処理 id を除外。
- **検出回避**: 低頻度（maxPerRun=3）・ランダム待機・システム Chrome・人間的間隔。
- **監査**: candidates.json / approved.json / reposted-log.json が全履歴。後から採否を検証できる。

## 関連

- 投稿テンプレ・タグ・UTM の真実源: [`.Codex/knowledge/reference/x-post-policy.md`](../../../../.Codex/knowledge/reference/x-post-policy.md)
- 既存の X 自動投稿（下書き→予約）: [`publish-x`](../publish-x/SKILL.md)
- curator サブエージェント仕様: [`.Codex/agents/x-repost-curator.md`](../../../agents/x-repost-curator.md)
