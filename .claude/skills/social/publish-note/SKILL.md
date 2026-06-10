---
name: publish-note
description: browser-use CLI で note.com（note.com/dobokunote）エディタを自動操作し、総監模範論文ペルソナ別マガジンの記事を下書き保存または予約投稿する。Use when user says "note投稿", "note公開", "note下書き作成". 本文paste・カバー・タグを自動設定。実行は Mac 推奨（会社PCはプロキシ制約）。
disable-model-invocation: true
user-invocable: true
argument-hint: "<persona> <RXX>[ <M/D> <HH:MM>] [, <persona> <RXX> ...]"
---

browser-use CLI（Chrome プロファイル経由）で **note.com/dobokunote** のエディタを自動操作し、総監模範論文ペルソナ別マガジンの記事（`docs/note/技術士総監/magazines/総監模範論文-<persona>/<RXX>/article.md`）を下書き保存または予約投稿する。

このスキルは stats47 プロジェクトの `publish-note`（note.com 自動投稿の実証済みスキル）を doboku-note 用に適応したもの。**note.com エディタ操作の共通ノウハウは `references/` を参照**し、本 SKILL.md は doboku-note 固有の規約・差分・安全ゲートを定義する。

## 実行環境の前提（重要）

- **実行は Mac 推奨**。会社 PC（Windows）はプロキシが外部 API（browser-use の LLM バックエンド等）を遮断する可能性が高い（[[project_ig_api_posting_setup]] と同根）。note 投稿は Mac で行う運用とする
- **browser-use CLI がインストール済み**であること（`$HOME/.browser-use-env/` 等）
- **Chrome プロファイルが note.com/dobokunote にログイン済み**であること。プロファイル名は環境変数 `NOTE_PROFILE` に設定（例: `export NOTE_PROFILE="Profile 1"`）。references の例にある `Profile 5` は stats47 用なので**使わない**
- **予約投稿**は note プレミアム加入アカウントのみ可（通常アカウントは日時設定不可）

## 投稿先アカウント（最重要・誤爆防止）

**このスキルの投稿先は `note.com/dobokunote` 固定。** Phase 1 のアカウント照合ゲートを必ず通す（stats47 で 2026-05-20 に別アカウントへ誤公開した事故の再発防止策。プロファイル分離だけではセッションドリフトを防げない）。

## stats47 → doboku-note 差分マップ（references を読む際の読み替え表）

| 項目 | stats47（references の記述） | doboku-note（本プロジェクト） |
|---|---|---|
| アカウント | `note.com/stats47` / Profile 5 / stats47jp@gmail.com | **`note.com/dobokunote`** / `$NOTE_PROFILE` |
| 記事パス | `docs/31_note記事原稿/<vertical>/<slug>/{note.md,draft.md}` | **`docs/note/技術士総監/magazines/総監模範論文-<persona>/<RXX>/article.md`** |
| 有料フラグ | frontmatter `is_paid` / `price_jpy` | frontmatter **`notePricing: paid`** / **`price: 500`** |
| 有料境界マーカー | 本文中 `ここから先は有料部分:` 行 | **`## 試験問題` 行の直前**（intro・「この記事でわかること」・マガジンCTA は無料プレビュー、試験問題＋解答以降が有料） |
| マガジン名/説明/価格 | 各 vertical の設定 | **`総監模範論文-<persona>/note掲載文.txt`** からコピペ |
| ハッシュタグ | 記事内 | **`<RXX>/hashtags.txt`**（90 個前後・単一行 space 区切り） |
| アイキャッチ | 生成画像 | **`<RXX>/img/cover.png`** |
| 購入特典PDF | なし | **`<RXX>/模範論文-*.pdf`**（有料エリアに添付＝半自動） |
| 公開URL記録 | `note-published-urls.json` + DB | **各記事 frontmatter `noteUrl`/`noteId`** ＋ `src/lib/note-magazines.ts`（マガジンURL・published） |

