---
name: note-magazine-cover
description: >
  note 有料マガジンの「見出し画像（マガジン画像/cover）」を `_cover.png` から設定するブラウザ CLI。
  `note-magazine-create`（新規作成）が作成時にカバーを設定しない systematic 欠落を補う。Playwright +
  システム Chrome（channel:'chrome'）で `/m/{key}/edit` にアップロード→「この画像を使う」→更新。
  Use when user says "noteマガジンのカバーを設定", "マガジン見出し画像", "マガジン画像が未登録", "/note-magazine-cover".
  **既定 probe・実保存は --commit。収益アカウントのため保存後 API 検証まで必須。Windows(会社PC)可。**
disable-model-invocation: true
user-invocable: true
argument-hint: "--key <magazineKey> (--dir <magazineDir> | --image <path.png>) [--commit]"
---

`scripts/note-magazine-cover.mjs` を駆動し、note 有料マガジンの見出し画像を設定する。`note-magazine-create`（新規作成）・`note-edit-magazine`（タイトル/説明/価格編集）・`note-magazine-add`（収録）が扱わない「カバー画像」を担う。`note-edit-session` でログイン済みの永続プロファイルを再利用。

## ⚠️ なぜ必要か（systematic 欠落）

`note-magazine-create` は `/magazines/new` でマガジンを作るが**カバーは設定しない**（カバーは作成後の `/m/{key}/edit` ページの「マガジン画像」枠）。そのため作成しただけのマガジンは note の**デフォルト見出し画像**のまま＝ユーザーには「未登録」に見える（2026-06-16 に BK-02/03・総監コアパックで顕在化）。**マガジン作成パイプラインの一工程**として本スキルを必ず実行する。

## 使い方

```bash
node scripts/note-magazine-cover.mjs --key <magKey> --dir <magazineDir>            # probe（編集ページ構造ダンプ・保存しない・既定）
node scripts/note-magazine-cover.mjs --key <magKey> --dir <magazineDir> --commit   # 実保存（<dir>/_cover.png）
node scripts/note-magazine-cover.mjs --key <magKey> --image <path.png> --commit    # 明示画像
```

- 画像は **1280×670px**（note マガジンヘッダ規格）。`--dir` 指定時は `<dir>/_cover.png` を既定解決。
- `--commit` 無し＝probe（編集ページの file input・画像関連ボタンをダンプ＋スクショ）。

## フロー（実機確定・2026-06-16）

1. account=dobokunote 照合（不一致は中断）
2. `/{creator}/m/{key}/edit` → 「マガジン画像」枠の `input[type=file]`（accept=image/...）に `setInputFiles`
3. ダイアログ「**この画像を使う**」をクリック（キャンセルでない方）→「**更新**」で保存

## 安全弁・検証

- **既定 probe**。実保存は `--commit` 必須。**ユーザー起動限定**（`disable-model-invocation`）＋サブエージェント化しない（決定的フロー＝原則5）。
- 保存後 note API で **`cover`/`coverRectangle`（`eyecatch` ではない・記事カバーと別フィールド）が実カバーか**を検証。**未設定時 API は cloudfront の `default_magazine_header` を返す**ため、単純な非null判定でなく `isDefaultCover` ガードで実カバー（`assets.st-note.com/production/uploads/...`）のみ SET 扱い。
- **全マガジン監査**: `contents?kind=magazine` を全ページ走査し `isDefaultCover` を数えると未登録マガジンを一括検出できる。

## 関連

- `scripts/note-magazine-cover.mjs` — 本体 / `node` 直呼び or `npm run note-magazine-cover`
- 新規作成: `note-magazine-create` ／ 設定・価格編集: `note-edit-magazine` ／ 収録: `note-magazine-add`
- 真実源 `.claude/knowledge/reference/note-api-verification.md` ・[[project_note_write_automation]]
