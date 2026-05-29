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

## ⚠️ 重要: 「予約投稿完了」ログを信用せず予約キューを実体検証（2026-05-29）

`✅ 予約投稿完了` ログは投稿成功の証拠にならない。実際に X 予約キュー（`https://x.com/compose/post/unsent/scheduled`）を開き、仮想スクロールで全セルをロードして本文・送信時刻の実在を確認するまで「完了」と報告しない。プロフィール（`x.com/<handle>`）のポスト数で即時投稿の誤爆も併せて確認する。検証パターンは [[feedback_publish_x_false_success]] / `.tmp/verify-final.mjs`（cellInnerDiv 末尾 scrollIntoView で全件ロード→regex マッチ＋時刻ヒストグラム）。

> **2026-05-29 事故**: 9 件を予約したつもりが 0 件しか入っていなかった。原因は予約確定の `tweetButton.click()` が React onClick を発火できず compose が閉じない（=保存されない）のに、その手前の `予約モード確認OK` だけで success を返していたこと。下記の通り Ctrl+Enter 確定＋compose 閉鎖検証に修正済み。

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
| 予約確定 | textbox focus → `ControlOrMeta+Enter`（`tweetButton.click()` は onClick 不発で保存されない）。確定後 compose クローズをループ検証し、閉じなければ中止＝偽成功を出さない（2026-05-29 修正） |
| 本文入力検証 | paste 後 `textbox.innerText()` を読み戻し、空なら `keyboard.insertText` フォールバック → なお空なら中止（clipboard 不発の偽成功防止、2026-05-29 追加） |

セレクタが壊れた場合は SKILL.md の表を更新すること。

## スクリプト本体

`.claude/skills/social/publish-x/publish-x.ts`
