---
name: project_ios_app_spec_v1_1
description: "技術士総監 iOSアプリ(買い切り¥1,800単軸・2026-04-26確定)は凍結中。現行方針はPWA過去問アプリ。着手条件=Web月収¥15k(未達)。仕様の正本はbacklog DN-0400"
metadata:
  type: project
---

技術士（総合技術監理部門）対策 iOS アプリの仕様 v1.1 と収益化戦略 v3.1 を 2026-04-26 に確定。買い切り ¥1,800 単軸モデル、Apple 手数料後 ¥1,260。試験 1 サイクル累計売上想定 ¥50,000〜¥95,000。

**⚠️ 方針転換（現況）**: プロダクトの方向は iOS ネイティブ単体から **PWA 過去問アプリ（資格別 PWA × 共通エンジン）** へ移り、過去問演習は iOS から移管された（CLAUDE.md ＋ `docs/project/05_プロダクト/06_PWA過去問アプリ設計方針.md` が現行真実源）。以下の iOS ネイティブ前提の数値・アプリ名候補は歴史的参考。着手判断は DB 導入 ADR（`docs/reference/data-storage-decision.md`）も参照。旧参照パス `docs/project/28_ios-app-spec-pe.md` / `05_収益化戦略.md` は再編で消滅（収益化は `docs/project/01_戦略/04_収益化戦略.md`）。

**Why:** App Store 競合調査で「資格系アプリ相場は買い切り ¥500〜2,000、サブスクは宅建以外稀」「隣接トップ TK office 1 級土木 ¥1,600（343 レビュー、4.5⭐）が市場リーダー」と判明。受験料 ¥14,000 の 12% 相場 ¥1,800 に整合させ、旧 v3 のサブスク 3 プラン（¥600/月・¥4,800/年・¥2,400 一括）から買い切り単軸へ転換。LTV/CAC framework と Red Line 運用化（note カニバリ防止 8 項目）も同時に整備。コミット `7155b23c`（develop）。

**How to apply:**
- iOS アプリの価格・Free/Premium 境界・LTV を質問されたら **`docs/project/28_ios-app-spec-pe.md`** を Read（戦略は 05 に集約）
- 「サブスク」の話が出たら v2.0 以降での将来検討事項（年額 ¥3,000 のみ）として扱う、MVP では出さない
- 着手条件は v3 を踏襲（Web 月収 ¥15k + 筆記合格、2026-10 末以降）— 現時点では着手しない凍結状態
- アプリ名は未確定（候補 A〜F、推奨 A「総監 Path」or B「doboku 総監」）。user の選定を待ってから実装着手
- note カニバリ判断は 05 の「Red Line 運用化表」で決定（iOS = 演習・参照、note = 読み物・体験で完全分離）
- 1 級土木への展開は v3.0 で判断（合格後）、現時点では別アプリ前提
- iOS 用データ export は doboku-note 側に `scripts/build-ios-data.mjs` を新設予定（着手条件達成後）

**主要数値スナップショット（2026-04-26 時点）**:
- 価格: 買い切り ¥1,800 / 試験 1 回パック ¥2,400 / Free（R07 全 40 問 + キーワード概要）
- LTV/CAC: 受験者 3,000 × Web → DL 5% × Free → Premium 15% × ¥1,260 = 初年度 ¥50k〜¥95k
- 試験合格後の毎年継続収益: ¥30k〜¥60k
- CAC 上限: ¥0（Apple Search Ads は当面不使用）

## 統合: iOS 仕様・設計 5ドキュメント（旧 ios_app_design）
真実源は backlog DN-0400（2026-09-27 に docs/products/01〜05 を削除してカードへ移した。原文は `git show 747fab5d9:docs/products/<ファイル名>`）。内容: 01 仕様 v3（買い切り¥1,800・Free=R07・Premium=R01-R06・MVP+Phase2）／02 画面設計 v2（8画面）／03 データパイプライン v1（JSON schema+delta fetch+SwiftData）／04 エコシステム動線 v1（iOS↔Web↔note・Apple ガイドライン準拠・クーポン・Universal Link）／05 ベンチマーク調査 v1（17本・frozen 2026-05-19）。
- 着手条件（戦略§7）: ①Web 月収 ≥ ¥15,000（**未達・ブロッカー**。2026-05 は単月で達成したが継続性は要観察）②筆記合格発表済み（達成）。最初のリリース目標 2027-07 試験→T+0 ≤ 2027-04-01。保留事項: アプリ名（候補 A〜F・推奨 A「総監 Path」/B「doboku 総監」）・アイコン。
- **Why:** ユーザー判断でサイト解答ゲートでなく iOS Premium で過去問演習を有料化。買い切り単軸は TK office ¥1,600/4.5★ と同価格帯で整合（受験料¥14,000の12%）。note カニバリ防止（iOS=演習・参照、note=読み物・体験で完全分離）。サブスクは v2.0 以降の将来検討（年額¥3,000のみ）。iOS 用データ export は `scripts/build-ios-data.mjs` を着手後に新設予定。1級土木展開は v3.0 で判断。
