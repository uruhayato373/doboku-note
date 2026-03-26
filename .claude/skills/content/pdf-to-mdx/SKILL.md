PDF または画像ファイルからテキストを抽出し、doboku-note 用の MDX ファイルに変換する。

## 引数

```
/pdf-to-mdx <入力ファイルパス> [出力先ディレクトリ]
```

- `入力ファイルパス`（必須）: PDF または画像ファイル（PNG/JPG）のパス。ディレクトリを指定した場合は配下の全ファイルを一括処理
- `出力先ディレクトリ`（任意）: MDX ファイルの保存先。省略時は `docs/` 配下の適切なカテゴリに自動配置

## ソースファイルの格納場所

`_sources/` ディレクトリに PDF/画像を配置する（gitignore 対象）。

```
_sources/
  general/           # 一般（土木工学、施工管理等）
  road/              # 道路
  river/             # 河川
  low/               # 法律
```

`_sources/` のサブディレクトリ名は `docs/` と対応しており、出力先の自動推定に使用する。

## 概要

Claude のマルチモーダル機能で PDF/画像を直接読み取り、テキスト抽出 → 構造化 → MDX 変換を一気通貫で行う。Azure OCR や外部 API は不要。

## 手順

### Step 1: 入力ファイルの確認

```
- ファイルの存在確認
- ファイル形式の判定（PDF / PNG / JPG）
- PDF の場合はページ数を確認
- ディレクトリ指定の場合は対象ファイル一覧を表示
```

### Step 2: テキスト抽出

Read ツールで PDF/画像を読み取る。

- **PDF**: Read ツールの `pages` パラメータで 20 ページずつ読み取り
- **画像**: Read ツールで直接読み取り
- 複数ファイルの場合はページ順・ファイル名順に処理

**大規模PDF（20ページ超）の場合はサブエージェント（Agent tool）に委任する：**

メインコンテキストでは：
1. PDFの最初の数ページを読んで全体構造を把握（目次・章立て）
2. 変換計画を作成（どのページ範囲 → どのMDXファイル）
3. Agent toolでサブエージェントを起動し、以下を渡す：
   - PDFファイルパス + 対象ページ範囲
   - 出力MDXファイルパス
   - 変換ルール（下記Step 3-4の内容）
   - frontmatter の内容
4. サブエージェントがPDF読み取り → MDX生成 → ファイル書き出しを完結させる
5. メインには結果（成功/失敗、生成行数、注意点）のみが返る

**複数章がある場合は並列でサブエージェントを起動する。**

### Step 3: コンテンツ分析

抽出したテキストから以下を判定する:

1. **カテゴリの推定**:
   - 土木工学全般 → `docs/general/civil-engineering/`
   - 施工管理 → `docs/general/construction-management/`
   - アセットマネジメント → `docs/general/asset-management/`
   - 空間情報 → `docs/general/spatial-information/`
   - 道路 → `docs/road/`
   - 河川・水理学 → `docs/river/`
   - 法律・憲法 → `docs/low/constitution/`
   - 国家賠償法 → `docs/low/national-compensation-law/`
   - 行政事件訴訟法 → `docs/low/state-edress-act/`

2. **コンテンツの構造**:
   - 章・節・項の階層
   - 数式の有無
   - 表の有無
   - 図の参照

### Step 4: MDX 変換

以下のルールで MDX に変換する:

#### 見出し
- 章 → `## 見出し`（h2、背景色付き）
- 節 → `### 見出し`（h3、左ボーダー付き）
- 項 → `#### 見出し`（h4、アイコン付き）

#### 数式
- ブロック数式: `$$...$$` で囲む（KaTeX 記法）
- インライン数式: `$...$` で囲む
- 数式番号がある場合は `\tag{数式番号}` を付与
- スクロール対応: `<div className="scroll-equation">` で囲む

#### 表
- Markdown テーブル記法に変換
- 必要に応じて `<div className="table-wrapper">` で囲む

