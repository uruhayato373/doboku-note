# pdf-to-mdx テンプレート: civil-construction-2（2級土木施工管理技士）

2級土木施工管理技士受験者向けの PDF/画像資料を MDX に変換するルール。**教科書 / 試験ガイド / 基準類**を対象とする。過去問は `/exam-questions-import --exam {civil-primary-2|civil-secondary-2}` を使う。

## 変換対象

- 教科書（土木工事共通仕様書・技術基準類）
- 試験ガイド（出題傾向・分析記事）
- 法規テキスト（労安法・建設業法・道路法 等）
- 土木一般（土工・コンクリート・基礎工）の基礎解説資料

## 出力先（Convention B、実態に合わせる）

```
content/site/civil-construction-2/
├── guide-2-{slug}/article.mdx        # 2級専用 試験ガイド
├── primary-{year}-{sub}/article.mdx  # 第1次検定 過去問（exam-questions-import 担当）
├── secondary-{year}/article.mdx      # 第2次検定 過去問（同上）
└── textbook-{slug}/article.mdx       # 教科書（将来追加時）
```

すべて Convention B（ディレクトリ + `article.mdx`）。

## frontmatter スキーマ

### textbook / guide

```yaml
---
title: "ページタイトル"
seoTitle: "ページタイトル | 2級土木施工管理技士 | doboku-note"
description: "50〜100 文字の説明"
category: "civil-construction-2"
group: "guide"                      # textbook | guide | primary | secondary
tags: ["guide"]
published: true
publishedAt: "YYYY-MM-DD"
---
```

- `group` は必須。検証エージェント（civil-construction-qa）がモード判定に使う
- `category` は `civil-construction-2` を厳守（1級と混同しない）

## MDX 構造ルール

### guide（試験ガイド・分析記事）

2級は基礎知識中心。1級ガイドより**用語・基本原理の説明を厚く**する。

- 出題傾向の**正確性**が最重要（頻度表・年度カバー）
- 過去問への**バックリンク**を積極設置（`/docs/civil-construction-2-primary-r07-kouki#問題-no{N}`）
- 1級 guide-* へのクロスリンクは「ステップアップしたい方へ」セクションで自然に貼る（押し付けない）
- 本文は編集的（網羅率 topic_rate 80% 以上）

### 必須コンポーネント

- `<Callout type="exam" title="頻出論点">` — 過去問で繰り返し問われる数値・区分を強調
- `<Callout type="standard" title="JIS/ISO/法令">` — 基準・規格の引用
- `<Callout type="formula">` — 公式・計算原理
- `<ExamPoint>` — 試験対策ポイント（guide 向き、体言止め、句読点禁止）

### 選択肢問題の引用（guide 内で過去問を参照する場合）

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

## 2級専用 guide の推奨カテゴリ分類

| カテゴリ | guide slug 例 |
|---|---|
| 戦略・全体像 | `guide-2-strategy`（制度・受験資格緩和・前期/後期・3種別） |
| 経験記述（最重要） | `guide-2-experience-writing-basics`, `guide-2-experience-writing-examples` |
| 分野別基礎 | `guide-2-earthwork-basics`, `guide-2-concrete-basics`, `guide-2-construction-management-basics`, `guide-2-law-basics`, `guide-2-quality-management-basics` |
| 時期別直前対策 | `guide-2-zenki-preparation`（5月発信）, `guide-2-last-minute-2026`（10月発信） |

## 画像取り扱い

- マスター: `content/site/civil-construction-2/{slug}/img/` に PNG/SVG 配置（git 追跡）
- 配信: R2 (`storage.doboku-note.com/posts/civil-construction-2/{slug}/img/...`)
- アップロード: `node .claude/scripts/upload-images-to-r2.mjs --prefix civil-construction-2/{slug}`
- 参照: `<ArticleImage src="/posts/civil-construction-2/{slug}/img/..." alt="..." />`（生 `<img>` 禁止）

## post_hooks

```bash
/check-mdx --rules all
/improve-article {path} --mode verify   # civil-construction-qa で視覚＋網羅率評価
```

## 1級との差分

| 観点 | 1級 (civil-construction-1) | 2級 (civil-construction-2) |
|---|---|---|
| ターゲット読者 | 監理技術者志望・中堅 | 主任技術者志望・若手〜中堅 |
| 解説の深さ | 応用・複合判断含む | 基礎・用語中心 |
| guide ファイル数 | 9本（earthwork, concrete, four-management 等） | 10本（guide-2-strategy 等、2級独自命名） |
| guide 流用方針 | — | 1級流用なし、独自執筆（SEO重複回避） |
| 過去問形式 | 問題A/B（午前/午後） | 前期/後期（年2回） |

## 参照

- `.claude/knowledge/reference/exam-content-policy.md` — 試験別コンテンツ整備方針
- `.claude/knowledge/reference/content-authoring.md` — MDX コンポーネント仕様
- `.claude/agents/civil-construction-qa.md` — 視覚検証・網羅率評価の真実源
- `.claude/agents/civil-construction-review.md` — 既存 MDX 校正の真実源
- `.claude/skills/conversion/pdf-to-mdx/templates/civil-construction-1.md` — 1級テンプレ（共通フォーマットの真実源）
