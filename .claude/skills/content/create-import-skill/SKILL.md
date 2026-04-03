---
name: create-import-skill
description: >
  PDF→MDXインポートスキルのテンプレートを生成する。Use when user asks to [インポートスキルを作りたい, /create-import-skill].
---

# /create-import-skill — PDFインポートスキル自動生成

## 概要

新しいPDF文書用のインポートスキル（`/xxx-import`）を自動生成するメタスキル。既存のインポートスキル群のパターンに準拠した高品質なSKILL.mdを生成する。

## 使い方

```
/create-import-skill                          # 対話形式で情報を収集して生成
/create-import-skill /path/to/pdf/directory   # 指定ディレクトリのPDFを分析して生成
```

## 手順

### Phase 1: ソース分析

1. **PDF所在の特定**: 引数またはユーザーに確認
2. **PDF一覧の取得**: ディレクトリ内のPDFファイルをリスト化
3. **ページ数の取得**: 各PDFのページ数をPyMuPDFで取得

```python
import fitz
doc = fitz.open(pdf_path)
print(f'{pdf_path}: {len(doc)} pages')
```

4. **テキスト品質の確認**: 各PDFの先頭3ページをテキスト抽出し、品質を評価
   - 文字化けの有無・パターン
   - ページヘッダ・フッタのパターン
   - 行番号の有無
   - 表・図の密度
5. **目次構造の特定**: 先頭ページまたは目次ページから章立てを把握
6. **既存変換の確認**: `content/` 内に既存のMDXファイルがあるか確認

### Phase 2: 出力先の決定

以下の情報をユーザーに確認（推測できる場合は提案）:

| 項目 | 例 |
|---|---|
| スキル名 | `civil-general-import` |
| 文書の正式名称 | 土木施工管理技術テキスト（土木一般編） |
| 出力ディレクトリ | `content/general/civil-general/` |
| サイドバーカテゴリ | generalSidebar |
| 図の命名プレフィックス | `ch01-fig-` |

### Phase 3: SKILL.md 生成

以下のテンプレートに基づいてSKILL.mdを生成する。**既存スキルのパターンを厳密に踏襲する。**

#### 必須セクション

1. **タイトル・概要** — スキル名、文書名、総ページ数、概要
2. **使い方** — `status`, 章指定, `verify` の3パターン
3. **ソース情報** — PDF所在、発行者、構成
4. **文書構成とページ数** — 章ごとのページ数・出力ファイル名・変換状態テーブル
5. **テキスト抽出** — PyMuPDFコード例、抽出の注意点（文字化けパターン、ヘッダ・フッタ除去ルール）
6. **変換ルール** — 見出し階層、frontmatter、表、図、数式、注記ブロック
7. **エージェント戦略** — 分割基準、章ごとの分割計画、プロンプトテンプレート
8. **出力先** — ディレクトリ構成
9. **サイドバー登録** — sidebar.ts への追加コード例
10. **ワークフロー** — 推奨変換順序、各章の手順
11. **進捗管理** — ステータス定義
12. **参照** — 関連スキルへのリンク

### Phase 4: 検証・登録

1. 生成したSKILL.mdを `.claude/skills/content/{スキル名}/SKILL.md` に書き出し
2. `CLAUDE.md` のスキル一覧テーブルに追加
3. ユーザーに確認を求める

## テンプレート

生成するSKILL.mdのテンプレート:

````markdown
# /{skill-name} — {文書名} PDF→MDX変換

## 概要

{文書の正式名称}（{構成概要}、総計{ページ数}ページ）のPDFをMDXに変換し、`{出力先}` に取り込むスキル。

## 使い方

```
/{skill-name}              # 進捗確認し、未変換の次の章を1件変換
/{skill-name} status       # 変換状況を一覧表示
/{skill-name} {N}          # 第{N}章を変換
/{skill-name} verify {N}   # 第{N}章のMDXをPDFと照合
```

## ソース情報

- **文書名**: {正式名称}
- **所在**: `{PDFディレクトリパス}`
- **発行**: {発行者}（省略可）
- **構成**: {章数}章、{PDF形態（章別/統合）}
- **総ページ数**: {ページ数}ページ

## 文書構成とページ数

| # | 章 | タイトル | PDF | ページ数 | 出力先 | 状態 |
|---|---|---|---|---|---|---|
| 1 | 第1章 | {タイトル} | `{PDFファイル名}` | {N} | `{dir}/` | 未変換 |
| ... | | | | | | |

{大きな章がある場合は節ごとの分割テーブルも記載}

## テキスト抽出

### PyMuPDF