## 引数（バッチ対応）

```
/publish-note <persona> <RXX>[ <M/D> <HH:MM>] [, <persona2> <RXX2> ...]
```

- **persona**: ペルソナ名（例 `自治体港湾担当`。`総監模範論文-` 接頭辞は不要）
- **RXX**: 年度ディレクトリ（`R03`〜`R07` / `R08-yosou-1` / `R08-yosou-2`）
- **M/D HH:MM**: 予約日時（任意・省略時は下書き保存のみ）

例: `/publish-note 自治体港湾担当 R03 7/1 08:00, 自治体港湾担当 R04 7/1 12:00`

## browser-use 共通設定

```bash
export PATH="$HOME/.browser-use-env/bin:$HOME/.browser-use/bin:$HOME/.local/bin:$PATH"
export NOTE_PROFILE="Profile 1"   # note.com/dobokunote にログイン済みのプロファイル名に置換
```

**全コマンド**: `browser-use --headed --profile "$NOTE_PROFILE" <command>`（references の `--profile "Profile 5"` は `"$NOTE_PROFILE"` に読み替え）

### ⚠️ 必須: 終了時クリーンアップ

スキル完了時／中断時に daemon と使い捨て Chrome を必ず停止する。手順は **[references/editor-operations.md](references/editor-operations.md)** および stats47 由来の3段クリーンアップ（macOS は osascript でエディタタブも閉じる）に従う。**Windows で実行する場合は `pkill`/`osascript` が無いため、`Stop-Process`/タスクマネージャ等で browser-use daemon と chromium を停止する**（が、原則 Mac 実行）。

## 実行フロー

```
引数パース → 記事ごとにループ:
  Phase 0: データ読み込み（Node.js・doboku-note 規約）
  Phase 1: ブラウザ起動 → ★dobokunote アカウント照合ゲート★ → エディタ表示
  Phase 2: アイキャッチ（img/cover.png・本文入力前に実行）
  Phase 3: タイトル入力（frontmatter title から H1 を除いた表示タイトル）
  Phase 4: 本文入力（一括 ClipboardEvent paste・URL は plain text）
  Phase 5: （図版なし方針のため通常スキップ）
  Phase 6: 下書き保存
  Phase 7: 公開設定（有料価格・タグ・予約 or 即時）※有料境界とPDF添付は半自動
  Phase 8: 確認スクショ → 公開URLを frontmatter に反映
→ 全記事完了後にブラウザを閉じる + 必須クリーンアップ
```

### Phase 0: データ読み込み（doboku-note 規約）

Node.js で対象記事を読み込み `/tmp/note-data-<persona>-<RXX>.json` に出力する：

1. `docs/note/技術士総監/magazines/総監模範論文-<persona>/<RXX>/article.md` を読む
2. frontmatter から `title`（先頭 `# ` 見出しを表示タイトルに採用）/ `notePricing` / `price` を抽出
3. 本文を **`## 試験問題` 行の直前で free / paid に分割**（intro＝無料プレビュー、試験問題以降＝有料）
4. 本文をセグメント分割（URL 単独行 vs テキスト。URL は paste 後に plain text のまま＝カード化は Phase 4-3）
5. `<RXX>/hashtags.txt`（タグ）、`<RXX>/img/cover.png`（アイキャッチ）、`<RXX>/模範論文-*.pdf`（特典）の存在を確認

**Phase 0 ガード**: 本文に未反映プレースホルダー（`{{MAGAZINE_URL}}` または `※note 公開後…予定` 系）が残っていたら、その記事は**公開せず中断**。先に `.claude/scripts/note/inject-magazine-url.cjs <persona> <マガジンURL>` で実 URL を注入しておく。

### Phase 1: dobokunote アカウント照合ゲート（投稿前に必ず）

```bash
browser-use --headed --profile "$NOTE_PROFILE" open "https://note.com/settings/account"
browser-use --headed --profile "$NOTE_PROFILE" state 2>&1 > /tmp/note-acct.txt
```

