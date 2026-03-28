# /civil-general-import — 土木施工管理技術テキスト（土木一般編）PDF→MDX変換

## 概要

「土木施工管理技術テキスト（土木一般編）」（全6章、385ページ）のPDFをMDXに変換し、`content/general/civil-general/` に取り込むスキル。1級土木施工管理技士試験対応の教科書。

## 使い方

```
/civil-general-import              # 進捗確認し、未変換の次の章を1件変換
/civil-general-import status       # 変換状況を一覧表示
/civil-general-import 1            # 第1章を変換
/civil-general-import 3            # 第3章を変換
/civil-general-import verify 1     # 第1章のMDXをPDFと照合
```

## ソース情報

- **文書名**: 土木施工管理技術テキスト（土木一般編）
- **所在**: `/Users/minamidaisuke/obsidian/attachments/奥義/01_土木共通/03_積算・施工/90_1級土木施工管理技士試験/土木施工管理技術テキスト（土木一般編）/`
- **構成**: 6章、章別PDF
- **総ページ数**: 385ページ
- **補助データ**: 第1章・第2章には `Text/` ディレクトリに事前抽出テキスト（`paragraphs.txt`, `table*.md`）あり

## 文書構成とページ数

| # | 章 | タイトル | PDF | ページ数 | 出力ディレクトリ | 状態 |
|---|---|---|---|---|---|---|
| 1 | 第1章 | 土工 | `第１章_土工/第１章_土工.pdf` | 142 | `earthwork/` | **完了**（10ファイル, 3,694行） |
| 2 | 第2章 | 建設機械 | `第２章_建設機械/第２章_建設機械.pdf` | 54 | `construction-machinery/` | **完了**（7ファイル, 1,485行） |
| 3 | 第3章 | コンクリート工 | `第３章_コンクリート工/第３章_コンクリート工.pdf` | 89 | `concrete/` | **完了**（10ファイル, 2,534行） |
| 4 | 第4章 | 基礎工 | `第４章_基礎工/第４章_基礎工.pdf` | 65 | `foundation/` | **完了**（6ファイル, 1,420行） |
| 5 | 第5章 | 測量 | `第５章_測量/第５章_測量.pdf` | 23 | `surveying/` | **完了**（4ファイル, 742行） |
| 6 | 第6章 | 解体工事 | `第６章_解体工事/第６章_解体工事.pdf` | 12 | `demolition/` | **完了**（2ファイル, 267行） |

**全章変換完了**: 全6章、385ページ、39ファイル、10,142行（2026-03-28）

### 第1章 土工（142P）— 要分割

| 節 | タイトル | 推定ページ | 出力ファイル | 状態 |
|---|---|---|---|---|
| 1 | 概説 | 1 | `earthwork/earthwork-overview.mdx` | 未変換 |
| 2 | 土質調査 | 11 | `earthwork/soil-investigation.mdx` | 未変換 |
| 3 | 盛土 | 25 | `earthwork/embankment.mdx` | 未変換 |
| 4 | 切土 | 15 | `earthwork/cutting.mdx` | 未変換 |
| 5 | 法面保護工 | 9 | `earthwork/slope-protection.mdx` | 未変換 |
| 6 | 軟弱地盤対策 | 15 | `earthwork/soft-ground.mdx` | 未変換 |
| 7 | 排水工法 | 3 | `earthwork/drainage.mdx` | 未変換 |
| 8 | 土工計画 | 14 | `earthwork/earthwork-planning.mdx` | 未変換 |
| 9 | 建設機械の作業能力 | 2 | `earthwork/machinery-capacity.mdx` | 未変換 |
| 10 | 道路土工・舗装 | 28 | `earthwork/road-pavement.mdx` | 未変換 |

> 第1章は142Pと大きいため、節単位でファイルを分割する。

### 第3章 コンクリート工（89P）— 要分割

| 節 | タイトル | 出力ファイル | 状態 |
|---|---|---|---|
| 1 | 概説 | `concrete/concrete-overview.mdx` | 未変換 |
| 2 | 材料 | `concrete/materials.mdx` | 未変換 |
| 3 | コンクリートの性質 | `concrete/properties.mdx` | 未変換 |
| 4 | 配合設計 | `concrete/mix-design.mdx` | 未変換 |
| 5 | レディーミクストコンクリート | `concrete/ready-mixed.mdx` | 未変換 |
| 6 | 施工 | `concrete/construction.mdx` | 未変換 |
| 7 | 鉄筋工 | `concrete/reinforcement.mdx` | 未変換 |
| 8 | 型枠および支保工 | `concrete/formwork.mdx` | 未変換 |
| 9 | 特別な考慮を要するコンクリート | `concrete/special-concrete.mdx` | 未変換 |
| 10 | 品質管理および検査 | `concrete/quality-inspection.mdx` | 未変換 |

