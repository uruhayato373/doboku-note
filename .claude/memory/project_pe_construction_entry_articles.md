---
name: pe-construction-entry-articles
description: 技術士建設部門(二次)のトップオブファネル入口記事32本(site16+note無料16)。site16は2026-06-14に全公開(published:true)済。残はnote投稿とdeploy
metadata: 
  node_type: memory
  type: project
  originSessionId: 17de79af-96cf-4d18-a51b-1e5bc17e2035
---

技術士建設部門(二次)の「検索流入ゼロ」(GSC impressions=0 / 過去問アーカイブ98本のみ)を解消するため、トップオブファネル入口記事を新設した(2026-06-12, commit 1e15ce6da で main デプロイ済)。

**作成物**
- サイト入口ページ16本: `.local/r2/posts/pe-construction/<slug>/article.mdx`。**2026-06-14 に全16本 `published:true`/`reviewStatus:approved` へ flip 済**（commit c6acc548b で2本=toan-kousei-template/secondary-study-method、2e776e8c7 で残14本）。build errors:0・pe-construction 115ページ・全内部リンク解決を検証済。**develop ローカルにコミット済・未 deploy**
- note無料記事16本: `docs/note/技術士建設部門/<日本語>/article.md`, `notePricing:free` / `noteStatus:draft`
- Tier S=必須I 6テーマ(防災国土強靱化/担い手確保/カーボンニュートラル/インフラ老朽化/建設DX/国土形成), A=勉強法/難易度合格率/業務経歴票/勉強時間, B=必須I解答例/選択科目書き分け/答案構成, C=道路/河川海岸/都市計画
- CTA送客先: 必須I マガジン(`m0f3bc3933454`, ¥1,980) / 道路(`m9e825cfd8348`)。河川海岸・都市計画マガジンは published:false で「近日公開」フォールバック。

**完了済 (2026-06-14)**
- ✅ site16 全 published flip（上記）
- ✅ `infra-roukyuuka-iji` の太字崩れ修正（commit 6d6779048、「**…）**」3行を「**…**）」へ。CommonMark right-flanking 規則上、閉じ ** の直後が文字のときだけ崩れる。他13本の ）** は直後が空白/ダッシュで正常描画＝非該当）

**note無料16本は2026-07-05時点で全公開済(完了)**: `docs/note/技術士建設部門/` 単発22dir中 published=16(全て live noteUrl)・draft=6。draft6本はB系統「〜の論点キーワード」でA系統6本と内容重複ゆえ意図的hold(将来マージ候補、L2もくじ:57のコメント)。**「note無料16投稿残」は解消済み**——ファネル監査で全16本がL2「建設部門もくじ」から到達可能と確認。

**未完(ユーザー作業)**
1. **deploy**: `develop`→`main`（`/deploy`）で本番反映 → Google インデックス。site16 はコミット済だが未 deploy
3. 相互リンク強化(任意): flip 済で記事間リンクが全解決したため、回遊を厚くするなら新規記事どうしの相互リンクを追加可能（現状でも exam-themes ハブ等への相互リンクは配線済）
4. tag-dictionary allowlist 外タグ(LOW・非ブロッキング・建設部門二次記事群に共通の既存ギャップ。essay-guide 等の既存公開記事も同タグ)

**戦略的背景**: 総監が売れて建設部門が売れない真因は「動線不足」でなく「検索の入口コンテンツ皆無」。総監の白書テーマ記事群と同じ「テーマ×論文」手法を横展開。差別化軸は発注者視点(元自治体土木職・道路/河川/都市計画で合格)。SSOT: `docs/note/技術士建設部門/noteコンテンツ計画.md`。関連 [[project_mlit_theme_articles]] [[project_pe_construction_secondary]]
