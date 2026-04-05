---
name: pdf-to-mdx
description: >
  PDF/画像を読み取りMDX形式に変換する。Use when user asks to [PDFをMDXに変換, PDFから記事を作りたい, /pdf-to-mdx].
---

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

### 画像抽出パイプライン

PDF内の図・写真・複雑な表を高品質PNGとして抽出する。**本文テキストの混入と図の切断を防ぐ**ことが最重要。

#### Step 1: PDFページをPNG変換（300dpi）

```bash
pdftoppm -png -r 300 input.pdf /tmp/page
# → /tmp/page-01.png, /tmp/page-02.png, ...
```

- **必ず300dpi**を使用（150dpiでは文字が潰れ、クロップ精度も下がる）
- A4ページ → 約2480×3508px、B5ページ → 約2155×3040px

#### Step 2: 図の位置特定（ページごと視覚確認）

各ページのPNG画像を **Read ツールで読み取り**、以下を特定する:

1. 図の存在有無と図番号（「図 X.X」「写真 X.X」）
2. 図の**上端・下端・左端・右端**のおおよそのピクセル座標
3. 図の周囲に**本文テキストが回り込んでいるか**（横並びレイアウト）
4. 複数の図が**同一ページに存在するか**

**座標メモの例:**
```
page-03.png (2155x3040):
  - fig-6-2: 上端250, 下端1250, 左端100, 右端1600（左側にテキスト回り込みなし）
  - fig-6-3: 上端1400, 下端2100, 左端200, 右端1800（テキスト回り込みあり）
  - fig-6-4: 上端2200, 下端2800, 左端800, 右端2000（右側にテキスト回り込み）
```

#### Step 3: ImageMagick でクロップ

```bash
# 基本クロップ: magick input -crop WxH+X+Y +repage output
magick /tmp/page-03.png -crop 1500x1000+100+250 +repage fig-6-2.png
```

**テキスト回り込みがある場合 → White-out技法:**

図の周囲に本文テキストが存在し、単純クロップでは除去できない場合、白塗りで消去する。

```bash
# 1. まず図を含む広い範囲でクロップ
magick /tmp/page-03.png -crop 1800x700+200+1400 +repage /tmp/fig-6-3-raw.png

# 2. テキスト部分を白塗りで消去
magick /tmp/fig-6-3-raw.png \
  -fill white -draw "rectangle 0,0 300,700" \
  -fill white -draw "rectangle 1500,0 1800,700" \
  fig-6-3.png
```

**ポイント:**
- クロップは**余白を少し広めに取る**（ギリギリだと図が切れるリスク）
- キャプション（「図 6.1 〇〇」）は**画像に含めない**（MDX側で `alt` 属性に記載）
- ただし図内部のラベル（軸名、凡例、寸法値）は**図の一部なので残す**

#### Step 4: 抽出後の目視検証

**必ずRead ツールで抽出した各画像を確認する。** 以下をチェック:

| チェック項目 | OK | NG（再クロップ必要） |
|---|---|---|
| 図の内容が完全か | 図全体が見える | 端が切れている |
| 本文テキスト | なし | 「...である。」等の文章が映り込み |
| 隣接図の混入 | なし | 別の図やキャプションが入っている |
| 解像度 | 文字が判読可能 | 文字が潰れている |

**NGの場合**: 座標を調整して Step 3 を再実行。最大2回まで再試行し、それでもNGなら White-out 技法を適用。

#### Step 5: 画像の配置

```
.local/r2/posts/{category}/{slug}/img/
  fig-1-1.png
  fig-1-2.png
  photo-1-1.png
  ...
```

MDXでの参照:
```html
<img src="/posts/{category}/{slug}/img/{ファイル名}" alt="図X.X キャプション" loading="lazy" />
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
