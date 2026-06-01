---
title: SEO強化 × note連携 戦略（impressions増加）
description: doboku-note のオーガニック impressions を増やすための、note資産を活かした「空白guide新設＋内部リンク＋note→サイト被リンク＋CTR改善」の4レバー戦略と優先ロードマップ
created: 2026-06-02
status: 実行中
---

# SEO強化 × note連携 戦略（impressions増加）

doboku-note のオーガニック検索 **impressions 増加** を北極星に、note資産との相乗を設計する実行戦略。Red Line（[note計画](../../note/技術士総監/noteコンテンツ計画.md)・[チャネル動線設計](../03_SNS/02_チャネル動線設計.md) §7）と整合させ、優先順位つきで段階実装する。

## 背景（2026-06-02 調査）

- **サイトは全面 index 可能**（`src/lib/metadata.ts` で `robots: index:true`、`out/robots.txt` は Google 全許可・AI スクレイパーのみ block）。indexing はボトルネックではない。
- impressions は **PE キーワードページ（pos 5–10 のニッチ総監語）に集中**。広い情報系 head-term（「総監 とは / 難易度 / 一般部門 違い」等）が手薄。高imp低CTR が多数（GSC 2026-05-28: `jisec` 73imp/0clk、`ppm分析` 33imp/0clk 等）。
- **フリー公開済み note 記事 約17本**が検索需要のある解説トピックを抱えるが、その SEO 価値は note.com に accrue しサイトに乗っていない。note→サイト被リンクは既に75本（健全）。

## 確定方針（2026-06-02 ユーザー判断）

1. **重複の扱い = サイト新規作成のみ・note は現状維持**。サイト版は note と「角度・粒度」を変えた新規執筆で verbatim 重複を作らない。
2. **ベクトル = 両輪（PE で型 → Civil 横展開）**。
3. 段階実装（戦略doc → 最優先ステップ → 計測 → 増産/撤退）。

## Red Line #4 の運用解釈（重要）

> **Red Line #4**: note と doboku-note に同じ技術解説を両方載せない（note の DA がサイトを沈める）。

本戦略はこれを **破らない**。判定ルール:

- 解説系 note トピックを**サイトに新規・差別化展開するのは #4 違反ではない**（verbatim コピーが違反）。サイト＝中立・体系・データ準拠のリファレンス／note＝体験・感情・要約・有料誘導、と角度を分ける。
- 同テーマ note があれば、サイト→note は `<NoteLink>` で「体験的深掘り」誘導し **funnel 化**（競合化しない）。note→サイトの既存被リンクは権威供給として活かす。
- #2（変換方向はサイト→note・サイト優先）の精神も維持＝サイトを SEO 本体として育てる。

## 北極星と4レバー

North star = **impressions（検索面積 ＋ トピック権威）**。clicks は副次。

| # | レバー | 効き | 工数 | 位置づけ |
|---|---|---|---|---|
| L1 | 空白トピックの guide ページ新設（広い情報系 head-term・spoke 化含む） | 大（複利） | 中 | 最優先・impressions の本丸 |
| L2 | 内部 hub-spoke リンク（新guideを `exam-index`/5ピラーへ束ねる） | 中 | 小 | 権威＋回遊 |
| L3 | note→サイト deep-link 監査（被リンクをトップでなく新canonicalページへ） | 中 | 小 | 権威フロー・低工数 |
| L4 | 高imp低CTR ページの seoTitle/description 改善 | 小〜中 | 小 | 既存impの換金・即効 |

## 着手前チェック（新規ページ重複回避）

1. サイトに既存の同等 hub/page が無いか確認（例: 試験概要/申込/合格戦略/総監とは は `exam-index`/`exam-application-guide`/`exam-passing-strategy`/`general-overview` が既存 → **新設せず強化 or spoke 化**）。
2. 同テーマ note があれば角度を変える（中立リファレンス化）。
3. 数値・事実はサイト既存ページと一貫させる（例: 総監 合格率は **15〜23%** を canonical とする。`exam-index` 準拠）。

## ロードマップ（優先順位）

### Phase A — PE で型を確立
- [x] **A0**: 本戦略doc 作成（2026-06-02）
- [ ] **A1（最優先ステップ）**: 「技術士 一般部門と総合技術監理部門の違い」guide 新設（中立比較リファレンス。`general-overview`/`exam-index` とは別角度、note `一般部門との違い` とは別粒度）
- [ ] A2: PE guide クラスタの空白埋め（差別化前提）— 公務員が総監を取る意味 / 自治体技術職員の資格地図（site 0本）/ 定年後資格戦略（`second-career` と相補）。各 note フリー記事を deep-dive 誘導先に
- [ ] A3: `exam-index` hub を強化し新 guide 群を spoke として相互リンク（L2）
- [ ] A4: note→サイト deep-link 監査（L3）。新 canonical ページへ張り替え
- [ ] A5: 高imp低CTR トップ10の seoTitle/description リライト（L4）

### Phase B — Civil 横展開（型を流用）
- [ ] B1: 空白 guide を Civil に複製（難易度・合格率の実態 等。既存 exam-overview/study-plan/career と相補）
- [ ] B2: Civil 内部クラスタ ＋ civil 経験記述マガジン note → サイト deep-link

### Phase C — 計測
- [ ] C1: 2–4週後 GSC 再計測（impressions/CTR/position）。効いた型を増産、効かない型は撤退

## 参照

- 雛形: `.local/r2/posts/civil-construction-1/guide-exam-overview/article.mdx`（guide 構造）
- コンポーネント: `Callout` / `RelatedKeywords` / `NoteLink` / `SeeAlso`（`src/lib/component-loader/index.ts`）
- Red Line 真実源: `docs/note/技術士総監/noteコンテンツ計画.md`・`docs/project/03_SNS/02_チャネル動線設計.md` §7
- GSC データ: `.claude/state/metrics/gsc/`（最新 2026-05-28）
- 関連: [05_civil-affiliate-seo-expansion.md](./05_civil-affiliate-seo-expansion.md)
