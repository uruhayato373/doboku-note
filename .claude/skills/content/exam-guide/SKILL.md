---
name: exam-guide
description: 既存テキスト・問題集から試験対策ガイド（重要ポイント・得点戦略）を生成するスキル。新規変換ではなく既存資産の再構成。
user-invocable: true
---

# /exam-guide — 試験対策ガイド生成

## 概要

既に変換済みのテキスト（土木一般編94ファイル・施工管理編55ファイル）と試験問題集（第1次24ファイル・第2次10ファイル）から、試験対策に特化した「重要ポイントまとめ」ページを生成する。

**Generator/Evaluator分離原則**: このスキルはGeneratorとして動作。品質評価はcontent-qaエージェントが行う。

## 使い方

```
/exam-guide earthwork         # 土工の重要ポイントを生成
/exam-guide concrete          # コンクリートの重要ポイントを生成
/exam-guide strategy          # 出題傾向と得点戦略を生成
/exam-guide four-management   # 施工管理4大管理まとめを生成
/exam-guide law               # 法規の重要ポイントを生成
```

## 情報源（既存資産）

| 対象 | ソースファイル | 用途 |
|---|---|---|
| 土工 | `content/general/civil-general/earthwork/*.mdx` (10ファイル) | テキストから重要ポイント抽出 |
| コンクリート | `content/general/civil-general/concrete/*.mdx` (10ファイル) | テキストから重要ポイント抽出 |
| 基礎工 | `content/general/civil-general/foundation/*.mdx` (6ファイル) | テキストから重要ポイント抽出 |
| 施工管理 | `content/general/construction-management/**/*.mdx` (55ファイル) | 4大管理の要約 |
| 第1次問題集 | `content/general/exam-questions/*.mdx` (14ファイル) | 出題傾向分析 |
| 第2次問題集 | `content/general/exam-questions-2/**/*.mdx` (10ファイル) | 記述対策のポイント |

## 生成ルール

### frontmatter

```yaml
---
id: {slug}
title: "{分野名} 重要ポイント — 1級土木施工管理技士試験対策"
sidebar_label: "{分野名}"
description: "{分野の概要}。過去問の出題傾向に基づく頻出テーマと重要ポイントを整理。1級土木施工管理技士試験対応。"
---
```

### 構成テンプレート

```mdx
# {分野名} 重要ポイント

## 出題傾向

{過去問からの出題パターン分析}

## 頻出テーマ

### テーマ1: {テーマ名}

{テキストからの要点抽出。数式・表・図は原文から引用}

:::note[試験のポイント]
{この分野で特に問われやすい知識}
:::

### テーマ2: ...

## 過去問リンク

{関連する過去問へのリンク一覧}

## テキスト参照

{詳細を学びたい人向けの元テキストへのリンク}
```

### 重要ルール

1. **新しい内容を創作しない** — 既存テキストと問題集からの抽出・再構成のみ
2. **出題頻度で優先順位付け** — 過去問で繰り返し出題されるテーマを上位に配置
3. **相互リンク** — テキスト元ページと過去問ページへのリンクを必ず含める
4. **:::note[試験のポイント]** — 各テーマの試験で問われやすいポイントを強調

## 出力先

```
content/general/exam-guide/
├── strategy.mdx              # 出題傾向と得点戦略
├── earthwork-key-points.mdx  # 土工の重要ポイント
├── concrete-key-points.mdx   # コンクリートの重要ポイント
├── four-management.mdx       # 施工管理4大管理まとめ
└── law-key-points.mdx        # 法規の重要ポイント
```

## サイドバー登録

`src/lib/sidebar.ts` の `generalSidebar` に追加:

```typescript
{
  type: 'category',
  label: '1級土木施工管理 試験対策ガイド',
  link: {
    type: 'generated-index',
    title: '1級土木施工管理 試験対策ガイド',
    slug: 'exam-guide',
  },
  items: [
    'general/exam-guide/strategy',
    'general/exam-guide/earthwork-key-points',
    'general/exam-guide/concrete-key-points',
    'general/exam-guide/four-management',
    'general/exam-guide/law-key-points',
  ],
},
```