```python
import fitz, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

doc = fitz.open('{PDFパス}')
for i in range(start_page, end_page):
    text = doc[i].get_text()
    print(f'--- Page {{i+1}} ---')
    print(text)
```

### テキスト抽出の特徴

{Phase 1で確認した品質情報を記載}

## 変換ルール

### 見出し階層

{既存MDXまたは文書構造に基づく見出しルール}

### frontmatter

```yaml
---
id: {slug}
title: "{タイトル}"
sidebar_label: "{短縮ラベル}"
description: "{要約}"
toc_min_heading_level: 2
toc_max_heading_level: 5
---
```

### 表

- Markdownテーブルで変換
- 表タイトル: `<p className="table-title">表X.X タイトル</p>`
- 表を `<div className="table-wrapper">` で囲む
- 複雑な表: PNG画像として抽出

### 図

- PDFページをPNG化（150 DPI）→ トリミング → `{出力先}/img/` に保存
- 命名: `{プレフィックス}-fig-{連番2桁}.png`
- MDX参照: `<img src="/content/{カテゴリ}/img/{ファイル名}" />`
- キャプション: `<p className="text-center">図X.X タイトル</p>`
- 画像はGitに含めない — R2から配信

### 数式

- ブロック: `<div className="scroll-equation">$$...$$</div>`
- インライン: `$...$`

## エージェント戦略

### 分割基準

| ページ数 | 分割 | エージェント数 |
|---|---|---|
| 1-30P | 分割なし | 1 |
| 31-60P | 2分割 | 2 |
| 61-100P | 3分割 | 2-3 |
| 100P超 | 節単位で4-5分割 | 3-4 |

### 図の抽出エージェント

- 1エージェントあたり最大6図
- 150 DPI
- `/tmp/{skill-name}/` に一時保存

### エージェントへのプロンプトテンプレート

```
以下のPDFをMDXに変換してください。

■ PDF: {PDFフルパス}
■ 対象: {節タイトル}（ページ {開始P}〜{終了P}）
■ 出力先: {出力ファイルパス}
■ 図ファイル一覧: {図パスリスト}

【変換ルール】
{このスキルの変換ルールを要約して記載}
```

## 出力先

```
{ディレクトリツリー}
```

## サイドバー登録

`src/lib/sidebar.ts` の `{sidebar名}` に追加:

```typescript
{サイドバー構成例}
```

## ワークフロー

{推奨変換順序}

## 進捗管理

| ステータス | 意味 |
|---|---|
| 未変換 | まだ取りかかっていない |
| 変換中 | MDX変換作業中 |
| QA中 | 原本と照合中 |
| 完了 | 変換・検証完了 |

## 参照

- `.claude/skills/content/pdf-to-mdx/SKILL.md` — 汎用PDF→MDX変換ルール
- `.claude/skills/content/qa-pdf-mdx/SKILL.md` — QA検証スキル
- `.claude/skills/content/check-mdx/SKILL.md` — MDX構文チェック
````

## 品質チェックリスト

生成したSKILL.mdが以下を満たすことを確認:

- [ ] 500行以内
- [ ] 全PDFのページ数が正確
- [ ] テキスト抽出品質が実際のPDFから確認済み
- [ ] 文字化けパターンが記載されている
- [ ] 大きな章（60P超）に分割計画がある
- [ ] 既存変換がある場合、状態が「完了」で行数が記載されている
- [ ] エージェントプロンプトテンプレートがある
- [ ] サイドバー登録のコード例がある
- [ ] CLAUDE.mdに登録されている

## 既存インポートスキル一覧（参考パターン）

| スキル | 特徴 | 参考にすべき点 |
|---|---|---|
| `common-specs-import` | 大規模（1,038P）、14編 | 編の優先順位付け、既存変換との照合 |
| `fishery-port-import` | URL配布PDF、37件 | ダウンロード手順、サブエージェント図抽出 |
| `tech-management-import` | 8編3,400P、章別+統合混在 | 統合PDFの目次抽出、フェーズ分け |
| `design-manual-import` | 5編2,267P | 大規模文書の分割戦略 |
| `civil-general-import` | 6章385P、一部変換済み | 既存変換の状態管理 |
| `river-design-import` | 技術基準 | エージェント戦略の参考 |

## 注意事項

- 既存の変換済みMDXがある場合は、そのパターン（frontmatter、見出し階層、表記法）に合わせる
- PDFのテキスト品質は必ず実際に抽出して確認する（推測しない）
- 500行を超えそうな場合は `reference/` に詳細を分離する
- スキル名は `{文書略称}-import` のケバブケース
