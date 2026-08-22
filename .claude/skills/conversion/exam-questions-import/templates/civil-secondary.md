# exam-questions-import テンプレート: civil-secondary（1級土木施工管理 第2次検定）

## ソース情報

- **文書名**: 1級土木施工管理第2次試験問題集
- **PDF パス**: `.claude/pdfs/１級土木施工管理技士/１級土木施工管理第２次試験問題集.pdf`（324 ページ / 書籍 316 ページ）
- **ページオフセット**: PDF page = 書籍page + 8
- **重要**: 完全画像ベース（テキスト層なし）、**全ページ上下逆向き（180°回転）**

## 章構成

| 章 | タイトル | 書籍P | PDFP | ページ数 |
|---|---|---|---|---|
| 第1章 | 施工経験記述 | 8-53 | 16-61 | 46 |
| 第2章 | 土工 | 54-137 | 62-145 | 84 |
| 第3章 | コンクリート工 | 138-215 | 146-223 | 78 |
| 第4章 | 施工計画 | 216-267 | 224-275 | 52 |
| 第5章 | 品質管理 | 268-316 | 276-324 | 49 |

## 出力先

```
content/site/civil-construction-1/secondary/{slug}.mdx
```

章単位または年度単位で分割（章単位推奨、本文量が多いため）。

## 画像変換ワークフロー（必須）

**全ページ 180°回転済みのため**:

```bash
# 1. PDF ページを画像化
pdftoppm -png -r 150 -f {PDFページ} -l {PDFページ} '{PDFパス}' /tmp/exam2-p

# 2. 180°回転
python3 -c "
from PIL import Image
img = Image.open('/tmp/exam2-p-{ページ番号}.png')
img.rotate(180).save('/tmp/exam2-p-{ページ番号}-rot.png')
"

# 3. Read ツールで回転済み画像を読み取って変換
```

一度に 3-6 ページを画像化→回転→読み取り→変換のサイクル。

## frontmatter スキーマ

```yaml
---
title: "1級土木 第2次 {章タイトル}"
seoTitle: "1級土木 第2次 {章タイトル} | doboku-note"
description: "1級土木施工管理技士 第2次検定（記述式） {章タイトル}の過去問と模範解答・解説。"
category: "civil-construction-1"
group: "secondary"
tags: ["secondary", "past-questions"]
exam: "civil-construction-1"
examType: "secondary"
year: "r07"                        # 複数年度まとめる場合は主要年度
chapter: "earthwork"               # experience-writing | earthwork | concrete | construction-plan | quality-management
published: true
publishedAt: "YYYY-MM-DD"
---
```

## MDX 構造（記述式問題）

```mdx
## 出題傾向

{出題パターンの分析表（1-2 セクション）}

## 過去問と解説

### 令和{N}年度 問題{N}

{問題文}

<details>
<summary>解答例・解説</summary>

**模範解答例（{文字数}字以内）**:

{模範解答例テキスト}

**解説**:

{解説テキスト}

**採点のポイント**:
- {ポイント1}
- {ポイント2}

</details>

## 基礎解説

{分野の基礎知識まとめ}
```

## エージェント戦略

画像の前処理はメインプロセス、回転済み画像のパスをエージェントに渡す:

1. **メイン**: pdftoppm で画像化 → Python PIL で 180°回転 → /tmp/ に保存
2. **エージェント**: Read ツールで回転済み画像を読み取り → MDX に変換 → /tmp/ に出力
3. **メイン**: 出力ファイルを配置 → ビルド検証

## 品質検証

```bash
/check-mdx {path} --rules syntax
/check-mdx {path} --rules frontmatter
```

## 参照

- `.claude/pdfs/１級土木施工管理技士/` — ソース PDF ディレクトリ
- `.claude/knowledge/reference/content-authoring.md` — MDX 構造ルール
