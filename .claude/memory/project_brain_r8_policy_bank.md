---
name: project_brain_r8_policy_bank
description: Brain商品②技術士総監「出題テーマ分析・国家施策バンク」スキル。証拠台帳/判定基準/バックテストprotocol済・R6-R7ブラインド遡及が残
metadata: 
  node_type: memory
  type: project
  originSessionId: e1b18328-8614-4876-a422-c360a2e90a77
---

Brain向け商品②「Claude Codeで作る 技術士総監 出題テーマ分析・国家施策バンク スキル」。企画SSOT=`docs/project/05_プロダクト/brain-r8-policy-prediction-skill/`。商品①施工経験記述キット（[[project_brain_civil_essay_kit]]）とは別の上位/独立商品。

**ケーススタディの核**: R8総監必須科目I-2記述式で「地方創生」が出題（2026-07-19）、その48日前=2026-06-01に「設問(3)国家施策バンク」へ地方創生・東京一極集中＋国家施策6案を事前収録していた実績。**git初出コミット63a26c67f=2026-06-01・frontmatter notePublishedAt: 2026-06-01で裏取り済**。帰属厳守=「予想問題集の本命的中」ではなく「設問(3)バンクに事前収録」と表現する（[[feedback_note_prepublish_verify_not_proxy]]）。

**2026-07-22 §13 step1-2完了＋step3(R8実証)**（最終commit d828f93cb・develop上・01-04の4本）:
- 01-evidence-ledger.md: 証拠E1-E7を実体裏取り。ground truth=R6カーボン/R7少子高齢化/R8地方創生。
- 02-match-criteria.md: 一致/部分一致/不一致をL1テーマ×L2施策部品で事前定義。後知恵で緩めない・K/カバレッジ/外れ候補/見逃し開示必須（的中率単独禁止）。
- 03-backtest-protocol.md: R6〜R8時点再現手順＋後知恵防止（資料カットオフ＋盲検化方式A=LLMブラインド/B=事前登録/C=第三者採点）。
- 04-backtest-results.md: **R8のみ前向き成立**。設問(3)バンク11テーマ全てgit初出2026-06-01(試験48日前)=事前登録、地方創生を含む→**一致(K=11)**。ただし予想問題集①本命(気候変動適応・git2026-06-10)は**外れ**＝「本命的中」ではない。**R6/R7はバンクが試験より後(2026作成)＝前向き検証不能**、方式C/当時資料が残。K=11は網が広い点も開示。
- 復旧記録: 並行セッションがworktreeをfeature/work-2026-07-21→developへ切替え、先行commit e7f877792が作業ツリーから外れた。git objectは健在→git checkout <commit> -- で復元しdevelop上へ再統合。backup=C:\tmp/brain-r8-docs-backup（[[feedback_multi_session_concurrent_git]]）。

05-free-note-draft.md=無料note入口記事の下書き（未公開・commit 3e6139b18）。「予想的中」と書かず本命(気候変動適応)外れとK=11を開示・価格/noteID非直書き。公開時はnote3点セット化+funnel配線が必要。

**2026-07-22 商品本体(β)構築完了**（`C:\tmp\pe-policy-bank-kit`・git init commit 171e138・38 tracked・ZIP=C:\tmp\pe-policy-bank-kit-beta.zip・リモートrepo名=pe-policy-bank-kit private でpush完了(2026-07-22・既定main・ユーザー報告)・skill内部名は forecast-policy-themes のまま）。skill=forecast-policy-themes（SKILL.md＋references[five-management/scoring-rubric/claims-policy]＋scripts[validate-sources(後知恵カットオフ検出)/validate-scorecards(8軸0-3・K・除外理由)/validate-answer-length(1施策600字)]＋templates5）＋agents5（theme-researcher/question-designer/policy-answer-writer/evaluator/fact-checker）＋examples架空sample＋docs4（setup/operation/r8-case-study正直版/limitations）。3スクリプトhappy+異常系(後知恵/範囲外/字数超過)全fire・blind前方テストで出典規律(架空sample外の統計を要出典で停止)確認済。有料note本文/内部パス非混入(漏れスキャンclean)。doboku-note側に設計・証拠(01-05)。

