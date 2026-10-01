---
name: feedback_ig_pack_posted_json
description: "IGキーワードパック: 公開記録は各パック直下のposted.json(status.jsonは予約状態)・新規作成前に既存パックを確認・配色は既存00-cover.svgを目視(MGMT_COLORSは過去問パック専用)"
metadata:
  type: feedback
---

## 状態管理は2ファイル分業（`docs/sns/instagram/cem/keyword-packs/{slug}/`）
- `status.json`（パック直下）＝予約スケジュール状態。`{reel|carousel}.{channel, status, scheduled_at, posted_at, video, updated_at}`
- `posted.json`（パック直下）＝公開記録。`{carousel|reels|stories}.{at, url, note}`（未公開チャネルは `null`）
公開報告（「〇〇を公開した＋IG URL」）を受けたら**パック直下 `posted.json` の該当チャネルに `{at, url, note}` を記録**。手本は rio-declaration 等10パックの既存 posted.json。
- **Why:** 2026-06-25、risk-perception の公開記録を既存方式を調べずに `carousel/status.json` へ独自スキーマで新規作成（場所もスキーマも誤り）。「管理しているjsonがあるのでは／git履歴は調べたか」と指摘され是正（76ecb4b2c）。CLAUDE.md §8「書く前に読む・現物を file:line で裏取り」違反。
- **How to apply:** SNS 状態ファイルを新規作成する前に同階層の既存パックを `find ... -name "*.json"` で列挙し既存スキーマ・配置を踏襲。推測で新規ファイルを作らない。

## 新規 keyword pack の配色は既存 SVG で確認してから
新規パック作成前に既存パックの `00-cover.svg` を1枚 Read して配色を確認してから着手する。`svg-base.mjs` の `MGMT_COLORS`（管理区分別カラー）は**過去問パック自動生成スクリプト専用**で、keyword pack は手書き SVG で**総監統一カラー（紺 `#1a3a5c` ＋ 茶 `#a36b2c`）で全管理区分共通**。コードを読んで配色を「推測」しない（2026-06-25 フェールセーフパックで安全管理色 `#b22234` を誤適用し修正）。
- **How to apply:** keyword pack 作成指示を受けたら最初に `maslow-hierarchy-of-needs` 等の既存パック `00-cover.svg` を Read し `fill` と `stroke` を目視確認してから SVG を書く。関連: [[feedback_content_structure]]（同じ「現物確認」系）[[feedback_svg_arrow_marker]]
