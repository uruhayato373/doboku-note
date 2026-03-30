---
description: "Obsidian のステージングコンテンツを doboku-note の MDX に変換・配置する"
user-invocable: true
argument-hint: "[obsidian-path]"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Agent
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
| `[[リンク先]]` | `[リンク先](/docs/path)` に変換（リンク先を content/ から検索） |
| `![[画像.png]]` | `<img src="/content/{category}/img/{filename}" />` |
| `> [!note]` | `:::note` ... `:::` |
| `> [!tip]` | `:::tip` ... `:::` |
| `> [!warning]` | `:::warning` ... `:::` |
| `$...$` / `$$...$$` | そのまま維持（KaTeX互換） |
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

MDX:
```yaml
id: concrete-basics
title: コンクリートの基本
sidebar_label: コンクリートの基本
sidebar_position: {自動決定}
description: "{titleの内容}。1級土木施工管理技士の試験対応。"
```

### Step 3: 配置先の決定

`exam-topic` と `tags` から配置先ディレクトリを決定する:

| exam-topic | 配置先 |
|---|---|
| 土工 | `content/general/exam-guide/` |
| コンクリート | `content/general/exam-guide/` |
| 基礎工 | `content/general/exam-guide/` |
| 施工管理（品質/安全/工程/環境） | `content/general/exam-guide/` |
| 法規 | `content/general/exam-guide/` |
| 過去問 | `content/general/exam-questions/` |
| 参考書・講座 | `content/general/certification/` |

配置先が不明な場合はユーザーに確認する。

### Step 4: ファイル書き込みと後処理

1. 変換した MDX を配置先に書き込む
2. sidebar.ts の更新が必要か確認し、必要なら提案する
3. Obsidian 側の frontmatter を `status: published` に更新
4. 変換結果のサマリーを表示:
   - ソース: Obsidian パス
   - 変換先: doboku-note パス
   - 変換で除去/変更した要素の一覧

### Step 5: 品質チェック（オプション）

`/check-mdx` を呼び出して変換結果の構文チェックを実行するか確認する。

## 出力フォーマット

```
## promote-to-site 結果

| 項目 | 値 |
|---|---|
| ソース | ~/obsidian/{path} |
| 変換先 | content/{category}/{filename}.mdx |
| status | ready → published |
| 変換項目 | Obsidianリンク: N件, 画像: N件, コールアウト: N件 |
| 警告 | {あれば表示} |

次のステップ:
- [ ] sidebar.ts の更新（必要な場合）
- [ ] `/check-mdx {path}` で構文チェック
- [ ] ブラウザでプレビュー確認
```
