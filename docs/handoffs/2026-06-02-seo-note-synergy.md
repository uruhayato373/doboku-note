---
title: SEO強化 × note連携 セッション（2026-06-02）— 実施内容と評価方法
---

# SEO強化 × note連携 セッション（2026-06-02）

doboku-note の**オーガニック impressions 増加**を目的に、note資産と相乗する SEO 拡張を実施・本番デプロイした 2026-06-02 セッションの記録。戦略・評価基準の真実源は [docs/project/04_運営/06_seo-note-synergy-strategy.md](../project/04_運営/06_seo-note-synergy-strategy.md)。

---

## 1. 方針（確定）

- **重複の扱い = サイト新規作成のみ・note は現状維持**（サイト版は note と角度を変えて新規執筆＝Red Line #4 を回避）
- **ベクトル = 両輪（PE で型 → Civil 横展開）**
- **North star = impressions**（検索面積＋トピック権威）。clicks は副次
- 4レバー: L1 空白guide新設 / L2 内部hub-spoke / L3 note→サイト被リンク / L4 高imp低CTRのCTR改善

> [!note] 前提となる調査結果
> サイトは全面 index 可能（robots `index:true`）。impressions は PE ニッチ語（pos5-15）に集中し、広い情報系 head-term が手薄。フリー公開 note 約17本が解説トピックの SEO 価値を note 側に滞留させていた。note→サイト被リンクは既に75本（健全）。

## 2. 実施内容

| フェーズ | 内容 | 成果物 |
|---|---|---|
| A0 | 戦略doc 作成 | `06_seo-note-synergy-strategy.md` |
| A1 | PE「一般部門と総監の違い」新設 | `pe-comprehensive-management-general-vs-comprehensive` |
| A2 | PE空白guide 3本（workflow） | `public-engineer-qualification-map` / `public-servant-comprehensive-merit` / `private-engineer-comprehensive-merit` |
| A3 | exam-index hub に「関連ガイド」節を追加し新4guideへspoke配線 | `exam-index` |
| A5 | 高imp低CTR 7ページの seoTitle/description リライト（workflow） | jisec / break-even-point / conformity-bias / cost-driver / digital-rights / push-production / tripod-theory |
| B1 | Civil guide | `civil-construction-1-guide-vs-pe`（施工管理技士と技術士の違い・civil↔PE橋渡し） |
| B2 / C | Civil guide クラスタの内部重複を精査 → **削除でなく差別化＋クラスタ化**に方針転換 | 下記 |

新規guide計6本（PE4＋Civil2）。いずれも note と差別化・公的データ準拠・内部リンク・NoteLink funnel。

### B2/C の経緯（重要な学び）

- Civil-1 guide に近接トピック（1級vs2級 / 勉強法 / 年収 / 難易度）が複数あることを検出。当初「重複→削除＋301統合」を計画。
- ユーザー判断で **「切り口が違うなら残す」** に転換。精査の結果、既存ページは seoTitle/intent が分かれ SeeAlso/RelatedKeywords で相互リンク済み＝**重複でなくクラスタ**と確認。
- 対応（削除なし）: 一旦削除した `guide-1-vs-2` を**復活**し、近接ペアの差別化シグナル＋相互リンクのみ補強。
  - 1vs2: `guide-1-vs-2`（違いの**詳細比較**）⇔ `guide-grade-comparison`（**どちらを選ぶ**判断）。grade-comparison の shortTitle を「1級と2級どちらを選ぶ」に変更し衝突解消。
  - 勉強法: `guide-study-method`（独学で合格できる?・受験資格・時間=入口）⇔ `guide-study-plan`（学習スケジュール）相互リンク。
  - 年収トリオ（market-value / salary-up / career-salary）は intent 分離＋相互リンク済 → 現状維持。

> [!important] 学び — カニばりは「同一クエリの正面競合」時のみ実害
> 切り口が分かれ相互リンクされていれば、近接トピックの複数ページは**両立＝検索面積（impressions）増**になる。当初の一律「重複→削除」は過剰だった。実害の有無は C1（GSC）で判定する。

## 3. デプロイ

- `develop` → `main` を promote し、GitHub Actions `Deploy to production (Cloudflare Pages)` 成功（run 26779764413, 7m47s）。
- 本番検証（`.pages.dev`）: トップ＋新規/編集6ページ HTTP200・`<main>`、exam-index hub の新guideリンクも反映。

主要コミット（develop=main 同期済）: `cd5641935`(A0/A1) / `b3cd98922`(A2/A3/B1) / `31ee0bf35`(A5) / `d2eed393a`(doc) / `059e5137d`(B2) / `3117379ee`(C)。

## 4. どう評価するか（C1）

> [!important] 新規スケジュールは不要
> GSC 計測は既に自動化済み。**金 06:00 JST の CI `fetch-metrics.yml`** が GSC データを取得・コミットし、**日 22:03 JST のクラウドルーティン `doboku-note weekly PDCA`** がレビューする。C1 は「~2026-06-30 頃の週次レビュー時に、この実験固有の効果を見る」だけでよい。

評価軸・決定ルール・対象クエリの詳細は [06_seo-note-synergy-strategy.md の Phase C / C1](../project/04_運営/06_seo-note-synergy-strategy.md)（評価表）を参照。要点:

- **新規guide（L1）**: 対象クエリで impressions>0・indexed か → 機能すれば増産、不発なら見直し/撤退
- **CTR（L4）**: 7ページの clicks/CTR が 〜05-28 比で改善か → 改善すれば他の高imp低CTRへ展開
- **カニばり監査**: 近接ペア（grade-comparison⇔guide-1-vs-2 / study-method⇔study-plan）が**同一クエリ**で正面競合・position 分散していないか → していれば canonical選定＋301へ切替、住み分けていれば維持
- **留意**: ベースライン低・季節影響・小数値ノイズ → 傾向で判断（デプロイ起点 2026-06-02）

## 5. 残課題・申し送り

> [!warning] 並行セッションの未完成 WIP が push をブロック中
> デプロイ中、別セッションが `src/app/docs/[...slug]/page.tsx` に「独学サポート」講座アフィリエイト（`SchoolAffiliate` 部品）を A/B 追加中だった（**型エラー `Type '"独学サポート"' is not assignable to type '"SAT"'` を含む未完成・未コミット**）。本セッションでは**一切変更せず stash 退避→自分のコミットのみ deploy→pop で復元**。
> - **本番には含まれていない**（未コミット）。
> - 作業ツリーに復元済み（`page.tsx` M ＋ `SchoolAffiliate/` 未追跡 ＋ `quality-cycle-state.json` M＝別ルーティン）。
> - **この WIP を完成・型修正するまで pre-push type-check で push がブロックされる**（`provider` 型 union に `'独学サポート'` を追加すれば解消見込み）。完成は元セッション側で。

> [!todo] 次にやること
> - 並行 WIP（page.tsx 独学サポート）の完成・型修正（元セッション）。本ドキュメントのコミットも、それ解消後に push 可能（docs のみ・デプロイ不要）。
> - C1 評価（~2026-06-30 の週次レビュー時、上記4軸）。効いた型を増産・Civil横展開、カニばり確定なら301統合。
> - （任意）note→サイト被リンクを新 canonical ページへ最適化（note 編集を伴うため別途判断）。
