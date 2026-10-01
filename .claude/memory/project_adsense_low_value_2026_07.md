---
name: project-adsense-low-value-2026-07
description: AdSense「有用性の低いコンテンツ」対策。主因=非インデックス265本(25%)、W1薄層CEMキーワード166本が本丸。内部weightedスコアはGoogle索引判定と乖離
metadata: 
  node_type: memory
  type: project
  originSessionId: f2968bec-51ef-425f-b705-c3ae7da83a6d
---

2026-07-04、AdSense審査「有用性の低いコンテンツ」で直近2-3回却下への対策を開始。

**診断（原本 handoff は 2026-07-11 に _archive ごと削除・git 履歴 `docs/handoffs/_archive/2026-07-04-adsense-low-quality-report.md` から復元可。生きた診断結論は本 memory と backlog「AdSense 再申請」タスクが保持）**
- 主因は非インデックス率。URL Inspection全1,051 URLで265本(25%)が非インデックス（クロール済み-未登録240＋検出-未登録25）。
- **最重要の非自明発見: 内部品質スコア `.claude/state/quality-scores.json` の weighted はGoogle索引判定と乖離する。** 非インデックスの薄層166本は全てweighted 2.2-3.0で内部合格しているのにGoogleは索引しない。内部ルーブリック(構造/モバイル/参考資料/リンク)は体裁遵守を測り、独自情報価値を測っていない。→ リライトのQAゲートに weighted≥X を使うのは無効。判定は「本文実測字数＋独自散文密度」で行う。
- 画像クロップは主因でない（極小PNG 8枚実測=解像度十分）。CLSは広告枠原因でない（`<ins adsbygoogle>`未実装、ローダーのみ）→ CWV別課題。
- 非インデックス265本の内訳: W1=CEM薄層キーワード166本(本文中央値2,685字・本丸)/W2=転職ガイド8本(3,590字と良質・薄さでなく権威性/鮮度が原因・審査問題でない)/W3-W7=過去問等の長尺重複ページ(7,000-33,000字・独自性問題・審査優先度最低)。**リライトはW1に集中する。**

**処置完遂(2026-07-04)**: W1のうち**本文3,000字未満だった薄層112本を全て3,000字超の実質散文へリライト完了・commit(batch1-19)**。全数検証112/112が3,000字以上・全lint HIGH=0。残54本(本文既に3,000字超のW1)は薄さ以外が非索引要因のためリライト対象外。要リライト初期リストは`.tmp/adsense-todo.json`(88本)。**残る手番=deploy→GSC sitemap再送信+主要URL手動索引登録→2-4週後に再申請**。

**リライト運用知見(次回必読)**: (1)サブエージェント・ストールの主因は**WebFetch/WebSearch**(会社PCプロキシ外部API遮断[[measurement-incidents]])→web禁止・既存参考URL維持・新規URL追加禁止を明示すると安定。(2)keyword-rewriterに3ページ渡すとページ毎サブエージェントへ非同期委譲(ネスト最大3層・コミット後の遅延重複書込事故あり)→「自身で直接編集しサブエージェントをspawnしない」明示で回避。(3)巨大な過去問ファイル(*-primary数万字)のRead/grepでもストール→Pattern E省略で安定。(4)キーバリュー表(項目|内容)は§4でHIGH違反→散文化必須。(5)エージェントの自己申告字数はマークアップ込みで2倍前後過大→SoT計数(frontmatter除去+空白除去)で検証。

**再申請SOP(ユーザー作業)**: リライト&deploy→GSCでsitemap再送信＋主要URL手動索引登録→1-2週観察→前回却下から2-4週空けて再申請。既存チェックリスト docs/project/_archive/03_civil-adsense-resubmission.md:147-191。関連: [[project_gsc_pivot_2026_04]]
