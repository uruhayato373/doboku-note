---
name: feedback_ig_pack_posted_json
description: IGキーワードパックの公開記録は各パック直下のposted.jsonが既存方式。新規ファイルを作る前に既存パックを必ず確認する
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 006435ef-75cf-4ccc-ba99-7b4a2167b722
---

IG キーワードパック（`docs/sns/instagram/cem/keyword-packs/{slug}/`）の状態管理は2ファイルに分業：

- `status.json`（パック直下）＝ 予約スケジュール状態。`{reel|carousel}.{channel, status, scheduled_at, posted_at, video, updated_at}`
- `posted.json`（パック直下）＝ 公開記録。`{carousel|reels|stories}.{at, url, note}`（未公開チャネルは `null`）

公開報告（「〇〇を公開した + IG URL」）を受けたら、**パック直下 `posted.json` の該当チャネルに `{at, url, note}` を記録**する。手本は rio-declaration 等10パックの既存 posted.json。

**Why:** 2026-06-25、risk-perception 公開記録を既存方式を調べずに `carousel/status.json` へ独自スキーマで新規作成した（場所もスキーマも誤り）。ユーザーから「管理しているjsonがあるのでは／git履歴は調べたか」と指摘され是正（76ecb4b2c）。CLAUDE.md §8「書く前に読む・現物を file:line で裏取り」違反。

**How to apply:** SNS 状態ファイルを新規作成する前に、必ず同階層の既存パックを `find ... -name "*.json"` で列挙し、既存スキーマ・配置を踏襲する。推測で新規ファイルを作らない。[[feedback_no_redundant_overview_tables]] と同じ「現物確認」系。
