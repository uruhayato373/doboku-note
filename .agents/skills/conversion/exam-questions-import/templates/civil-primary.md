# exam-questions-import テンプレート: civil-primary（1級土木施工管理 第1次検定）

## ソース情報

- **文書名**: 1級土木施工管理第1次試験問題集
- **PDF パス**: `.claude/pdfs/１級土木施工管理技士/１級土木施工管理第１次試験問題集.pdf`（316 ページ前後）
- **収録年度**: 令和2年度〜平成26年度
- **構成**: 前付 18P + 7 年度 ×（問題A + 問題B）

## ページ範囲表

`expected_figures` 列は import 後の verify-pdf-mdx.mjs `--expected-figures` ガード（Phase 4、Issue #128）で利用。図版数の自動チェックに使う。

| 年度 | サブ | PDF 開始P | 推定P数 | 出力ファイル | 問題数 | OCR 品質 | expected_figures |
|---|---|---|---|---|---|---|---|
| r02 | a | 21 | 54 | `r02-a.mdx` | 59 | 良好 | 8 |
| r02 | b | 75 | 32 | `r02-b.mdx` | 35 | 良好 | 4 |
| r01 | a | 107 | 51 | `r01-a.mdx` | 61 | 良好 | 8 |
| r01 | b | 158 | 31 | `r01-b.mdx` | 35 | 良好 | 4 |
| h30 | a | 189 | 49 | `h30-a.mdx` | 61 | 概ね良好 | 8 |
| h30 | b | 240 | 29 | `h30-b.mdx` | 35 | 概ね良好 | 4 |
| h29 | a | 271 | 51 | `h29-a.mdx` | 61 | やや不良 | 8 |
| h29 | b | 324 | 33 | `h29-b.mdx` | 35 | やや不良 | 4 |
| h28 | a | 359 | 53 | `h28-a.mdx` | 54 | 不良 | 8 |
| h28 | b | 414 | 31 | `h28-b.mdx` | 35 | 不良 | 4 |
| h27 | a | 447 | 45 | `h27-a.mdx` | 62 | 不良 | 8 |
| h27 | b | 494 | 29 | `h27-b.mdx` | 35 | 不良 | 4 |
| h26 | a | 525 | 48 | `h26-a.mdx` | 53 | 不良 | 8 |
| h26 | b | 575 | 41 | `h26-b.mdx` | 35 | 不良 | 4 |

**OCR 不良（H29 以前）**: PyMuPDF テキスト抽出だけでは不十分。PDF ページを 150dpi で画像化して Read ツールで内容確認しながら変換する。

**注**: `expected_figures` の値は暫定値。実際の年度 import 時に PDF を視覚確認して正確な数に調整する。

## 出力先

```
.local/r2/posts/civil-construction-1/primary/{year}-{sub}.mdx
```

例: `.local/r2/posts/civil-construction-1/primary/r07-a.mdx`

## frontmatter スキーマ

```yaml
---
title: "令和7年度 第1次検定 問題A"
seoTitle: "令和7年度 第1次検定 問題A | 1級土木施工管理技士 | doboku-note"
description: "1級土木施工管理技士 令和7年度第1次検定 問題Aの全問と解説。土木一般・専門土木・法規を網羅。"
category: "civil-construction-1"
group: "primary"
tags: ["primary", "past-questions"]
exam: "civil-construction-1"
examType: "primary"
year: "r07"
sub: "a"                           # a | b
questionCount: 61
published: true
publishedAt: "YYYY-MM-DD"
toc_min_heading_level: 2
toc_max_heading_level: 2
---
```

## MDX 構造

```mdx
## 問題 No.{N} {分野タグ}

{問題文}

**(1)** 選択肢1

**(2)** 選択肢2

**(3)** 選択肢3

**(4)** 選択肢4

<details>
<summary>解答・解説</summary>

**正解: ({X})**

(1) 選択肢1の解説 {❌|✅}

(2) 選択肢2の解説 {❌|✅}

(3) 選択肢3の解説 {❌|✅}

(4) 選択肢4の解説 {❌|✅}

<RelatedKeywords items={[
  { label: "キーワード名", slug: "keyword-slug" },
]} />

</details>
```

## 分野タグ（問題A）

| No. | 分野 |
|---|---|
| 1-15 | 土木一般 |
| 16-49 | 専門土木 |
| 50-61 | 法規 |

問題B: 施工管理（施工計画・工程管理・安全管理・品質管理・環境保全）

## OCR 不良年度の変換手順

```bash
# 1. PDF ページを画像化（150dpi）
pdftoppm -png -r 150 -f {開始P} -l {終了P} '{PDFパス}' /tmp/exam-p

# 2. Read ツールで画像を読み取って変換
```

## サブエージェント活用

大規模な年度変換では Agent tool で並列サブエージェント起動:
- 1 エージェント = 1 年度の問題A または 問題B
- 最大 3 並列で処理

## 品質検証

変換後に以下を実行:
```bash
/check-mdx {path} --rules syntax
/check-mdx {path} --rules explanations   # 破損解説検出
```

## add-answers モード

既存 MDX の未解答設問に解答・解説を追加:
1. 正答 PDF を確認
2. 選択肢解説に `❌` / `✅` バッジを付与
3. `**正解: (X)**` を記入
4. `<RelatedKeywords>` を追加（過去問⇔キーワード紐付け）

## 参照

- `.claude/pdfs/１級土木施工管理技士/` — ソース PDF ディレクトリ
- `.claude/knowledge/reference/content-authoring.md` — 過去問 MDX の構造ルール
