---
name: note-magazine-create
description: >
  note 有料マガジンを `note掲載文.txt` 駆動で新規作成する（/magazines/new・有料単体）。`note-edit-magazine`（編集専用）が扱わない「新規作成」を担う。Use when user says [noteマガジン作成, note有料マガジンを作る, /note-magazine-create].
disable-model-invocation: true
user-invocable: true
argument-hint: "--dir <magazineDir> [--commit]"
---

`scripts/note-magazine-create.mjs` を駆動し、note 有料マガジンを **`note掲載文.txt` 駆動**で新規作成する。`note-edit-magazine`（既存マガジンの設定編集）・`note-magazine-add`（記事の収録）と役割分離。Playwright × システム Chrome（`channel:'chrome'`＋永続プロファイル＋proxy＋ignoreHTTPSErrors、Windows可）。

## 使い方

```
node scripts/note-magazine-create.mjs --dir <magazineDir>            # probe（フォーム構造ダンプ・作成しない・既定）
node scripts/note-magazine-create.mjs --dir <magazineDir> --commit   # 実作成
```

- `--dir` の `note掲載文.txt` を `scripts/lib/note-meta.mjs` の `parseNoteText` でパースし、**マガジンタイトル / 説明 / アピール / セット価格** を取得（文字数制約 30/400/250 は txt 側で担保済み）。
- カテゴリは「キャリア」固定（技術士系）。

## フロー（実機確定・2026-06-15）

1. account=dobokunote 照合（不一致は中断）
2. `/magazines/new` → タイトル input・説明 textarea を fill
3. **「有料(単体)」ボタン**をクリック → 価格 `input[type=number]`・アピール textarea・カテゴリ `select` が出現
4. 価格（セット価格）・アピール・カテゴリ=キャリア を fill/select
5. **読み戻し検証**（title/price 不一致なら作成中止）→ 「作成」→ URL から magazine key（`/m/{key}`）取得

## 安全弁

- **既定 probe**（フォームをダンプするだけ・作成しない）。実作成は `--commit` 必須。
- 作成前に fill 値を読み戻し検証（title/price 一致を確認）。
- 作成は**ユーザー起動限定**（`disable-model-invocation: true`）。決定的フローのためサブエージェント化しない（原則5）。

## 作成後

1. **カバー設定**（必須・本スキルは設定しない）: `note-magazine-cover --key {key} --dir {magazineDir} --commit` で `_cover.png`（1280×670）を設定。**作成しただけだと note のデフォルト見出し画像のまま＝「未登録」に見える**（systematic 欠落・2026-06-16）。
2. `note-magazine-add --target {key} --notes {記事IDs} --commit` で記事を収録
3. （記事が未添付なら）`note-attach-pdf`（`note-attach-magazine-pdfs --dir {magazineDir} --commit`）で各記事末尾に印刷用 PDF を添付
4. `src/lib/note-magazines.ts` の該当エントリを `published: true` ＋ `noteUrl`（`https://note.com/dobokunote/m/{key}`）＋価格を更新
5. `npm run verify-note-magazines` で SoTズレ0を確認

## 参照

- `scripts/note-magazine-create.mjs` — 本体
- `scripts/lib/note-meta.mjs` — `note掲載文.txt` パーサ（共有）
- `.Codex/skills/social/note-magazine-cover/` — マガジン見出し画像の設定（作成後の必須工程）
- `.Codex/skills/social/note-attach-pdf/` — 各記事末尾への印刷用 PDF 添付
- `.Codex/skills/social/note-edit-magazine/` — 既存マガジンの設定編集（別操作）
- `.Codex/skills/social/note-magazine-add/` — 記事の収録（別操作）
- 真実源 `.Codex/knowledge/reference/note-api-verification.md` / [[project_note_write_automation]]