### 第4章 基礎工（65P）— 要分割

| 節 | タイトル | 出力ファイル | 状態 |
|---|---|---|---|
| 1 | 概説 | `foundation/foundation-overview.mdx` | 未変換 |
| 2〜 | （PDF目次から特定） | `foundation/*.mdx` | 未変換 |

> 第4章の詳細な節構成は変換開始時にPDF目次から特定する。

## テキスト抽出

### PyMuPDF

```python
import fitz, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PDF_BASE = '/Users/minamidaisuke/obsidian/attachments/奥義/01_土木共通/03_積算・施工/90_1級土木施工管理技士試験/土木施工管理技術テキスト（土木一般編）'
doc = fitz.open(f'{PDF_BASE}/第{N}章_{タイトル}/第{N}章_{タイトル}.pdf')
for i in range(start_page, end_page):
    text = doc[i].get_text()
    print(f'--- Page {i+1} ---')
    print(text)
```

### テキスト抽出の特徴

- **散文ページ**: PyMuPDFで概ね良好に取れる
- **行番号**: 左側に5刻みの行番号（5, 10, 15, 20...）が入る → **除去する**
- **ページヘッダ**: 「第X章 タイトル」が各ページ上部にある → **除去する**
- **表**: テキスト抽出では崩壊しやすい → PDFページ画像を見ながらMarkdown表を構成
- **図**: 構造図・断面図・グラフが多い → PNG画像として抽出
- **OCR品質**: 一部ページで文字化け（「@」→「・」、「寸」→「ト」等）があるため、文脈から修正する
- **補助データ**: 第1章には `Text/table01.md`〜`table16.md` に事前抽出済みの表データあり → 活用する

## 変換ルール

### 見出し階層

既存ファイルのパターンに準拠:

```
# {節タイトル}                    → h1（ファイル先頭、frontmatter title と一致）
## X.X {中見出し}                 → h2
### (X) {小見出し}                → h3
#### X) {項目}                    → h4
```

### frontmatter

既存ファイルのパターンに準拠:

```yaml
---
id: {slug}
title: {節タイトル}
sidebar_label: {短縮ラベル}
description: "{内容の要約（240-310文字）}。1級土木施工管理技士試験対応。"
toc_min_heading_level: 2
toc_max_heading_level: 5
---
```

### 表

- 標準Markdownテーブルで変換（`<div className="table-wrapper">` 等のラッパー不使用）
- 表タイトルは本文テキストとして記載（例: 「表4.1に、各種基礎形式と特徴を示す。」）
- 空白セルは `—`（ダッシュ）を使用
- 注記は表の下に `（注）...` の形式で記載

### 図・写真

- JSXコメント形式で参照位置にプレースホルダーを配置:

```mdx
{/* 図4.1 基礎形式の分類 */}
{/* 写真4.2 場所打ち杭の施工状況 */}
```

- 番号は章ごとの通し番号（図4.1, 図4.2, ..., 写真4.1, ...）
- 将来的にPNG画像に差し替え可能な構造

### 数式

- ブロック数式: `$$...$$`（scroll-equation ラッパー不使用）
- インライン数式: `$...$`
- 式番号: `\quad \text{（式X.X）}` で式の右側に記載
- 桁区切り: `3{,}600`
- 単位の上付き: `m&#179;` 等のHTMLエンティティ

### 注・参考ブロック

```mdx
:::note
注記の内容
:::
```

## エージェント戦略

### 分割基準

| ページ数 | 分割 | エージェント数 |
|---|---|---|
| 1-30P | 分割なし | 1 |
| 31-60P | 2分割 | 2 |
| 61-100P | 3分割 | 2-3 |
| 100P超 | 節単位で4-5分割 | 3-4 |

### 第1章 土工（142P）の分割計画

| グループ | 節 | 推定ページ | エージェント |
|---|---|---|---|
| A | 1概説 + 2土質調査 + 3盛土 | 約37P | 1 |
| B | 4切土 + 5法面保護工 + 6軟弱地盤 | 約39P | 1 |
| C | 7排水 + 8土工計画 + 9作業能力 | 約19P | 1 |
| D | 10道路土工・舗装 | 約28P | 1 |

### 第3章 コンクリート工（89P）の分割計画

| グループ | 節 | エージェント |
|---|---|---|
| A | 1概説 + 2材料 + 3性質 | 1 |
| B | 4配合設計 + 5レディーミクスト + 6施工 | 1 |
| C | 7鉄筋工 + 8型枠 + 9特殊コンクリート + 10品質管理 | 1 |

### 第4章 基礎工（65P）の分割計画

| グループ | 節 | エージェント |
|---|---|---|
| A | 前半（概説〜杭基礎） | 1 |
| B | 後半（ケーソン〜特殊基礎） | 1 |

