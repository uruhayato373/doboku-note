---
name: feedback_svg_arrow_marker
description: "SVG矢印マーカーは右向き三角形で定義する（orient=\"auto\"が90度崩れの原因）"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 318c6891-cb4f-4ebc-96c9-b3def4a57a0b
---

SVG の矢印マーカーは必ず **右向き三角形（+x 方向）** で定義する。`<polygon points="0,0 W,H/2 0,H">`、`refX` はほぼ先端、`refY` は中央。

**Why:** `orient="auto"` はマーカーをパスの進行方向＝+x 軸として回転させる。上向き／下向き三角形として描くと、上向き線・下向き線で 90 度ずれて矢じりが横向きに崩れる。2026-05-20 の IT トレンド図版整備で iot・edge-computing・rpa・zero-trust・blockchain-crypto の 5 本がこのバグで崩れ、修正コミットが必要になった。

**How to apply:** `create-svg` スキルのマーカーテンプレ（`points="0,0 8,3 0,6"` 等の右向き）をそのまま使い、再設計しない。短い接続線で矢じりが過大になる場合は `markerUnits="userSpaceOnUse"` で固定サイズ化（例: markerWidth=10 markerHeight=9 refX=9 refY=4.5）。SVG 監査（audit.mjs）は向き崩れを検出しないため、`@resvg/resvg-js` でレンダリングし矢印部分を拡大目視する。関連 [[project_svg_illustration_runway]]。
