---
name: feedback_platform_only_artifacts_destroyed_by_bulk_ops
description: SoT に現れないプラットフォーム側の成果物（note の PDF 添付等）は、SoT ベースの一括操作が黙って破壊する。ライブ一括操作の前に「SoT に無いがライブにある物」を数えて保全する
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 4c910f6f-53db-44d0-8b1b-65894f94ebfe
  modified: 2026-07-28T08:10:34.281Z
---

**SoT に無いものは、SoT ベースの一括操作から見えない＝黙って壊れる。**

2026-07-28、note の送客リンク是正で `note-update-body`（Ctrl+A → Delete → paste の全文置換）を建設部門 196 本へ流し、**本文内の PDF 添付カードを 179 本ぶん消した**。添付は note のプラットフォーム機能で `article.md` に一行も現れないため、paste では戻らない。売上ログ142件中74件が建設部門＝購入者が既に払った対価が届かなくなった。**是正作業そのものが商品を壊した。**

同じ日に、別経路の同型（公開したが添付し忘れ）で ¥1,980 の商品が「末尾に添付」と書きながら添付ゼロで売られていたことも判明した。

**Why:** SoT（リポジトリ）を真実源として設計していると、「ライブにしか存在しない状態」が思考から抜け落ちる。一括操作は SoT を正として上書きするので、ライブ固有の成果物は差分としてすら現れず、破壊が無音になる。スクリプトに `--images-only`（添付を触らない逃げ道）が既にあった＝既知の破壊だったのに、既定で止まらなかったのが決定的。

**How to apply:**
- **ライブへ一括書き込みする前に、「SoT に無いがライブにある物」を数える**。添付ファイル・予約設定・プラットフォーム側メタなど。0 でないなら、破壊するのか保全するのかを明示的に決める。
- **危険な既定を「逃げ道つき」で放置しない**。回避オプション（`--images-only` 等）が必要になった時点で、それは**既定を逆にすべき**というサイン。既定で中断し、破壊は明示フラグ（`--allow-*`）でのみ許す。
- **各工程の出口で落とす**。横断ゲート1本だと気づくのが遅い。①公開して添付忘れ→publish が exit 9、②添付したつもり→attach が live 実測、③全文置換→update が事前中断、④累積ドリフト→横断ゲート、と入口ごとに実行者本人が即座に気づく位置へ置く。
- **done-log を `.tmp` に置かない**（git 管理外＝原因究明時に過去の作業記録が消えている）。`.claude/state/` の追跡下へ。
- **API フィールドを意味の推測で使わない**。note の `remained_file_num` は添付数ではなく、14ファイル添付済みが `0` を返す。実測（著者ログインで `a[href*="api/v2/attachments/download"]` を数える）に切り替えて確定させた。
- **CI で見えないものを CI に載せない**。有料エリアの添付カードは未ログイン HTML に出ない＝Actions からは原理的に不可視。ソース層＝CI／ライブ層＝ローカル、と分けて「載っているフリ」を作らない（[[feedback_gate_zero_coverage_false_pass]]）。

関連: [[feedback_gate_zero_coverage_false_pass]] / [[feedback_prevention_over_patching]] / [[feedback_note_price_three_layer_drift]] / [[feedback_note_prepublish_verify_not_proxy]]
