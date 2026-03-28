---
name: pe-exam-guide
description: 技術士試験（建設部門）対策コンテンツを生成するスキル。既存テキスト資産の再構成＋公開情報（技術士会HP・国交省資料）の独自解説。
user-invocable: true
---

# /pe-exam-guide — 技術士試験対策ガイド生成

## 概要

技術士試験（建設部門）の対策コンテンツを生成する。既存の土木一般編・施工管理編テキストを試験対策の切り口で再構成し、公開情報（日本技術士会HP、国交省技術基準）を独自に解説する。

**著作権ルール**: 他サイト（pejp.net等）のコンテンツをコピー・転載しない。公開情報源と既存資産のみを使用。

## 使い方

```
/pe-exam-guide primary          # 一次試験 建設部門ガイド全体
/pe-exam-guide soil             # 一次試験 土質基礎の要点
/pe-exam-guide concrete         # 一次試験 コンクリートの要点
/pe-exam-guide river            # 一次試験 河川砂防海岸の要点
/pe-exam-guide construction     # 一次試験 施工計画の要点
/pe-exam-guide road             # 一次試験 道路の要点
/pe-exam-guide secondary        # 二次試験 記述対策の基本
```

## 情報源

### 1. 既存資産（doboku-note内）

| 対象 | ソース | 技術士一次の対応科目 |
|---|---|---|
| 土木一般編 土工 | `content/general/civil-general/earthwork/` | 土質・基礎 |
| 土木一般編 コンクリート | `content/general/civil-general/concrete/` | 鋼構造及びコンクリート |
| 土木一般編 基礎工 | `content/general/civil-general/foundation/` | 土質・基礎 |
| 施工管理編 | `content/general/construction-management/` | 施工計画 |
| 河川関連 | `content/river/` | 河川・砂防及び海岸 |
| 道路関連 | `content/road/` | 道路 |

### 2. 公開情報源

| 情報源 | URL | 用途 |
|---|---|---|
| 日本技術士会 | https://www.engineer.or.jp/ | 試験制度、過去問題（問題文は公開情報） |
| 国土交通省 技術基準 | https://www.mlit.go.jp/ | 技術基準・白書・統計 |
| 文部科学省 | https://www.mext.go.jp/ | 技術士制度の根拠法 |

### 3. 使用不可の情報源

- pejp.net（SUKIYAKI塾）のオリジナル解説・対策記事
- 市販参考書・問題集の内容
- 他の受験対策サイトのコンテンツ

## 一次試験の科目構成（建設部門）

| 科目群 | 問題数 | doboku-noteの対応資産 |
|---|---|---|
| 土質・基礎 | 4問 | earthwork/ + foundation/（充実） |
| 鋼構造及びコンクリート | 8問 | concrete/（充実） |
| 都市計画 | 4問 | なし（新規作成） |
| 河川・砂防及び海岸 | 9問 | river/（中程度） |
| 港湾及び空港 | 1問 | port/（あり） |
| 電力土木 | 2問 | なし |
| 道路 | 1問 | road/（充実） |
| 鉄道 | 1問 | なし |
| トンネル | 1問 | なし |
| 施工計画 | 2問 | construction-management/（充実） |
| 建設環境 | 2問 | environment/（少量） |

35問中25問を選択 → 得意科目に集中する戦略が有効

## 生成ルール

### frontmatter

```yaml
---
id: {slug}
title: "技術士一次試験 {科目名}の要点 — 建設部門"
sidebar_label: "{科目名}"
description: "{科目の概要}。技術士一次試験 建設部門の{科目名}分野の頻出テーマと重要ポイントを整理。"
---
```

### 構成テンプレート

```mdx
# 技術士一次試験 {科目名}の要点

## 出題の特徴

{科目の出題傾向、問題数、選択戦略}

## 重要テーマ

### テーマ1

{既存テキストから要点抽出}

:::note[試験のポイント]
{頻出の知識・計算パターン}
:::

## 学習リソース

{doboku-note内の関連ページへのリンク}
```

## 出力先

```
content/general/pe-exam/
├── primary-guide.mdx       # 一次試験 建設部門ガイド
├── soil-foundation.mdx     # 土質基礎の要点
├── concrete-points.mdx     # コンクリートの要点
├── river-erosion.mdx       # 河川砂防海岸の要点
├── construction-plan.mdx   # 施工計画の要点
├── road-points.mdx         # 道路の要点
└── secondary-guide.mdx     # 二次試験 記述対策
```

## サイドバー登録

```typescript
{
  type: 'category',
  label: '技術士試験対策（建設部門）',
  link: {
    type: 'generated-index',
    title: '技術士試験対策（建設部門）',
    slug: 'pe-exam',
  },
  items: [
    'general/pe-exam/primary-guide',
    'general/pe-exam/soil-foundation',
    'general/pe-exam/concrete-points',
    'general/pe-exam/river-erosion',
    'general/pe-exam/construction-plan',
    'general/pe-exam/road-points',
    'general/pe-exam/secondary-guide',
  ],
},
```
