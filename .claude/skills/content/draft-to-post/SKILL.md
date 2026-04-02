---
description: "drafts/ の Markdown 下書きを src/content/posts/ の MDX に変換して公開する"
user-invocable: true
argument-hint: "<draft-file-path>"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

`drafts/` にある Markdown 下書きを doboku-note のブログ記事（MDX）に変換し、`src/content/posts/` に配置する。

## 引数

```
/draft-to-post <draft-file-path>
```

- `draft-file-path`: `drafts/writing/` または `drafts/ready/` 内のファイルパス
  - 例: `drafts/writing/pe-sokangiri-economics.md`
  - 例: `drafts/ready/pe-sokangiri-hr-management.md`

## 手順

### Step 1: 下書きファイルの読み込みと検証

Read ツールでファイルを読み込む。

以下の frontmatter フィールドを確認する:

| フィールド | 必須 | 説明 |
|---|---|---|
| `title` | ✅ | 記事タイトル |
| `description` | ✅ | SEO用説明文（80〜120文字推奨） |
| `publishedAt` | ✅ | 公開日 YYYY-MM-DD |
| `category` | ✅ | `src/config/categories.json` に存在するカテゴリ名 |
| `subCategory` | ✅ | そのカテゴリの `subCategories` に含まれる値 |
| `tags` | ✅ | 配列形式 |
| `isPremium` | ✅ | `false` または `true` |
| `slug` | 任意 | 省略時はファイル名（拡張子なし）を使用 |

不足フィールドがある場合はユーザーに確認してから続行する。

カテゴリ検証: `src/config/categories.json` を Grep で確認する。

### Step 2: Markdown → MDX 変換

以下のルールで変換する。

**Callout 変換:**

```
# Before（Obsidian）
> [!info] タイトル
> 内容テキスト

# After（MDX）
<Callout type="info" title="タイトル">
内容テキスト
</Callout>
```

| Obsidian | MDX type |
|---|---|
| `[!info]` | `info` |
| `[!warning]` | `warning` |
| `[!error]` / `[!danger]` | `error` |
| `[!success]` / `[!check]` | `success` |
| `[!tip]` / `[!hint]` | `tip` |
| `[!note]` | `note` |
| `[!question]` / `[!faq]` | `question` |

**Wikiリンク変換:**

```
[[ページ名]]         → ページ名（プレーンテキスト）
[[ページ名|表示名]]  → 表示名（プレーンテキスト）
![[埋め込み]]        → 削除
```

**Frontmatter 変換:**

下書き用フィールド（`status`, `slug`）は MDX 出力に含めない。
出力する frontmatter:

```yaml
---
title: ""
description: ""
publishedAt: "YYYY-MM-DD"
category: ""
subCategory: ""
tags: []
isPremium: false
---
```

**その他:**
- 数式 `$...$` / `$$...$$` → そのまま保持（KaTeX対応）
- テーブル・コードブロック・`<details>` → そのまま保持

### Step 3: slug と出力先の決定

- frontmatter に `slug` があればそれを使用
- なければ入力ファイル名（拡張子なし）を使用

出力先: `src/content/posts/{slug}.mdx`

既存ファイルがある場合はユーザーに上書き確認を取る。

### Step 4: MDX ファイルの書き出し

Write ツールで `src/content/posts/{slug}.mdx` に書き込む。

### Step 5: 元ファイルの状態更新

- `drafts/writing/` にある場合 → `drafts/ready/` に移動（`mv` コマンド）
- `drafts/ready/` にある場合 → frontmatter の `status` を `published` に更新

### Step 6: 完了報告

```
✅ 公開完了
- 出力先: src/content/posts/{slug}.mdx
- URL: /blog/{slug}
- カテゴリ: {category} > {subCategory}
```

---

## 下書き frontmatter テンプレート

`drafts/writing/` に置くファイルの frontmatter:

```yaml
---
title: "記事タイトル"
description: "SEO用説明文（80〜120文字）"
publishedAt: "2026-04-03"
category: "技術士（総合技術監理部門）"
subCategory: "試験ガイド"
tags:
  - 総合技術監理
  - 技術士
isPremium: false
status: draft
slug: ""
---
```

## 利用可能な MDX コンポーネント

| コンポーネント | 用途 |
|---|---|
| `<Callout type="info/warning/error/success/note/tip/question" title="">` | 注意書き・補足 |
| `<AuthorCallout items={[...]} />` | 対象読者リスト |
| `<CustomUnorderedList style="checklist/elegant" items={[...]} />` | 箇条書き |
| `<CustomOrderedList items={[...]} />` | 番号付きリスト |
| `<DataTable headers={[...]} rows={[[...]]} />` | データテーブル |
| `<Underline>テキスト</Underline>` | 下線強調 |
| `<details><summary>見出し</summary>内容</details>` | 折りたたみ（過去問解説等） |
