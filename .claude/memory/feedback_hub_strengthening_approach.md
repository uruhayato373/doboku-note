---
name: feedback_hub_strengthening_approach
description: "SEO判断: pos5-15のhubはseoTitle+リード文のクエリ整合だけで外科的に強化。impressions=0を即noindexにしない(季節性)。近接トピックは削除せず差別化+相互リンク"
metadata:
  type: feedback
---

## hub 強化は seoTitle + リード文の「クエリ整合」で外科的に
position 5-15 で頭打ちの hub は本文を大規模に書き直さず、**seoTitle + リード文（最初の200字）の検索クエリ整合**に絞る（2026-04-27 HIGH 2件 scraper, histogram + MEDIUM 1件 keyword-2026 で実施。本文は既に十分＝FAQ5・参考資料・図解あり。「動いてるものを壊さない」）。
1. 対象ページの実 GSC クエリを取得（`npm run fetch-gsc-data --dimension query --page <slug>`・90日・上位30）。
2. 主要クエリ（impr 上位1-3件）を確認し検索意図を判定（「○○とは」=定義+概要、「○○ 計算」=公式+例題）。
3. seoTitle を主要クエリに整合（複数クエリは「｜」区切り）。リード文先頭に「○○とは…」の定義を1文追加。本文は触らない（または最小限の追記）。
- **避ける**: 主要クエリと無関係な大規模リライト／タイトルの完全変更（既存の被リンク・評価を失う）／FAQ の追加削除。
- 例: scraper 旧「スクレーパ」→新「スクレーパとは｜3種類の特徴と運搬距離」（クエリ「スクレーパとは」8 imp）。histogram 旧「ヒストグラム・工程能力図」→新「工程能力図とは｜ヒストグラムとの違い・Cp Cpk」（「工程能力図」7 imp が最大）。
- **効果検証**: デプロイ2-4週後に GSC で position 変化を確認。impressions が下がっていない（クエリマッチ範囲が狭まっていない）ことを併記。改善判定＝position が1-3ポイント上昇＋impressions 横ばい以上。

## noindex 判断は時間軸とサイトライフサイクルを考慮
新規ドメイン＋季節性事業で「インデックス済＋過去N日 impressions=0」を機械的に「価値なし／noindex 化候補」と判定しない。大半は「まだ Google に評価されていない」ページ。
- **Why:** 2026-04-27、GSC API 診断後に「low-value 200-400ページの noindex 化」を推奨しユーザーに訂正された。doboku-note は v1.0 立ち上げ後3ヶ月の新規ドメイン、主戦場は6-7月の受験期。ピーク前の4月に noindex 化すると受験期流入を捨てる。真因はドメイン権威性不足で noindex で権威は上がらない。noindex 解除後の再インデックスは数週〜数ヶ月で誤判定コストが高い。
- **How to apply:** 「いま価値が無い」のか「まだ評価されていない」のかを問う。後者が大半＝即 noindex は推奨しない。代替: ①何もしない（権威性を待つ）②既存 hub 強化 ③外部被リンク獲得 ④独自データ構築。noindex 判断はピーク後（受験期後の8-9月）の実データを見てから。

## 近接トピックは削除せず差別化＋相互リンク（2026-06-02）
近接トピックの複数ページを見つけても安易に「重複→削除/301統合」しない。切り口（intent / seoTitle）が違えば差別化シグナル＋相互リンクでクラスタ化して両方活かす。
- **Why:** 検索カニバリの実害は「同一クエリで正面競合」したときだけ。切り口が分かれ相互リンクされていれば両立し検索面積（impressions）も増える。Civil の guide-grade-comparison / guide-1-vs-2 / study-method / study-plan / 年収トリオは seoTitle と SeeAlso/RelatedKeywords で既に差別化済みクラスタだったのに、当初「一律削除」案を出しユーザーに是正された。
- **How to apply:** (1) seoTitle・狙うクエリ・相互リンクを精査（既に住み分け済みでないか）(2) 切り口が違えば差別化補強（shortTitle 衝突解消・cross-link）で残す。同一クエリの正面競合が**実データ（GSC）で確認**できて初めて canonical 選定＋301を検討 (3) live・indexed ページの削除/統合は SEO 影響大＝自動実行せず必ず承認。未デプロイの自作重複のみ即削除可。戦略の真実源 `docs/project/04_運営/06_seo-note-synergy-strategy.md`。関連: [[feedback_sns_docs_url_flat_slug]]
