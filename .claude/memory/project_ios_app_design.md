---
name: project-ios-app-design
description: "iOS アプリ仕様/設計 5 ドキュメント完成（docs/project/05_プロダクト/）。買い切り¥1,800単軸・着手判断は Web¥15k 達成待ち"
metadata: 
  node_type: memory
  type: project
  originSessionId: 41c93a41-6b7e-4e92-aaa5-f54538e656db
---

iOS アプリ（技術士総合技術監理部門対策）の仕様/設計フェーズ Phase 0 完了。

**真実源**: `docs/project/05_プロダクト/` 配下 5 ドキュメント

- 01_iOSアプリ仕様.md v3 — 仕様本体（買い切り¥1,800単軸、Free=R07・Premium=R01-R06、MVP+Phase 2 ロードマップ、成功監視 KPI）
- 02_iOS画面設計.md v2 — 8 画面ワイヤー + 画面遷移 + Free/Premium UI 挙動
- 03_iOSデータパイプライン.md v1 — JSON schema + delta fetch + SwiftData upsert
- 04_iOSエコシステム動線.md v1 — iOS ↔ Web ↔ note 3 層動線 + Apple ガイドライン準拠 + クーポン仕様 + Universal Link
- 05_iOSベンチマーク調査.md v1 — 資格学習 iOS アプリ 17 本横断調査（frozen 2026-05-19、MVP 追加機能の根拠）

**着手条件**（戦略 §7）:
- ①Web 月収 ≥ ¥15,000（未達成、ブロッカー）
- ②筆記合格発表済み（✅ 達成、運営者合格済み）

**最初のリリース目標**: 2027-07 試験（総監 2 次筆記、年 1 回）。逆算で T+0 ≤ 2027-04-01。

**Why**: ユーザー判断で「サイト解答ゲート」ではなく iOS Premium で過去問演習を有料化する方針。Apple ガイドライン準拠とカニバリ防止を 04 で定式化。買い切り単軸は TK office ¥1,600/4.5★ と同価格帯で市場整合（05 で裏付け）。

**How to apply**:
- iOS アプリ着手判断は Web ¥15k 達成時に開始
- 実装着手前は 5 ドキュメントの整合性維持（仕様変更時は連動更新）
- 着手前にユーザー判断が必要な保留事項: アプリ名確定（候補 A〜F）、アイコンデザイン
- 5 ドキュメントの追加/改訂時は本メモリの version 数値を更新

関連: [[project_strategy_docs]] [[feedback_deploy_discipline]]