note入口記事を公開品質化（commit 2adc18cf5・`docs/note/技術士総監/出題テーマ分析-R8地方創生検証/article.md`・無料・published:false・手動公開待ち・「予想的中」不使用/本命外れ開示/K=11）。

**2026-07-22 全チャネル listable 化**（commit cee7d7e03・develop push済）: ①Brain=販売ページ原稿 06-brain-sales-page-draft.md＋kit repoにthumbnail.svg(commit 0060a74・ZIP再生成59entry・**origin/main比 ahead1=要再push**)。②ココナラ=総監 出題テーマ分析PDF新規（`coconala-sokan-bunseki-pdf`・draft・¥2,500・非カニバリ=施策バンク本文非転載）。source=07-coconala-bunseki-source.md→write_pdfで生成(2頁・外部URL0)・listings/thumb(総監色)/services/operations/sales-recorder配線・check-coconala-wiring✓。**2026-07-22 ココナラ本公開済**: ¥2,500 → **listed** https://coconala.com/services/4322661 （coconala-edit --service-id 4322661 --commit --image）。納品=購入後トークルームで `.claude/config/coconala/assets/pdf/coconala-sokan-bunseki.pdf` を送付。

**2026-07-22 ユーザー判断B（価値を上げてから公開）→ R6/R7統制run実施→公開ゲート充足→Brain公開申請完了**:
- 統制run: 各年度3レンズ独立エージェント（sonnet・outcome非開示・当時資料台帳・K=5固定・汚染自己申告必須）。試験日確定=R6:2024-07-14/R7:2025-07-20（技術士会/mext裏取り）・白書2024=2024-06-28公表。**結果: R6=3/3一致（GX、うち1位24/24）・R7=1/3一致（少子高齢化5位・他2は隣接止まり）**＝「少数絞りは外れる→K=11幅広備蓄」の定量実証。副次: R7上位に地方創生2/3出現→翌R8実出題（年跨ぎ価値）。**汚染1件**（初回R6-CがrepoのGT表をRead→自己申告→無効化→ツール完全禁止で再実行）＝エージェント採点はツール遮断必須が教訓。記録=04§6-7（commit 57395c088）・kit同梱docs/backtest-validation.md（kit commit f192754）。
- **Brain公開申請済（審査待ち・原則24h）**: 記事=https://brain-market.com/a/b1IDO3UjMgoTZsNWa0JXY ・¥9,800・部数無制限・審査後すぐ公開。本文2,381字（統制テスト節込み・誠実フレーム）。配布=`storage.doboku-note.com/brain/dist/pe-policy-bank-kit-beta-vfsiHyhN_1g2.zip`（HTTP200検証済）。パイプライン=brain-new.mjs(新規記事)→post3b(画像)→post6(価格/ライン/モーダルassert/申請)。

**残**: 審査結果メール待ち（両商品）・カテゴリ「ビジネス」→「資格」変更検討（審査後）・売れたら/record-sales。②R6/R7試験日前資料をsource-register化③R6/R7を方式Cブラインド遡及で採点④R8の事前固定Kを2026-06-01記録から復元⑤04-backtest-results.md作成⑥商品本体を別非公開リポジトリで作成⑦架空サンプル/前方テスト⑧販売ページ/無料note。β仮価格9,800〜12,800円。**R6/R7バックテストは実行者が答えを知る=後知恵を完全排除できないため方式C/統制run必須（会社PCはプロキシで外部API遮断→別環境）**（[[feedback_metrics_cicd_supplied]]）。著者=元発注者・1級土木施工管理技士、添削者/採点者/Anthropic認定を名乗らない（[[project_operator_pe_comprehensive_pass]]）。
