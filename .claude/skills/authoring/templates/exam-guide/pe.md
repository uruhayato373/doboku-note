---
exam_id: pe
exam_name: 技術士試験（建設部門）対策
created: 2026-04-01
---

# 技術士（建設部門） — exam-guide テンプレート設定

このファイルは `/exam-guide --exam pe` スキルで使用される設定値を定義します。
スキルはここに記載された値を参照して、技術士試験対策ガイドを生成します。

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
  河川砂防: content/river/
  道路: content/road/
```

---

## 外部情報源 — external_sources

著作権フリーの公開情報源。技術士試験は公開情報も参照する。

```yaml
external_sources:
  日本技術士会:
    url: https://www.engineer.or.jp/
    用途: 試験制度・科目構成・過去問（公開分）
    著作権制約: 問題文・試験要項は公開情報。解答・解説は独自作成。pejp.net等のオリジナル解説は参考にしない
  国土交通省 技術基準:
    url: https://www.mlit.go.jp/
    用途: 道路基準・河川技術基準・白書・統計
    著作権制約: 国家機関資料のため利用可能。出典は必ず明記
  文部科学省:
    url: https://www.mext.go.jp/
    用途: 技術士制度の根拠法・技術者倫理
    著作権制約: 法令・白書は利用可能
```

---

## 試験構成 — exam_structure

第一次・第二次の科目構成と選択戦略。ガイド内の「出題の特徴」セクションで参照される。

```yaml
exam_structure: |
  | 試験段階 | 科目群 | 問題数 | 形式 | 戦略 |
  |---|---|---|---|---|
  | **第一次試験** | 基礎科目 | 5問全部 | 択一式 | 全分野必須。合格ライン 60% |
  | | 適性科目 | 3問全部 | 択一式 | 技術者倫理・法令。全分野必須 |
  | | 専門科目 | 35問中25問選択 | 択一式 | **得意科目に集中する**。土質・基礎が確実なら 4 問。コンクリート 8 問。河川 9 問などで構成 |
  | **第二次試験** | 選択科目 | 記述式 | 複数科目選択可能 | 実務経験と深い知識が必須。一次で選択しなかった科目も選択可 |
  
  **選択戦略**: 35 問中 25 問選択 = 10 問スキップ可能。自分の得意分野で確実に点を取ることが合格の鍵。
```

---

## 出力先ディレクトリ — output_dir

生成されたガイドページの保存先。

```yaml
output_dir: content/general/pe-exam/
```

---

## サイドバー識別子 — sidebar_slug

サイドバー登録時の slug。URL: `/docs/{slug}` の一部になる。

```yaml
sidebar_slug: pe-exam
```

---

## frontmatter テンプレート

生成ページに付与される frontmatter のテンプレート。`{科目名}` は生成時に置換される。

```yaml
---
id: {slug}
title: "技術士一次試験 {科目名}の要点 — 建設部門"
sidebar_label: "{科目名}"
description: "{科目の概要}。技術士一次試験 建設部門の{科目名}分野の頻出テーマと重要ポイントを整理。"
exams:
  - pe
---
```

---

## 本文テンプレート

生成ページの本体構成。スキルは以下の構造で記事を生成します。

```markdown
# 技術士一次試験 {科目名}の要点

## 出題の特徴

{科目の出題傾向・問題数・選択戦略}

例：「土質・基礎は一次試験の基幹科目。4 問出題。計算問題と理論問題が 50:50 で出題。」

## 重要テーマ

### テーマ1: {テーマ名}

{既存テキストからの要点抽出。国交省技術基準との関連を明記}

:::note[試験のポイント]
{頻出の知識・計算パターン。一次試験で問われやすい}
:::

### テーマ2: {テーマ名}

...

## doboku-note での関連ページ

{既存テキスト・施工管理コンテンツへのリンク}

例：
- [土工 — 概説](docs/general/civil-general/earthwork/overview)
- [施工計画 — 工程管理](docs/general/construction-management/project-management/schedule)

## 参考資料

{国交省・日本技術士会の公開情報へのリンク}

例：
- [日本技術士会 — 試験制度](https://www.engineer.or.jp/)
- [国土交通省 河川技術基準](https://www.mlit.go.jp/)
```

---

## 補足

- **外部情報源の著作権ルール**: 市販参考書・他の受験対策サイト（pejp.net等）のオリジナル解説は参考にしない。必ず公式資料と既存資産のみを使用。
- **出力先**: `content/general/pe-exam/` 以下に複数ページが生成される（primary-guide.mdx, soil-foundation.mdx, concrete-points.mdx 等）
- **メンテナンス**: 試験制度（特に選択科目の構成）に変更があった場合、このテンプレートの `exam_structure` セクションを更新する。

---

## 次のステップ（Phase 2）

このテンプレートが完成した後、スキル側でパラメータ化が予定されています：

```bash
# Phase 1（現在）
/exam-guide --exam pe soil

# Phase 2（2026年秋予定）
/exam-guide --exam pe --topic soil
```

スキル側で `--exam` パラメータを追加し、複数試験対応の汎用化が実現します。
