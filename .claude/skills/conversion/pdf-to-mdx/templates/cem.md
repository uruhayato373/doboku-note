# pdf-to-mdx テンプレート: cem（技術士総合技術監理部門）

技術士（総合技術監理部門）受験者向けの PDF/画像資料を MDX に変換するルール。**論文・事例・5 管理技術解説**を対象とする。キーワードページそのものの作成は `/keyword-page` スキルの担当。

## 変換対象

- CEM 公式教材・参考書
- 総合技術監理に関する技術論文・事例集
- 5 管理技術（安全・社会環境・経済性・情報・人的資源）の解説資料

## 出力先

```
content/site/pe-comprehensive-management/{slug}/article.mdx
```

- 論文・事例: `{theme-slug}/article.mdx`
- 試験ガイド: `exam-index/article.mdx`, `section-{X}/article.mdx`
- 過去問（PDF→MDX 取込み）は `/exam-questions-import --exam pe-primary` を使うこと

## frontmatter スキーマ

```yaml
---
title: "ページタイトル"
seoTitle: "ページタイトル | 技術士総合技術監理 | doboku-note"
description: "50〜100 文字の説明"
category: "pe-comprehensive-management"
section: "X.Y"                          # 5 管理体系の節番号（1.1〜5.6）
tags: ["keyword"]
published: true
publishedAt: "YYYY-MM-DD"
---
```

- `section` は `src/config/pe-chapters.json` で定義された章・節を参照
- `seoTitle` は `| 技術士総合技術監理 | doboku-note` サフィックス必須

## MDX 構造ルール

### 論文・事例の標準構造

```mdx
## {主要概念}とは

{概念の定義・背景}

## 背景

{問題が発生した業界・企業・プロジェクトの背景}

## 課題

{解決対象となった課題}

## 解決策・アプローチ

### {戦術1}
...

### {戦術2}
...

## 成果・学習

{達成された成果・教訓}

## 総合技術監理における位置づけ

{5 管理体系のどこに位置するか、他管理分野との関連}

## 参考資料

- [公的資料タイトル](URL) — 公的機関（go.jp/ac.jp/or.jp 等）
- [民間解説タイトル](URL) — Wikipedia / 技術ブログ / note 等
```

### 必須コンポーネント

- `<ExamPoint summary="..." items={["...", "..."]} />` — 試験対策ポイント（原則 1-2 個、総括位置、詳細は `.claude/knowledge/reference/content-principles.md` §5）
- `<Callout type="note|tip|warn|...">` — 注意・補足（1 記事 1-3 個、詳細は [docs/design/callout-gallery.md](../../../../../docs/design/callout-gallery.md)）

### 禁止事項

- 絵文字（❌✅💡🔑 等）の使用 → `<Callout>` で表現
- `<ExamPoint>` 3 個以上
- `summary` / `items` に「誤り選択肢」「代表的な誤り」を含める（lint 9-3 違反）
- 「とは」直後の `<ExamPoint>` 配置（lint 9-5 違反）
- 末尾の `関連キーワード: [A]、[B]` 列挙行（lint 8-1 違反、インラインリンク化）

### 法令リンク

本文中の「〇〇法第◯条」は e-Gov にインラインリンク化:
```
[**労働安全衛生法第22条**](https://laws.e-gov.go.jp/law/347AC0000000057#Mp-At_22)
```

`fix-legal-citations.mjs`（`/check-mdx --rules legal-citations --fix`）で自動修正可能。

## カテゴリ推定

| PDF 内容 | section |
|---|---|
| 経済性管理 | 1.X |
| 人的資源管理 | 2.X |
| 情報管理 | 3.X |
| 安全管理 | 4.X |
| 社会環境管理 | 5.X |

## 品質ルーブリック（cem-qa エージェント）

変換後に `/improve-article --mode verify` で自動評価。5 軸（構造 30% / モバイル 25% / 原則 20% / 参考資料 15% / 関連付け 10%）、合格ライン 2.0/3.0。

## post_hooks

```bash
/check-mdx --rules all
/improve-article {path} --mode verify   # 任意、cem-qa で 5 軸評価
```

## 参照

- `.claude/knowledge/reference/content-principles.md` — コンテンツ原則（真実源）
- `.claude/knowledge/reference/content-authoring.md` — MDX コンポーネント仕様
- `src/config/pe-chapters.json` — 5 管理体系の章・節構造
- `.claude/skills/authoring/keyword-page/SKILL.md` — キーワードページ作成（PDF 変換ではなく対話型作成）
