# RelatedArticles 設計リファレンス

関連記事セクションの設計方針・アルゴリズム・スタイリングルール。`src/lib/related-core.mjs`・`src/lib/related-score.ts`・`src/lib/article-end-wiring.ts` や `src/components/ui/RelatedArticles/` を触るときに参照する。規則と重みの正典は [content-taxonomy.md](../../.claude/knowledge/reference/content-taxonomy.md) §6-3。

## 設計思想

- **自動生成**: ページテンプレート（`page.tsx`）で自動表示。MDX への手動記述は不要
- **サーバーコンポーネント**: インタラクション不要のため `"use client"` なし。SEO に最適
- **MDXコンポーネントではない**: `component-loader` に登録しない。`page.tsx` から直接 import
- **RelatedKeywords との棲み分け**:
  - `RelatedKeywords` = MDX 本文内のインライン用語リンク（手動指定）
  - `RelatedArticles` = 記事下部の「次に読む」OGP サムネイルカード導線（自動生成）

## ファイル構成

| ファイル | 役割 |
|---|---|
| `src/lib/related-core.mjs` | ランクアルゴリズムの本体（純粋関数、I/O なし）。テストと `report-taxonomy-wiring` も同じ関数を使う |
| `src/lib/related-score.ts` | サイト用の窓口。tags.json の class と topics.json の所属を `related-core.mjs` に渡す。`RelatedArticles`・`MidArticleCta` の関連記事モード・記事末のテーマ／法令のカードで共有 |
| `src/lib/article-end-wiring.ts` | 記事末の「この記事のテーマ」「同じ法令を扱う記事」の選び方（`relatedScore` で並べ、資格が重ならないように選ぶ） |
| `src/components/ui/RelatedArticles/RelatedArticles.tsx` | セクション本体（サーバーコンポーネント） |
| `src/components/ui/RelatedArticles/RelatedArticleCard.tsx` | OGP サムネイルカード1枚分 |

## アルゴリズム: タグの class とテーマで点を付けてランク

```
rankRelated(currentMeta, categoryArticles, limit = 6, exclude = new Set())
```

- 共有するタグの点は `tags.json` の class で変える（主題 topical 10・資格 qualification 0・学習の型 learning 0・structural/flag 0）。同じテーマ（topics.json）1 つにつき +6、同じ資格（カテゴリ）に +2。資格タグを数えると、付け忘れた記事が同点の勝負で毎回負けるので数えない（総監の 5 管理のように科目名がテーマを兼ねるタグはテーマの共有で数える）
- 技術テーマ（主題タグかテーマ）を 1 つも共有しない記事は関連にしない。limit に満たなければ資格・学習の型の共有で補う（`fallbackScore`）
- 自分自身・非公開（`published === false`）・`exclude`（記事末の先のカードで出した記事）は除外
- 同じ資格は limit の 4/6 まで。他の資格・実務の候補が足りなければ同じ資格で埋める
- 同点は `stableTieBreak`（記事の組ごとの擬似乱数。ビルドのたびには変わらない）。2026-10-21 まで更新日の新しい順で、どの記事からも同じ新しい記事が選ばれ、705 本がどの記事の関連記事にも選ばれなかった（63 本に減った）

## 表示条件

`RelatedArticles` は `rankRelated()` の結果が **2 件未満なら何も描画しない**（`null` を返す）。タグが薄い過去問ページ等で薄いセクションになったり、`RelatedTextbooks`/`RelatedKeywords` と重複したりするのを避けるため。

## スタイリング

- **セクション外枠**: `MetaCard`（共通カードシェル）
- **グリッド**: `grid grid-cols-1 gap-4 sm:grid-cols-2 zenn-desktop:grid-cols-3`
- **カード**: `card-interactive card-surface-content`（デザイントークン。個別に border/shadow を直書きしない）
- **サムネイル**: 各記事の `ogp.png`（R2 配信・全 published 記事で CI 実在保証）を `aspect-[1200/630]` で表示。`loading="lazy"` で LCP 非干渉
- **タイトル**: `line-clamp-2 text-sm font-semibold text-brand`
- **説明文**: `line-clamp-2 text-xs text-[var(--ink-body)]`（`doc.description` がある場合のみ）
- タグのバッジ表示はしない

## 配置

記事末は 根拠法令（法令ページへのリンク・同じ法令を扱う記事・関わるテーマ）→ この記事のテーマ（`TopicHubLinks`）→ 関連記事 → `AuthorCard` の順。法令ページでは解説の直後に法令ページの自動の節（`LawPageSections`）が先に入る。先のカードで出した記事は関連記事から外し、法令ページ自身は同じ法令を扱う記事に入れない（content-taxonomy.md §6-3）。

## パフォーマンス

- `categoryArticles` は呼び出し元（`page.tsx`）がメタデータのみで用意する（本文コンテンツは読み込まない）
- `related-core.mjs` の `rankRelated()` は純粋関数（I/O なし）。テーマの所属は `getDocTopics()` が slug ごとに覚える

## 拡張ポイント

- **limit 変更**: `rankRelated()` の第3引数で調整可能（デフォルト 6）
- **新カテゴリ追加**: `tags` があれば追加設定なしで動作。構造タグの語彙を増やす場合は `src/config/tags.json` の `class` で宣言する（規則は [content-taxonomy.md](../../.claude/knowledge/reference/content-taxonomy.md) §5）
- **カスタムスコアリング**: 重みや規則を変えるときは `related-core.mjs` を変える。`RelatedArticles`・`DocPage` の中間 CTA・`article-end-wiring.ts` に反映され、`tests/topic-wiring-rules.test.mjs` と週次の `report-taxonomy-wiring`（他の資格の割合・どこからも選ばれない記事）で効果を確かめる
