---
name: feedback_new_tool_doc_wiring
description: "新スクリプト/ツール追加時はdiscoverability配線＋commit前/doc-sync。機械ゲートは意味ドリフトを拾えない。handoff棚卸しは/doc-declutter経由で前送りタスクを抽出してから削除"
metadata:
  type: feedback
---

## 新しいスクリプト・ツール・経路を足したら discoverability 配線＋/doc-sync（2026-06-25）
①既存 skill/policy doc から参照を張る ②commit 前に `/doc-sync` を1回回す。
- **Why:** 機械ゲート（`check-doc-refs`＝壊れた参照 / `check-doc-coupling`＝台帳もれ）は「パスが実在するか」「skill/agent 台帳が同期しているか」しか見ず、**既存の案内が別ツールを指したまま陳腐化した意味ドリフトは構造的に拾えない**（`/doc-sync`＝doc-sync-auditor 専用の守備範囲・[[reference_doc_sync_system]]）。2026-06-24 に figure→reel 経路 `scripts/figure-reel-create.mjs` を新設したのに `ig-figure-pack` SKILL.md は「Reels動画化→`ig-reel-create`」のまま（`ig-reel-create` は過去問 quiz 専用で figure 不可）＝誤案内が残存し、新スクリプトもどの doc からも参照されず発見不能で次セッションが同じ調査をやり直す羽目に。機械ゲートは全部緑だった。
- **How to apply:** `scripts/**` `.claude/skills/**` `src/**` 等ドキュメント化された面を変更/追加した commit の前に `/doc-sync`（CLAUDE.md §8。ゲートが緑でも省略しない）。新ツールは最も近い既存 skill SKILL.md か reference policy から1行参照（例: ig-figure-pack SKILL.md「担当外」＋ ig-reels-policy.md に figure-reel-create を明記）。似た既存ツールがあれば新旧の棲み分けを明記（figure=figure-reel-create / 過去問=ig-reel-create）。`/doc-sync` を回したか自体は機械ゲート化が難しく運用規律＝チェックリスト化。

## handoff 棚卸しは /doc-declutter 経由・前送りタスクを抽出してから削除（2026-07-14）
handoff（`docs/handoffs/*.md`）の棚卸しで未完了タスクを backlog へ抽出せず退避し、タスクごと消失させた（BuildJob note展開の消失をユーザーが指摘して発覚）。
1. 完了マーク（`> [!done]`）＋PR merged の裏取りだけで「完了」と判定し、同居する `🔴🟡`・「残タスク」「次アクション」「別PC」等の**前送り節を抽出しなかった**。handoff は完了報告と前送りタスクが同居する文書。
2. 廃止済みの `docs/handoffs/_archive/` を復活させた。正規ライフサイクルは「抽出→`git rm` 削除（記録は git 履歴）・archive は 2026-07-11 廃止」（information-architecture.md「handoff のライフサイクル」）。
3. 規定手順スキルを「無い」と誤断定。`/doc-declutter` は `.claude/skills/dev/doc-declutter/SKILL.md` に実在したのに、フラットな `ls .claude/skills/` で探して見つからず、`doc-curator` の外部実体検証（「抽出が先・削除が後」「抽出なしの DELETE は禁止」）をスキップした。スキルはカテゴリ別サブディレクトリ構造（`.claude/skills/<category>/<name>/SKILL.md`）。

**How to apply:** handoff の棚卸しは必ず `/doc-declutter`（doc-curator が KEEP/TRIM/DELETE/CONSOLIDATE を判定）。手動なら「前送りマーカー全スキャン→backlog 抽出→削除」。スキル/エージェント探索は Glob `.claude/skills/**/<name>/SKILL.md`（フラット ls 禁止）。`_archive/` は作らず抽出済みなら `git rm`（出典引用は正当・`check-doc-refs` は `docs/handoffs/**` 対象外）。機械ゲート `scripts/check-handoff-extraction.mjs`（pre-commit）が素通りを止める（handoff 直下削除で前送りマーカーあり＆backlog 未同梱／`_archive` 追加を reject・回避 `SKIP_HANDOFF_EXTRACT=1`）。判定の質は `/doc-declutter`。関連: [[feedback_prevention_over_patching]]
