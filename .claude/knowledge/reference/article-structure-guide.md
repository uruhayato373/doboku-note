---
title: 記事構成ガイド（civil ガイド記事）
---

# 記事構成ガイド（civil ガイド記事）

1級・2級土木施工管理技士（`civil-construction-1` / `civil-construction-2`）の **ガイド記事（`group: guide`）** を新規執筆・拡充するときの構成テンプレ。「基本構成・文字数目標・Callout 使い方・見出し構成・CTA の型」を1ファイルで通しで確認できるようにまとめる（DN-0053）。

**位置づけ**: 本ガイドは新しいルールを作らない。真実源は一貫して `.claude/knowledge/reference/content-principles.md`（§5/§7.1/§17/§18/§20/§24/§25/§26）であり、本ガイドはその中から **civil ガイド記事の執筆時に実際に当てはまる箇所だけを抜き出し、civil の実例で示す** 実装ガイドである。矛盾が生じた場合は content-principles.md が優先する。

**由来**: 見出し構成・リード文・CTA の型は外部ブログの構成テンプレ（`.claude/knowledge/reference/reference-sites.md`「たけの副業ロード」の記事構成テンプレ）を参考に、content-principles.md §26（読者ベネフィット型リード）へ既に取り込み済み。本ガイドはそれを civil ガイド記事向けに具体化する。

## 対象

`category: civil-construction-1` または `civil-construction-2`、`group: guide` の MDX。textbook（`group: textbook`）・キーワードページ（`group` 未設定）・過去問（`primary`/`secondary`）は対象外（構成が別 — textbook/guide 共用の校正観点は `civil-construction-review` を参照）。

## 1. 基本構成（frontmatter）

```yaml
title: <検索キーワード込みのタイトル>
shortTitle: <カード表示用の短縮タイトル>
subtitle: <補足サブタイトル（任意）>
description: >-
  <150字前後。何を横断整理する記事か・根拠データの種類>
category: civil-construction-1 | civil-construction-2
group: guide
tags: [guide, <テーマタグ>]
published: true
publishedAt: 'YYYY-MM-DD'
seoTitle: <検索結果表示用タイトル（｜区切りで要素を列挙）>
faqs:
  - q: <想定質問>
    a: <120字前後の回答>
```

`title`/`seoTitle`/`description`/`category`/`tags`/`published` は全記事共通の必須6項目（CLAUDE.md）。ガイド記事はこれに加えて `faqs` を付けると `<StructuredData>` が FAQPage を出力し SERP 占有面積が広がる（content-authoring.md「FAQ frontmatter」）。

## 2. 見出し構成の型

ガイドは大きく2型に分かれる（§20 の Type-1/Type-2 を civil で具体化）。どちらも **H2 以下のみ使用**（H1 は frontmatter の `title` から自動生成・CLAUDE.md §2）。

| 型 | 用途 | H2 の数 | civil 実例 |
|---|---|---|---|
| **俯瞰・横断型**（Type-2） | 制度・キャリア・年収など複数トピックを横断整理 | 4〜6 個 | `guide-career-path`（資格ラダー→できること→難易度→年収→発注者視点→次の一手） |
| **戦略・手順型**（Type-1） | 受験戦略・申込手順など読者の次の行動を1つに絞る | 4〜7 個 | `guide-exam-overview`（試験制度→難易度→申込〜合格の流れ→キャリア） |
| **ピラー型**（大型・情報網羅） | 頻出論点を1ページで網羅する重量ページ | 5〜8 個 | `guide-last-minute-2026`、`guide-four-management`、`guide-law-key-points` |

**見出し直下は必ず1〜2文のリードから始める**（H2/H3 直後にいきなり表・箇条書き・図・Callout を置かない、§2/§17-2、機械検知 `lint-mdx-mobile` 6-2〜6-5）。

## 3. リード文の型（記事冒頭）

冒頭（最初の H2 より前の地の文）は **§26 読者ベネフィット型リード** で書く。civil ガイドは「ですます調」（文体ルール）。

1. **共感・問題提起**（1文）— 読者のつまずき・不安を言い当てる
2. **この記事でわかること**（1〜2文）— 何を横断整理する記事か
3. **結論の方向性**（1文）— 記事全体の結論を先出し（PREP の P）

**禁止**: 冒頭をいきなり `<Callout>` で始めない（§7.1/§26）。冒頭直後にいきなり表・箇条書きを置かない。

civil 実例（`guide-career-path` 冒頭）:

> 土木施工管理技士は **2級 → 1級**、さらに **技術士（建設部門・総合技術監理部門）** へと続く資格ラダーの一部です。本ページでは、各段階で「何ができるようになるか」「難易度」「転職市場での評価」を横断的に整理します。試験対策そのものではなく、**資格をキャリアの中でどう位置づけるか**を、発注者（自治体土木職）と民間の両方の視点から扱います。

## 4. 各 H2 セクションの型

1. **導入リード**（200〜400字目安・§17）— そのセクションで何を扱うかを地の文で示す
2. **本文**（散文中心。表・箇条書きは整理のための補足・§17-4）
3. **（任意）Callout「試験のポイント」** — 1 セクション 1 個まで（下記5節）

