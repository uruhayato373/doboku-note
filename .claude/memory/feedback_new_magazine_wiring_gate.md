---
name: feedback_new_magazine_wiring_gate
description: 新noteマガジン追加は note-magazines.ts 登録だけでは依存実行系に配線されない。keiken系は字数ゲート漏れが起きる→check-magazine-wiringで機械検知。配線チェックリストあり
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 8cfad8a8-0e42-4422-b217-553b14af9d77
---

新しい note 有料マガジン（コンテンツライン）を追加するとき、`src/lib/note-magazines.ts` にエントリを足すだけでは**依存する実行系に配線されない**。2026-07-01 の 2級 想定工事バンクで顕在化した修正漏れ:
- `keiken-charcount.mjs` の探索フィルタが「経験記述」substring 限定で、dir 名に「経験記述」を含まない想定工事バンクを**一括で全スキップ**（36本の解答欄字数チェックが素通り）。
- `check-note-charlimits`（pre-commit 字数ゲート）は**建設部門 BK 限定**で、土木 keiken は対象外だった。
- essay-writer/qa の型リスト・sales-recorder の productId マッピングも未追記。

**Why:** check-doc-coupling は skill/agent の追加削除・description 変更しか見ず、「新コンテンツ型が既存の実行系（スクリプトのフィルタ・エージェントの型リスト・sales マッピング）に配線されたか」は無防備だった。

**How to apply:** 新マガジン追加時の配線チェックリスト（`note-magazines.ts` の MAGAZINES_RAW 直前コメントに明文化）:
1. cover: `generate-magazine-covers.mjs` / `generate-magazine-sidebar-banners.mjs` に定義
2. 売上: `sales-recorder.md` の productId マッピング
3. keiken系なら: `keiken-charcount.mjs` の探索フィルタに判別語追加（→ `check-magazine-wiring.mjs` が pre-commit で漏れを機械検知）
4. Generator/Evaluator の対応型: `civil-keiken-essay-writer.md` 等＋`agents-registry.md`
5. `/doc-sync` を1回

`keiken-charcount.mjs` は `--staged --strict` で pre-commit ゲート化済み（土木 keiken 全体をカバー）。`check-magazine-wiring.mjs` が「答案マーカーを持つマガジンが字数ツールの探索対象に入っているか」を機械検証（本命の再発防止）。[[feedback_prevention_over_patching]] の具体適用。