#### 箇条書き
- 元テキストの箇条書きはそのまま維持
- ただし冗長な箇条書きは自然な文章に変換（元の意味を変えない）

#### 引用・出典
- 法律の条文引用: `> ...` で blockquote
- 出典表記: `<p className="source">出典名</p>`

#### 判例（法律コンテンツの場合）
- 重要判例: `<div className="box_important-precedent">` で囲む
- 最重要判例: `<div className="box_most-important-precedent">` で囲む

### Step 5: frontmatter の付与

```yaml
---
sidebar_position: N
title: "ページタイトル"
description: "ページの簡潔な説明（SEO 用、120文字以内）"
---
```

### Step 6: ファイル保存

- 推定カテゴリに基づいてパスを決定
- ユーザーに保存先を確認してから保存
- 既存ファイルがある場合は上書き確認

### Step 7: サイドバー更新確認

新しいカテゴリやファイルを追加した場合、`sidebars/` の該当ファイルの更新が必要か確認する。

## 変換ルール詳細

### 絶対に変えないこと
- 原文の意味・内容
- 数値・数式の正確性
- 法律の条文番号・判例番号
- 技術用語

### 変換時に行うこと
- 文字化け・OCR 誤認識の修正（文脈から推定）
- 全角/半角の統一（数字は半角、日本語は全角）
- 不要な改行・空白の除去
- 参照番号や注釈の整理

### 変換時に行わないこと
- 内容の追加・補足・解説
- 原文にない見出しの追加
- 意訳や言い換え

## 一括処理

ディレクトリ指定時の処理フロー:

```
1. 対象ファイル一覧を表示
2. カテゴリと出力先の推定結果を表示
3. ユーザーに確認
4. 順次変換（進捗を報告）
5. 完了サマリーを表示
```

## 出力例

```mdx
---
sidebar_position: 1
title: "品質管理の概要"
description: "土木施工における品質管理の基本概念、管理図、ヒストグラムの作成方法を解説"
---

## 品質管理の概要

品質管理（Quality Control）とは、...

### 管理図

管理図は、工程が安定状態にあるかどうかを判断するために用いる。

<div className="scroll-equation">

$$
\bar{x} = \frac{1}{n} \sum_{i=1}^{n} x_i \tag{1}
$$

</div>

### ヒストグラム

...
```

## 画像の取り扱い（R2）

コンテンツ画像は Cloudflare R2 (`storage.doboku-note.com`) から配信する。Gitには含めない。

### 画像ワークフロー

1. PDFから図・複雑な表をPNG抽出（150 DPI）
2. `content/{カテゴリ}/img/` に一時保存
3. R2にアップロード: `node scripts/upload-images-to-r2.mjs --prefix {カテゴリ}`
4. MDXでは R2 URL で参照:
   ```html
   <img src="/content/{カテゴリ}/img/{ファイル名}" alt="..." />
   ```
   または Markdown 記法:
   ```markdown
   ![alt](/content/{カテゴリ}/img/{ファイル名})
   ```

### R2アップロードスクリプト

```bash
node scripts/upload-images-to-r2.mjs                          # 全画像
node scripts/upload-images-to-r2.mjs --prefix general/design-manual  # 特定ディレクトリ
node scripts/upload-images-to-r2.mjs --dry-run                # プレビュー
node scripts/upload-images-to-r2.mjs --skip-existing          # 差分のみ
```

### 注意

- `content/**/img/` は `.gitignore` 対象 — ローカルの画像ファイルはコミットしない
- R2バケット: `doboku-note`、カスタムドメイン: `storage.doboku-note.com`
- S3互換API使用（`@aws-sdk/client-s3`、20並行アップロード）

## 参照

- `src/css/custom.css` — スタイル定義（見出し、判例枠、数式スクロール等）
- `docs/` — 既存コンテンツの形式を参考にする
- `sidebars/` — サイドバー定義
- `scripts/upload-images-to-r2.mjs` — R2画像アップロードスクリプト
