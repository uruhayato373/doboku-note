---
name: feedback_ig_keyword_pack_color
description: IGキーワードパック新規作成前に既存SVGで配色確認必須。MGMT_COLORSは過去問パック専用でkeyword packに非適用
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 006435ef-75cf-4ccc-ba99-7b4a2167b722
---

新規 IG keyword pack（`docs/sns/instagram/cem/keyword-packs/`）を作成する前に、必ず既存パックの `00-cover.svg` を1枚 Read して配色を確認してから着手する。

**Why:** `svg-base.mjs` の `MGMT_COLORS`（管理区分別カラー）は過去問パック自動生成スクリプト専用。keyword pack は手書き SVG で、総監統一カラー（紺 `#1a3a5c` ＋ 茶 `#a36b2c`）で全管理区分共通。コードを読んで配色を「推測」してはいけない（2026-06-25 フェールセーフパックで安全管理色 `#b22234` を誤適用し修正）。

**How to apply:** keyword pack 作成指示を受けたら、最初のステップとして `maslow-hierarchy-of-needs` 等の既存パック `00-cover.svg` を Read し、`fill` と `stroke` 値を目視確認してから SVG を書き始める。
