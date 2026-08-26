# RelatedArticles 設計リファレンス

関連記事セクションの設計方針・アルゴリズム・スタイリングルール。`src/lib/related-score.ts` や `src/components/ui/RelatedArticles/` を触るときに参照する。

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
| `src/lib/related-score.ts` | ランクアルゴリズム（純粋関数、副作用なし）。`RelatedArticles` と `MidArticleCta` の関連記事モードで共有 |
| `src/components/ui/RelatedArticles/RelatedArticles.tsx` | セクション本体（サーバーコンポーネント） |
| `src/components/ui/RelatedArticles/RelatedArticleCard.tsx` | OGP サムネイルカード1枚分 |

## アルゴリズム: トピックタグの共通数でランク

```
rankRelated(currentMeta, categoryArticles, limit = 6)
```

- `meta.tags` から**構造タグ**（`guide`/`primary`/`secondary`/`textbook`/`keyword`/`pillar`/`essay`/`past-questions`/`pastExam`。`STRUCTURAL_TAGS`）を除いた**トピックタグ**だけで比較する
- 同カテゴリ内の各記事について、現在記事とのトピックタグ共通数を score とする
- 自分自身・非公開（`published === false`）・共通タグ 0 件（score 0）は除外
- 同スコアは `date` 降順（新しい記事優先）でソート
- 上位 `limit` 件（既定 6）を返す
- 現在記事にトピックタグが 1 つもない場合は空配列を返す（Tier 段階のフォールバックはない）

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

記事末（`AuthorCard` の前）に固定配置。カテゴリナビ（折りたたみ全記事リスト）は廃止済み。記事下部の導線は関連記事カードに一本化。

## パフォーマンス

- `categoryArticles` は呼び出し元（`page.tsx`）がメタデータのみで用意する（本文コンテンツは読み込まない）
- `rankRelated()` は純粋関数（I/O なし）

## 拡張ポイント

- **limit 変更**: `rankRelated()` の第3引数で調整可能（デフォルト 6）
- **新カテゴリ追加**: `tags` があれば追加設定なしで動作。構造タグの語彙を増やす場合は `STRUCTURAL_TAGS` を更新する
- **カスタムスコアリング**: アクセス数等を加味する場合、`rankRelated()` のみ変更すれば `RelatedArticles` と `MidArticleCta` の両方に反映される