散文比率は記事全体で **60% 以上** を目安にする（§17-3）。表・箇条書きだけで構成された H2 は概念説明が薄い兆候（機械検知 `lint-mdx-mobile` 12-2）。

## 5. Callout の使い方（civil ガイド版）

civil の guide ピラー型（H2 5〜8個の重量ページ）は、content-principles.md §5「適用範囲と例外」により `<ExamPoint>` の代わりに `<Callout type="note" title="試験のポイント">` を使う運用が定着している。

- **1 セクション 1 個まで**（合計 5〜8 個が標準）。3個以上の連続は禁止（§7.1-5、機械検知 9-14）
- **見出しと Callout を直結しない**: 「H2 → 1〜2文のリード → Callout → 本文」の順（機械検知 6-5）
- **例題・計算例は Callout に入れない**: `#### 例題1：…` の見出し＋地の文で書く（Callout は本文を担わない・§7.1-1、機械検知 9-15）
- **末尾に総括 ExamPoint は不要**（重複になる・§20「ガイドで使ってはいけないセクション」— `## 総合技術監理における位置づけ`・`## 参考資料` はキーワードページ専用でガイドには置かない）

商業 CTA（`<CareerAffiliate>`・note magazine 誘導）は Callout でなく専用コンポーネントで扱う（§7.1 type 対応表の `tip` はキーワードページ向けの用法であり、civil ガイドの CTA は §6 の末尾パターンに従う）。

ベンチマーク: `guide-last-minute-2026` / `guide-four-management` / `guide-law-key-points`（Callout 7〜12個で構造的に成立、§5）。

## 6. 文体・文末（§24）

- 「ですます調」に統一（である調との混在禁止）
- 文末の単調回避: 「〜です。」「〜ます。」が3文以上連続しない（体言止め・断定形・「〜でしょう」等で変化を付ける、機械検知 15-1）
- 1文 60〜80字を目安（機械検知 15-2）

## 7. 文字数目標（§25）

- 本文（frontmatter 除く・空白除去後）**3,000字以上**が公開品質の下限（`npm run check-guide-length`）
- 各 H2 セクションの散文導入は **200〜400字**（§17-2）
- **字数合わせの水増しはしない**。質の番人は字数でなく `guide-qa` の5軸ルーブリック（導入/読みやすさ/ボリューム/導線/モバイル視認性）

## 8. 末尾構成・CTA の型（§20）

civil ガイドは記事の性質で末尾 CTA を使い分ける。**転職系（キャリア・年収）は note 誘導をしない**（現行運用として意図的にゼロ。転職系は `<CareerAffiliate>` または本文中の自然なツールリンクに留める）。

| 記事の性質 | 末尾セクション名の例 | CTA 構成 | civil 実例 |
|---|---|---|---|
| キャリア・年収・転職 | `## 次の一手をどう選ぶか` | `<RelatedKeywords>` のみ（note 誘導なし・ツールリンクは本文中に自然配置） | `guide-career-path` |
| 受験戦略・申込手順 | `## ○○の選択肢` | 散文1〜2段落 → `<CareerAffiliate>`（任意）→ `<RelatedKeywords>` → `<MagazineCard>` | `guide-exam-overview` |

共通ルール:

- `<RelatedKeywords>` は最後のコンテンツセクション末尾に1個（§18）
- `## 参考資料` / `## 総合技術監理における位置づけ` は置かない（§20、ガイド専用の禁止セクション）
- `<MagazineCard>` を置く場合は本文末尾の地の文（1〜2文）で自然に紹介してから置く（価格直書き禁止・§14-c 相当）

## 9. 執筆・校正の担当分離

| フェーズ | 担当 |
|---|---|
| 新規執筆（本ガイド準拠） | `civil-guide-writer`（Generator） |
| 既存記事の弱点軸リライト | `civil-textbook-rewriter`（Generator・`civil-construction-review` の評価待ち） |
| 全資格横断ガイドのリライト | `guide-rewriter`（Generator） |
| ガイド軸5軸評価 | `guide-qa`（Evaluator・audit-only） |
| 事実検証（合格率・制度・年収等） | `guide-fact-checker`（Evaluator・WebSearch） |

## 参照ドキュメント

- `.claude/knowledge/reference/content-principles.md` — §5（ExamPoint/Callout 例外）・§7.1（Callout 5判定基準）・§17（散文中心）・§18（末尾塊化禁止）・§20（ガイド末尾構成）・§24（文体）・§25（文字数下限）・§26（リード文の型）
- `.claude/knowledge/reference/reference-sites.md` — 記事構成テンプレの参考出典（たけの副業ロード）
- `.claude/knowledge/reference/content-authoring.md` — frontmatter 実装規約・FAQ structured data
- `.claude/agents/guide-qa.md` — ガイド軸5軸ルーブリック（Evaluator 側の真実源）
- `.claude/agents/civil-guide-writer.md` — 本ガイドを真実源とする新規執筆 Generator