### 図の抽出エージェント

- 1エージェントあたり最大6図
- 150 DPI でレンダリング
- `/tmp/civil-general-ch{章番号}/` に一時保存
- 抽出後に `content/general/civil-general/img/` に保存
- 全図完了後にまとめてR2アップロード: `node scripts/upload-images-to-r2.mjs --prefix general/civil-general`

### エージェントへのプロンプトテンプレート

```
以下のPDFをMDXに変換してください。

■ PDF: {PDFフルパス}
■ 対象: {節タイトル}（ページ {開始P}〜{終了P}）
■ 出力先: content/general/civil-general/{ディレクトリ}/{ファイル名}
■ 既存ファイル: なし（新規作成）
■ 図ファイル一覧: {抽出済み図のパスと図番号の対応}

【変換ルール】
- 見出し: # = ファイルタイトル, ## = X.X, ### = (X), #### = X)
- frontmatter: id, title, sidebar_label, description, toc_min/max_heading_level
- 表: 標準Markdownテーブル（ラッパー不使用）、表タイトルは本文テキスト
- 図: {/* 図X.X タイトル */} のJSXコメント形式でプレースホルダー配置
- 数式: $$...$$ (ブロック) / $...$ (インライン)
- 行番号（5, 10, 15...）を除去
- ページヘッダ（「第X章 タイトル」）を除去
- OCR文字化け（@→・、寸→ト等）を文脈から修正
- description末尾に「1級土木施工管理技士試験対応。」を付与
```

## 出力先

```
content/general/civil-general/
├── img/                          # 図・複雑な表の画像（.gitignore対象）
│   ├── ch01-fig-01.png
│   └── ...
├── earthwork/                    # 第1章 土工
│   ├── earthwork-overview.mdx
│   ├── soil-investigation.mdx
│   └── ...
├── construction-machinery/       # 第2章 建設機械（完了）
├── concrete/                     # 第3章 コンクリート工
│   ├── concrete-overview.mdx
│   └── ...
├── foundation/                   # 第4章 基礎工
│   ├── foundation-overview.mdx
│   └── ...
├── surveying/                    # 第5章 測量（完了）
└── demolition/                   # 第6章 解体工事（完了）
```

## サイドバー登録

変換完了後、`src/lib/sidebar.ts` の `generalSidebar` 内「土木一般」カテゴリに追加:

```typescript
{
  type: 'category',
  label: '土木一般',
  link: { type: 'generated-index', title: '土木一般', slug: 'civil-general' },
  items: [
    {
      type: 'category',
      label: '土工',
      link: { type: 'generated-index', title: '土工', slug: 'civil-general/earthwork' },
      items: [
        'general/civil-general/earthwork/earthwork-overview',
        'general/civil-general/earthwork/soil-investigation',
        // ...
      ],
    },
    // 第2章 建設機械（既存）
    {
      type: 'category',
      label: 'コンクリート工',
      link: { type: 'generated-index', title: 'コンクリート工', slug: 'civil-general/concrete' },
      items: [
        'general/civil-general/concrete/concrete-overview',
        // ...
      ],
    },
    {
      type: 'category',
      label: '基礎工',
      link: { type: 'generated-index', title: '基礎工', slug: 'civil-general/foundation' },
      items: [
        'general/civil-general/foundation/foundation-overview',
        // ...
      ],
    },
    // 第5章 測量（既存）
    // 第6章 解体工事（既存）
  ],
},
```

## ワークフロー

### 推奨変換順序

1. **第4章 基礎工**（65P）— 中規模、2分割で完了しやすい
2. **第3章 コンクリート工**（89P）— 中規模、3分割
3. **第1章 土工**（142P）— 最大、4分割、補助データ（Text/table*.md）を活用

### 各章の変換手順

1. PDFを読んで節構成・図の一覧を作成
2. 図の抽出エージェントを起動（3〜6枚/エージェント、150 DPI）
3. MDX変換エージェントを起動（節ごとに並列）
4. `/check-mdx` で構文チェック
5. サイドバー登録
6. このスキルファイルの状態欄を更新

## 進捗管理

| ステータス | 意味 |
|---|---|
| 未変換 | まだ取りかかっていない |
| 変換中 | MDX変換作業中 |
| QA中 | `/verify-content` で原本と照合中 |
| 完了 | 変換・検証完了 |

## 参照

- `.claude/skills/content/pdf-to-mdx/SKILL.md` — 汎用PDF→MDX変換ルール
- `.claude/skills/content/qa-pdf-mdx/SKILL.md` — QA検証スキル
- `.claude/skills/content/check-mdx/SKILL.md` — MDX構文チェック
- `.claude/skills/content/tech-management-import/SKILL.md` — 類似スキル（エージェント戦略の参考）
