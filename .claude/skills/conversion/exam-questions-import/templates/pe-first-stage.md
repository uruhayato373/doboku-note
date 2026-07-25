# exam-questions-import テンプレート: pe-first-stage（技術士 第一次試験）

## ソース情報

- **試験**: 技術士第一次試験（全部門共通の基礎科目・適性科目 ＋ 建設部門の専門科目）
- **形式**: 5 択選択式
- **科目構成（`--sub`）**:
  | `--sub` | 科目 | 問題記号 | 出題数 | 解答数 |
  |---|---|---|---|---|
  | `basic` | 基礎科目 | `Ⅰ-{群}-{n}` | 30 問（1〜5群 × 各6問） | 15 問選択 |
  | `aptitude` | 適性科目 | `Ⅱ-{n}` | 15 問 | 15 問 |
  | `construction` | 専門科目（建設部門） | `Ⅲ-{n}` | 35 問 | 25 問選択 |
- **収録年度**: 令和5〜令和7（初回パイロット）
- **PDF パス**: `docs/textbook/技術士第一次試験/{R##}-{基礎|適性|建設}.pdf`
- **正答 PDF**: `docs/textbook/技術士第一次試験/{R##}-正答.pdf`（年度1ファイル、全科目の正答番号表。テキスト抽出可）

## 基礎科目の群構成（参考）

| 群 | テーマ | 問題記号 |
|---|---|---|
| 1群 | 設計・計画に関するもの | Ⅰ-1-1〜Ⅰ-1-6 |
| 2群 | 情報・論理に関するもの | Ⅰ-2-1〜Ⅰ-2-6 |
| 3群 | 解析に関するもの | Ⅰ-3-1〜Ⅰ-3-6 |
| 4群 | 材料・化学・バイオに関するもの | Ⅰ-4-1〜Ⅰ-4-6 |
| 5群 | 環境・エネルギー・技術に関するもの | Ⅰ-5-1〜Ⅰ-5-6 |

## 出力先

```
.local/r2/posts/pe-first-stage/{year}-{subject}/article.mdx
```

subject = `basic` / `aptitude` / `construction`
例: `.local/r2/posts/pe-first-stage/r07-basic/article.mdx`

## frontmatter スキーマ

```yaml
---
title: "令和7年度 技術士第一次試験 基礎科目"
shortTitle: "令和7年度 基礎科目"
category: "pe-first-stage"
group: "primary"
tags:
  - 技術士（第一次試験）
  - 基礎科目
  - 令和7年度
source_pdf: "https://www.engineer.or.jp/c_topics/011/attached/attach_11457_1.pdf"
description: "技術士第一次試験 令和7年度 基礎科目の全30問と解答解説。設計・計画／情報・論理／解析／材料・化学・バイオ／環境・エネルギーの5群を全問収録。"
published: true
publishedAt: "YYYY-MM-DD"
seoTitle: "令和7年度 技術士第一次試験 基礎科目 過去問解説 | doboku-note"
toc_min_heading_level: 2
toc_max_heading_level: 2
---
```

- `seoTitle` / `description` は科目・年度で差し替える。
- `source_pdf` は engineer.or.jp の当該 PDF 直リンク。

## MDX 構造

```mdx
{冒頭に解答方法の注記（PDF 冒頭の指示文を簡潔に）}

## Ⅰ-1-1

{問題文}

1. 選択肢1

2. 選択肢2

3. 選択肢3

4. 選択肢4

5. 選択肢5

<details>
<summary>解答・解説</summary>

**正答：{X}**

1. {選択肢1の解説} {❌|✅}
2. {選択肢2の解説} {❌|✅}
3. {選択肢3の解説} {❌|✅}
4. {選択肢4の解説} {❌|✅}
5. {選択肢5の解説} {❌|✅}

<ExamPoint
  summary="論点の本質"
  items={[
    "覚えるべきポイント1",
    "覚えるべきポイント2",
  ]}
/>

</details>
```

- 基礎科目は群見出し（`## 1群 設計・計画に関するもの` 等）を H2 で挟まず、設問 H2（`## Ⅰ-1-1`）のみで TOC を構成する。群の区切りが必要なら設問見出しの直前に通常段落で示す。
- 数式は KaTeX（`$...$` / `$$...$$`）。基礎・専門には計算問題が含まれるため、式は LaTeX 化する。
- 図表を含む設問（建設部門に多い）は、画像が必要なら `img/` に PNG を置き `<ArticleImage>` で参照（image-policy.md 準拠）。図が選択肢の組合せ表なら Markdown 表で代替。

## 必須コンポーネント

- `<ExamPoint>` — 1 問あたり 1 個、論点総括（`.claude/knowledge/reference/content-principles.md` §5）。

## RelatedKeywords の扱い

- **当面は省略**。技術士第一次（建設）の論点に対応するキーワードページが未整備のため、リンク先のない `<RelatedKeywords>` は置かない（content-principles の「リンク先が存在するもののみ」原則）。
- 将来キーワード集を整備したら add-answers モードで付与する。

## 正答の確定方法

1. `{R##}-正答.pdf` をテキスト抽出（PyMuPDF）。`問題番号 正答番号` の表形式で全科目分が入っている。
2. 各設問の `**正答：X**` を正答 PDF と機械突合。
3. ただし**正答番号一致は品質保証にならない**。問題文・選択肢は必ず原典視覚突合（下記）で確認する。

## 原典視覚突合（必須品質ゲート）

問題 PDF は**画像ベース（テキスト抽出不可）**。全問を以下で照合:

```bash
python3 -c "import fitz,os; os.makedirs('/tmp/verify',exist_ok=True); d=fitz.open('docs/textbook/技術士第一次試験/R07-基礎.pdf'); [d[i].get_pixmap(dpi=200).save(f'/tmp/verify/p{i+1:03d}.png') for i in range(d.page_count)]; d.close()"
```

- 各ページ画像を Read で視覚転記（推測禁止）。
- 設問極性（「最も適切」/「最も不適切」/「誤っているもの」）を MDX と一致させ、`❌`/`✅` が極性と整合するか確認。

## 禁止事項

- `❌` / `✅` を `<ExamPoint>` の `summary` / `items` に含める（lint 9-3 違反）。
- 選択肢解説以外での `❌` / `✅` 使用（lint 9-6 違反）。
- リンク先が存在しない `<RelatedKeywords>` の設置。

## 品質検証

```bash
/check-mdx {path} --rules syntax
/check-mdx {path} --rules explanations
/improve-article {slug} --mode verify   # content-qa で 5 軸評価
```

## 参照

- `docs/textbook/技術士第一次試験/` — ソース PDF ディレクトリ
- `.claude/knowledge/reference/content-principles.md` — コンテンツ原則
- `.claude/knowledge/reference/exam-content-policy.md` — 試験別整備方針（pe-first-stage 列）
