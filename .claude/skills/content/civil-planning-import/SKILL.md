# /civil-planning-import — 土木計画学 PDF→MDX変換

## 概要

土木計画学（第Ⅰ編5章＋第Ⅱ編15章、全20章、総計677ページ）のPDFをMDXに変換し、`content/general/civil-planning/` に取り込むスキル。

## 使い方

```
/civil-planning-import              # 進捗確認し、未変換の次の章を変換
/civil-planning-import status       # 変換状況を一覧表示
/civil-planning-import {N}          # 指定章を変換（例: /civil-planning-import Ⅱ-03）
/civil-planning-import verify {N}   # MDXをPDFと照合
/civil-planning-import all          # 未変換を全て一括変換
```

## ソース情報

- **文書名**: 土木計画学（土木学会編）
- **所在**: `_backend/pdf/土木計画学/`
- **構成**: 第Ⅰ編（基礎5章）＋第Ⅱ編（応用15章）、章別PDF
- **総ページ数**: 677ページ
- **PDF形態**: フルページスキャン画像＋テキストレイヤー（テキスト抽出品質良好）

## 文書構成とページ数

| # | 章 | PDF | ページ数 | 出力先 | 状態 |
|---|---|---|---|---|---|
| Ⅰ-01 | 土木計画学とは何か | `Ⅰ-01_土木計画学とは何か.pdf` | 29 | `01-introduction.mdx` | 完了 |
| Ⅰ-02 | 計画論 | `Ⅰ-02_計画論.pdf` | 42 | `02-planning-theory.mdx` | 完了 |
| Ⅰ-03 | 基礎数学 | `Ⅰ-03_基礎数学.pdf` | 49 | `03-mathematics.mdx` | 完了 |
| Ⅰ-04 | 交通学基礎 | `Ⅰ-04_交通学基礎.pdf` | 67 | `04-transportation.mdx` | 完了 |
| Ⅰ-05 | 関連分野 | `Ⅰ-05_関連分野.pdf` | 99 | `05-related-fields.mdx` | 未変換 |
| Ⅱ-01 | 国土・地域・都市計画 | `Ⅱ-01_国土・地域・都市計画.pdf` | 26 | `06-land-planning.mdx` | 未変換 |
| Ⅱ-02 | 環境都市計画 | `Ⅱ-02_環境都市計画.pdf` | 29 | `07-env-urban-planning.mdx` | 未変換 |
| Ⅱ-03 | 河川計画 | `Ⅱ-03_河川計画.pdf` | 19 | `08-river-planning.mdx` | 未変換 |
| Ⅱ-04 | 水資源計画 | `Ⅱ-04_水資源計画.pdf` | 18 | `09-water-resources.mdx` | 未変換 |
| Ⅱ-05 | 防災計画 | `Ⅱ-05_防災計画.pdf` | 35 | `10-disaster-prevention.mdx` | 未変換 |
| Ⅱ-06 | 観光 | `Ⅱ-06_観光.pdf` | 15 | `11-tourism.mdx` | 未変換 |
| Ⅱ-07 | 道路交通管理・安全 | `Ⅱ-07_道路交通管理・安全.pdf` | 29 | `12-road-safety.mdx` | 未変換 |
| Ⅱ-08 | 道路施設計画 | `Ⅱ-08_道路施設計画.pdf` | 26 | `13-road-facilities.mdx` | 未変換 |
| Ⅱ-09 | 公共交通計画 | `Ⅱ-09_公共交通計画.pdf` | 39 | `14-public-transport.mdx` | 未変換 |
| Ⅱ-10 | 空港計画 | `Ⅱ-10_空港計画.pdf` | 22 | `15-airport-planning.mdx` | 未変換 |
| Ⅱ-11 | 港湾計画 | `Ⅱ-11_港湾計画.pdf` | 36 | `16-port-planning.mdx` | 未変換 |
| Ⅱ-12 | まちづくり | `Ⅱ-12_まちづくり.pdf` | 31 | `17-community-dev.mdx` | 未変換 |
| Ⅱ-13 | 景観 | `Ⅱ-13_景観.pdf` | 20 | `18-landscape.mdx` | 未変換 |
| Ⅱ-14 | モビリティマネジメント | `Ⅱ-14_モビリティマネジメント.pdf` | 22 | `19-mobility-mgmt.mdx` | 未変換 |
| Ⅱ-16 | ロジスティクス | `Ⅱ-16_ロジスティクス.pdf` | 24 | `20-logistics.mdx` | 未変換 |

