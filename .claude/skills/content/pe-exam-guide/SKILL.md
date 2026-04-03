---
name: pe-exam-guide
description: >
  技術士試験対策ガイドを生成する。Use when user asks to [技術士の対策, /pe-exam-guide].
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
