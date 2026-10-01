---
name: magazine-add-snapshot
description: note マガジンへ記事を収録したら同じ commit で verify-note-magazines --contents --json の snapshot を再生成する
metadata:
  node_type: memory
  type: feedback
  originSessionId: a8d9cc9f-2b0a-4427-82e4-6e1cc465f225
  modified: 2026-09-24T12:55:48.966Z
---

`note-magazine-add-articles --commit` でマガジンの収録を増やしたら、同じ作業のうちに `npm run verify-note-magazines -- --contents --json` で `.claude/state/note/magazines-snapshot.json` を作り直して commit する。

**Why:** 2026-09-24 に会員お題ラボへ W9・W10 を収録（8→10）したが snapshot を直さず、`check-magazine-membership`（CI ゲート）が「ライブ 8」で赤になり、無関係な PR #608・#609 の build まで落ちた。ライブの収録数は snapshot 経由でしか CI に見えない。

**How to apply:** マガジン収録・会員特典の収録を触ったら、snapshot 再生成 → `npm run check-magazine-membership` 緑 → commit まで 1 セットで。SoT の件数表記（`src/lib/note-magazines.ts`）が変わる場合も同じ commit。カードを閉じる前の docs 参照確認は todo-complete の doc-refs 検査（PR #611）が止める。関連: [[parallel-agent-commit-sweep]]