**変換済み: 4/20章（187P）、未変換: 16章（490P）**

## テキスト抽出

### PyMuPDF

```python
import fitz, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

doc = fitz.open('_backend/pdf/土木計画学/{PDFファイル名}')
for i in range(len(doc)):
    text = doc[i].get_text()
    print(f'--- Page {i+1} ---')
    print(text)
```

### テキスト抽出の特徴

- **品質**: 良好（全PDF共通でテキストレイヤーあり）
- **画像**: 各ページに1枚のフルページスキャン画像（背景）
- **ヘッダ・フッタ**: ページ番号と章タイトルが行頭に混入（例: `8.1 道路網計画\n471\n`）→ 除去が必要
- **OCRノイズ**: 軽微な文字化けあり（例: `手I|水` → `利水`、`プロジ、エクト` → `プロジェクト`）
- **数式**: KaTeX 変換が必要な数式あり（特にⅠ-03 基礎数学、Ⅰ-05 関連分野）
- **脚注**: `[^N]` 形式で参照あり、章末に脚注テキストあり

## 変換ルール

### 見出し階層

既存ファイルに準拠:
- 章タイトル → `# N. タイトル`（h1、ファイル先頭のみ）
- 節 → `## N.N タイトル`（h2）
- 項 → `### N.N.N タイトル`（h3）
- 細項 → `#### タイトル`（h4）

### frontmatter

```yaml
---
id: general/civil-planning/{slug}
title: "{章番号}. {タイトル}"
sidebar_label: "{短縮タイトル}"
description: "{120字以内の要約}"
toc_min_heading_level: 2
toc_max_heading_level: 4
---
```

### 表

- Markdownテーブルで変換
- 複雑な表はテキストで最善を尽くす（画像化は図抽出フェーズで対応）

### 図

#### Phase 1（テキスト変換時）
- 図の参照テキスト（「図X.X タイトル」）はそのまま保持
- 画像プレースホルダを挿入:
  ```
  {/* TODO: 図X.X を挿入 */}
  ```

#### Phase 2（図抽出時 — 後工程）
1. PyMuPDFでページ全体を150 DPIでPNG化
2. Read ツールでページ画像を確認し、図の座標を特定
3. PILで図領域を切り抜き
4. `content/general/civil-planning/img/` に保存
5. R2にアップロード: `node scripts/upload-images-to-r2.mjs --prefix general/civil-planning`
6. MDX内のプレースホルダを実画像参照に置換:
   ```html
   <img src="/content/general/civil-planning/img/{ファイル名}" alt="図X.X タイトル" />
   ```

### 数式

- ブロック: `<div className="scroll-equation">$$...$$</div>`
- インライン: `$...$`
- 数式番号: `\tag{(N.N)}`

### 脚注

- `[^N]` 形式で本文中に参照
- 章末に `[^N]: テキスト` で定義

## エージェント戦略

### 分割基準

| ページ数 | 分割 | エージェント数 |
|---|---|---|
| 1-30P | 分割なし | 1 |
| 31-60P | 2分割 | 2 |
| 61-100P | 3分割 | 2-3 |

### 一括変換時のバッチ戦略

16章490Pを効率的に変換するため、以下のバッチで並列実行:

**バッチ1**（小規模5章、計107P）:
- Ⅱ-06 観光（15P）、Ⅱ-04 水資源計画（18P）、Ⅱ-03 河川計画（19P）、Ⅱ-13 景観（20P）、Ⅱ-10 空港計画（22P）→ 5並列

**バッチ2**（中規模6章、計186P）:
- Ⅱ-14 モビリティマネジメント（22P）、Ⅱ-16 ロジスティクス（24P）、Ⅱ-01 国土・地域・都市計画（26P）、Ⅱ-08 道路施設計画（26P）、Ⅱ-02 環境都市計画（29P）、Ⅱ-07 道路交通管理・安全（29P）→ 5-6並列

**バッチ3**（大規模5章、計240P）:
- Ⅱ-12 まちづくり（31P）、Ⅱ-05 防災計画（35P）、Ⅱ-11 港湾計画（36P）、Ⅱ-09 公共交通計画（39P）、Ⅰ-05 関連分野（99P → 3分割）→ 5並列（関連分野は3エージェント）

### エージェントプロンプトテンプレート

