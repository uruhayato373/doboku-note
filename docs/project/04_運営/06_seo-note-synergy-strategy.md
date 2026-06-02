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
| L5 | striking-distance（pos5-9）ページへの FAQ schema 付与（CTR/PAA・SERP feature） | 小〜中 | 小 | 既存impの換金・PE keyword の構造化データ欠落是正 |

## 着手前チェック（新規ページ重複回避）

1. サイトに既存の同等 hub/page が無いか確認（例: 試験概要/申込/合格戦略/総監とは は `exam-index`/`exam-application-guide`/`exam-passing-strategy`/`general-overview` が既存 → **新設せず強化 or spoke 化**）。
2. 同テーマ note があれば角度を変える（中立リファレンス化）。
3. 数値・事実はサイト既存ページと一貫させる（例: 総監 合格率は **15〜23%** を canonical とする。`exam-index` 準拠）。

## ロードマップ（優先順位）

### Phase A — PE で型を確立
- [x] **A0**: 本戦略doc 作成（2026-06-02）
- [x] **A1**: `general-vs-comprehensive`（一般部門と総監の違い）新設（中立比較リファレンス・note funnel）— 2026-06-02
- [x] **A2**: PE guide 3本新設（差別化）— `public-engineer-qualification-map`（資格地図・site 0本）/ `public-servant-comprehensive-merit`（公務員メリット・発注者視点）/ `private-engineer-comprehensive-merit`（民間メリット・経審）— 2026-06-02（workflow）
- [x] **A3**: `exam-index` hub に「関連ガイド」節を追加し新 guide 4本へ spoke 配線 — 2026-06-02
- [ ] A4: note→サイト deep-link 監査（L3）— **保留**（note 現状維持の方針。新 canonical ページへの張替えは note 編集を伴うため次段階で判断）。現状 note→サイト被リンクは75本で健全
- [x] **A5**: 高imp低CTR 7ページの seoTitle/description リライト（jisec / break-even-point / conformity-bias / cost-driver / digital-rights / push-production / tripod-theory）— 2026-06-02（workflow）

### Phase B — Civil 横展開（型を流用）
- [x] **B1**: Civil guide 新設 — `civil-construction-1-guide-vs-pe`（施工管理技士と技術士の違い・civil↔PE 橋渡し）採用 — 2026-06-02
- [x] **B2**: `guide-vs-pe` を `guide-career-path` の関連に配線。civil 経験記述マガジンは**既に各2本サイトリンク済み**のため note→site は達成済み（追加は過剰リンク回避で見送り）— 2026-06-02

> **重要所見（2026-06-02）— Civil guide クラスタは「重複」でなく「切り口違いのクラスタ」**: B2 着手時、近接トピックの guide が複数あることを検出したが、精査の結果 **seoTitle/intent が分かれ、SeeAlso/RelatedKeywords で相互リンク済み**（前制作で差別化＋クラスタ化されていた）。**削除/統合は不要**と判断（流入を増やす検索面積として活かす方針）。カニばりは「同一クエリの正面競合」時のみ実害で、切り口が分かれていれば両立する。
>
> **対応（2026-06-02・削除なし）**: 近接ペアの差別化シグナルと相互リンクのみ補強。
> - 1級vs2級: `guide-1-vs-2`（違いの**詳細比較**）と `guide-grade-comparison`（**どちらを選ぶ**判断ガイド）に役割分担。一旦削除した `guide-1-vs-2` を復活し、shortTitle/相互リンクで差別化。
> - 勉強法: `guide-study-method`（独学で合格できる?・受験資格・勉強時間=**入口**）⇔ `guide-study-plan`（**学習スケジュール・進め方**）を相互リンク。
> - 年収: `guide-market-value`（市場価値）/ `guide-salary-up`（上げ方how-to）/ `guide-career-salary`（年収いくら・手当相場）は intent が分かれ相互リンク済み → 現状維持。
> - 難易度: `guide-difficulty`（難易度・合格率）と `guide-exam-overview`（試験概要）は別クエリ → 現状維持。
>
> 効果は **C1（GSC 再計測）** で判定し、もし同一クエリで正面競合が確認されたら、その時に canonical 選定＋301 統合を再検討する。

### Phase C — 計測（効果判定）

- [ ] **C1: 本SEO群の効果判定（評価目安日 〜2026-06-30）** — デプロイ起点 2026-06-02 ＋ 約4週。新規ページのインデックス・順位確立に数週かかるため。

**データ源（新規取得は不要）**: 既存自動計測を参照する。
- 金 06:00 JST の CI `fetch-metrics.yml` が `npm run fetch-gsc-data` で `.claude/state/metrics/gsc/`（`gsc-query-*` / 7日窓 `gsc-date-*`）にコミット。
- 日 22:03 JST のクラウドルーティン `doboku-note weekly PDCA` が上記を読み review + PR。
- → C1 は「~6/30 頃の週次レビュー時に、下記の軸で**この実験固有の効果**を見る」だけでよい。専用ルーティンは作らない（routine 重複禁止の教訓）。

**評価軸と決定ルール**:

