# exam-questions-import テンプレート: civil-primary-2（2級土木施工管理 第1次検定）

> **品質ゲート（必読、2026-05-28 大規模ハルシネーション事故の教訓）**
> 一次（選択式）PDF は画像ベースで OCR が不安定なため、生成時に**問題文・選択肢を捏造（ハルシネーション）しやすい**。R03-R07 全15本の初稿で約240箇所の相違（問題文取り違え・設問極性逆転・選択肢の意味反転）が発生した。
> **正解番号の正答PDF一致だけで合格としてはならない。** content-qa の構造採点や verify-pdf-mdx の網羅率チェックでも検出できない。**生成後に SKILL.md「Step 5.7 原典視覚突合」を全問必ず実施**（PDF を 250dpi 画像化して問題文・選択肢・設問極性を1問ずつ照合）。詳細は memory `feedback_exam_pdf_cross_reference`。

## ソース情報

- **試験**: 2級土木施工管理技術検定 第1次検定
- **PDF 配置**: `docs/textbook/２級土木施工管理技士/過去問/R{YY}/`
- **収録年度**: 令和3年度〜令和7年度（5 年分、各年度 前期/後期 2 回開催）
- **特徴**: 1級と異なり、年度ごとに **別ファイル**（page_ranges 表は不要、PDF 1 つ = 1 MDX）

## 年度別 PDF パス表

`expected_figures` 列は import 後の `verify-pdf-mdx.mjs --expected-figures` ガードで利用。

| 年度 | サブ | PDF パス | 出力ファイル | 問題数 | OCR 品質 | expected_figures |
|---|---|---|---|---|---|---|
| r03 | zenki | `docs/textbook/２級土木施工管理技士/過去問/R03/R03_第一次検定_前期.pdf` | `primary-r03-zenki/article.mdx` | 61 | 良好 | 5 |
| r03 | kouki | `docs/textbook/２級土木施工管理技士/過去問/R03/R03_第一次検定_後期.pdf` | `primary-r03-kouki/article.mdx` | 61 | 良好 | 5 |
| r04 | zenki | `docs/textbook/２級土木施工管理技士/過去問/R04/R04_第一次検定_前期.pdf` | `primary-r04-zenki/article.mdx` | 61 | 良好 | 5 |
| r04 | kouki | `docs/textbook/２級土木施工管理技士/過去問/R04/R04_第一次検定_後期.pdf` | `primary-r04-kouki/article.mdx` | 61 | 良好 | 5 |
| r05 | zenki | `docs/textbook/２級土木施工管理技士/過去問/R05/R05_第一次検定_前期.pdf` | `primary-r05-zenki/article.mdx` | 61 | 良好 | 5 |
| r05 | kouki | `docs/textbook/２級土木施工管理技士/過去問/R05/R05_第一次検定_後期.pdf` | `primary-r05-kouki/article.mdx` | 61 | 良好 | 5 |
| r06 | zenki | `docs/textbook/２級土木施工管理技士/過去問/R06/R06_第一次検定_前期.pdf` | `primary-r06-zenki/article.mdx` | 61 | 良好 | 5 |
| r06 | kouki | `docs/textbook/２級土木施工管理技士/過去問/R06/R06_第一次検定_後期.pdf` | `primary-r06-kouki/article.mdx` | 61 | 良好 | 5 |
| r07 | zenki | `docs/textbook/２級土木施工管理技士/過去問/R07/R07_第一次検定_前期.pdf` | `primary-r07-zenki/article.mdx` | 61 | 良好 | 5 |
| r07 | kouki | `docs/textbook/２級土木施工管理技士/過去問/R07/R07_第一次検定_後期.pdf` | `primary-r07-kouki/article.mdx` | 61 | 良好 | 5 |

**正答 PDF**: 別ファイルで併存（`R{YY}_第一次検定_{zenki|kouki}_正答.pdf`）。import 時に解答抽出に併用、独立 MDX は作らない（解説内に統合）。

