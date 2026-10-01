---
name: north-star-metric
description: "NSM = 手数料控除後の月の受取額（netReceipts）・目標 月¥100,000（2026-09-27 切替）。organicUsers は集客の補助（大半 Bing）"
metadata:
  node_type: memory
  type: project
  originSessionId: d718e2c2-f7e0-451e-a1d4-e6d6883d7545
  modified: 2026-09-27T06:31:22.277Z
---

2026-09-27 に運営者が NSM を「月間オーガニック検索流入ユーザー（organicUsers）」から **手数料等控除後の月の受取額（`netReceipts`）** へ切り替え、全体目標を **月 ¥100,000** と決めた。ツリーと追加 KPI は `docs/strategy/15_KPIツリー.md`、機械正本は `.claude/config/business-direction.json` の `northStar`。

**Why:** organicUsers は大半が Bing（Google は月100クリック前後）で、売上の大半は note の中の検索・回遊で起きる。流入を頂点にすると売上と連動しない。受取額・費用・作業時間は 2026-09 時点で一度も計測されていなかった。

**How to apply:** 目標は `target` 記録で持つ（完全な実測 snapshot が前提なので、先に受取額の月次計測を残す）。チャネルをまたいで割り算しない。organicUsers は Google と Bing を分けて集客の補助として読む。関連: [[revenue-diagnosis-2026-06]]。
