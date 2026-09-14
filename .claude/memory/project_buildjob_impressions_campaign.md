---
name: project_buildjob_impressions_campaign
description: ビルドジョブ(A8建設転職)露出最大化 施策の全体像・8/31期限・9/1自動復帰・note展開・週次監視
metadata: 
  node_type: memory
  type: project
  originSessionId: 9d0d961e-a0b1-4992-bc1f-a96146badc43
---

ビルドジョブ（A8・建設転職エージェント・無料キャリア面談）の露出最大化施策（2026-07-06 実施）。**〜2026-08-31 は成果 ¥50,000/件の増額キャンペーン＝8週間の期限付き**。9/1（=8/31 15:00 UTC）に全 BuildJob 面が GKS へ自動復帰（SSG・ビルド時刻で確定）。

**サイト面＋計測（PR #378 `feat/buildjob-impressions`）**: creatives（text `NTRMQ`/120バナー `NU729`）＋`isCampaignActive()` 共有化、露出ギャップ解消（concrete-chief/diagnostician・pe-first-stage・pe-construction の hub＋モバイル記事末）、career記事の本文中間テキストCTA、civil-1 hub小バナー。計測バグ修正（`report-monetization-coverage` の latest() prefix が by-device 誤マッチで 06-20 から無音死→修正）＋`--by-label` フェッチ＋`a8-results.json`(EPC分母)。

**note展開（develop 反映済み）**: キャリア無料記事に `noteId` 転記（既存6本・本文不変）＋**新規2本を公開**（転職のベストタイミング=`n401905648243` / ホワイトな建設会社の見分け方=`ne7284dacf78b`・BuildJob `NTJWY` テキストリンク付き）。**note アフィリ footprint 6→8 本・全公開済み**。もくじ非掲載（学習セグメントと分離）。[[feedback_note_article_three_set_dod]]

**戦略転換＝note ドメインパワー活用（2026-07-14・ユーザー指示）＝note 実公開まで完了**: 「カニバリ回避」→「note の高 DA で BuildJob/キャリア顕在クエリを note でも取る」。**このPC（`.local/playwright-note-profile` に note ログイン済み・`note-publish`/`note-update-body` が channel:chrome＋永続profile＋proxy で会社PCでも投稿可）で全て実公開**（＝「note 投稿は別PC限定」は誤り・このPCで可能）: ①**N7-N9 新規3本を本公開**（ビルドジョブの評判-発注者目線=na0f42fd52a51／転職エージェント比較=ne49853deac96／辞める前に確認すること=n7a81ebf1cdc5・note API status=published 検証済）②**既存キャリア note 8本の本文再push 完了**（サイト送客リンク live 反映・API body 照合済）。無料記事の `note-update-body --commit` 自動確定（「更新する」検出）は**実機で成功を確認**（旧「未検証」を解消）。数値（163万/50,529/4.8）は景表法リスクで**恒久不掲載**。残＝A8 EPC 月末＋stray 下書き nf2316420abd0 手動削除（backlog）。[[feedback_note_prepublish_verify_not_proxy]]

**週次監視（C7・develop）**: `/weekly-improve` Phase 3.5＝`affiliate_cta_click` by-label CTR・BuildJob 期限残週・9/1 GKS復帰の curl 検証・EPC 布石。真実源 `.claude/knowledge/reference/affiliate-operations.md`（2026-07-27 に旧 docs 台帳から移設）。

**状態（2026-07-07 更新）**: ①PR #378 develop→main 昇格・本番デプロイ・実体検証済み ✅ ②GA4 `event_label`＋`event_category`（イベントスコープ）カスタムディメンション登録済み ✅（遡及なし＝以降蓄積・伝播〜48h。キーイベント/データ保持14mo も設定）→ #10 アフィリ A/B の event_label 取得は完了（measurement-infra-enhancement.md 反映済み）。**残＝③EPC 判定 ~2026-09**（backlog P5・A8 成果÷GA4 by-label クリック）。[[feedback_ga_ssr_not_client_gate]] [[feedback_metrics_cicd_supplied]]
