# Anthropic プログラム利用課金 影響調査（2026-06-10）

## 背景

2026-06-15 から Anthropic の課金体系が変わり、Claude を**プログラムから叩くヘッドレス利用**（`claude -p` / Agent SDK / Claude Code の GitHub Actions / SDK 経由の常駐ツール）が、サブスクとは別枠の**月次クレジット制**になる。手で対話する Claude Code と Cowork は対象外。

このリポジトリと実行環境から、課金対象になりうる箇所を全て洗い出した記録。

## 結論

**コードに埋め込まれた Claude API/SDK 呼び出しはゼロ。** 課金対象になりうるのは実質1か所＝**クラウドルーティン（`/schedule` で作った定期エージェント）**のみ。ただしその一覧は repo / ローカルに存在せずクラウド側 (`RemoteTrigger list`) が唯一の真実源のため、別途 web セッションでの確認が必要。

## 課金対象（月次クレジット制に入る）

| # | 箇所 | なぜ対象か | 状況 |
|---|---|---|---|
| 1 | クラウドルーティン（`RemoteTrigger` / `/schedule` の定期エージェント） | スケジュール起動で Claude をヘッドレス実行＝対話外。これが本丸 | **要現況確認**（下記） |

ドキュメント上に痕跡のあるルーティン（要現況確認）:

- `doboku-note weekly PDCA`（正典）
- `doboku-weekly-review`（2026-05-30 に重複作成した残骸。整理済みか未確認）
- `04_自動化マップ.md` に `/weekly-review` 日曜20:00・`/weekly-plan` 月曜07:00 の Claude Cron 登録案

根拠: `.claude/skills/management/routines/SKILL.md` に「状態は repo にもローカルにも存在せず、唯一の真実源はクラウド側の `RemoteTrigger list`」と明記。本調査を行った remote 実行コンテナには `RemoteTrigger`（claude.ai web 専用ツール）が載っておらず列挙不能だった。

## 課金対象に入らない（確認済み）

| 箇所 | 実体 | 判定 |
|---|---|---|
| GitHub Actions 11本（`psi-audit` `fetch-metrics` `link-audit` `uptime-ping` `r2-sync` `cloudflare-deploy` `ci` ほか） | 全て node スクリプト（PSI/GA4/GSC/R2/IG投稿）。`claude-code-action`・`ANTHROPIC_API_KEY` ともに無し | 対象外（Claude を呼んでいない） |
| hooks（`settings.json`）SessionStart/PreToolUse/PostToolUse/Stop | `x-sync-status.mjs`・mojibake/doc-sync/stray-files の shell・node | 対象外 |
| npm scripts（`refresh-indexes` `generate-webp` `build` 等） | 純粋な node ビルド | 対象外 |
| SNS/動画スクリプト（`publish-x.ts` `youtube/post.js` `instagram/*`） | X / YouTube / IG の各 API。"claude" 一致はコメント中のパス文字列のみ | 対象外 |
| MCP サーバ（`.mcp.json`: aidesigner, context7） | 各社独自エンドポイント・独自キー | Anthropic 課金とは無関係 |
| 依存関係 | `package.json` / `package-lock.json` に `@anthropic-ai/*` は 0 件 | SDK 不在 |
| 本調査コンテナの cron/launchd | `crontab -l` なし・launchd なし（非 Mac） | 対象外 |

`claude -p` / `claude --print` / `messages.create` / `new Anthropic(` などの直接呼び出しも全リポジトリで該当なし。

## 残作業（この環境からは確認不能な2点）

> [!todo] あなた側での確認
> 1. **クラウドルーティンの棚卸し（最優先）** — claude.ai 側セッションで `/routines`（または `RemoteTrigger {action:"list"}`）、もしくは https://claude.ai/code/routines を直接確認。doboku-note 紐づきの定期エージェント（特に weekly PDCA 系）の `enabled` を確認し、6/15 以降も回すか判断。残骸 one-shot は disable。これが新クレジットを消費する唯一の継続課金源。
> 2. **実機（Mac/PC）の cron / launchd** — 本調査は使い捨て remote コンテナ上で実機は不可視。実機で `claude -p` や Agent SDK を叩く常駐/定時ジョブがあれば `crontab -l`・`ls ~/Library/LaunchAgents`（Mac）・`systemctl --user list-timers`（Linux）で確認。

## 補足

現在稼働中のこのセッション自体は web/GitHub 起点の Claude Code だが、対話で回している限り「手で対話して使う Claude Code」＝対象外の区分。課金境界は「対話か / スケジュール・トリガー起動のヘッドレスか」であり、リポジトリ側で後者に当たるのはクラウドルーティンのみ、というのが本調査の結論。

## 調査方法（再現用）

- `claude -p` / `--print` / `headless` の grep（全リポジトリ）
- `@anthropic-ai` / `new Anthropic` / `ANTHROPIC_API_KEY` / `claude-code-action` / `messages.create` の grep（`scripts/`・`.claude/scripts/`・`.github/`）
- `.github/workflows/*.yml` 11本の Claude 呼び出し有無
- `package.json` / `package-lock.json` の `@anthropic-ai/*` 依存
- `.mcp.json`・`.claude/settings.json`・`settings.local.json` の hooks/MCP
- 本コンテナの `crontab -l` / launchd
- `.claude/skills/management/routines/SKILL.md`・`docs/project/04_運営/04_自動化マップ.md`
