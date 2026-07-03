---
name: note-magazine-sync
description: >
  note.com 公開マガジン一覧と SoT（note-magazines.ts）の同期ズレを検出し、
  SoT 側の修正（published/noteUrl/価格）を自動適用する。
  note.com 側の手動対応が要る問題（空マガジン・異質記事混入）はリストアップして報告。
  Use when user says "noteの同期確認", "SoT突合", "マガジン公開状態チェック",
  "ブラウザcliでnoteを確認", "/note-magazine-sync".
argument-hint: "[--contents]（収録記事の詳細まで確認する場合）"
---

# note マガジン同期チェック＋SoT 自動修正

**真実源**: `docs/reference/note-api-verification.md`

---

## Step 1. 検証スクリプトを実行

```bash
# npm run は Windows で intermittent 失敗あり → node 直接呼びが安定
node scripts/verify-note-magazines.mjs --contents
```

- 終了コード 0: ズレなし → Step 4 の報告のみ
- 終了コード 1: API 取得失敗 → プロキシ/疎通を確認（`curl --ssl-no-revoke` の疎通テストを先に実施）
- 終了コード 2: ズレあり → Step 2 へ

---

## Step 2. 問題種別を分類

出力から以下のパターンを識別する：

| パターン | 修正場所 | 対応 |
|---|---|---|
| **未配線** — note 公開済みだが SoT `noteUrl:''` | `note-magazines.ts` | Step 3-A |
| **価格ドリフト** — SoT 価格 ≠ note 価格 | `note-magazines.ts` | Step 3-B |
| **要修正** — SoT `published:true` だが `noteUrl:''` | `note-magazines.ts` | Step 3-A |
| **非公開化?** — SoT の `noteUrl` が note 一覧に存在しない | ユーザー確認 | Step 4 で報告 |
| **空マガジン** — 収録 0 件 | note.com 側 | Step 4 で報告 |
| **異質記事混入** — マガジンに無関係な記事が含まれる | note.com 側 | Step 4 で報告 |

---

## Step 3. SoT 自動修正（note-magazines.ts）

### 3-A. 未配線 / noteUrl 空の修正

1. 出力の magazine list から `key`（`m...`）を取得する（例: `mf9f281e2cb32`）
2. `note-magazines.ts` で対象 ID の行を見つけ Edit する：
   ```
   published: false → true
   noteUrl: ''      → 'https://note.com/dobokunote/m/{key}'
   ```
3. **確認**: Edit 後に `grep -A 4 "'{id}'" src/lib/note-magazines.ts` で値を目視確認

### 3-B. 価格ドリフトの修正

1. note 側の実価格（出力に `¥XXXX` で表示）を確認する
2. `note-magazines.ts` の `price:` フィールドを探し、先頭の `¥X,XXX` 部分を修正する
   - 例: `'¥2,480（7本セット）'` → `'¥3,480（7本セット）'`
3. **注意**: `note掲載文.txt`（note.com 内容の SoT）と乖離していないか確認する

### 3-C. コミット

修正が 1 件以上あれば：

```bash
npm run refresh-indexes
git diff --cached --name-only   # staged 確認（note-magazines.ts のみのはず）
git add src/lib/note-magazines.ts
git commit -m "fix(note): SoT 配線・価格を note 現実に同期

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Step 4. 再検証 → 報告

```bash
node scripts/verify-note-magazines.mjs
```

終了コード 0 を確認してから結果を報告する。

### 報告フォーマット

```
### note マガジン同期チェック結果

**SoT 修正（自動適用）**
- ✅ essay-standards-municipality-magazine: published:true + noteUrl 反映

**note.com 側の手動対応が必要**
- ⚠️ {マガジン名}（{key}）: 収録 0 件 → 記事を登録する
- ⚠️ {マガジン名}（{key}）: 異質記事「{title}」混入 → 編集画面で除外する

**対応なし（監視継続）**
- ℹ️ {マガジン名}: SoT 非公開化疑い → ユーザー確認
```

note.com 側の操作は `npm run note-edit-session -- {key}` でブラウザを開いて実施する
（ログイン要・ご自身の端末で実行）。

---

## やってはいけない

- `npm run verify-note-magazines` を使う（intermittent 失敗あり。`node` 直接呼びを使う）
- `noteUrl` を推測で書く（出力の magazine list に表示される `key` を必ず使う）
- 価格修正時に `note掲載文.txt` との乖離を確認せずに `note-magazines.ts` だけ直す

## 関連

- 検証スクリプト参照: `docs/reference/note-api-verification.md`
- note.com 書き込み: `/note-edit-magazine`（note掲載文.txt 駆動）
- セッション起動: `npm run note-edit-session`
