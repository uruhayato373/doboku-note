---
name: civil-construction-1-pdf-to-mdx
description: >
  1級土木施工管理技士試験対策用PDF/画像から過去問・基準類をMDX形式に変換する。
  Use when user asks to [1級土木施工管理, 過去問をMDXに, 土木施工管理のPDF変換, /civil-construction-1-pdf-to-mdx].
---

## 用途

1級土木施工管理技士受験者向けの PDF/画像資料を MDX 形式に変換し、`content/exam/civil-construction-1/` に配置するスキル。

## 変換対象資料

- 過去問題集（第1次・第2次試験）
- 土木工事共通仕様書・技術基準類
- 法規テキスト・判例集
- 土木一般（土工・コンクリート・基礎工）解説資料

## 出力スキーム

### 第1次試験：選択肢問題の標準化

```mdx
---
title: "{分野} 第1次 {年度}年問{問番号}"
description: "{問題の簡潔な説明}"
category: "{土工 | コンクリート | 基礎工 | 測量 | 建設機械 | 法規 | 施工管理}"
subcategory: "{細分類}"
difficulty: "basic | intermediate | advanced"
exam: civil-construction-1
examType: "primary"  # first stage exam
year: {年度}
questionNumber: {問番号}
lastUpdated: "{YYYY-MM-DD}"
---

## 問題文

{原文のまま}

## 選択肢

**A.** {選択肢A}

**B.** {選択肢B}

**C.** {選択肢C}

**D.** {選択肢D}

## 正答と解説

**正答: {A|B|C|D}**

### 正答の根拠

{正答が正しい理由、参照法規・基準}

### 不正答の理由

**A. (不正)** {理由}

**B. (不正)** {理由}

**C. (不正)** {理由}

**D. (不正)** {理由}

## 関連キーワード

{基準・法令・技術用語の列挙}

## 参考資料

{出題元の基準類、詳細解説への内部リンク}
```

### 第2次試験：施工経験記述の標準化

```mdx
---
title: "{分野} 第2次 {年度}年試験"
description: "{試験テーマ}"
category: "{分野}"
exam: civil-construction-1
examType: "secondary"  # essay exam
year: {年度}
essayTopic: "{テーマ}"
lastUpdated: "{YYYY-MM-DD}"
---

## 試験テーマ

{出題されたテーマ}

## 評価基準

| 評価軸 | 重要度 |
|---|---|
| 工事内容の理解度 | ★★★ |
| 施工上の課題の抽出 | ★★★ |
| 対処方法の妥当性 | ★★★ |
| 技術基準・法規の遵守 | ★★ |
| 記述の論理性・簡潔性 | ★★ |

## 解説例

{模範解答の例、記述ポイント}

### 例1: 品質管理の観点

{品質に関する記述パターン}

### 例2: 安全管理の観点

{安全に関する記述パターン}

### 例3: 工程管理の観点

{工程に関する記述パターン}

## よくある間違い

{減点対象になりやすい記述、避けるべき表現}

## 参考資料

{関連ドキュメント・基準へのリンク}
```

### 基準類・マニュアルの標準化

```mdx
---
title: "{基準名}"
type: "standard | manual"
category: "{適用範囲}"
exam: civil-construction-1
source: "{発行機関}"
lastUpdated: "{YYYY-MM-DD}"
---

## 概要

{基準の制定背景・適用対象工事}

## 主要項目

| 項目 | 内容 |
|---|---|
| 制定年 | {年号} |
| 最終改定 | {年月日} |
| 適用範囲 | {工事種別・規模} |

## 技術要点

### {セクション1}

{要点と図表}

### {セクション2}

{要点と図表}

## 試験出題実績

{過去問での出題キーワード、頻出度}

## チェックポイント

:::note[試験のポイント]
{1級試験で必ず押さえておくべき内容}
:::
```

## frontmatter 自動付与

**必須項目**:
- `exam: civil-construction-1` — 自動付与（変更不可）
- `examType: primary | secondary` — 試験種別
- `title`, `description`, `category` — ソースから抽出
- `year`, `questionNumber` — 過去問の場合
- `lastUpdated` — 変換実行日

**オプション項目**:
- `difficulty` — (basic|intermediate|advanced)
- `source` — 出題元・参考資料
- `relatedKeywords` — キーワード配列

## 出力先・ファイル配置

