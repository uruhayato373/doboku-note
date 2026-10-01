---
name: note-status-reconciler
description: note記事のnoteStatus draftドリフトの原因と再発防止(writeback拡張+verify-note-status weekly reconciler)。--fix はCRLF記事で偽成功していた(2026-09-19修正)
metadata: 
  node_type: memory
  type: reference
  originSessionId: 5ba2470b-1709-4c88-ab46-86c9db436682
---

note 記事 frontmatter の `noteStatus` が「公開済みなのに draft」のままドリフトする問題の原因と恒久対策（2026-06-21 実装）。

**原因**: `scripts/note-publish.mjs` の writeBack は元々 `noteUrl`/`noteId`/`notePublishedAt` のみを書き戻し、`noteStatus` は対象外だった。さらに予約投稿は go-live が note サーバ側で後刻に起きるためローカル書戻しの機会が無い。**実シグナルは「noteUrl 非空 OR noteStatus に publish」の OR**（note-lint.mjs / .claude/scripts/check-note-3set.mjs）なので、noteUrl さえ入れば機能は壊れず、noteStatus の嘘は赤くならない＝検知されず放置される（2026-06-21、建設部門 無料入口16本で実害化）。

**対策**:
- writeBack に noteStatus 行追加（即時=published / 予約=reserved）。
- `npm run verify-note-status`（`scripts/verify-note-status.mjs`）= noteStatus 行を持つ記事のみ（~95本）を note 公開API と突合し drift 検知、`-- --fix` で既存行を是正。連続取得はレート制限されるため throttle(0.4s)+retry 必須。noteStatus 行が無い記事（マガジン収録記事等＝noteUrl管理の別規約）には field 注入しない。
- weekly-review skill の Agent B に配線（週次で自己修復）。creds 不要・network依存ゆえ CI ゲート非対象（[[session-start-git-sync]] 系の verify-note-magazines / audit-note-funnel --live と同系統）。

関連: [[note-paid-unpublish-blocked]]（note公開状態の制約）。

**--fix の偽成功（2026-09-19）**: frontmatter 正規表現が LF 専用（`---\n`）で、Windows 由来の CRLF 記事（pack-lineup の会員記事・学科09・W8）は 1 バイトも書き換わらないまま「是正済み」と数えられていた＝書き込み版の「検査ゼロを PASS と呼ばない」。修正: 置換を `scripts/lib/note-status.mjs` の `setNoteStatus`（`\r?\n`）へ集約し、`--fix` は `next !== raw` のときだけ「是正」と数え、書き換え不能は UNFIXED として exit 1（`tests/verify-note-status-crlf.test.mjs`）。**書き換え系スクリプトは「対象件数」でなく「実際に差分が出た件数」を報告させる**。
