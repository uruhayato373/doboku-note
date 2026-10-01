---
name: mechanical-task-direct
description: well-specifiedな機械作業（売上転記等）はskill/agent委譲で遠回りせず直接処理する。mapping陳腐化はcheck-sales-mappingで機械ガード化済み
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e3572959-44ed-471f-8823-443dded6678b
---

仕様が固まった機械作業（note 売上のダッシュボード→sales-log.json 転記など）は、**自分で直接処理する**のが速い。スキル呼び出し→サブエージェント委譲と遠回りしない。

**Why:** 2026-06-21 の売上記録で、surface されていない `/record-sales` スキルを Skill ツールで呼んで弾かれ、次に `sales-recorder` エージェント委譲を試みてユーザーに2回 interrupt された（「止まっていないか」）。明確な転記+突合作業はその場で Read/Edit/Bash で完結できた。スキル/エージェントは正常で、私の経路選択が過剰だった。

**How to apply:**
- skill が当該セッションの利用可能一覧に無ければ、SSOT（[[1-2-pdf]] 等の reference）を Read して手順を踏み、直接実行する。
- 売上記録では既存ログの (date, productId, price) と突合して重複を skip（既存月は記録済みのことが多い）。productId は sales-recorder.md の mapping と既存ログの slug 系統（`bk-*`/`essay-*`。note-magazines.ts の `pe-construction-*` とは別系統）に合わせる。
- 新商品を売ったら sales-recorder.md の mapping 追加が必要。**この取りこぼしは `npm run check-sales-mapping` が pre-commit で機械検知する**（2026-06-21 新設、未文書化 productId・`article:unknown-*` で exit 1、回避 `SKIP_SALES_MAPPING=1`）。
- `npm run sales-summary -- 2026-06`（月は位置引数。`--month`/`--trend`/`--by-product` は未実装）。
