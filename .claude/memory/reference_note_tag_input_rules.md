---
name: note-tag-input-rules
description: note のタグ欄の仕様（- . / 不可・大文字小文字を区別しない・上限99）と、一括同期で公開 API を叩きすぎると note.com 全体が 403 になる罠
metadata:
  node_type: memory
  type: reference
  originSessionId: ffbf02f3-349f-4966-a27b-df2907efb19a
  modified: 2026-09-23T11:21:22.247Z
---

2026-09-23 に `note-sync-tags --prune` で約900本を一括同期したときの実測。

- **入力できない文字**: `-` `.` `/` を含むタグは Enter しても chip にならず入力欄に残る（i-Construction・Park-PFI・地方創生2.0・BIM/CIM）。`_` は可（Society5_0・BIM_CIM）。原稿では `_` に置き換え、`check-note-hashtags` が止める（PR #590）
- **大文字小文字を区別しない**: 原稿 `GX` を足してもライブは既存の `gx` のまま。比較は小文字キーで行う（`scripts/lib/note-tag-plan.mjs` の tagKey）
- **上限99**: 埋まっているとタグを1つも足せない。原稿に無いタグを外す `--prune` で解消（PR #586）
- **会員限定記事**: 未ログインの公開 API はタグを空で返す。ログイン済みブラウザの `ctx.request` なら著者として読める（24本で確認）
- **403 の罠**: 公開 API を 0.25 秒間隔で約900回読んだ直後、note.com 全体（ページも）が CloudFront 403 になった。約1分で解除。一括は1秒間隔（`--throttle-ms`）にし、403 が続いたら止める
- 公開設定のタグ chip は `<button>#タグ<span aria-label="削除">`。textContent 末尾に改行が付くので完全一致の正規表現は空白を許す

関連: [[reference_note_update_body_gotchas]] [[reference_note_status_reconciler]]
