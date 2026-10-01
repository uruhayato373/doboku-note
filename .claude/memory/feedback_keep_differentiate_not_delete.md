---
name: keep-differentiate-not-delete
description: 近接トピックの複数ページは安易に削除/統合せず、切り口が違えば差別化＋相互リンクで活かす
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 24f5177f-f310-465b-bf73-bf9d66a59cea
---

近接トピックの複数ページを見つけても、**安易に「重複→削除/301統合」しない**。切り口（intent / seoTitle）が違えば、削除でなく **差別化シグナル＋相互リンクでクラスタ化** して両方活かす（2026-06-02、Civil guide クラスタで指摘）。

**Why:** 検索カニばりの実害は「**同一クエリで正面競合**」したときだけ。切り口が分かれ相互リンクされていれば、複数ページは両立し、むしろ**検索面積（impressions）増**になる。実際、Civil の guide-grade-comparison / guide-1-vs-2 / study-method / study-plan / 年収トリオは既に seoTitle と SeeAlso/RelatedKeywords で差別化済みのクラスタだった。当方の当初「一律削除」案は過剰で、ユーザーに是正された。

**How to apply:**
1. 近接ページを見つけたらまず seoTitle / 狙うクエリ / 相互リンクを精査（既に住み分け＆クラスタ化されていないか）。
2. 切り口が違う → 差別化補強（shortTitle 衝突解消・cross-link）で残す。同一クエリ正面競合が**実データ（GSC）で確認**できて初めて canonical 選定＋301 を検討。
3. live・indexed ページの削除/統合は SEO 影響大 → 自動実行せず必ず承認を得る。未デプロイの自作重複のみ即削除可。

関連: [[related-keywords-prefix]] [[hub-strengthening-approach]]。戦略の真実源: `docs/project/04_運営/06_seo-note-synergy-strategy.md`。
