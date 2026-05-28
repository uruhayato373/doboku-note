---
exam_id: civil-construction-2
exam_name: 2級土木施工管理技士試験対策
created: 2026-05-28
---

# 2級土木施工管理技士 — exam-guide テンプレート設定

このファイルは `/exam-guide --exam civil-construction-2` スキルで使用される設定値を定義します。

---

## ソースコンテンツ — source_paths

スキルが参照すべき、既存のコンテンツディレクトリ（2級は新規立ち上げのため、基本は2級配下のみを参照）。

```yaml
source_paths:
  第1次過去問: .local/r2/posts/civil-construction-2/primary-*/
  第2次過去問: .local/r2/posts/civil-construction-2/secondary-*/
  PDF 教科書: docs/textbook/２級土木施工管理技士/
```

**注**: 1級 (`civil-construction-1`) のテキスト資産は 2級 guide では原則参照しない（独自執筆方針）。ただし共通の制度説明・法令解説は引用可。

---

## 外部情報源 — external_sources

著作権フリーの公開情報源（必要時のみ）。

```yaml
external_sources:
  全国建設研修センター公式: https://www.jctc.jp/mondai/
  e-gov 法令検索: https://elaws.e-gov.go.jp/
```

---

## 試験構成 — exam_structure

第一次・第二次の科目構成と出題形式。ガイド内の「出題の特徴」セクションで参照される。

```yaml
exam_structure: |
  | 試験段階 | 実施時期 | 科目 | 問題形式 | 出題数 | 特徴 |
  |---|---|---|---|---|---|
  | **第一次検定（前期）** | 6月 | 土木一般・専門土木・法規・施工管理法 | 4択 | 41問程度 | 17歳以上なら誰でも受験可。施工管理法に比重あり |
  | **第一次検定（後期）** | 10月 | 同上 | 4択 | 61問 | 第2次と同日実施、第1次の主目標 |
  | **第二次検定** | 10月 | 経験記述・土工・コンクリート工・施工計画・品質管理 | 記述式 | 9問（必須＋選択） | 主任技術者視点で記述。採点は1級より緩いが論点漏れは大幅減点 |
```

---

## 出力先ディレクトリ — output_dir

生成されたガイドページの保存先（Convention B、実態に合わせる）。

```yaml
output_dir: .local/r2/posts/civil-construction-2/
```

各 guide は `guide-2-{slug}/article.mdx` として配置。

---

## サイドバー識別子 — sidebar_slug

URL: `/docs/civil-construction-2-{slug}` の一部になる。

```yaml
sidebar_slug: civil-construction-2
```

---

## frontmatter テンプレート

生成ページに付与される frontmatter のテンプレート。`{分野名}` は生成時に置換される。

```yaml
---
title: "{分野名} 重要ポイント — 2級土木施工管理技士試験対策"
seoTitle: "{分野名} 重要ポイント | 2級土木施工管理技士 | doboku-note"
description: "{分野の概要}。過去問の出題傾向に基づく頻出テーマと重要ポイントを整理。2級土木施工管理技士試験対応。"
category: "civil-construction-2"
group: "guide"
tags: ["guide", "{分野タグ}"]
exams:
  - civil-construction-2
published: true
publishedAt: "YYYY-MM-DD"
---
```

---

## 本文テンプレート

生成ページの本体構成。

```markdown
# {分野名} 重要ポイント

## 出題傾向

{過去問からの分析。2級では何年度・どの形式・何問出題されているか。前期/後期で差異がある場合は明示}

例：「2級第1次検定（後期）では平均 5問/年。土工計算問題が 60% を占める。」

## 頻出テーマ

### テーマ1: {テーマ名}

{2級レベルに最適化した用語解説・基本原理から始める}

<Callout type="exam" title="頻出論点">
{この分野で問われやすい知識・基本パターン}
</Callout>

### テーマ2: {テーマ名}

...

## 過去問リンク

{関連する過去問へのリンク一覧、2級配下から選ぶ}

例：
- [令和7年度 第1次検定（後期）問XX](/docs/civil-construction-2-primary-r07-kouki#問題-noXX)
- [令和6年度 第1次検定（後期）問XX](/docs/civil-construction-2-primary-r06-kouki#問題-noXX)

## 1級へのステップアップ

{2級合格後、1級を目指す方向けの自然な誘導。押し付けない}

<SeeAlso
  href="/docs/civil-construction-1-guide-{該当 slug}"
  title="1級向け {分野名} 詳細解説"
  reason="2級の基礎を固めた後、応用論点を学びたい方へ"
/>
```

---

## 補足

- **出力先**: `.local/r2/posts/civil-construction-2/guide-2-{slug}/article.mdx` として複数ページが生成される
- **著作権**: 既存資産（2級過去問 MDX）と公開試験問題を再構成するのみ。新規創作なし
- **メンテナンス**: 試験制度に変更があった場合、このテンプレートの `exam_structure` セクションを更新する
- **1級との関係**: 1級ガイドの複製は禁止。独自執筆で SEO 重複を回避

---

## 推奨 guide リスト（Phase 2 で 10本完成予定）

| guide slug | 内容 |
|---|---|
| `guide-2-strategy` | 2級制度全体像（前期/後期・受験資格緩和・3種別） |
| `guide-2-experience-writing-basics` | 2級経験記述の書き方（主任技術者視点・採点基準） |
| `guide-2-experience-writing-examples` | 2級経験記述 模範例文 5パターン |
| `guide-2-earthwork-basics` | 土工 基礎範囲（2級頻出論点） |
| `guide-2-concrete-basics` | コンクリート 基礎範囲 |
| `guide-2-construction-management-basics` | 施工管理法（工程・品質・安全・環境） |
| `guide-2-law-basics` | 法規（労安法・建設業法・道路法） |
| `guide-2-quality-management-basics` | 品質管理 |
| `guide-2-zenki-preparation` | 前期試験 直前対策（5月発信） |
| `guide-2-last-minute-2026` | 後期＋二次 直前対策（10月発信） |

## 参照

- `.claude/skills/authoring/templates/exam-guide/civil-construction-1.md` — 1級テンプレ（共通構造の真実源）
- `.claude/skills/authoring/exam-guide/SKILL.md` — exam-guide スキル本体
- `docs/reference/content-principles.md` — コンテンツ原則・末尾テンプレ
