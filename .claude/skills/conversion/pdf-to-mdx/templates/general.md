# pdf-to-mdx テンプレート: general（汎用変換）

汎用 PDF→MDX 変換ルール。土木工学一般・施工管理・法律等、特定の試験カテゴリに属さないコンテンツに適用。

## 出力先カテゴリ推定

| コンテンツの性質 | 推定出力先 |
|---|---|
| 土木工学全般 | `content/site/civil-general/{slug}/article.mdx` |
| 施工管理 | `content/site/construction-management/{slug}/article.mdx` |
| 法律・憲法・キーワード | `content/site/keywords-law/{slug}/article.mdx` |

## frontmatter スキーマ

```yaml
---
title: "ページタイトル"
seoTitle: "ページタイトル | doboku-note"
description: "50〜160 文字の説明"
category: "civil-general"  # civil-general | construction-management | keywords-law
tags: ["keyword"]
published: true
publishedAt: "YYYY-MM-DD"
---
```

## MDX 構造ルール

### 見出し
- 章 → `## 見出し`
- 節 → `### 見出し`
- 項 → `#### 見出し`

### 法律・判例コンテンツ
- 条文引用: `> ...` で blockquote
- 出典表記: キャプションではなく本文で「出典: {出典名}」として明記
- 重要判例: `<Callout type="standard" title="最高裁 H30.X.Y">` を使用
- 最重要判例: 同上＋本文で強調

### 数式・図表

- ブロック数式: `$$...$$`（開始・終了を別行）
- インライン数式: `$...$`
- 表: `<ArticleImage>` は図版のみ、表は Markdown テーブル
- 図: `<ArticleImage src="..." alt="..." />`

## post_hooks

変換完了後、以下を自動実行（推奨）:

```bash
/check-mdx --rules all
```

## スコープ外

以下は専用テンプレートを使う:
- 技術士総合技術監理 → `--exam cem`
- 1級土木施工管理 → `--exam civil-construction-1`
- 過去問集 → `/exam-questions-import --exam {...}`
