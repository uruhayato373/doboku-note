---
paths:
  - ".claude/state/**"
  - ".claude/config/**"
  - "src/lib/note-magazines.ts"
  - "src/lib/magazine-placement.ts"
  - "src/lib/coconala-services.ts"
  - "src/lib/brain-products.ts"
---

# 運用状態・機械設定・販売カタログを触るときの規約

- `.claude/state/`（状態）と `.claude/config/`（機械設定）は JSON。**`.claude/state/*.md` の新規作成禁止**（人向けの出力は admin が JSON を読んで表示する）。`.claude/config/` はツール設定（OGP テンプレ/ルール/改行設定、PSI しきい値・URL リスト、エージェント編集領域）で、真実源の doc へのポインタを `_doc` に書く
- 運用記録の日付は JST（`npm run check-jst-date`・UTC で前日付になる事故）。実験台帳の再計測/close 期限は `npm run check-experiment-due`。予約・計画・期日の横断ビューは `npm run schedule-view`

## 計測（GSC / GA4 / PSI）

- **計測は CI/CD 供給が正・ローカル creds 不要**（会社 PC はプロキシで外部 API を遮断する）。**PSI は field(CrUX) で実害判定・lab は診断／単発 lab 値で CRITICAL を立てない** → [measurement-incidents.md](../knowledge/reference/measurement-incidents.md)。計測データに異常があれば同 doc を先に確認してから結論を出す
- GSC 継続管理（index coverage / performance / hygiene の分業・閾値・cadence） → [gsc-management.md](../knowledge/reference/gsc-management.md)。UI CSV 取得は `/google-search-growth`（`npm run google-console:login` → `npm run search-growth:report`、月次期限 `npm run check-gsc-ui-due`、SSOT 整合 `npm run check-google-ui-ssot`）。GA4 カスタムディメンションは `npm run ga4-admin:check` / `npm run check-ga4-dimensions`。未登録 URL の診断は `npm run gsc-indexing:check`
- GA4 fetch は country=Japan＋参照スパム除外が既定（生データは `--include-all`）。季節性事業なので impressions=0 を即 noindex と判断しない

## 販売カタログ（実価格・公開状態の真実源）

- note: `src/lib/note-magazines.ts`（実価格・noteUrl）。サイト側 CTA の配線は `src/lib/magazine-placement.ts`（civil/docs の note CTA を一元管理・`published:true` でも配置条件を満たさないと出ない）。売上記録 → [sales-tracking.md](../knowledge/reference/sales-tracking.md)（`/record-sales`・`.claude/state/sales/sales-log.json`・`npm run note-sales-fetch`）
- ココナラ: `src/lib/coconala-services.ts`。運用 → [coconala-operations.md](../knowledge/reference/coconala-operations.md)（受注/DM 収集 `npm run coconala-orders` → `npm run check-coconala-orders`、KPI `npm run coconala-analytics` → `npm run check-coconala-analytics`、休止/再開 `npm run coconala-pause`。`paused` は `pauseReason` で retired と absence を区別）
- Brain: `src/lib/brain-products.ts`。運用 → [brain-operations.md](../knowledge/reference/brain-operations.md)
- アフィリエイト: 転職一本（講座/教材/書籍は Red Line）。**3 ASP とも doboku-note と stats47 が同一口座に同居**し判定は `scripts/lib/asp-site-guard.mjs` に集約（不一致は例外で停止） → [affiliate-operations.md](../knowledge/reference/affiliate-operations.md)。台帳 `.claude/state/ads/affiliate-catalog.json`、設定 `.claude/config/affiliate-asp.json`
- 会員配信ドリップの真実源は `メンバーシップ/README.md` の配信表（`npm run check-membership-drip`。日付をカードへ複製しない）