`state` 出力からログイン中アカウントのハンドルを読み取り、**`dobokunote` と決定論的に文字列照合**する。

- 一致 → Phase 2 へ
- **不一致 / 未ログイン / 確認不能 → 即中断**（1 記事も投稿しない）。「Profile が note.com/dobokunote にログインしていません。投稿を中止しました」と報告。憶測で続行しない

### Phase 2〜8: エディタ操作

具体的な browser-use コマンド・要素検索・paste 機構は **[references/editor-operations.md](references/editor-operations.md)**、有料価格/タグ/予約は **[references/scheduling.md](references/scheduling.md)**、要素ヘルパー/エラー処理は **[references/troubleshooting.md](references/troubleshooting.md)** を参照（アカウント・パスは差分マップで読み替え）。doboku-note 固有の要点：

- **Phase 2 アイキャッチ**: `<RXX>/img/cover.png` をアップロード（本文入力前）
- **Phase 4 本文**: free セグメントを一括 ClipboardEvent paste（H2/H3/太字が変換される唯一の方法。`type` 不可・連続 paste 不可）。**URL カード化は半手動**（本プロジェクトの記事はマガジンCTAの URL を単独行で持つ＝ペースト後に各 URL 行を行末 Enter → 4 秒待ちでカード化。references 4-3）
- **Phase 7-Pricing**: `notePricing: paid` かつ `price>0` のとき有料設定。Shadow DOM 内 `<input id=price>` に JS で価格を上書き（`type` 不可）
- **有料境界の指定 と 特典PDF添付 は半自動**（stats47 でも未到達領域）。価格設定までは自動、有料エリア境界の選択と PDF 添付は**人間が手動**で行う運用とする
- **Phase 7-Tags**: `<RXX>/hashtags.txt` の内容を入力
- 予約日時があれば予約投稿、なければ「今すぐ公開」または下書き保存のみ

### Phase 8 後: 公開 URL の反映

公開（即時/予約）したら、その記事 URL（`note.com/dobokunote/n/<id>`）を：

1. 当該記事 `article.md` の frontmatter `noteUrl` / `noteId` / `notePublishedAt` に記入
2. マガジン単位で全 7 記事が公開済みになったら、`src/lib/note-magazines.ts` の該当エントリを `published: true` ＋ マガジン `noteUrl` に更新（マガジンURL は `inject-magazine-url.cjs` で本文にも反映）

下書き保存のみの場合は記録しない。

## 偽成功の罠（必ず実体検証）

「投稿できた」というログを**信用しない**。stats47/publish-x で予約ゼロの空振り事故があった（[[feedback_publish_x_false_success]]）。公開後は **note の公開ページ（または下書き一覧）を実取得して、本文・カバー・タグ・価格・カード化が実際に反映されているか DOM/スクショで確認**してから「完了」と報告する。clipboard paste 不発（本文空）も頻発するため、paste 後に本文の文字数を eval で確認する。

## トラブルシューティング

要素検索ヘルパー（`find_idx`）・実証済み要素パターン・clipboard paste 不発時の対処は **[references/troubleshooting.md](references/troubleshooting.md)**。既存公開記事の本文更新は **[references/update-mode.md](references/update-mode.md)**。

## 参照

- `.claude/skills/social/publish-note/references/` — note.com エディタ操作ノウハウ（stats47 由来・差分マップで読み替え）
- `.claude/scripts/note/inject-magazine-url.cjs` — マガジンURLのプレースホルダ一括注入（doboku-note 版）
- `docs/reference/note-essay-review-checklist.md` Step 10 — 公開後 URL 反映フロー
- `.claude/skills/social/publish-x/` — 同系統のブラウザ自動投稿（persistentContext・偽成功検証の設計元）
- `src/lib/note-magazines.ts` — マガジンの published/noteUrl/price 真実源
