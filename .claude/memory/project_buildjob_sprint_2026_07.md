---
name: buildjob-sprint-2026-07
description: BuildJob増額(~8/31)期間の高意図slug優先表示スプリント。P0-P2+civil1/2記事完遂・自動復帰・GA4 event_labelは登録済
metadata: 
  node_type: memory
  type: project
  originSessionId: 28783a89-1f50-4913-9d4f-1e8fd1321964
---

BuildJob（建設特化 転職エージェント・A8）の無料面談成果が **〜2026-08-31 は ¥50,000/件**（GKS の2倍）の増額期間。この間だけの短期収益最大化スプリントを 2026-07-14 に P0/P1/P2 まで実装（commit 17fb3e1ec / 8411e333f）。

- **P0**: 高意図キャリア slug（件数の真実源＝`HIGH_INTENT_CAREER_SLUGS`＝`src/config/affiliate-creatives.ts`。P0で31、P1で+5＝**現在36**＝civil-1 25/civil-2 10/pe-construction 1）を、キャンペーン中だけ建設JOBs A/B から除外し BuildJob 100% 固定（`isKensetsuJobsArmEffective`）。**9/1 に `isCampaignActive()`=false で自動的に slug ハッシュ A/B へ復帰＝コード削除不要**。判定はサイドバー/記事末/本文中間テキストの3面共有＝1ページ1ピクセル維持。
- **P0 コピー**: `resolveBuildJobCopy(slug)`＝「無料相談」→「資格・経験で狙える求人/年収相場を確認」訴求＋安心コピー（今すぐ転職しなくても相場確認だけOK）＋テーマ別CTA6種。inline `CareerAffiliate program="gks"` 163枚にも自動反映。
- **P1**: 新規記事 civil-1 3本（buildjob-review 指名／career-agent-comparison 比較／career-consultation-before-quit 顕在層）＋civil-2 2本（career-agent-comparison／buildjob-review・経験の有無で使い分け）。note無料3本にUTM(referral)送客追加。全記事 guide-fact-checker 済み（civil-1で163万/50529人/4.8等の景表法リスク数値を削除→定性記述に是正、以降の記事は数値不掲載）。
- **P2**: `npm run report-buildjob-affiliate`（面別/EPC集計md）。

**GA4 event_label は登録済み（当初「未登録」と誤診→2026-07-14訂正）**: 「CTA label」=パラメータ `event_label` として 2026-07-07 登録済み（実装 gtag.ts と一致）。by-labelが `(not set)` だったのは取得期間が登録日より前でカスタムディメンションが遡及しないため。**追加設定不要**、deploy後にクリックが溜まり07-07以降の期間で `fetch-ga4-cta-clicks --by-label` を取り直せば面別に分解される。

真実源: `docs/project/04_運営/09_BuildJob収益最大化スプリント.md`（＋02 提携状況・08 記事ビルド計画）。9/1 以降は GKS/建設JOBs/BuildJob の EPC 実績で再配分（[[revenue-diagnosis-2026-06]]）。note有料商品とのカニバ리回避のため学習意図は対象外。
