---
name: note-publish
description: >
  note.com/dobokunote の有料記事を Playwright × システム Chrome で「下書き作成→公開」する Windows 決定的パブリッシャ。カバー/タイトル/本文(markdown変換)/価格/タグ/有料境界を自動設定し、境界検証ゲート通過後に公開する。Use when user says [note記事公開, note有料記事を投稿, note自動公開, /note-publish].
disable-model-invocation: true
user-invocable: true
argument-hint: "--article <article.md path> [--commit]"
---

`scripts/note-publish.mjs` を駆動し、note 有料記事を**下書き作成→公開**する。`publish-note`（browser-use=Mac・AIエージェント）の **Windows 決定的 Playwright 版**で、`note-magazine-add` と同じ「システム Chrome（`channel:'chrome'`）＋永続プロファイル（`.local/playwright-note-profile`）＋proxy＋`ignoreHTTPSErrors`」で会社PCの社内プロキシ（TLS傍受）を越える。

## いつ使うか / どちらを使うか

- **このスキル（Windows可・決定的）**: BK マガジン等の有料記事を Windows から公開する。
- `publish-note`（browser-use=Mac）: LLM バックエンドが必要で会社PCプロキシでは不可。Mac 専用。
- **publishing は意図的にユーザー起動限定**（`disable-model-invocation: true`）。エージェントが勝手に公開しない。決定的フローのためサブエージェント化もしない（原則5）。

## 安全弁（収益アカウントのため必須・崩さない）

1. **account=dobokunote を assert**（不一致は即中断・1記事も触らない。誤公開事故の再発防止）
2. **既定は draft**（下書き保存のみ）。実公開は `--commit` 必須
3. `--commit` でも **有料境界が「試験問題/予想問題」H2 の直前にあるか検証**してからのみ投稿（`boundaryBeforeExam=false` は公開中断）
4. 公開後は note 公開ページを実取得し **無料プレビュー/カード/価格** を実体検証（[[feedback_publish_x_false_success]] 偽成功ガード）

## 使い方

```
node scripts/note-publish.mjs --article <article.md path>          # 下書き作成のみ（既定・安全）
node scripts/note-publish.mjs --article <article.md path> --commit # 実公開（境界検証ゲート付き）
```

- カバー/タグは記事と同じ年度dir の `img/cover-<type>.png` / `hashtags-<type>.txt` を自動解決（`article-II1.md` → `cover-II1.png`/`hashtags-II1.txt`。無ければ `cover.png`/`hashtags.txt`）。
- 価格・有料/無料は frontmatter `notePricing`/`price`。`notePricing: paid` かつ `price>0` で有料設定。

## 自動化される工程 / 手動の例外

| 工程 | 自動 |
|---|---|
| account ゲート / 新規エディタ / カバー(eyecatch) / タイトル / 本文(ClipboardEvent paste・markdown変換) | ✅ |
| 価格（Shadow DOM `input#price` を JS setter で上書き） | ✅ |
| タグ（公開設定パネルの「ハッシュタグを追加する」→type+Enter・先頭30） | ✅ |
| **有料境界**（有料エリア設定画面で「試験問題/予想問題」H2 直前の「ラインをこの場所に変更」を DOM順で特定→クリック→検証） | ✅ |
| **リンクカード化**（CTA の URL 単独行） | ❌ **手動仕上げ** |

### リンクカード化が手動な理由（既存「未実装TODO」を実証）

note のエディタ（ProseMirror/React）で URL→OGPカード変換の自動化は 3 方式とも失敗:
1. URL 行末で Enter → 既存 URL は遡及カード化されない
2. 属性マーク→locate → 再render で属性が消える
3. `getByText` で掴む → contenteditable 内でクリック不能

→ **公開後に CTA の URL 単独行を note UI で手動カード化**（URL 行末 Enter→約4秒。1記事1〜2リンク・5秒）。[[feedback_note_link_card]] の通りカードの方が CTR 高いので必ず仕上げる。

## 既知の限界・運用

- 1記事ずつ実行（バッチは呼び側でループ）。実行ごとに `/new` が空ドラフトを生成するため、失敗時は残った空ドラフトを削除する。
- スクショ: `.tmp/np-boundary.png`（境界画面）/ `.tmp/np-final.png`（最終）。
- 公開後 URL は記事 frontmatter `noteUrl`/`noteId` と `note-magazines.ts`（マガジン全記事公開後に `published:true`）へ反映する（[[feedback_no_price_in_mdx_body]]・真実源 `src/lib/note-magazines.ts`）。

## 参照

- `scripts/note-publish.mjs` — 本体
- `.claude/skills/social/publish-note/` — browser-use 版（Mac・手順の元）。本スキルはその Windows Playwright 版
- `.claude/skills/social/note-magazine-add/` — 公開後のマガジン収録（別操作）
- `docs/reference/note-api-verification.md` — 公開状態の実体検証
