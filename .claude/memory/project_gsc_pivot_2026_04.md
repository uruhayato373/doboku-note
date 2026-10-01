---
name: project_gsc_pivot_2026_04
description: "GSC/SEO方針の統合記録。2026-04 内部施策打切り→2026-06 CTA最適化へ。AdSense有用性対策・GA4既定フィルタ・ピラー構造・コンテンツ復活(reference-materials)を含む"
metadata:
  type: project
---

2026-04-27 セッションの GSC 真因診断で確定した戦略方針。

> **2026-06-22 更新 — 前提失効**: index_ratio が 54%（4/27）→ **81.6%**（6/19 batch、`index-coverage-history.json` に反映済）に改善。+256 ページ追加後もむしろ上昇し、hygiene は redirect/404 とも 0。「ドメイン権威性の壁で半分未 index」という前提は失効した。流入減（impr 3 週 −30%・平均順位 23→37）の真因は ①新規ページ pos80-90 による blended 順位の希釈アーティファクト ②上位表示ページの CTR 欠落（pos5 で CTR0.5% 等）。打ち手の最優先は **CTR 最適化（seoTitle/description を実クエリ整合）**。被リンク/独自データは長期の天井上げで緊急度は下がった。真実源は [[reference_gsc_diagnosis_toolkit]] と docs/reference/gsc-management.md の 2026-06-22 ログ。以下の旧方針は歴史的記録として残す。

**Why**: ブランド月間 6.3 imp / 89% 幽霊ページ / referring_urls=0 が 99% という実データから、「ドメイン権威性不足 + 新規ドメイン待ち」が真因と確定。Issue #29 (内部リンク拡充) は実装としては正常（HTML 出力に内部リンク 82.5/ページ平均存在）だが、Google が認識・評価していない = 内部施策の効果限界。

**新方針**:
- Issue #29 (内部リンク拡充) は close 維持・追加施策しない
- Issue #160 (記述式独自データ) を Q2 最優先 — 独自性が権威性の核
- Issue #161 (SNS 自動投稿基盤) を Q2 中までに MVP — 外部被リンクの起点
- noindex 化は 2026-08 以降（受験期後）に再評価（Issue #171 close）
- KPI 変更: ex0 数値追跡 → PASS 件数の impressions/clicks 推移 + ブランド月間 imp

**How to apply**:
- GSC 数値（ex0/未登録）の悪化を見ても焦って内部施策を増やさない
- 「impressions=0 のページは"いま価値がない"のか"まだ評価されていない"のか」を必ず問う
- 新規ドメイン + 受験期前の文脈では後者が大半
- 効果検証は 2026-05-11 頃 + 受験期（6-7 月）後に集約

**廃止 / Close 済 Issue**:
- #29 内部リンク拡充 — 実装完了・効果限界
- #171 noindex 候補 — 時期尚早として close

**進行中**:
- #28 GSC Coverage Umbrella — 月次 PDCA 継続
- #160 総監記述式 思考パターン抽出 — Q2 最優先
- #161 SNS 自動投稿基盤 — Q2 MVP

**関連 commit**: `eb87d5c7` (診断ツール) `a0e33889` (生データ) `a4d27a48` `536047c5` (hub 強化)

**関連コメント**: Issue #28 の 2026-04-27 投稿 8 件

