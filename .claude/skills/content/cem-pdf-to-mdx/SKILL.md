---
name: cem-pdf-to-mdx
description: >
  技術士総合技術監理試験対策用PDF/画像から論文・事例をMDX形式に変換する。
  Use when user asks to [技術士CEM対策, 総合技術監理の論文を作りたい, CEMのPDF変換, /cem-pdf-to-mdx].
---

## 用途

技術士（総合技術監理部門）受験者向けの PDF/画像資料を MDX 形式に変換し、`content/exam/cem/` に配置するスキル。

## 変換対象資料

- CEM（Certified Engineering Manager）公式教材・参考書
- 総合技術管理に関する技術論文・事例集
- 5管理技術（品質・安全・工程・コスト・リスク）の解説資料

## 出力スキーム

### 論文構造の標準化

```mdx
---
title: "{論文タイトル}"
description: "{50字程度の概要}"
category: "論文"
subcategory: "{5管理技術 | 経営管理 | 業界動向など}"
difficulty: "basic | intermediate | advanced"
exam: cem
lastUpdated: "{YYYY-MM-DD}"
---

## 背景

{問題が発生した業界・企業・プロジェクトの背景}

## 問題・課題

{解決対象となった課題の明示}

## 解決策・アプローチ

{実装した施策・管理手法の詳細}

### {戦術1のタイトル}

{詳細説明}

### {戦術2のタイトル}

{詳細説明}

## 成果・学習

{達成された成果・定量指標・教訓}

## 試験対策ポイント

:::note[CEM対策]
{CEM試験で問われやすい観点、関連する5管理技術、評価員が注目する要素}
:::

## 参考資料・引用元

{出典、関連ドキュメント、参考論文へのリンク}
```

### 事例・マニュアルの構造化

```mdx
---
title: "{事例名 | マニュアル名}"
type: "case-study | methodology"
category: "{5管理技術}"
exam: cem
---

## 概要

{事例背景・適用企業・規模}

## 要点（表形式）

| 項目 | 内容 |
|---|---|
| 管理技術 | {該当する5管理技術} |
| 実施期間 | {期間} |
| 成果 | {定量的成果} |

## 詳細解説

{段階ごとの実装手順、具体例、チェックポイント}

## CEM試験との関連

{この事例がCEM試験のどの領域に該当するか、出題可能性}
```

## frontmatter 自動付与

**必須項目**:
- `exam: cem` — 自動付与（変更不可）
- `title`, `description`, `category` — ソースから抽出
- `lastUpdated` — 変換実行日

**オプション項目**:
- `difficulty` — (basic|intermediate|advanced)
- `subcategory` — 5管理技術別の分類
- `relatedTopics` — 関連キーワード配列

## 出力先・ファイル配置

```
content/exam/cem/
├── index.mdx                    # CEM試験対策ガイド（索引）
├── essays/
│   ├── quality-management-01.mdx
│   ├── safety-management-01.mdx
│   └── ...
├── case-studies/
│   ├── large-project-01.mdx
│   └── ...
└── methodologies/
    ├── risk-management-framework.mdx
    └── ...
```

## 品質ルーブリック（content-qa 評価基準）

| 軸 | 評価ポイント |
|---|---|
| 構造正確性 (30%) | 論文構造（背景→問題→解決→成果）の忠実度、5管理技術の体系性維持 |
| テキスト忠実度 (25%) | ソースPDFとの照合、数値・統計の正確性、引用の明示 |
| 表図数式 (20%) | 複雑な図表・マトリクスの適切な構造化、MDX互換性 |
| MDX互換性 (15%) | frontmatter完全性、コンポーネント・リンク・メタデータの正確性 |
| メタデータ品質 (10%) | category/subcategory/difficulty の一貫性、CEMマップとの整合性 |

## 留意点

1. **5管理技術の体系性** — 各論文・事例が「品質・安全・工程・コスト・リスク」のいずれに該当するか明示する
2. **試験対策ポイント** — 論文内に「CEM試験で問われやすい観点」セクションを必ず含める
3. **事業評価** — 数値的成果（コスト削減率、工程短縮、品質向上等）を抽出・強調する
4. **出典明示** — 企業機密でない限り、引用元・出所を必ず記載

## サイドバー登録例

`src/lib/sidebar.ts` の `examSidebar` に追加:

```typescript
{
  type: 'category',
  label: '技術士（総合技術監理）',
  link: {
    type: 'generated-index',
    title: 'CEM試験対策',
    slug: 'cem',
  },
  items: [
    'exam/cem/essays/quality-management-01',
    'exam/cem/case-studies/large-project-01',
    // ...
  ],
},
```
