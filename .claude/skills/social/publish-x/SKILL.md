---
name: publish-x
description: >
  Playwright で X (Twitter) の投稿を自動実行する。docs/x-posts/draft/ 配下の x/tweets.md を読み取り、
  ## Tweet XX ブロックを1件ずつ投稿（即時 or 予約）。
  Use when user says "X投稿", "X予約投稿", "ツイート投稿".
  **初回実行時 or セレクタ更新後は必ず --dry-run で事前検証すること**.
disable-model-invocation: true
argument-hint: "<draft> [<YYYY-MM-DDTHH:MM>...] [--tweet N] [--immediate] [--dry-run]"
---

Playwright（永続プロファイル）で X のコンポーザを自動操作し、即時投稿または予約投稿する。

## ⚠️ 重要: 初回 / セレクタ更新後は --dry-run で事前検証

X の UI は頻繁に変わる。**予約モード未確認のまま投稿ボタンを押すと即時投稿が発火する**（2026-04-18 実際に発生）。

```bash
npx tsx .claude/skills/social/publish-x/publish-x.ts 004 --tweet 1 2026-05-09T08:00 --dry-run
```

- 成功: `.local/playwright-x-debug/` に `dry-run-scheduled-mode.png` が保存される
- 失敗: `schedule-mode-not-confirmed.png` を確認してセレクタ修正
- **dry-run 成功後**に `--dry-run` を外して本番実行

## 使い方

```bash
# 1. 利用可能な draft を確認
ls docs/x-posts/draft/

# 2. dry-run（初回必須）
npx tsx .claude/skills/social/publish-x/publish-x.ts 004 --tweet 1 2026-05-09T08:00 --dry-run

# 3a. 即時投稿（特定ツイート）
npx tsx .claude/skills/social/publish-x/publish-x.ts 004 --tweet 1 --immediate

# 3b. 予約投稿（全ツイート、日時をツイート数分並べる）
npx tsx .claude/skills/social/publish-x/publish-x.ts 004 \
  2026-05-09T08:00 \
  2026-05-10T08:00 \
  2026-05-11T08:00 \
  2026-05-12T08:00 \
  2026-05-13T08:00
```

## 引数

| パラメータ | 必須 | 説明 |
|---|---|---|
| `<draft>` | ✓ | `docs/x-posts/draft/` 配下のディレクトリ名。先頭番号のみ（`004`）でも可 |
| `[<date>...]` | - | 予約日時 JST (`YYYY-MM-DDTHH:MM`)。ツイート数と一致させる |
| `--tweet N` | - | 特定ツイートのみ投稿（1-based、省略時は全ツイート） |
| `--immediate` | - | 予約ではなく即時投稿（`--tweet` と組み合わせ推奨） |
| `--dry-run` | - | 実投稿せず予約モード到達まで確認 |

## tweets.md の形式

```markdown
## Tweet 01: タイトル

投稿テキスト本文

---

## Tweet 02: タイトル
...
```

`## Tweet NN:` を区切りとして各ブロックを1投稿として扱う。

## 画像

`img/tweet-{NN}-{slug}.png` が存在すれば自動添付。存在しなければテキストのみ投稿。

## 前提条件

1. **Playwright Chromium がインストール済み**（`npx playwright install chromium`）
2. **初回ログイン**: `.local/playwright-x-profile/` にセッションがなければブラウザが開き手動ログインが必要（5 分以内）

## 実証済みセレクタ（2026-04-20 stats47 で検証）

| 操作 | セレクタ |
|---|---|
| テキスト入力 | `page.getByRole("textbox").first()` |
| 画像アップロード | `input[data-testid="fileInput"]` |
| 予約ボタン | `[role="dialog"] [data-testid="scheduleOption"]`（DOM `.click()` 必須） |
| 日時 select | `[role="dialog"] select` × 5（options 内容からロール自動判定） |
| 確認ボタン | `[data-testid="scheduledConfirmationPrimaryAction"]` |
| 予約モード検証 | `[data-testid="tweetButton"]:has-text("予約設定")` |

セレクタが壊れた場合は SKILL.md の表を更新すること。

## スクリプト本体

`.claude/skills/social/publish-x/publish-x.ts`
