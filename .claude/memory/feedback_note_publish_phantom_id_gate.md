---
name: feedback_note_publish_phantom_id_gate
description: note公開バッチのfail=0は偽成功しうる(noteUrl有無だけの判定)。noteId実在をnote API v3で照合してから完了。二層ゲート実装済み
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 23437d94-469a-4531-b01d-675ad44079ff
---

note 公開バッチ `note-publish-magazine.mjs` の `[done] fail=0` を**信用しない**。成功判定が従来 `fmHasUrl`（frontmatter に noteUrl があるか）だけで、`note-publish.mjs` の writeback は**ページから拾った URL の id を書くだけ**なので、公開が実際は未完了でも**幻 noteId**（note API で 404 not_found）＋`noteStatus:published` を書き込みうる。2026-06-30 完全攻略パック 工事82-87 の6本が fail=0 のまま未公開で、マガジン収録時に初めて発覚した（[[project_civil1_flagship_pack]]）。

**Why**: 偽成功の実シグナルは「noteUrl 非空」で、note-lint 等の機械ゲートは URL の**存在**しか見ず**実在**を見ない。UI タイミング/プロキシ揺れで publish が中断しても URL 断片を拾えば素通りする。

**How to apply**:
- **二層ゲート（2026-07-01 実装済・PR#314）**: ①`note-publish-magazine.mjs` は即時公開分について書き戻した noteId が `https://note.com/api/v3/notes/{id}` で実在するか照合し、確定404なら fail 停止（予約投稿は go-live 後刻ゆえ検証しない）。②バッチ完了後・完了報告前に必ず `npm run verify-note-status`（fm=published ↔ ライブ404 を WARN 列挙する reconciler）で全件確証する。
- WARN/幻idを見つけたら該当 frontmatter の noteUrl/noteId/notePublishedAt を空へリセット→`--commit` で再公開→再照合。
- 単発の実体検証は publish-note SKILL.md「偽成功の罠」が真実源。関連=[[feedback_publish_x_false_success]]（予約ゼロの空振り）・[[feedback_note_prepublish_verify_not_proxy]]（代理指標でなく実条件）。
