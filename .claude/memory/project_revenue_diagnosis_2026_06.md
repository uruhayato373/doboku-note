---
name: project_revenue_diagnosis_2026_06
description: "収益診断(2026-06)。月¥205k(6月)=note有料・総監集中から建設部門横展開。note売上の流入元実測(2026-09)・売上ログ機構を含む"
metadata:
  type: project
---

2026-06-23 実測で doboku-note / stats47 の収益診断を実施。

**doboku-note**: note有料 累計¥146,280（5月¥33k→6月¥113k、3.4倍）。収益の64%が総監記述式3商品（essay-complete-pack ¥47,880 / r8-essay-forecast ¥30,280 / tankan-reading-guide ¥15,840）。GA4 organic ~760人/1,201セッション。**詰まりは単価/導線でなく流入と"勝ちパターンの偏在"**。少ない流入から月11万＝オファー/導線は効いている（売上はsite検索流入よりnote+SNSファネル経由の可能性大、要確認）。

**次の1手**: 総監で実証した「完全パック＋R8予想＋読み方ガイド」3点セットを、運営者が合格科目を持つ**建設部門**へ横展開（道路・河川・都市計画）。新資格ゼロ作りより「実証済みの型×既存の専門性」が最速。

**6月確定（2026-06-29 reconcile, export 真実源）**: 6月 **98件/¥205,060**（5月¥33k→6月¥205k、6.2倍）。内訳=マガジン¥170,940(83%)+単品¥34,120。トップは総監完全パック¥47,880・R8予想¥28,320だが、**建設部門の横展開が結果に出始め**（必須I模範解答集¥13,920・トンネル選択科目¥11,920・都市計画¥8,940・道路¥6,960・土質基礎¥5,960）＝診断の打ち手が当たった。完全パックは06-26から¥9,800へ改定済、コアパック¥5,480新設。建設部門R8予想単品の¥500→¥780値上げ(06-18)は値上げ後も継続して売れ機能。reconcile 手順=月途中で止まった手動ログに追記せず、月次exportで当月を全面再構築（二重計上回避）。SoT=data/sales/sales-log.json。

**stats47（別プロジェクト, stats47.jp）との対照**: stats47はGSC ~5,800クリック/月・~4,264PVと doboku-note の7〜10倍流入だが収益は月~¥500（AdSense）+¥0（affiliate）。**流入でなく収益モデルの差**＝統計閲覧者に「金を払う痛み」が薄い。広告磨きは天井が低い。教訓＝**稼ぐのは高単価の有料コンテンツ×高ペインのニッチ**（doboku-noteが実証、stats47内の公務員×AI記事=koumuin-claude-codeが同型を移植中）。詳細diary: obsidian/dairy/2026-06-23.md。関連 [[project_note_revenue_strategy_2026]] [[project_pe_construction_secondary]]。

**STP分析で研ぎ澄まし(2026-07-07, `docs/project/01_戦略/11_STP分析2026-07.md`新設=S/T/P SSOT)**: sales-log 119件+GA4/GSCを資格別集計。**転換率が流入量と逆相関**＝建設部門16.8% >> 総監3.1% >> 2級土木0.9% >> **1級土木0%**（GA4 6月・部分集計）。**1級土木が最大流入(GA4 top100で1477users)なのにnote売上¥0**＝最大のマネタイズの穴（買い切り実売ゼロ→会員ラボ未ローンチ）。SNS流入は実測ほぼ機能せず(Organic Social 34users/1%未満、organic search 85%)。この実データで戦略doc再構成: 01_プロダクト/03_事業(v4)/02/04/06/07/08を陳腐化是正(iOS→PWA・書籍アフィリ廃止・達成済みKPI・677→743記事)、05_コンテンツロードマップは`docs/project/_archive/`へ退避。稼ぐ順=建設部門(拡大)>総監(維持)>1級土木(マネタイズ設計が課題)。
**2026-09-26 追記**: Brain チャネルから完全撤退（出品2点・約2か月で売上台帳0件・サイト送客クリック0件・試験対策の競合もほぼ不在＝受験生の購買の場ではない）。リポジトリの Brain 関連コード・スキル・エージェント・文書は削除済み、出品取り下げは運営者が対応。経験記述の AI 設計キットはココナラ（coconala-civil-keiken-kit）で継続。

## 統合: 売上ログ機構（旧 sales_log）
真実源 `data/sales/sales-log.json`（date/productId/title/type/price。購入者名は記録しない・productId は note-magazines.ts の id、単品は `article:<slug>`）＋ `npm run sales-summary [YYYY-MM]`。月初に note ダッシュボード販売履歴から追記→検算。社会的証明の投稿は生スクショでなく匿名実績カード。2026-05 実績 16件/¥33,220（Web¥15k マイルストーン達成・単月、継続性は要観察）。月途中の手動ログは追記せず月次 export で当月を全面再構築（二重計上回避）。

## 統合: note 流入元の実測（旧 note_traffic_sources_2026_09・2026-09-15）
note ダッシュボード「記事の流入元」（Playwright read-only・年35,174PV・売上¥638,840＝sales-log 整合）。
- 稼いだ6〜7月の流入は note内回遊＋note記事への検索直で73〜80%、X は年間75PV（0.2%）、検索直のうち Bing+Yahoo が45%。8〜9月の no referrer 急増（4,000超/月）は正体未確認。
- **結論:** 収益エンジンは「note内の発見性（関連記事・マガジン・タグ・フォロワーTL）」と「note記事自身の検索順位」。サイトSEO・図・X の売上寄与は計測上1桁%以下（GA4 の note CTA クリックは4週で約200）。時間配分は note 側（無料→有料の内部導線・タイトル/冒頭の検索適合・フォロワー獲得）へ、X は直前期の告知に縮小。
- サイト→note が note 側で見えなかった原因は全 CTA の `rel="noopener noreferrer"`。PR #511 で note.com だけ `noopener`（判定 `src/lib/external-link-rel.ts`）。**合格条件＝deploy 翌月（2026-10）の流入元に `doboku-note.com` が現れること。** 取得手順: note プロファイルで /dashboard→期間→「時系列」→データテーブルを innerText（`DOBOKU_PW_MIN_FREE_MB=1000` が要ることあり）。
