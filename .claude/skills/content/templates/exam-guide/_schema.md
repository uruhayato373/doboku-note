# exam-guide テンプレート — 試験別設定スキーマ

最終更新: 2026-04-01

各試験対策ガイドスキル（`/exam-guide`, `/pe-exam-guide` など）で使用される設定変数の定義。

---

## 設定ファイルの仕様

各試験対応の設定ファイルは YAML 形式で以下の6変数を定義します。

### 1. `exam_name` — 試験の正式名称

**用途**: frontmatter の title 生成、コンテンツ内での試験呼称

**形式**: 文字列

**例**:
- `1級土木施工管理技士試験対策`
- `技術士試験（建設部門）対策`
- `コンクリート技士試験対策`

---

### 2. `source_paths` — ソースコンテンツの配置パス

**用途**: ガイド生成時に参照すべきコンテンツディレクトリを指定

**形式**: 
```yaml
source_paths:
  分野1: content/path/to/content1/
  分野2: content/path/to/content2/
  ...
```

**例** — 1級土木施工管理技士:
```yaml
source_paths:
  土工: content/general/civil-general/earthwork/
  コンクリート: content/general/civil-general/concrete/
  基礎工: content/general/civil-general/foundation/
  施工管理: content/general/construction-management/
  第1次問題集: content/exam/civil-construction-1/primary/
  第2次問題集: content/exam/civil-construction-1/secondary/
```

**例** — 技術士（建設部門）:
```yaml
source_paths:
  土工: content/general/civil-general/earthwork/
  コンクリート: content/general/civil-general/concrete/
  基礎工: content/general/civil-general/foundation/
  施工管理: content/general/construction-management/
  河川: content/river/
  道路: content/road/
```

---

### 3. `external_sources` — 著作権フリーの外部情報源

**用途**: ガイド生成時に参照可能な公開情報源。既存資産にない分野を補完。

**形式**:
```yaml
external_sources:
  情報源名: 
    url: https://...
    用途: 用途説明
    著作権制約: 使用可能な内容の範囲
```

**例** — 技術士（建設部門）:
```yaml
external_sources:
  日本技術士会:
    url: https://www.engineer.or.jp/
    用途: 試験制度・科目構成・過去問（公開分）
    著作権制約: 問題文・試験要項は公開情報。解答・解説は独自作成
  国土交通省 技術基準:
    url: https://www.mlit.go.jp/
    用途: 道路基準・河川技術基準・白書
    著作権制約: 国家機関資料のため利用可能。出典は必ず明記
```

**例** — 1級土木施工管理技士:
```yaml
external_sources: {}  # 既存資産のみ使用
```

---

### 4. `exam_structure` — 試験構成・科目情報テーブル

**用途**: ガイド生成で「出題の特徴」「科目構成」を記載する際の参照データ

**形式**: テーブル形式の YAML 配列または マークダウン テーブル文字列

**例** — 1級土木施工管理技士:
```yaml
exam_structure: |
  | 試験段階 | 科目 | 問題数 | 形式 | 備考 |
  |---|---|---|---|---|
  | 第一次検定 | 問題A（工学基礎・土木一般・法規） | 70問中50問選択 | 択一式 | 必須3問+選択問題 |
  | 第一次検定 | 問題B（施工管理法） | 土工・コンクリート・基礎工から選択 | 択一式 | 専門分野選択 |
  | 第二次検定 | 記述式 | 4問出題・2問選択 | 論文+実務経験記述 | 施工現場の実経験が必須 |
```

**例** — 技術士（建設部門）:
```yaml
exam_structure: |
  | 試験段階 | 構成 | 問題数 | 形式 | 戦略 |
  |---|---|---|---|---|
  | 第一次試験 | 基礎科目5問 | 5問全部 | 択一式 | 全分野必須 |
  | 第一次試験 | 適性科目3問 | 3問全部 | 択一式 | 全分野必須 |
  | 第一次試験 | 専門科目 | 35問中25問選択 | 択一式 | 得意科目に絞る |
  | 第二次試験 | 筆記（必須・選択） | 選択科目から複数選択 | 記述式 | 実務経験の深掘り |
```

---

### 5. `output_dir` — ガイドの出力先ディレクトリ

**用途**: 生成されたガイドページの保存先を指定

**形式**: `content/` を基準とした相対パス

**例**:
- `content/general/exam-guide/` （1級土木施工管理技士）
- `content/general/pe-exam/` （技術士）
- `content/exam/concrete-engineer/guide/` （コンクリート技士 — Phase 2）

---

### 6. `sidebar_slug` — サイドバー内での識別子

**用途**: サイドバー登録時の `slug` 値。URL の `/docs/{slug}` 部分に対応。

**形式**: ケバブケース

**例**:
- `exam-guide` （1級土木施工管理技士）
- `pe-exam` （技術士）
- `concrete-engineer-guide` （コンクリート技士）

**注意**: 複数資格対応時は **重複しない** ことが重要。

---

## 実装例

### civil-construction-1.md の構成

```yaml
---
exam_id: civil-construction-1
exam_name: 1級土木施工管理技士試験対策
---

## ソースコンテンツ

source_paths:
  土工: content/general/civil-general/earthwork/
  コンクリート: content/general/civil-general/concrete/
  基礎工: content/general/civil-general/foundation/
  施工管理: content/general/construction-management/
  第1次問題集: content/exam/civil-construction-1/primary/
  第2次問題集: content/exam/civil-construction-1/secondary/

## 外部情報源

external_sources: {}

## 試験構成

exam_structure: |
  | 試験段階 | 科目 | 問題数 | 形式 |
  |---|---|---|---|
  | 第一次検定 | 工学基礎・土木一般・法規 | 70問中50問 | 択一式 |
  | 第二次検定 | 記述式 | 2問選択 | 論文 |

## 出力先

output_dir: content/general/exam-guide/

## サイドバー

sidebar_slug: exam-guide
```

---

## バージョン管理

このスキーマが変更された場合：
1. `_schema.md` 自体を更新
2. すべての試験別設定ファイルが互換性を保つことを確認
3. `.claude/reference/skills-registry.md` の「複数資格対応の進め方（Phase別）」セクションを更新（必要に応じて）

---

## 参考リンク

- テンプレートフォルダ: `.claude/skills/content/templates/`
- `exam-guide` スキル詳細: `.claude/skills/content/exam-guide/SKILL.md`
- `pe-exam-guide` スキル詳細: `.claude/skills/content/pe-exam-guide/SKILL.md`
- URL設計ガイドライン: `docs/00_プロジェクト管理/07_URL設計ガイドライン.md`
