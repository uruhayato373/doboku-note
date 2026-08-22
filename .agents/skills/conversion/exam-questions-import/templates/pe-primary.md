# exam-questions-import テンプレート: pe-primary（技術士総合技術監理 第1次試験）

## ソース情報

- **試験**: 技術士総合技術監理部門 第1次試験（択一式）
- **PDF パス**: `.claude/pdfs/技術士総合技術監理部門/{year}-primary.pdf` 等
- **形式**: 5 択選択式（40 問/年度）
- **収録年度**: 平成21〜令和7

## 出力先

```
.local/r2/posts/pe-comprehensive-management/{year}-primary/article.mdx
```

例: `.local/r2/posts/pe-comprehensive-management/r07-primary/article.mdx`

## frontmatter スキーマ

```yaml
---
title: "令和7年度 第1次試験 過去問"
seoTitle: "令和7年度 第1次試験 過去問 | 技術士総合技術監理 | doboku-note"
description: "技術士総合技術監理部門 令和7年度 第1次試験の全40問と解説。5管理分野（経済性・人的資源・情報・安全・社会環境）を網羅。"
category: "pe-comprehensive-management"
group: "primary"
tags: ["primary", "past-questions"]
exam: "pe-comprehensive-management"
examType: "primary"
year: "r07"
questionCount: 40
published: true
publishedAt: "YYYY-MM-DD"
toc_min_heading_level: 2
toc_max_heading_level: 2
---
```

## MDX 構造

```mdx
## Ⅰ-1-{N}

{問題文}

**(1)** 選択肢1

**(2)** 選択肢2

**(3)** 選択肢3

**(4)** 選択肢4

**(5)** 選択肢5

<details>
<summary>解答・解説</summary>

**正解: ({X})**

(1) 選択肢1の解説 {❌|✅}

(2) 選択肢2の解説 {❌|✅}

(3) 選択肢3の解説 {❌|✅}

(4) 選択肢4の解説 {❌|✅}

(5) 選択肢5の解説 {❌|✅}

<ExamPoint summary="論点の本質" items={[
  "覚えるべきポイント1",
  "覚えるべきポイント2",
]} />

<RelatedKeywords items={[
  { label: "キーワード名", slug: "keyword-slug" },
]} />

</details>
```

## 5 管理分野の配分（参考）

40 問は概ね以下のバランス:

| 分野 | 問題数 | section |
|---|---|---|
| 経済性管理 | 8 問 | 1.X |
| 人的資源管理 | 8 問 | 2.X |
| 情報管理 | 8 問 | 3.X |
| 安全管理 | 8 問 | 4.X |
| 社会環境管理 | 8 問 | 5.X |

## 必須コンポーネント

- `<ExamPoint>` — 1 問あたり 1 個、論点総括（詳細は `.claude/knowledge/reference/content-principles.md` §5）
- `<RelatedKeywords>` — キーワードページへの双方向リンク（全件に設置）

## 禁止事項

- `❌` / `✅` を `<ExamPoint>` の `summary` / `items` に含める（lint 9-3 違反）
- 選択肢解説以外での `❌` / `✅` 使用（lint 9-6 違反）

## 品質検証

```bash
/check-mdx {path} --rules syntax
/check-mdx {path} --rules explanations   # 破損解説パターン検出
/check-mdx {path} --rules related-keyword # 末尾列挙パターン検出
/improve-article {path} --mode verify     # content-qa で 5 軸評価
```

## add-answers モード

既存 MDX の未解答設問に解答・解説を追加:
1. 正答 PDF を確認
2. 選択肢解説に `❌` / `✅` バッジ付与
3. `<ExamPoint>` で論点総括を追加
4. `<RelatedKeywords>` でキーワードページへの紐付け

## 参照

- `.claude/pdfs/技術士総合技術監理部門/` — ソース PDF ディレクトリ（要配置）
- `.claude/knowledge/reference/content-principles.md` — コンテンツ原則
- `src/config/pe-chapters.json` — 5 管理体系の章・節構造