| 軸（対応レバー） | 見るもの | 成功＝次アクション | 不発＝次アクション |
|---|---|---|---|
| 新規guide獲得（L1） | 6新guideが対象クエリで impressions>0・indexed か | 型が機能 → 空白guide増産・Civil横展開 | タイトル/内容/内部リンク見直し or 撤退 |
| CTR改善（L4） | CTRリライト7ページの clicks/CTR が前（〜05-28）比で改善か | 他の高imp低CTRへ展開 | seoTitle/description 再考 |
| カニばり監査 | 近接ペアが**同一クエリ**で両方表示され position 分散/低迷か | （別クエリで住み分け＝OK・維持） | 同一クエリ競合確定 → canonical選定＋301統合へ切替 |
| hub配線（L2） | exam-index 経由で新guideがインデックス/評価されているか | 維持 | 内部リンク増強 |

**対象（クエリ例）**: general-vs-comprehensive（技術士 一般部門 総監 違い）/ public-engineer-qualification-map（自治体 技術職員 資格）/ public-servant・private-merit（公務員・建設会社 総監 メリット）/ guide-vs-pe（施工管理技士 技術士 違い）。CTR: jisec / break-even-point / conformity-bias / cost-driver / digital-rights / push-production / tripod-theory。カニばり監視ペア: grade-comparison⇔guide-1-vs-2 / study-method⇔study-plan。

**留意**: ベースライン低・受験季節影響・小数値ノイズ大 → 単月の増減でなく**傾向**で判断。クリーンな7日WoWは organic スナップショットが溜まる時期以降。

### 実装メモ（2026-06-02 追補: L5 FAQ schema = striking-distance 強化）
GSC ページ単位（2026-04-27〜05-25）で striking-distance を実査した結果の知見と施策:
- **最重要所見**: 高imp ページ（`textbook-scraper` 753imp/pos8.7、`primary-r07-a/b` 286/122imp、過去問全般）は **seoTitle・定義・FAQ 等が既に最適化済み** → 0% CTR は on-page でなく **順位（権威）律速**。表の重複追加（冗長概要表禁止）になるため churn せず "rank-limited" と判定。
- **構造化データの体系的欠落を是正**: PE keyword ページは FAQ schema 未付与が多数（civil は完備）。**page-1（pos5-9）かつ高imp** の PE 9ページに FAQPage（frontmatter `faqs`）を追加（回答は各ページ本文から正確に派生・捏造なし）:
  - 第1弾: `jisec`(163imp) / `asch-conformity-experiment`(121) / `blind-drill`(104) ＋ `keyword-2026`(363) の冗長 seoTitle 短縮（commit 2d271a30c）
  - 第2弾: `break-even-point`(63) / `catastrophe-bias`(61) / `appraisal-three-principles`(51) / `end-of-pipe`(58) / `cost-driver`(56)（commit 262f52d9c）
- **pos25+ の rank-buried ページは対象外**（FAQ ではクリック改善しない＝順位律速）。L5 の費用対効果は pos5-9 の少数ページに限定するのが妥当。
- **C1 計測対象に追加**: 上記9ページの CTR / position 推移を ~6/30 の週次レビューで確認。
- **次レバーの本命（所見）**: striking-distance on-page は概ね出し切り → 残りは L1/L2（権威・面積、進行中）と **P2 = 被リンク資産（無料 web ツール等、サイト未保有）** が上限を上げる本命。

### 実装メモ（2026-06-02）
- A1–A5・B1 を 1 セッションで実装（A2/A5/B1 は workflow で並行生成 → 親が QA・hub配線・索引・コミット統合）。
- QA で検出・修正: guide-1-vs-2 の資格手当具体額 → site 方針（一律相場なし）へ／guide-1-vs-2 の太字崩れ（経審）→ 括弧外出し／guide-vs-pe 誤字。
- 全6新ページ dev curl HTTP200・コンパイル/太字/文字化けなしを確認。
- B2/C: 近接重複は削除でなく「保持＋差別化＋クラスタ化」へ方針転換（guide-1-vs-2 を一旦削除→復活し差別化）。詳細は [handoff 2026-06-02](../../handoffs/2026-06-02-seo-note-synergy.md)。
- **デプロイ済（2026-06-02、develop→main→Cloudflare Pages, run 26779764413）**。本番 .pages.dev で全ページ HTTP200 確認。commit: cd5641935 / b3cd98922 / 31ee0bf35 / d2eed393a / 059e5137d / 3117379ee。

## 参照

- 雛形: `.local/r2/posts/civil-construction-1/guide-exam-overview/article.mdx`（guide 構造）
- コンポーネント: `Callout` / `RelatedKeywords` / `NoteLink` / `SeeAlso`（`src/lib/component-loader/index.ts`）
- Red Line 真実源: `docs/note/技術士総監/noteコンテンツ計画.md`・`docs/project/03_SNS/02_チャネル動線設計.md` §7
- GSC データ: `.claude/state/metrics/gsc/`（最新 2026-05-28）
- 関連: [05_civil-affiliate-seo-expansion.md](./05_civil-affiliate-seo-expansion.md)
