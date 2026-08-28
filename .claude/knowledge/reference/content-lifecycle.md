---
title: コンテンツ ライフサイクル（全チャネル共通ステージ）
---

# コンテンツ ライフサイクル

全チャネル（サイト・note・SNS・ココナラ・Brain・Kindle・動画）のコンテンツを、**企画 → 下書き → 公開**という 1 つの物差しで横断把握するための共通語彙。制定 2026-08-28。

- 機械可読 SSOT: `scripts/lib/content-lifecycle.mjs`（ステージ定数＋写像関数）
- 横断ビュー: 管理画面 `/content/lifecycle`（read-only・`tools/admin-app/src/lib/lifecycle.ts`）

## 1. 原則

1. **各チャネルのネイティブ状態が真実源**。共通ステージはその写像であり、状態を書き換えない。ライフサイクル用の第2の状態台帳を作らない
2. **写像はデータだけで決まる純関数**として `content-lifecycle.mjs` に置く。管理画面（React）や個別スクリプトへ判定を再実装しない
3. **未知の値は published 側へ寄せない**。写像できない値は `null` → 画面では「不明」。0 件と「数えられていない（未取得）」も区別する（CLAUDE.md §9）

## 2. 6 ステージ

| stage | 表示 | 意味 |
|---|---|---|
| `planned` | 企画 | 企画のみ（本文の実体がまだ無い） |
| `draft` | 下書き | 実体はあるが非公開 |
| `review` | レビュー | QA・承認・審査の待ち |
| `scheduled` | 予約 | 公開日時が決まっていて公開待ち |
| `published` | 公開 | 公開中 |
| `retired` | 停止 | 停止・アーカイブ・休止 |

## 3. チャネル別 写像

| チャネル | ネイティブ状態の真実源 | 写像 |
|---|---|---|
| 動画パック | `.claude/state/video-content-status.json` の statusEnum | `draft`＝本文有無で planned/draft、`qa_blocked`/`failed`→draft、`qa_passed`/`approved`→review、`rendered`/`scheduled`→scheduled、`published`/`measured`/`refresh_due`→published、`stopped`→retired |
| サイト記事 | MDX frontmatter `published` | true→published／false→draft／統合済み 301→retired |
| note 記事 | `content/note/**/article*.md` の `noteUrl` | あり→published／なし→draft |
| note マガジン | `src/lib/note-magazines.ts` の `published` | true→published／false かつ noteUrl あり→review／それ以外→draft |
| Instagram | パック配下 `posted.json` の有無 | あり→published／予約→scheduled／なし→draft |
| X | `content/sns/x/draft/**/status.json` の tweets[].status | queued→draft／scheduled→scheduled／posted→published／replaced・cancelled→retired |
| YouTube Shorts | `.claude/state/youtube-schedule.json` の items[].status | pending→scheduled／uploaded→published／retired・skipped→retired／failed→draft |
| ココナラ | `src/lib/coconala-services.ts` の status（＋pauseReason） | draft→draft／listed→published／paused かつ absence→scheduled／paused（retired・理由不明）→retired／archived→retired |
| Brain | `src/lib/brain-products.ts` の status | draft・rejected→draft／submitted→review／listed→published |
| Kindle | `scripts/kindle-published/catalog.json` の status | draft→draft／in_review→review／live→published／unpublished→retired |

## 4. 新しいチャネルを足すとき

1. `content-lifecycle.mjs` に写像関数を 1 つ足す（未知は `null` を返す）
2. `tests/content-lifecycle.test.mjs` に「実在するネイティブ値を全て写像できる」テストを足す（カタログ・state を実読して回す。取りこぼしを機械で止める）
3. `tools/admin-app/src/lib/lifecycle.ts` にアダプタを 1 つ足す（読むだけ・失敗は `ok:false`）
4. 本書の §3 表を同じ commit で更新する

## 5. 数え方の注意（実測で判明した罠）

- **`src/config/doc-meta-index.json` は published:false を除外して生成される**（`.claude/scripts/build-doc-meta-index.mjs`）。index だけを数えるとサイト記事の「下書き 0」という偽の緑になる。非公開は `git grep -l "^published: false" -- content/site` で別に数える
- **`igBoard()` は `posted` オブジェクトを返さず、フォーマット別の投稿有無を `CRS` 形式の文字列（未投稿は `-`）へ畳んで `status` に入れる**。`posted` を読もうとすると全件 draft になる
- **この端末では 1 ファイル読み取りが EDR スキャンで 20〜45ms かかる**（memory: reference_local_build_io_bound）。831 本の note frontmatter を読む `noteArticles()` は 70 秒超。件数だけなら `git ls-files` / `git grep` で 1 秒（`content.ts` の `noteArticleCounts` が同じ判定の高速版・**ルールを変えるときは両方を直す**）