## 統合: AdSense「有用性の低いコンテンツ」対策（旧 adsense_low_value_2026_07・2026-07-04）
- 主因は非インデックス率: URL Inspection 全1,051 URL で265本(25%)が非インデックス。**内部品質スコア `quality-scores.json` の weighted は Google 索引判定と乖離する**（非インデックス薄層166本は全て weighted 2.2-3.0 で内部合格）→リライトの QA ゲートに weighted を使わない。判定は「本文実測字数＋独自散文密度」。画像クロップ・広告 CLS は主因でない。
- 内訳: W1=CEM 薄層キーワード166本（本丸）／W2=転職ガイド8本（権威性・鮮度が原因で審査問題でない）／W3-W7=過去問等の長尺重複（優先度最低）。
- 処置: 本文3,000字未満だった W1 薄層112本を全て3,000字超へリライト完了。**残る手番＝deploy→GSC sitemap 再送信＋主要 URL 手動索引登録→前回却下から2-4週空けて再申請**（SOP は docs/project/_archive/03_civil-adsense-resubmission.md:147-191）。
- リライト運用知見: サブエージェント・ストールの主因は WebFetch/WebSearch（会社PCプロキシ遮断）→web 禁止・既存参考 URL 維持を明示。keyword-rewriter に3ページ渡すとネスト委譲で遅延重複書込→「自身で直接編集しサブエージェントを spawn しない」と明示。巨大過去問ファイルの Read/grep もストール要因。キーバリュー表(項目|内容)は HIGH 違反→散文化。エージェント自己申告字数はマークアップ込みで2倍前後過大→frontmatter除去＋空白除去で計数。

## 統合: SEO 施策の恒久知見（旧 seo_phase1_phase2_2026_05）
- LCP: AdSense を `lazyOnload` に変更済み（`NEXT_PUBLIC_ADSENSE_EAGER=1` で即時ロールバック可）。`images.unoptimized:false` 化は Static Export 制約で実装不可。lab PSI のばらつき大→実効果は CrUX（28日後）で判断。
- 独自データ公開: `essay-keyword-frequency.json`・`/docs/pe-comprehensive-management-essay-data-2026`・`...-primary-statistics-2026`（R01-R07×280問 χ²=1.107＝正答番号偏りなし）。`llms.txt`＋`llms-full.txt`（`build-llms-full.mjs` 自動生成）。2026-05-17 ベースライン: Bing 252/Direct 101/Google 77/OpenAI 45（AI 検索合計 61 ≒ Google の79%）。

## 統合: GA4 取得の既定フィルタ（旧 ga4_default_filter）
`fetch-ga4-data.mjs` は 2026-05-17 以降、既定で country=Japan＋参照スパム5件除外。生データが要るときだけ `--include-all`。〜2026-05-16 の記録（フィルタ前で5〜6倍値）と直接比較しない。スパム追加は `SPAM_REFERRAL_SOURCES` 配列へ。経緯は measurement-incidents.md 2026-04-26。

## 統合: ピラー構造と内部リンク（旧 pillar_architecture / issue29_internal_links）
- PE 5ピラー（経済性/人的資源/情報/安全/社会環境）は hub→pillar＋spoke→pillar が双方向化済み、過去問(H21〜R07・680問)がキーワード紐付け済みで `<RelatedExamQuestions>` 表示。過去問追加後は `npm run refresh-indexes`、新 PE keyword 追加時は `add-pillar-backlinks.mjs`（冪等）。Civil 5ピラーは過去問のキーワード紐付けが 0 件で過去問掲載は保留（再開は別 Issue・要設計）。
- Issue #29（内部リンク拡充）は PE keyword 648ページに `<RelatedKeywords>` を設置して完了・追加施策しない（`insert-keyword-relations` 手順は exam-backlinks SKILL）。既知の制約: pe-chapters.json 未登録の orphan（general-overview 等）は対象外／section 6.2 は意味的に異質なキーワードが混在し関連リンクが弱い→section 再編で改善。

## 統合: コンテンツ復活・reference-materials 分離（旧 content_resurrection・2026-04-19）
- 試験対策ハブの看板を薄めないため、設計便覧系5記事は独立カテゴリ `reference-materials`（`categories.json`・variant reference）に分離し **全て published:false**（旧 `civil-construction-1-reference-*` から 301）。実験 EXP-002 は paused（resume_criteria: 5記事の精度向上→再公開→新 baseline）。主戦場の civil-construction-1 / 総監の充実を優先。再公開は1記事で試験文脈最適化の雛形を作ってから展開。`ReferenceLinks`/`ExamContext` コンポーネントは 2026-06-25 に削除済み（再開時は git 履歴〜9b840f4e9 以前から再実装）。
