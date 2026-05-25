---
name: publish-x
description: >
  Playwright で X (Twitter) の投稿を自動実行する。docs/sns/x/draft/ 配下の tweets.md を読み取り、
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
ls docs/sns/x/draft/

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
| `<draft>` | ✓ | `docs/sns/x/draft/` 配下のディレクトリ名。先頭番号のみ（`004`）でも可 |
| `[<date>...]` | - | 予約日時 JST (`YYYY-MM-DDTHH:MM`)。ツイート数と一致させる |
| `--tweet N` | - | 特定ツイートのみ投稿（1-based、省略時は全ツイート） |
| `--immediate` | - | 予約ではなく即時投稿（`--tweet` と組み合わせ推奨） |
| `--dry-run` | - | 実投稿せず予約モード到達まで確認 |

## tweets.md の形式

```markdown
## Tweet 01: タイトル

投稿テキスト本文

#技術士 #技術士総監 #<種別タグ>

---

## Tweet 02: タイトル
...
```

`## Tweet NN:` を区切りとして各ブロックを1投稿として扱う。

## 投稿テンプレ・ハッシュタグ運用ルール

本文構成・ハッシュタグ個数・推奨タグセットの真実源は **`docs/sns/x/README.md`**。

要点だけ抜粋:
- 文字数上限 280 weighted chars（日本語 = 2、URL = 23 固定）
- ハッシュタグは **3-4 個**（ベース 2 個 `#技術士 #技術士総監` + 種別 1-2 個）
- `#総合技術監理部門` は 17 weight と重く要点投稿限定
- 投稿前に `node .tmp/count-x-chars.mjs <tweets.md>` で文字数検証必須

## 画像

`img/tweet-{NN}-{slug}.png` が存在すれば自動添付。存在しなければテキストのみ投稿。

## 前提条件

1. **システム Chrome がインストール済み**（Playwright 組み込み Chromium は X にボット判定される）
2. **初回ログイン**: `.tmp/x-login.ts` を使って手動ログイン → セッションが `.local/playwright-x-profile/` に保存される
   ```bash
   npx tsx .tmp/x-login.ts
   # ブラウザが開くのでアカウントにログイン → x.com/home に遷移すると自動終了
   ```
3. **セッション切れ時**: 同様に `.tmp/x-login.ts` で再ログイン（`publish-x.ts` が Chrome チャンネルを使うので再ログイン後も bot 検知なし）
4. **SingletonLock エラー時**: 前回の Playwright が残っている場合は以下でクリア
   ```bash
   pkill -f "playwright-x-profile" 2>/dev/null; rm -f .local/playwright-x-profile/SingletonLock
   ```

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
