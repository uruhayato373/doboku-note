---
name: note-publish-price-field
description: note-publishはprice欄必須(isPaid=notePricing===paid && price>0)。price欄無し=無料公開事故。free→paid変換はnote-convert-to-paid.mjs
metadata:
  node_type: memory
  type: reference
---

note-publish.mjs の有料判定は **`const isPaid = notePricing === 'paid' && price > 0`**（scripts/note-publish.mjs:90）。`notePricing: paid` でも **frontmatter に `price:` 欄が無い（or 0）と isPaid=false → 無料で公開される**（2026-07-24、完全攻略パック工事/補充18本＋総監3本＝計21本が price 欄欠落で無料公開＝値崩れ事故）。

**予防**: paid 記事を公開する前に `price:` 欄(>0)を必ず確認。完全攻略パック個別記事は **¥500**（バンドル ¥2,480＝単品比56-65%OFF と整合。price 欄ありの9本が¥500）。パック専用設計で個別 price を未設定にしていた記事が地雷。

**修復ツール（新規 2026-07-24）**: `scripts/note-convert-to-paid.mjs` — 既に無料公開済みの note を有料化する（`--list`/`--article` ＋ `--commit`）。既存 note editor を開く→公開に進む→有料選択＋価格(input#price setter)→有料エリア設定で境界を paidBoundary 直前へ→更新する→API で price>0 検証。note-publish の有料+境界ロジック(steps 9/11)を踏襲。冪等: note-publish は noteUrl あると skip するので既存 note の有料化には使えない＝本ツールが必要。

**同一画像の2枚目アップロード失敗（failed=1）**: 本文に同じ画像を2回（例: 著者権威バナーを冒頭+末尾）貼ると note が2枚目のアップロードに失敗し note-publish が `[12] ★中断: 本文画像が未完（leftover=0 failed=1）→ 公開しない★` で公開拒否（安全停止）。別ファイル名コピーでも同一内容だと失敗する場合あり→**重複バナーは1枚に削除**するのが確実（2026-07-24、工事14/補充-基礎杭工）。[[reference_note_update_body_gotchas]]

**~~note-publish は会員限定(membership)を扱わない~~ → 2026-08-06 に対応済み**: 旧: `notePricing: membership` を出すと isPaid=false で一般公開されていた。現: note-publish が公開範囲を選び、選べなければ公開しない（fail-closed）。仕様と実装は [[note-membership-publish]]。
