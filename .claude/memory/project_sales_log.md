---
name: project_sales_log
description: note 売上の月次ログ機構を新設（.claude/state/sales/sales-log.json + npm run sales-summary）。2026-05 で Web¥15k マイルストーン達成
metadata: 
  node_type: memory
  type: project
  originSessionId: 050963b7-0ab0-4649-a5ce-ab4c0df98adb
---

note 販売の真実源が無かったため、月次売上ログ機構を新設（2026-06-01、develop コミット 6c34fca37 に同梱で着地）。

**構成:**
- `.claude/state/sales/sales-log.json` — 取引データの SoT（手動転記）。`date / productId / title / type(magazine|article) / price`。**購入者名は非記録**（プライバシー保護）。productId は `src/lib/note-magazines.ts` の id に合わせる（単品記事は `article:<slug>`）。
- `scripts/sales-summary.mjs` / `npm run sales-summary [YYYY-MM]` — 月次・商品別集計、¥15k マイルストーン判定。

**2026-05 実績:** 16件 / ¥33,220。内訳トップは R8予想問題集マガジン 5件¥12,400・精読ガイド 5件¥9,900。→ **Web¥15k マイルストーン達成**（[[project_ios_app_design]] の iOS 着手判断トリガー条件に到達。単月実績の継続性は要観察）。

**How to apply:**
- 月初に note ダッシュボード→販売履歴 を開き、未記録分を sales[] に追記 → `npm run sales-summary` で検算。
- 売上を根拠に SNS 投稿（社会的証明）を作る際は、購入者名を含む生スクショを公開せず匿名の実績カードにする（[[project_x_30days_campaign]] 系の X 運用と同様）。R8 実績ポストは draft 037 に保存済み（未投稿）。
