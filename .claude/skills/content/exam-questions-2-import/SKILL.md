---
name: exam-questions-2-import
description: >
  第2次試験問題集PDFをMDX変換してインポートする。Use when user asks to [第2次問題集インポート, /exam-questions-2-import].
---

# /exam-questions-2-import — 1級土木施工管理第2次試験問題集 PDF→MDX変換

## 概要

「1級土木施工管理第2次試験問題集」（316ページ）のPDFをMDXに変換し、`content/general/exam-questions-2/` に取り込むスキル。第2次検定（記述式）の過去問題と解説・基礎解説を構造化する。

## 使い方

```
/exam-questions-2-import              # 進捗確認し、未変換の次の章を変換
/exam-questions-2-import status       # 変換状況を一覧表示
/exam-questions-2-import ch2          # 第2章 土工 を変換
/exam-questions-2-import verify ch2   # 第2章のMDXをPDFと照合
```

## ソース情報

- **文書名**: 1級土木施工管理第2次試験問題集
- **PDF**: `/Users/minamidaisuke/obsidian/attachments/奥義/01_土木共通/03_積算・施工/90_1級土木施工管理技士試験/１級土木施工管理第２次試験問題集/１級土木施工管理第２次試験問題集.pdf`
- **総ページ数**: 324ページ（PDF）/ 316ページ（書籍）
- **構成**: I編（概要7P）+ II編（5章309P）
- **ページオフセット**: PDF page = 書籍page + 8

## OCR品質の注意

**このPDFは完全画像ベース（テキスト層なし）かつ全ページ上下逆向き（180°回転）。**

PyMuPDFのテキスト抽出は不可。全ページをpdftoppmで画像化し、Pythonで180°回転してからRead toolで読み取る必要がある。

### 画像変換手順

```bash
# 1. PDFページを画像化
pdftoppm -png -r 150 -f {PDFページ} -l {PDFページ} '{PDFパス}' /tmp/exam2-p

# 2. 180°回転
python3 -c "
from PIL import Image
img = Image.open('/tmp/exam2-p-{ページ番号}.png')
img.rotate(180).save('/tmp/exam2-p-{ページ番号}-rot.png')
"

# 3. Read toolで読み取り
```

一度に3〜6ページを画像化→回転→読み取り→変換のサイクルで処理する。

## 文書構成と変換状況

| # | 章 | タイトル | 書籍P | PDFP | ページ数 | ファイル数 | 行数 | 状態 |
|---|---|---|---|---|---|---|---|---|
| — | I編 | 第二次検定の概要 | 1-7 | 9-15 | 7 | — | — | スキップ |
| 1 | 第1章 | 施工経験記述 | 8-53 | 16-61 | 46 | 2 | 1,097 | **完了** |
| 2 | 第2章 | 土工 | 54-137 | 62-145 | 84 | 2 | 1,699 | **完了** |
| 3 | 第3章 | コンクリート工 | 138-215 | 146-223 | 78 | 2 | 1,778 | **完了** |
| 4 | 第4章 | 施工計画 | 216-267 | 224-275 | 52 | 2 | 1,216 | **完了** |
| 5 | 第5章 | 品質管理 | 268-316 | 276-324 | 49 | 2 | 1,296 | **完了** |

**合計**: 309P、10ファイル、7,086行（全章変換完了）

**注**: 目次には第6章（安全管理）・第7章（環境保全）・付録があるが、PDFには第5章途中（P.316）までしか収録されていない。

## 各章の構造

各章は3部構成:

1. **出題傾向** — 出題パターンの分析表（1-2P）
2. **過去の問題と解説** — 年度別の過去問と模範解答・解説
3. **基礎解説** — 分野の基礎知識のまとめ

### 第2次検定の問題形式

第1次検定（4択）とは異なり、**記述式**:
- 問題1: 施工経験記述（必須）
- 問題2-9: 各分野の記述問題（選択）

各問題は「問題文 → 模範解答例 → 解説」の構成。

## 変換ルール

### frontmatter

```yaml
---
id: {slug}
title: {タイトル}
sidebar_label: {短縮ラベル}
description: "{要約240-310文字}。1級土木施工管理技士 第2次検定対応。"
toc_min_heading_level: 2
toc_max_heading_level: 5
---
```

### 問題のMDX構造

```mdx
### {年度} {問題番号}

{問題文}

<details>
<summary>解答例・解説</summary>

{模範解答例}

{解説テキスト}

</details>
```

### 見出し・表・図

- 見出し: `##` 章タイトル, `###` 節, `####` 項目
- 表: 標準Markdownテーブル
- 図: `{/* 図 タイトル */}` JSXコメント
- 数式: `$$...$$` / `$...$`

## エージェント戦略

### 基本: 1節 = 1エージェント

各章の「過去の問題と解説」と「基礎解説」を別エージェントで処理。

### 画像変換の前処理

エージェントにはBash権限がないため、**画像の前処理（pdftoppm + 回転）はメインプロセスで行い、回転済み画像のパスをエージェントに渡す**。

### ワークフロー

1. メイン: pdftoppmで画像化 → Python PILで180°回転 → /tmp/に保存
2. エージェント: Read toolで回転済み画像を読み取り → MDXに変換 → /tmp/に出力
3. メイン: 出力ファイルを配置 → ビルド検証

## 出力先

```
content/general/exam-questions-2/
├── experience-writing/       # 第1章 施工経験記述
│   ├── trends.mdx           # 出題傾向
│   ├── past-problems.mdx    # 過去の問題と解説
│   └── basics.mdx           # 基礎解説
├── earthwork/                # 第2章 土工
│   ├── trends.mdx
│   ├── past-problems.mdx
│   └── basics.mdx
├── concrete/                 # 第3章 コンクリート工
├── construction-plan/        # 第4章 施工計画
└── quality-management/       # 第5章 品質管理
```

## サイドバー登録

`src/lib/sidebar.ts` の `generalSidebar` に追加（第1次試験問題集の後）:

```typescript
{
  type: 'category',
  label: '1級土木施工管理 第2次試験問題集',
  link: {
    type: 'generated-index',
    title: '1級土木施工管理 第2次試験問題集',
    slug: 'exam-questions-2',
  },
  items: [
    // 章ごとのカテゴリ
  ],
},
```

## 推奨変換順序

1. **第4章 施工計画**（52P、最も小さい章の一つ）
2. **第5章 品質管理**（49P）
3. **第1章 施工経験記述**（46P）
4. **第2章 土工**（84P）
5. **第3章 コンクリート工**（78P）

## 進捗管理

| ステータス | 意味 |
|---|---|
| 未変換 | まだ取りかかっていない |
| 変換中 | MDX変換作業中 |
| QA中 | 原本と照合中 |
| 完了 | 変換・検証完了 |

## 参照

- `.claude/skills/content/exam-questions-import/SKILL.md` — 第1次試験問題集スキル
- `.claude/skills/content/civil-general-import/SKILL.md` — テキスト変換スキル
- `.claude/skills/content/pdf-to-mdx/SKILL.md` — 汎用PDF→MDX変換ルール
- `.claude/skills/quality/check-mdx/SKILL.md` — MDX 検査統合スキル（`--rules syntax` で構文チェック）
