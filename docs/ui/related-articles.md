# RelatedArticles 設計リファレンス

関連記事セクションの設計方針・アルゴリズム・スタイリングルール。`src/lib/related-articles.ts` や `src/components/ui/RelatedArticles/` を触るときに参照する。

## 設計思想

- **自動生成**: ページテンプレート（`page.tsx`）で自動表示。MDX への手動記述は不要
- **サーバーコンポーネント**: インタラクション不要のため `"use client"` なし。SEO に最適
- **MDXコンポーネントではない**: `component-loader` に登録しない。`page.tsx` から直接 import
- **RelatedKeywords との棲み分け**:
  - `RelatedKeywords` = MDX 本文内のインライン用語リンク（手動指定）
  - `RelatedArticles` = 記事下部の「次に読む」カード導線（自動生成）

## ファイル構成

| ファイル | 役割 |
|---|---|
| `src/lib/related-articles.ts` | 選択アルゴリズム（純粋関数、副作用なし） |
| `src/components/ui/RelatedArticles/RelatedArticles.tsx` | 表示コンポーネント（サーバーコンポーネント） |
| `src/app/docs/[...slug]/page.tsx` | データ取得・レンダリング統合 |

## アルゴリズム: 3段階フォールバック

```
selectRelatedArticles(current, categoryArticles, maxCount=4)
```

| 優先度 | 条件 | 用途 |
|---|---|---|
| Tier 1 | 同 `section` フィールド | PE 記事のセクション内関連（5.1 安全管理 等） |
| Tier 2 | 同ドキュメントグループ（`classifyDoc()` 結果） | keyword↔keyword, guide↔guide 等 |
| Tier 3 | 同カテゴリ（グループ問わず） | 候補不足時の補完 |

- 各 Tier 内は**決定的シャッフル**（スラグのハッシュがシード）→ SSG キャッシュと両立
- 自分自身は除外
- `section` フィールドがない記事は Tier 1 をスキップ
- 候補が 0 件ならセクション非表示（`null` 返却）

## スタイリングルール

カテゴリページの `DocCard`（`src/app/category/[slug]/page.tsx`）を踏襲:

- **外枠**: `bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/60`
- **グリッド**: `grid gap-4 grid-cols-1 md:grid-cols-2`
- **カード**: `rounded-lg border p-4 hover:border-blue-400 hover:shadow-md transition-all`
- **タイトル**: `text-sm font-semibold line-clamp-2 group-hover:text-blue-600`
- **説明文**: `text-xs text-gray-600 line-clamp-2`
- **タグ**: 最大2つ表示、`text-xs px-2 py-0.5 bg-gray-100 rounded`

## 配置

```
</article>
↓ 関連記事セクション（max-w-[780px] mx-auto mt-8）
↓ フッター
```

カテゴリナビ（折りたたみ全記事リスト）は廃止済み。記事下部の導線は関連記事カードに一本化。

## パフォーマンス

- `getDocsMetaByCategory()` でメタデータのみ取得（コンテンツは読み込まない）
- `getDocMeta()` は React `cache()` でメモ化済み → サイドバー生成とキャッシュ共有
- `selectRelatedArticles()` は純粋関数（I/O なし）

## 拡張ポイント

- **maxCount 変更**: `selectRelatedArticles()` の第3引数で調整可能（デフォルト 4）
- **新カテゴリ追加**: `section` フィールドがあれば Tier 1 が自動で有効化。なければ Tier 2 から動作
- **カスタムスコアリング**: 将来的にタグ重複数やアクセス数を加味する場合、`selectRelatedArticles()` のみ変更
