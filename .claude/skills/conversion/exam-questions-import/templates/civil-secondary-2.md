# exam-questions-import テンプレート: civil-secondary-2（2級土木施工管理 第2次検定）

> **品質ゲート（2026-05-28 の教訓）**
> 二次（記述式）は一次より OCR 影響が小さく設問本体の相違は少ない（R04二次は相違0）が、**穴埋め語句・選択語句群・工種名の転記誤り**は発生する（R07二次で語句群「鉛直/地耐力」誤り等5問）。生成後に SKILL.md「Step 5.7 原典視覚突合」で設問文・語句群を照合すること。経験記述の解答例は著者独自表現（CECC 逐語転載禁止）。

## ソース情報

- **試験**: 2級土木施工管理技術検定 第2次検定（記述式）
- **PDF 配置**: `content/sources/textbook/２級土木施工管理技士/過去問/R{YY}/R{YY}_第二次検定.pdf`
- **収録年度**: 令和3年度〜令和7年度（5 年分、年1回後期のみ実施）
- **特徴**: 年度ごとに **別ファイル**、1級と異なり PDF はテキスト層あり（OCR 良好）

## 年度別 PDF パス表

| 年度 | PDF パス | 出力ファイル | 問題数 | OCR 品質 |
|---|---|---|---|---|
| r03 | `content/sources/textbook/２級土木施工管理技士/過去問/R03/R03_第二次検定.pdf` | `secondary-r03/article.mdx` | 9 | 良好 |
| r04 | `content/sources/textbook/２級土木施工管理技士/過去問/R04/R04_第二次検定.pdf` | `secondary-r04/article.mdx` | 9 | 良好 |
| r05 | `content/sources/textbook/２級土木施工管理技士/過去問/R05/R05_第二次検定.pdf` | `secondary-r05/article.mdx` | 9 | 良好 |
| r06 | `content/sources/textbook/２級土木施工管理技士/過去問/R06/R06_第二次検定.pdf` | `secondary-r06/article.mdx` | 9 | 良好 |
| r07 | `content/sources/textbook/２級土木施工管理技士/過去問/R07/R07_第二次検定.pdf` | `secondary-r07/article.mdx` | 9 | 良好 |

**注**: 問題数は標準で 9 問（必須＋選択、うち経験記述 1 題が最重要）。年度により変動あり。

## 出力先（Convention B）

```
content/site/civil-construction-2/secondary-{year}/article.mdx
```

例: `content/site/civil-construction-2/secondary-r07/article.mdx`

## frontmatter スキーマ

```yaml
---
title: "令和7年度 第2次検定"
seoTitle: "令和7年度 第2次検定 | 2級土木施工管理技士 | doboku-note"
description: "2級土木施工管理技士 令和7年度第2次検定（記述式）の全問と模範解答・解説。経験記述・土工・コンクリート工・品質管理を網羅。"
category: "civil-construction-2"
group: "secondary"
tags: ["secondary", "past-questions"]
exam: "civil-construction-2"
examType: "secondary"
year: "r07"
published: true
publishedAt: "YYYY-MM-DD"
toc_min_heading_level: 2
toc_max_heading_level: 2
---
```

## MDX 構造（記述式問題）

```mdx
## 出題傾向

{出題パターンの分析表（経験記述テーマ・必須/選択の構成）}

## 必須問題

### 問題 1（経験記述）

{問題文：「あなたが経験した工事について、〇〇に関し、現場で実施した品質管理を 5要素（現場状況／課題／検討／処置／評価）で具体的に記述しなさい」}

<details>
<summary>解答・ポイント</summary>

### ポイント

経験記述は 5 要素（現場状況→課題→検討→処置→評価）を全て押さえる。2級は1級より採点基準が緩いが、論点の漏れは大幅減点。

### 解答例

【現場状況】XX 工事において...

【課題】土工施工中に...

【検討】品質確保のため、施工管理として以下を検討した:
- ...

【処置】具体的には...

【評価】結果として...

<ExamPoint
  summary="2級経験記述は主任技術者視点・5要素を一貫して記述"
  items={[
    "現場状況→課題→検討→処置→評価の5要素を抜けなく",
    "数値（土量・配合・工期等）を具体的に書く",
    "主任技術者として講じた処置を主語で書く"
  ]}
/>

</details>

### 問題 2（土工・コンクリート工・品質管理 等）

{問題文}

<details>
<summary>解答例・解説</summary>

**解答例**:

{解答テキスト}

**解説**:

{なぜそうなるかの理屈、関連法令、技術基準}

</details>

## 選択問題（5問中4問を選択）

### 問題 3-9

{各問題と解答}
```

## 1級との差分

| 観点 | 1級 (civil-secondary) | 2級 (civil-secondary-2) |
|---|---|---|
| 経験記述 採点基準 | 厳格（実務経験10年相当を期待） | 緩い（主任技術者レベル、新人〜数年目目線） |
| 立場 | 監理技術者・施工管理者 | 主任技術者・作業班長 |
| 必須問題 | 1問（経験記述） | 1問（経験記述） |
| 選択問題 | 5問中4問選択 | 5問中4問選択 |
| PDF 品質 | 完全画像ベース・180°回転 | テキスト層あり・正立 |
| 重要度 | 極高（合格率の主要ハードル） | 高（合格率の主要ハードル、ただし採点基準が緩い） |

## 画像変換ワークフロー（必要時のみ）

1級と異なり 2級 PDF はテキスト層あり・正立のため、通常は PyMuPDF テキスト抽出で足りる。図版がある場合のみ:

```bash
pdftoppm -png -r 150 -f {開始P} -l {終了P} '{PDFパス}' /tmp/exam-2-2k-p
```

## エージェント戦略

年度別並列処理:
- 1 エージェント = 1 年度
- 5 年度同時並列も可能（PDF 独立）

ただし経験記述の解答例執筆は著作権配慮で著者独自表現が必須。`civil-secondary-exam-writer` エージェントのルールを Generator 段階で適用する。

## 品質検証

```bash
/check-mdx {path} --rules syntax
/check-mdx {path} --rules frontmatter
```

## 参照

- `content/sources/textbook/２級土木施工管理技士/過去問/` — ソース PDF ディレクトリ
- `.claude/knowledge/reference/content-authoring.md` — MDX 構造ルール
- `.claude/skills/conversion/exam-questions-import/templates/civil-secondary.md` — 1級テンプレ（共通フォーマットの真実源）
- `.claude/agents/civil-secondary-exam-writer.md` — 経験記述解答補完の真実源
