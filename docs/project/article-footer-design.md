# 記事末尾の情報設計

記事ページ（`/docs/{slug}`）の本文下に表示する情報は、ページ種別（`group`）ごとに明確に設計する。重複を避け、読者が「次に何を読むべきか」が一目で分かる構成にする。

## 基本方針

1. **本文の一部はMDX内に残す**: `## 参考資料` など、筆者が文脈を持って書く情報
2. **サイト構造的な回遊はコンポーネント化**: 過去問ナビ、キーワード一覧など、自動生成できる情報
3. **役割の重複を避ける**: 同じ情報を複数のコンポーネントで出さない
4. **`RelatedArticles`（自動選定）は使用しない**: 役割が不明確でSEO/UX効果が薄い

## ページ種別ごとの構成

| ページ種別 (group) | 末尾表示 | 目的 |
|---|---|---|
| **PE guide** | CategoryNavCard（モバイル版） | 他のガイドへ遷移 |
| **PE past-exam** | 1. PastExamNav<br>2. KeywordsInExam | 他年度へ遷移、出題キーワードの深掘り |
| **PE keyword** | 1. PastExamBacklinks<br>2. SectionKeywords | 出題された過去問の確認、体系的な学習 |
| **Civil guide** | CategoryNavCard（モバイル版） | 他のガイドへ遷移 |
| **Civil primary** | 1. PastExamNav<br>2. RelatedTextbooks | 他年度へ遷移、教科書で深掘り |
| **Civil secondary** | CategoryNavCard（モバイル版） | 他の第2次対策へ遷移 |
| **Civil textbook** | 1. TextbookNav<br>2. CategoryNavCard（モバイル版） | 前後章ナビ、全体構成の把握 |

## コンポーネント一覧

### 共通コンポーネント

- **`CategoryNavCard`** (既存): 右サイドバー + モバイル版。カテゴリ・グループに応じて内容切り替え
- **`PastExamNav`** (既存): 年度ナビ（PE択一/記述、Civil問題A/B）
- **`SectionKeywords`** (既存): PEキーワードの同セクション関連リンク

### 末尾専用コンポーネント

- **`PastExamBacklinks`**: キーワードが出題された過去問への逆引きリンク
- **`KeywordsInExam`**: 過去問で扱われたキーワード一覧
- **`RelatedTextbooks`**: 第1次検定問題に関連する教科書章
- **`TextbookNav`**: 教科書の前後章ナビゲーション

## MDX本文のルール

### 残すもの
- `## 総合技術監理における位置づけ` (PEキーワード)
- `## 参考資料` (外部リンク)
- 本文中のインラインMarkdownリンク（関連キーワードへの参照）

### 削除するもの
- `## 過去問での出題` セクション（`PastExamBacklinks`で自動化）
- 手書きの「関連キーワード:」末尾インライン一覧（`SectionKeywords`で自動化）

## 廃止する要素

- **`RelatedArticles`**: 自動選定の関連記事。役割不明確のため全ページで廃止
