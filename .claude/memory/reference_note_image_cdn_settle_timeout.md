---
name: reference_note_image_cdn_settle_timeout
description: note へ本文画像を上げると会社PCのプロキシ経由では CDN 確定が既定90秒を超えて中断する。NOTE_IMG_SETTLE_* で延長。保存はされないので破損はしない
metadata: 
  node_type: memory
  type: reference
  originSessionId: 01d1c3b9-c92e-4c78-851d-950b5c151af9
  modified: 2026-08-04T08:40:36.235Z
---

note-update-body / note-publish が本文画像をアップロードすると、`blob:` プレビューが CDN URL に
差し替わるのを待つ（`scripts/lib/note-images.mjs` の `settleUploads`）。既定は **min 90 秒 / 20 秒per枚**。

**会社 PC（プロキシ経由）ではこれを超える。** 2026-08-04 の実測で、26 本バッチの 1 回目は
14 本中 6 本が `[4.4] ABORT: 画像が CDN 確定せず` で中断した（3 本連続でバッチ自体も自動停止）。
待ちを 4 倍にした 2 回目は 18 本中 13 本成功し、1 回目に失敗した記事も通った。

- 延長: `NOTE_IMG_SETTLE_MIN_MS=240000 NOTE_IMG_SETTLE_PER_IMG_MS=60000`
- **これは「待てば通る」失敗**。判定（blob: でない img が target 個）は緩めていない。
- **中断しても保存しない**ので live は壊れない。ただし有料記事では、note のエディタが
  「保存しない」で抜けても全文置換＋添付削除の状態を保持するため、
  再実行前に人が記事を開いて添付の有無を確認すること（[[feedback_platform_only_artifacts_destroyed_by_bulk_ops]]）。
- 回線の速い PC なら既定のままで通る可能性がある。**まず 1 本 dry-run して確かめてから**バッチを流す。

関連: [[feedback_note_prepublish_verify_not_proxy]] / [[feedback_metrics_cicd_supplied]]