```
content/exam/civil-construction-1/
├── index.mdx                    # 試験ガイド（索引）
├── primary/                     # 第1次試験過去問
│   ├── {year}/
│   │   ├── earthwork-{q}.mdx
│   │   ├── concrete-{q}.mdx
│   │   └── ...
│   └── ...
├── secondary/                   # 第2次試験過去問・解説
│   ├── {year}/
│   │   ├── {theme}.mdx
│   │   └── ...
│   └── ...
├── standards/                   # 技術基準類
│   ├── common-specs.mdx
│   ├── concrete-standard.mdx
│   └── ...
└── laws/                        # 法規テキスト
    ├── civil-law.mdx
    ├── building-standards.mdx
    └── ...
```

## 品質ルーブリック（content-qa 評価基準）

| 軸 | 評価ポイント |
|---|---|
| 構造正確性 (30%) | 過去問の問題文・選択肢の完全性、法規引用の正確性 |
| テキスト忠実度 (25%) | ソースPDFとの100%照合、数値・条文番号の正確性 |
| 表図数式 (20%) | 図表・表・計算式の適切なMDX化、寸法値の精度 |
| MDX互換性 (15%) | frontmatter完全性、コンポーネント・リンク・メタデータの正確性 |
| メタデータ品質 (10%) | category/year/questionNumber の一貫性、難易度分類の妥当性 |

## 選択肢問題の特別ルール

1. **選択肢は A B C D を固定** — 複数の正答がある場合は選択肢Aに統一
2. **法規条文は必ず参照** — 「〇〇法第△△条」など出典を明示
3. **不正答の理由は詳細に** — なぜこれが間違いなのか、一般的な誤解は何か
4. **関連キーワード** — 基準・法令の条項番号をメタデータ化（検索性向上）

## 第2次試験の特別ルール

1. **評価軸を明示** — 記述採点の観点を「品質・安全・工程・コスト・リスク」に分類
2. **模範解答は複数例示** — 「完璧な答え」より「合格ラインの記述パターン」を重視
3. **チェックリスト化** — 「減点されやすい項目」を箇条書き
4. **文字数制限** — 制限文字数を明示（200字以内など）

## 留意点

1. **著作権** — 公開されている過去問のみ使用。出題機関の著作権は尊重
2. **法規改正への対応** — 施行年を必ず記載し、古い法規による誤導を防止
3. **難易度分類** — 得点率から逆算して difficult/intermediate/basic に分類
4. **内部リンク** — 「詳しくは {関連ドキュメント} を参照」と相互参照を充実

## サイドバー登録例

`src/lib/sidebar.ts` の `examSidebar` に追加:

```typescript
{
  type: 'category',
  label: '1級土木施工管理技士',
  link: {
    type: 'generated-index',
    title: '1級土木施工管理技士 試験対策',
    slug: 'civil-construction-1',
  },
  items: [
    'exam/civil-construction-1/primary/2023/earthwork-1',
    'exam/civil-construction-1/secondary/2023/theme-1',
    'exam/civil-construction-1/standards/common-specs',
    // ...
  ],
},
```

## Phase 5: 品質検証（必須）

変換完了後は **必ず** `/verify-pdf-mdx` を実行して品質を確認する。これにより以下が自動チェックされる:

- **テキスト網羅率**: PDF 章節見出しの 95% 以上が MDX に含まれているか
- **図の完全性**: `<img>` 参照ファイルが全て存在し、natural ≥ display か
- **視覚一致**: 代表画像が PDF 原本と一致しているか（Playwright + LLM 視覚判定）
- **数式・表正確性**: KaTeX 数式と表の本数が PDF と整合しているか
- **MDX 互換性**: `/check-mdx` のビルドエラー有無

### 実行手順

```bash
# dev server を起動（別ターミナル）
npm run dev

# 検証実行
/verify-pdf-mdx .local/r2/posts/civil-construction-1/{group}/{slug}/article.mdx
```

### 不合格時の対応

- **テキスト網羅率不足** → missing topics リストを参考に、漏れている章節を本文に追記
- **図のファイル欠落** → 該当ページから再抽出して `img/` に配置
- **画像のぼかしリスク** → 300dpi 以上で再抽出
- **視覚不一致** → 該当画像を手動で確認し、必要なら再抽出
- **数式欠落** → PDF の該当箇所から KaTeX で本文に取り込む
- **SVG 復元候補** → Phase 2 の `/reconstruct-figure`（未実装）で SVG 化を検討

### 連携先

`/verify-pdf-mdx` は内部で **`civil-construction-qa`** サブエージェント（Evaluator）を呼び出し、3 モード（textbook / guide / past-exam）で 5 軸ルーブリック評価を行う。

詳細: `.claude/agents/civil-construction-qa.md` および `CLAUDE.md` の「コンテンツ別レビュー視点」セクションを参照。
