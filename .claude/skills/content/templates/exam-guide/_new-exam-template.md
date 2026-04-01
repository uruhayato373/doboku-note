---
exam_id: YOUR_EXAM_ID
exam_name: YOUR_EXAM_NAME_HERE
created: YYYY-MM-DD
status: draft  # 完成まで draft のまま
---

# YOUR_EXAM_NAME_HERE — exam-guide テンプレート設定

新資格対応時のテンプレート。このファイルをコピーして使用してください。

**使い方**:
1. このファイルを `{exam-id}.md` にコピー
2. 以下の値を埋める（詳細は `_schema.md` 参照）
3. `status: draft` を `status: ready` に変更

---

## ソースコンテンツ — source_paths

対応するコンテンツディレクトリを記載。

例：コンクリート技士の場合
```yaml
source_paths:
  コンクリート: content/general/civil-general/concrete/
  建設機械: content/general/civil-general/construction-machinery/
  施工管理: content/general/construction-management/
  試験問題集: content/exam/concrete-engineer/past-questions/
```

```yaml
source_paths:
  分野1: content/path/to/content1/
  分野2: content/path/to/content2/
```

---

## 外部情報源 — external_sources

著作権フリーの公開情報源があれば記載。ない場合は `{}` （空）。

例：
```yaml
external_sources:
  資格試験主催機関:
    url: https://...
    用途: 試験制度・科目構成
    著作権制約: 公開情報の範囲で利用
```

```yaml
external_sources: {}
```

---

## 試験構成 — exam_structure

第一次・第二次の科目構成。マークダウンテーブル形式。

例：
```yaml
exam_structure: |
  | 試験段階 | 科目 | 問題数 | 形式 | 特徴 |
  |---|---|---|---|---|
  | 第一次 | コンクリート材料 | 25% | 択一式 | 配合・製造・試験 |
  | 第一次 | コンクリート構造 | 25% | 択一式 | 耐久性・構造設計 |
  | 第二次 | 記述式 | 業績・実務 | 記述 | 実務経験に基づく |
```

```yaml
exam_structure: |
  | 試験段階 | 科目 | 問題数 | 形式 |
  |---|---|---|---|
  | Your exam stage | Your subject | XX問 | Your format |
```

---

## 出力先ディレクトリ — output_dir

生成ページの保存先。`content/` を基準とした相対パス。

通常は `content/general/{exam-slug}/` または `content/exam/{exam-id}/guide/`

```yaml
output_dir: content/exam/YOUR_EXAM_ID/guide/
```

---

## サイドバー識別子 — sidebar_slug

サイドバー登録時の slug。ユニークである必要があります。

```yaml
sidebar_slug: your-exam-slug
```

---

## frontmatter テンプレート

生成ページに付与される frontmatter。`{分野名}` や `{科目名}` は生成時に置換されます。

```yaml
---
id: {slug}
title: "{分野名} 重要ポイント — YOUR_EXAM_NAME_HERE 試験対策"
sidebar_label: "{分野名}"
description: "{分野の概要}。YOUR_EXAM_NAME_HERE試験対応。"
exams:
  - YOUR_EXAM_ID
---
```

---

## 本文テンプレート

生成ページの基本構成。スキルはこの構造で記事を生成します。

```markdown
# {分野名} 重要ポイント

## 出題傾向

{過去問からの分析}

## 頻出テーマ

### テーマ1: {テーマ名}

{テキストからの要点抽出}

:::note[試験のポイント]
{試験で問われやすい知識}
:::

### テーマ2: ...

## 関連ページ

{doboku-note内の参照リンク}

## 参考資料

{外部情報源のリンク}
```

---

## チェックリスト

新資格設定が完成した時点でチェック：

- [ ] `exam_id` が URL設計ガイドラインの `exam-id` と一致
- [ ] `source_paths` の全ディレクトリが実在
- [ ] `external_sources` の著作権制約を確認
- [ ] `exam_structure` テーブルが試験の最新制度を反映
- [ ] `output_dir` が既存コンテンツと競合しない
- [ ] `sidebar_slug` が他の試験と重複しない
- [ ] このファイルを `{exam_id}.md` にリネーム
- [ ] `status: draft` を `status: ready` に変更
- [ ] スキルSKILL.md側で参照文を追記

---

## 関連ファイル

- スキーマ定義: `_schema.md`
- 1級土木施工管理技士: `civil-construction-1.md`
- 技術士建設部門: `pe.md`
- テンプレートフォルダ全体: `../README.md`
