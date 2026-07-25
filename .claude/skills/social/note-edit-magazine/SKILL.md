---
name: note-edit-magazine
description: >
  note の有料マガジン設定（タイトル/説明/アピール/価格）と収録記事の単品価格を、対応する
  note掲載文.txt（単一SoT）の値へ自動反映する。Playwright + システム Chrome（channel:'chrome'）で編集→保存。
  Use when user says "note マガジン編集", "note 価格変更", "note タイトル変更", "マガジン設定更新".
  **初回 or 様子見は必ず --dry-run。書き込みは収益アカウントのため保存後 API 検証まで必須**。
disable-model-invocation: true
argument-hint: "--key <magazineKey> --dir <magazineDir>（or --txt note掲載文.txt）[--articles] [--dry-run]"
---

note の有料マガジンを `note掲載文.txt`（マガジン設定の単一SoT・■ セクション＋機械ブロック）駆動で編集する。`publish-x` と同じ「システム Chrome ＋永続プロファイル」方式で、bot 検知を回避して編集・保存する。読み取り検証は `verify-note-magazines`、編集導線の入口は `note-edit-session`。本スキルは値の自動反映（書き込み）を担う。

## ⚠️ 前提: ログインセッションが永続化済みであること

`channel:'chrome'`（システム Chrome）＋ `.local/playwright-note-profile` を使う。**初回のみ手動ログイン**が必要:

```bash
npm run note-edit-session -- <magazineKey>   # 開いた画面でログイン → 閉じる（セッション保存）
```

ログイン後は本スキルがそのセッションを再利用する。組み込み Chromium だと「安全でないブラウザ」で弾かれるため `channel:'chrome'` 必須（真実源: `.claude/knowledge/reference/note-api-verification.md`）。

## ⚠️ 重要: note の文字数制限（超過すると「更新」ボタンが無効＝保存不可）

- **マガジンタイトル ≈ 30 字以内**（旧 29 字 OK・51 字で赤エラー）。超過は警告。
- **アピールポイント 250 字以内**（「文字数は250文字以内にしてください」）。**超過はスクリプトが abort** する。`npm run note-meta-lint` で先に全 note掲載文.txt を検査・是正すること（タイトル30/説明400/アピール250）。
- 説明（description）は長文可（373 字で OK）。

## 使い方

```bash
# 1) dry-run（入力・読み戻し照合・スクショまで。保存しない）
npm run note-edit-magazine -- --key m6854c7437d4d --dir "docs/note/技術士総監/magazines/総監記述式-R8予想問題集" --dry-run

# 2) 本番（マガジン設定のみ保存）
npm run note-edit-magazine -- --key m6854c7437d4d --dir "<magazineDir>"

# 3) 収録記事の単品価格も _meta.articlePrice へ揃える（公開フロー経由・再公開）
npm run note-edit-magazine -- --key m6854c7437d4d --dir "<magazineDir>" --articles
```

`--key` は対象マガジンの note key（`note-magazines.ts` の noteUrl 末尾 or `verify-note-magazines` で確認）。

## 動作（安全段階）

1. `note掲載文.txt`（■ タイトル/説明/アピール＋機械ブロックの setPrice/articlePrice）から抽出。
2. 文字数制限を事前チェック（アピール>250 は abort）。
3. マガジン編集フォーム（`/m/{key}/edit`）に入力 → `inputValue` で**読み戻し照合** → 「更新」ボタンの **enabled 確認** → 保存（dry-run なら保存せず `.tmp/note-edit-magazine.png`）。
4. `--articles`: 収録記事を API で取得し、価格≠articlePrice の記事のみ `editor.note.com` 公開フロー（公開に進む→価格→有料エリア設定→更新する）で更新。
5. **保存後 note API で price/title を実体検証**（更新マガジンは creator 一覧の page1 先頭へ移動）。

## やってはいけない

- **`--dry-run` を飛ばしていきなり本番**（特にセレクタ変更後）。note の UI 変更で誤操作し得る。
- 保存後の **API 検証を省略**して「完了」と報告する（[[feedback_publish_x_false_success]] と同じ偽成功の罠）。
- 記事の **公開フローで価格以外（無料/有料・収録マガジン・ハッシュタグ）を変更**しない。

## 関連

- 読み取り照合: `npm run verify-note-magazines`（[note-api-verification.md](../../../.claude/knowledge/reference/note-api-verification.md)）
- ログイン入口: `npm run note-edit-session`
- 兄弟スキル: `publish-x`（同方式の X 投稿）