**注**: `expected_figures` の値は暫定値。実際の年度 import 時に PDF を視覚確認して正確な数に調整する。問題数は前期/後期ともに 61 問が標準（暫定、最終的に PDF で確認）。

## 出力先（Convention B、実態に合わせる）

```
.local/r2/posts/civil-construction-2/primary-{year}-{sub}/article.mdx
```

例: `.local/r2/posts/civil-construction-2/primary-r07-zenki/article.mdx`

`{sub}` は `zenki`（前期）または `kouki`（後期）。

## frontmatter スキーマ

```yaml
---
title: "令和7年度 第1次検定 前期"
seoTitle: "令和7年度 第1次検定 前期 | 2級土木施工管理技士 | doboku-note"
description: "2級土木施工管理技士 令和7年度第1次検定（前期）の全問と解説。土木一般・専門土木・法規・施工管理を網羅。"
category: "civil-construction-2"
group: "primary"
tags: ["primary", "past-questions"]
exam: "civil-construction-2"
examType: "primary"
year: "r07"
sub: "zenki"                       # zenki | kouki
questionCount: 61
published: true
publishedAt: "YYYY-MM-DD"
toc_min_heading_level: 2
toc_max_heading_level: 2
---
```

## MDX 構造

1級と同じ構造を採用（共通フォーマット維持）。

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

## 分野タグ（2級 第1次検定）

2級は前期・後期で出題構成が異なる。

### 前期（6月実施）

| No. | 分野 | 出題数 |
|---|---|---|
| 1-11 | 土木一般 | 11問 |
| 12-26 | 専門土木 | 15問 |
| 27-30 | 法規 | 4問 |
| 31-41 | 共通工学・施工管理法 | 11問 |

### 後期（10月実施、第1次検定の主目標）

| No. | 分野 | 出題数 |
|---|---|---|
| 1-11 | 土木一般 | 11問 |
| 12-31 | 専門土木 | 20問 |
| 32-42 | 法規 | 11問 |
| 43-61 | 共通工学・施工管理法 | 19問 |

**注**: 分野配分は暫定（実 PDF 取込時に最終確定）。問題数の合計は標準で 61 問だが、年度により多少の変動あり。

## OCR 不良年度の変換手順

```bash
# 1. PDF ページを画像化（150dpi）
pdftoppm -png -r 150 -f {開始P} -l {終了P} '{PDFパス}' /tmp/exam-2k-p

# 2. Read ツールで画像を読み取って変換
```

## サブエージェント活用

年度別並列処理:
- 1 エージェント = 1 年度の前期 or 後期
- 最大 3 並列で処理
- 年度間は独立、衝突なし

## 品質検証

変換後に以下を実行:
```bash
/check-mdx {path} --rules syntax
/check-mdx {path} --rules explanations   # 破損解説検出
```

## add-answers モード

既存 MDX の未解答設問に解答・解説を追加:
1. 正答 PDF（`R{YY}_第一次検定_{zenki|kouki}_正答.pdf`）を確認
2. 選択肢解説に `❌` / `✅` バッジを付与
3. `**正解: (X)**` を記入
4. `<RelatedKeywords>` を追加（過去問⇔キーワード紐付け、2級独自キーワードは将来対応）

## 1級との差分

| 観点 | 1級 (civil-primary) | 2級 (civil-primary-2) |
|---|---|---|
| 試験回数 | 年1回（7月） | 年2回（前期6月・後期10月） |
| 問題区分 | 問題A（午前61問）+ 問題B（午後35問） | 前期 41問程度・後期 61問の単一構成 |
| サブ識別子 | `a` / `b` | `zenki` / `kouki` |
| 専門深度 | 高（応用判断） | 基礎（用語・基本原理） |
| 経験記述 | 第2次で必須 | 第2次で必須（採点基準が緩い） |

## 参照

- `docs/textbook/２級土木施工管理技士/過去問/` — ソース PDF ディレクトリ
- `.claude/knowledge/reference/content-authoring.md` — 過去問 MDX の構造ルール
- `.claude/skills/conversion/exam-questions-import/templates/civil-primary.md` — 1級テンプレ（共通フォーマットの真実源）
