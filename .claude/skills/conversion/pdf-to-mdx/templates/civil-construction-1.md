# pdf-to-mdx テンプレート: civil-construction-1（1級土木施工管理技士）

1級土木施工管理技士受験者向けの PDF/画像資料を MDX に変換するルール。**教科書 / 試験ガイド / 基準類**を対象とする。過去問集は `/exam-questions-import --exam {civil-primary|civil-secondary}` を使う。

## 変換対象

- 教科書（土木工事共通仕様書・技術基準類）
- 試験ガイド（出題傾向・分析記事）
- 法規テキスト・判例集
- 土木一般（土工・コンクリート・基礎工）解説資料

## 出力先

```
content/site/civil-construction-1/
├── guide/{slug}.mdx               # 試験ガイド（Convention A）
├── primary/{slug}.mdx             # 第1次試験過去問（Convention A、/exam-questions-import が担当）
├── secondary/{slug}.mdx           # 第2次試験（Convention A、同上）
└── textbook/{slug}/article.mdx    # 教科書（Convention B）
```

- `guide/` と `primary/`, `secondary/` は Convention A（個別ファイル名）
- `textbook/` は Convention B（`article.mdx`）で新規作成推奨

## frontmatter スキーマ

### textbook / guide
```yaml
---
title: "ページタイトル"
seoTitle: "ページタイトル | 1級土木施工管理技士 | doboku-note"
description: "50〜100 文字の説明"
category: "civil-construction-1"
group: "textbook"                   # textbook | guide | primary | secondary
tags: ["textbook"]
published: true
publishedAt: "YYYY-MM-DD"
---
```

- `group` は必須。検証エージェント（civil-construction-qa）がモード判定に使う

## MDX 構造ルール

### textbook（教科書）

- 教科書 PDF の **章立てに忠実**（網羅率 95% 以上必須）
- 数式・表・図は全て移植
- SVG 化候補（フロー図・比較図）は変換時に候補として記録、別途 `/create-svg` で作成
- `<ArticleImage src="/posts/civil-construction-1/textbook/{slug}/img/..." alt="..." />` で画像参照（生 `<img>` 禁止）

### guide（試験ガイド・分析記事）

- 出題傾向の**正確性**が最重要（頻度表・年度カバー）
- 過去問への**バックリンクを多く設置**（`/docs/civil-construction-1-primary-r07-a#問題-no{N}`）
- 本文は編集的（網羅率は topic_rate 80% 以上）

### 必須コンポーネント

- `<Callout type="exam" title="頻出論点">` — 過去問で繰り返し問われる数値・区分を強調
- `<Callout type="standard" title="JIS/ISO/法令">` — 基準・規格の引用
- `<Callout type="formula">` — 公式・計算原理
- `<ExamPoint>` — 試験対策ポイント（guide 向き）

### 選択肢問題の構造（guide 内で過去問を引用する場合）

```mdx
## 問題 No.{N} {分野タグ}

{問題文}

**(1)** 選択肢1

**(2)** 選択肢2

**(3)** 選択肢3

**(4)** 選択肢4

<details>
<summary>解答・解説</summary>

**正解: (X)**

{解説テキスト}

</details>
```

## 品質ルーブリック（civil-construction-qa / civil-construction-review）

変換後に `/improve-article --mode verify` で自動評価。

- **textbook モード**: テキスト網羅率 30% / 図の完全性 30% / 視覚一致 20% / 数式・表正確性 15% / MDX 互換性 5%（合格 2.0/3.0）
- **guide モード**: 主要トピック網羅 20% / 出題傾向の正確性 25% / 過去問バックリンク 20% / モバイル視認性 20% / MDX 互換性 15%

## カテゴリ分類（分野タグ）

| 問題番号 | 分野（問題A）|
|---|---|
| 1-15 | 土木一般 |
| 16-49 | 専門土木 |
| 50-61 | 法規 |

問題B: 施工管理（施工計画・工程管理・安全管理・品質管理・環境保全）

## 画像取り扱い

- マスター: `content/site/civil-construction-1/{group}/{slug}/img/` に PNG/SVG 配置（git 追跡）
- 配信: R2 (`storage.doboku-note.com/posts/civil-construction-1/{group}/{slug}/img/...`)
- アップロード: `node .claude/scripts/upload-images-to-r2.mjs --prefix civil-construction-1/{group}/{slug}`

## post_hooks

```bash
/check-mdx --rules all
/improve-article {path} --mode verify   # civil-construction-qa で視覚＋網羅率評価
```

## 参照

- `.claude/knowledge/reference/exam-content-policy.md` — 試験別コンテンツ整備方針
- `.claude/knowledge/reference/content-authoring.md` — MDX コンポーネント仕様
- `.claude/agents/civil-construction-qa.md` — 視覚検証・網羅率評価の真実源
- `.claude/agents/civil-construction-review.md` — 既存 MDX 校正の真実源
