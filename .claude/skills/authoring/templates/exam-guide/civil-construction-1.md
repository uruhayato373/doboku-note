---
exam_id: civil-construction-1
exam_name: 1級土木施工管理技士試験対策
created: 2026-04-01
---

# 1級土木施工管理技士 — exam-guide テンプレート設定

このファイルは `/exam-guide` スキルで使用される設定値を定義します。
スキルはここに記載された値を参照して、試験対策ガイドを生成します。

---

## ソースコンテンツ — source_paths

スキルが参照すべき、既存のコンテンツディレクトリ。

```yaml
source_paths:
  土工: content/general/civil-general/earthwork/
  コンクリート: content/general/civil-general/concrete/
  基礎工: content/general/civil-general/foundation/
  建設機械: content/general/civil-general/construction-machinery/
  施工管理: content/general/construction-management/
  第1次問題集: content/exam/civil-construction-1/primary/
  第2次問題集: content/exam/civil-construction-1/secondary/
```

---

## 外部情報源 — external_sources

著作権フリーの公開情報源。1級土木は既存資産のみ使用するため、ここは空。

```yaml
external_sources: {}
```

---

## 試験構成 — exam_structure

第一次・第二次の科目構成と出題形式。ガイド内の「出題の特徴」セクションで参照される。

```yaml
exam_structure: |
  | 試験段階 | 科目 | 問題形式 | 出題数 | 特徴 |
  |---|---|---|---|---|
  | **第一次検定** | 工学基礎 | 択一式 | 必須3問 | 土質工学・構造力学・水理学から出題。基礎知識が問われる |
  | | 土木一般 | 択一式 | 必須4問 | 土工・コンクリート工・基礎工の技術的知識 |
  | | 施工管理法 | 択一式 | 選択6問 | 施工計画・工程管理・品質管理・安全管理・環境管理 |
  | | 関係法規 | 択一式 | 必須3問 | 建設業法・労働安全衛生法・環境関連法 |
  | **第二次検定** | 論文・実務経験 | 記述式 | 2問選択 | 実務現場の課題解決。記述式論文が中心 |
```

---

## 出力先ディレクトリ — output_dir

生成されたガイドページの保存先。

```yaml
output_dir: content/general/exam-guide/
```

---

## サイドバー識別子 — sidebar_slug

サイドバー登録時の slug。URL: `/docs/{slug}` の一部になる。

```yaml
sidebar_slug: exam-guide
```

---

## frontmatter テンプレート

生成ページに付与される frontmatter のテンプレート。`{分野名}` は生成時に置換される。

```yaml
---
id: {slug}
title: "{分野名} 重要ポイント — 1級土木施工管理技士試験対策"
sidebar_label: "{分野名}"
description: "{分野の概要}。過去問の出題傾向に基づく頻出テーマと重要ポイントを整理。1級土木施工管理技士試験対応。"
exams:
  - civil-construction-1
---
```

---

## 本文テンプレート

生成ページの本体構成。スキルは以下の構造で記事を生成します。

```markdown
# {分野名} 重要ポイント

## 出題傾向

{過去問からの分析。この分野は何年度に、どの形式で、何問出題されているか}

例：「第一次検定では平均 2.5 問/年。土工計算問題が 50% 以上を占める。」

## 頻出テーマ

### テーマ1: {テーマ名}

{既存テキストからの要点抽出}

:::note[試験のポイント]
{この分野で問われやすい知識・計算パターン}
:::

### テーマ2: {テーマ名}

...

## 過去問リンク

{関連する過去問へのリンク一覧}

例：
- [令和5年第一次 問XX](docs/exam/civil-construction-1/primary/r05)
- [令和4年第一次 問XX](docs/exam/civil-construction-1/primary/r04)

## テキスト参照

{元テキストへのリンク。詳細を学びたい人向け}

例：
- [土工 — 概説](docs/general/civil-general/earthwork/overview)
- [土工 — 盛土](docs/general/civil-general/earthwork/embankment)
```

---

## 補足

- **出力先**: `content/general/exam-guide/` 以下に複数ページが生成される（strategy.mdx, earthwork-key-points.mdx 等）
- **著作権**: 既存資産（doboku-note内テキスト）と公開試験問題を再構成するのみ。新規創作なし。
- **メンテナンス**: 試験制度に変更があった場合、このテンプレートの `exam_structure` セクションを更新する。

---

## 次のステップ（Phase 2）

このテンプレートが完成した後、スキル側でパラメータ化が予定されています：

```bash
# Phase 1（現在）
/exam-guide earthwork

# Phase 2（2026年秋予定）
/exam-guide --exam civil-construction-1 --topic earthwork
```

スキル側で `--exam` パラメータを追加し、複数試験対応の汎用化が実現します。