```
テキストファイル `/tmp/civil-planning-{slug}.txt` を読んで、
土木計画学 {章タイトル} をMDXに変換してください。

■ 出力先: `content/general/civil-planning/{filename}`

【frontmatter】
---
id: general/civil-planning/{slug}
title: "{章番号}. {タイトル}"
sidebar_label: "{短縮タイトル}"
description: "{要約}"
toc_min_heading_level: 2
toc_max_heading_level: 4
---

【変換ルール】
- 節 → ## N.N タイトル、項 → ### N.N.N タイトル
- 数式: $$...$$ (ブロック)、$...$ (インライン)
- 表: Markdownテーブル
- 図: プレースホルダ {/* TODO: 図X.X を挿入 */}
- 脚注: [^N] 形式
- ページヘッダ・フッタ・ページ番号を除去
- OCRノイズを修正
```

## 出力先

```
content/general/civil-planning/
├── 01-introduction.mdx          # Ⅰ-01 ✅完了
├── 02-planning-theory.mdx       # Ⅰ-02 ✅完了
├── 03-mathematics.mdx           # Ⅰ-03 ✅完了
├── 04-transportation.mdx        # Ⅰ-04 ✅完了
├── 05-related-fields.mdx        # Ⅰ-05
├── 06-land-planning.mdx         # Ⅱ-01
├── 07-env-urban-planning.mdx    # Ⅱ-02
├── 08-river-planning.mdx        # Ⅱ-03
├── 09-water-resources.mdx       # Ⅱ-04
├── 10-disaster-prevention.mdx   # Ⅱ-05
├── 11-tourism.mdx               # Ⅱ-06
├── 12-road-safety.mdx           # Ⅱ-07
├── 13-road-facilities.mdx       # Ⅱ-08
├── 14-public-transport.mdx      # Ⅱ-09
├── 15-airport-planning.mdx      # Ⅱ-10
├── 16-port-planning.mdx         # Ⅱ-11
├── 17-community-dev.mdx         # Ⅱ-12
├── 18-landscape.mdx             # Ⅱ-13
├── 19-mobility-mgmt.mdx         # Ⅱ-14
├── 20-logistics.mdx             # Ⅱ-16
└── img/                         # 図（R2配信、gitignore対象）
```

## サイドバー登録

`src/lib/sidebar.ts` の `generalSidebar` 内、既存の土木計画学カテゴリを拡張:

```typescript
{
  type: 'category',
  label: '土木計画学',
  items: [
    'general/civil-planning/01-introduction',
    'general/civil-planning/02-planning-theory',
    'general/civil-planning/03-mathematics',
    'general/civil-planning/04-transportation',
    'general/civil-planning/05-related-fields',
    {
      type: 'category',
      label: '第Ⅱ編 応用',
      items: [
        'general/civil-planning/06-land-planning',
        'general/civil-planning/07-env-urban-planning',
        'general/civil-planning/08-river-planning',
        'general/civil-planning/09-water-resources',
        'general/civil-planning/10-disaster-prevention',
        'general/civil-planning/11-tourism',
        'general/civil-planning/12-road-safety',
        'general/civil-planning/13-road-facilities',
        'general/civil-planning/14-public-transport',
        'general/civil-planning/15-airport-planning',
        'general/civil-planning/16-port-planning',
        'general/civil-planning/17-community-dev',
        'general/civil-planning/18-landscape',
        'general/civil-planning/19-mobility-mgmt',
        'general/civil-planning/20-logistics',
      ],
    },
  ],
},
```

## ワークフロー

### 推奨変換順序

1. バッチ1（小規模5章）→ ビルド確認
2. バッチ2（中規模6章）→ ビルド確認
3. バッチ3（大規模5章）→ ビルド確認
4. 図抽出（Phase 2）→ R2アップロード
5. サイドバー登録 → 最終ビルド

### 各章の変換手順

1. PyMuPDFでテキスト抽出 → `/tmp/civil-planning-{slug}.txt`
2. サブエージェントに委任（テキストファイル + 変換ルール）
3. 生成されたMDXをビルド確認
4. 図のプレースホルダを確認（Phase 2で対応）

## 進捗管理

| ステータス | 意味 |
|---|---|
| 未変換 | まだ取りかかっていない |
| テキスト完了 | MDX変換済み、図はプレースホルダ |
| 図抽出済 | 図もR2にアップロード済み |
| QA中 | 原本と照合中 |
| 完了 | 変換・検証完了 |

## 参照

- `.claude/skills/content/pdf-to-mdx/SKILL.md` — 汎用PDF→MDX変換ルール
- `.claude/skills/content/qa-pdf-mdx/SKILL.md` — QA検証スキル
- `.claude/skills/content/check-mdx/SKILL.md` — MDX構文チェック
