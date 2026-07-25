---
name: promote-to-site
description: >
  Obsidian vault の Markdown ノートを doboku-note の MDX に変換・配置する。frontmatter 整形・category/tags 付与・画像パス変換を自動化。
  Use when user asks to [Obsidian から移行, コンテンツを公開, 昇格, promote, /promote-to-site].
---

Obsidian（~/obsidian）の Markdown ノートを doboku-note の MDX ファイルに変換し、適切なディレクトリに配置する。

## 引数

```
/promote-to-site [obsidian-path]
```

- `obsidian-path`: Obsidian vault 内のファイルパスまたはフォルダパス（例: `exam/1doboku/concrete-basics.md`）
- パスは `~/obsidian/` からの相対パスでも絶対パスでも可

## 前提条件

- 対象ノートの frontmatter `status` が `ready` であること
- `status` が `ready` でない場合は警告を表示し、ユーザーに確認を求める
- Obsidian パスは `/Users/minamidaisuke/obsidian/` に解決する

## 処理手順

### Step 1: ソースノートの読み込みと検証

1. 指定パスのノートを読み込む
2. frontmatter を解析し、以下を確認:
   - `status` が `ready` であること
   - `target` が `doboku-note` であること
   - `title` が存在すること
3. 不備があれば警告し、続行するか確認

### Step 2: MD → MDX 変換

Obsidian の Markdown 記法を MDX に変換する。

**変換ルール:**

| Obsidian 記法 | MDX 変換 |
|---|---|
| `[[リンク先]]` | `[リンク先](/docs/slug)` に変換（リンク先を `.local/r2/posts/` から検索） |
| `![[画像.png]]` | `<ArticleImage src="/posts/{category}/{slug}/img/{filename}" alt="..." width={N} height={N} />` |
| `> [!note]` | `<Callout type="note">` ... `</Callout>` |
| `> [!tip]` | `<Callout type="tip">` ... `</Callout>` |
| `> [!warning]` | `<Callout type="warn">` ... `</Callout>` |
| `$...$` / `$$...$$` | そのまま維持（KaTeX互換。ブロック数式は開始・終了 `$$` を別行にする） |
| Obsidian frontmatter | MDX frontmatter に変換（下記参照） |

**frontmatter 変換:**

Obsidian:
```yaml
title: コンクリートの基本
tags: [1doboku, concrete]
source: 土木一般編 第3章
status: ready
target: doboku-note
exam-topic: コンクリート
```

MDX（必須項目 = `title` / `seoTitle` / `description` / `category` / `tags` / `published`）:
```yaml
title: コンクリートの基本
seoTitle: "{検索意図に合わせたタイトル}"
description: "{titleの内容}。1級土木施工管理技士の試験対応。"
category: "civil-construction-1"
tags: ["guide"]
published: true
```

### Step 3: 配置先の決定

`exam-topic` と `tags` から配置先カテゴリ（`.local/r2/posts/{category}/{slug}/`）を決定する:

| exam-topic | 配置先カテゴリ |
|---|---|
| 土工 | `civil-construction-1`（tags に `guide`） |
| コンクリート | `civil-construction-1`（tags に `guide`） |
| 基礎工 | `civil-construction-1`（tags に `guide`） |
| 施工管理（品質/安全/工程/環境） | `civil-construction-1`（tags に `guide`） |
| 法規 | `civil-construction-1`（tags に `guide`） |
| 過去問 | `civil-construction-1`（tags に `past-questions`） |

`category` の全選択肢は `src/config/categories.json` が真実源（content-authoring.md 参照）。参考書・講座など既存カテゴリに対応しない exam-topic はユーザーに確認する。配置先が不明な場合もユーザーに確認する。

新規コンテンツは Convention B（`{slug}/article.mdx`）を推奨。

### Step 4: ファイル書き込みと後処理

1. 変換した MDX を `.local/r2/posts/{category}/{slug}/article.mdx`（Convention B）として `writeMdxFile`（`.claude/scripts/lib/mdx-io.mjs`）経由で書き込む（直接 `writeFileSync` は CRLF 混在を招き pre-commit で reject される）
2. <!-- TODO: 要確認 — 現行のナビ/一覧生成機構（旧 `src/lib/sidebar.ts` 相当）が不明。新規ページの一覧・回遊導線への反映が別途必要か確認する -->
3. Obsidian 側の frontmatter を `status: published` に更新
4. 変換結果のサマリーを表示:
   - ソース: Obsidian パス
   - 変換先: doboku-note パス
   - 変換で除去/変更した要素の一覧

### Step 4.5: 画像を R2 にアップロード（画像含む場合のみ）

変換した MDX に `<ArticleImage src="/posts/...">` タグが含まれている場合:

1. 対応する画像ファイルが `.local/r2/posts/{category}/{slug}/img/` に存在するか確認
2. **存在する場合**:
   - 通常は `main` push 時に CI（`r2-sync.yml`）が自動同期する（対象 path = `**/img/**` と `**/ogp.png|.webp`）
   - 手動同期する場合は `npm run upload-images-r2`（= `node .claude/scripts/upload-images-to-r2.mjs --prefix {category}/{slug}`）を実行
3. **存在しない場合**:
   - ユーザーに「以下の画像ファイルが見つかりません。Obsidian から配置してから再度実行してください」と案内：
     - 未検出ファイルのリスト

**注意:**
- Obsidian では `![[画像.png]]` 記法で画像を埋め込みますが、MDX 変換時に `<ArticleImage src="/posts/{category}/{slug}/img/{filename}">` に変換されます
- 画像ファイル自体は `.local/r2/posts/{category}/{slug}/img/` に配置する必要があります（Obsidian の attachments フォルダから Obsidian vault 同期時にコピー）。この配下は git 追跡対象

### Step 5: ファイル配置確認（オプション）

1. `npm run dev` を実行（`public/posts` → `.local/r2/posts` のシンボリックリンク経由でローカル配信されるため、別途同期は不要）
2. 変換先ページをブラウザで確認：
   - レイアウト・画像表示・リンク等が正常であること

### Step 6: 品質チェック（オプション）

`/check-mdx --rules syntax` を呼び出して変換結果の構文チェックを実行するか確認する。

### Step 7: 静的インデックス再生成

```bash
npm run refresh-indexes
```

本番 `npm run build` では自動実行されるが、開発中は手動で実行すること。詳細は `.claude/knowledge/reference/workflows.md` を参照。

## 出力フォーマット

```
## promote-to-site 結果

| 項目 | 値 |
|---|---|
| ソース | ~/obsidian/{path} |
| 変換先 | .local/r2/posts/{category}/{slug}/article.mdx |
| status | ready → published |
| 変換項目 | Obsidianリンク: N件, 画像: N件, コールアウト: N件 |
| 警告 | {あれば表示} |

次のステップ:
- [ ] `npm run refresh-indexes` 実行済みか確認
- [ ] `/check-mdx {path} --rules syntax` で構文チェック
- [ ] ブラウザでプレビュー確認
```
