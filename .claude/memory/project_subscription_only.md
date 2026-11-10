---
name: project_subscription_only
description: Claude は API 従量課金を使わずサブスク内で処理する。モデル選定の判断軸はドル単価ではなく利用枠と速度
metadata:
  node_type: memory
  type: project
  originSessionId: b4104f5d-c8b4-46ff-86a4-a6406186d4d3
  modified: 2026-11-10T00:10:08.090Z
---

Claude は API を使わず、サブスクリプション（Claude Code）の枠内だけで処理する（2026-11-10 ユーザー明言）。

**Why:** API の従量課金を払う運用をしていない。モデル比較記事の $/MTok はそのままでは当てはまらない。

**How to apply:** モデルや effort を選ぶ基準は、ドル費用ではなく利用枠の消費（トークン量・上位モデルの使用量）と速度にする。Haiku・Sonnet への委任や effort を下げる案は「枠を節約できるか」で評価し、比べるときは `/usage` で見る。API の移行の注意点（tool_choice・思考ブロックの扱いなど）は対象外。関連: [[project_model_assumptions]] [[feedback_opus_sonnet_split]]
